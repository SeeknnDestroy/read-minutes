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
})

function loadFixtureDocument(fileName: string, sourceUrl: string): Document {
  const currentDirectory = dirname(fileURLToPath(import.meta.url))
  const fixturePath = resolve(currentDirectory, 'fixtures', fileName)
  const html = readFileSync(fixturePath, 'utf8')
  const dom = new JSDOM(html, { url: sourceUrl })

  return dom.window.document
}
