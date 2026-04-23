import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createTranscriptResult } from '@/shared/transcript'

describe('createTranscriptResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates local markdown export text without using fetch fallbacks', async () => {
    const document = loadFixtureDocument('article.html', 'https://example.com/designing-better-reading-sessions')
    const fetchSpy = vi.fn()

    vi.stubGlobal('fetch', fetchSpy)

    const result = await createTranscriptResult(document)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      throw new Error('Expected transcript extraction to succeed for the article fixture.')
    }

    expect(result.payload.markdown).toContain('Long-form reading works best when the page feels calm')
    expect(result.payload.exportText.startsWith('---\n')).toBe(true)
    expect(result.payload.exportText).toContain('title: "Designing Better Reading Sessions"')
    expect(result.payload.exportText).toContain('site: "example.com"')
    expect(result.payload.exportText).toContain('source: "https://example.com/designing-better-reading-sessions"')
    expect(result.payload.exportText).toContain('word_count: ')
    expect(result.payload.exportText).toContain('\n---\n\n')
    expect(result.payload.exportText.endsWith(result.payload.markdown)).toBe(true)
  })

  it('exports OpenAI deployment safety article content instead of leading footnotes', async () => {
    const document = createDeploymentSafetyDocument()
    const result = await createTranscriptResult(document)

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      throw new Error('Expected transcript extraction to succeed for the deployment safety fixture.')
    }

    expect(result.payload.title).toBe('GPT-5.5 System Card')
    expect(result.payload.markdown).toContain('GPT-5.5 is a new model designed for complex, real-world work.')
    expect(result.payload.markdown).toContain('introduction259')
    expect(result.payload.markdown).not.toContain('short footnote should not be selected')
  })

  it('returns unavailable for non-article content', async () => {
    const document = loadFixtureDocument('non-article.html', 'https://example.com/')
    const result = await createTranscriptResult(document)

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'below-threshold',
    })
  })

  it('keeps fenced code block languages in the raw markdown export', async () => {
    const html = `
      <!doctype html>
      <html lang="en">
        <head>
          <title>Code Example</title>
        </head>
        <body>
          <main>
            <article>
              <h1>Code Example</h1>
              <p>${'word '.repeat(220)}</p>
              <pre><code class="language-python">from fastapi import FastAPI\napp = FastAPI()</code></pre>
            </article>
          </main>
        </body>
      </html>
    `
    const dom = new JSDOM(html, { url: 'https://example.com/code-example' })
    const result = await createTranscriptResult(dom.window.document)

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      throw new Error('Expected transcript extraction to succeed for the code fixture.')
    }

    expect(result.payload.exportText).toContain('```python')
    expect(result.payload.exportText).toContain('from fastapi import FastAPI')
  })

  it('strips leading sequential line numbers from fenced code blocks', async () => {
    const html = `
      <!doctype html>
      <html lang="en">
        <head>
          <title>Code Example</title>
        </head>
        <body>
          <main>
            <article>
              <h1>Code Example</h1>
              <p>${'word '.repeat(220)}</p>
              <pre><code class="language-python">1
2
3
4
from fastapi import FastAPI
app = FastAPI()</code></pre>
            </article>
          </main>
        </body>
      </html>
    `
    const dom = new JSDOM(html, { url: 'https://example.com/code-example' })
    const result = await createTranscriptResult(dom.window.document)

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      throw new Error('Expected transcript extraction to succeed for the numbered code fixture.')
    }

    expect(result.payload.exportText).toContain('```python\nfrom fastapi import FastAPI')
    expect(result.payload.exportText).not.toContain('```python\n1\n2\n3\n4')
  })

  it('strips OpenAI docs style code gutters from list-indented fenced code blocks', async () => {
    const lineNumberMarkup = Array.from({ length: 14 }, (_value, index) => {
      const lineNumber = index + 1

      return `<span class="react-syntax-highlighter-line-number">${lineNumber}\n</span>`
    }).join('')
    const html = `
      <!doctype html>
      <html lang="en">
        <head>
          <title>Code Example</title>
        </head>
        <body>
          <main>
            <article>
              <h1>Code Example</h1>
              <p>${'word '.repeat(220)}</p>
              <ol>
                <li>
                  <p>Generate a client token.</p>
                  <pre><code data-language="python"><code style="float:left;padding-right:10px">${lineNumberMarkup}</code><span>from fastapi import FastAPI
</span><span>from pydantic import BaseModel
</span><span>from openai import OpenAI
</span><span>import os
</span><span>
</span><span>app = FastAPI()
</span><span>openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
</span></code></pre>
                </li>
              </ol>
            </article>
          </main>
        </body>
      </html>
    `
    const dom = new JSDOM(html, { url: 'https://example.com/code-example' })
    const result = await createTranscriptResult(dom.window.document)

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      throw new Error('Expected transcript extraction to succeed for the docs-style code fixture.')
    }

    expect(result.payload.exportText).toContain('```python\n\tfrom fastapi import FastAPI')
    expect(result.payload.exportText).not.toContain('```python\n\t1\n\t2\n\t3')
    expect(result.payload.exportText).not.toContain('\n\t14\n\tfrom fastapi import FastAPI')
  })
})

function loadFixtureDocument(fileName: string, sourceUrl: string): Document {
  const currentDirectory = dirname(fileURLToPath(import.meta.url))
  const fixturePath = resolve(currentDirectory, 'fixtures', fileName)
  const html = readFileSync(fixturePath, 'utf8')
  const dom = new JSDOM(html, { url: sourceUrl })

  return dom.window.document
}

function createDeploymentSafetyDocument(): Document {
  const bodyText = Array.from(
    { length: 260 },
    (_value, index) => `introduction${index}`,
  ).join(' ')
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <title>GPT-5.5 System Card - OpenAI Deployment Safety Hub</title>
        <meta
          name="description"
          content="GPT-5.5 is a new model designed for complex, real-world work."
        >
        <meta property="og:title" content="GPT-5.5 System Card">
      </head>
      <body>
        <main id="main">
          <div id="footnotes">
            <ol>
              <li>
                <p>A short footnote should not be selected as the article body.</p>
              </li>
            </ol>
          </div>
          <aside data-system-card-nav>
            <a href="/gpt-5-5/introduction">Introduction</a>
            <a href="/gpt-5-5/safety">Safety</a>
          </aside>
          <section id="introduction" data-section data-section-slug="introduction">
            <header>
              <h1>GPT-5.5 System Card</h1>
            </header>
            <article>
              <div class="system-card-richtext">
                <p>GPT-5.5 is a new model designed for complex, real-world work.</p>
                <p>${bodyText}</p>
              </div>
            </article>
          </section>
        </main>
      </body>
    </html>
  `
  const dom = new JSDOM(html, {
    url: 'https://deploymentsafety.openai.com/gpt-5-5/introduction',
  })

  return dom.window.document
}
