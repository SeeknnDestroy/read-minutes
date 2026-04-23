import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { analyzeDocument } from '@/shared/analysis'
import { calculateReadingMinutes } from '@/shared/reading-time'
import { defaultSettings } from '@/shared/types'

describe('analyzeDocument', () => {
  it('returns article metrics for long-form content', () => {
    const document = loadFixtureDocument('article.html', 'https://example.com/designing-better-reading-sessions')
    const analysis = analyzeDocument(document, defaultSettings)

    expect(analysis.status).toBe('article')

    if (analysis.status !== 'article') {
      throw new Error('Expected article analysis for the article fixture.')
    }

    expect(analysis.wordCount).toBeGreaterThan(180)
    expect(analysis.minutes).toBe(calculateReadingMinutes(analysis.wordCount, defaultSettings.wordsPerMinute))
    expect(analysis.readingTimeLabel).toBe(`${analysis.minutes} min read`)
  })

  it('extracts OpenAI deployment safety article content instead of leading footnotes', () => {
    const document = createDeploymentSafetyDocument()
    const analysis = analyzeDocument(document, defaultSettings)

    expect(analysis.status).toBe('article')

    if (analysis.status !== 'article') {
      throw new Error('Expected article analysis for the deployment safety fixture.')
    }

    expect(analysis.pageTitle).toBe('GPT-5.5 System Card')
    expect(analysis.wordCount).toBeGreaterThan(250)
  })

  it('returns no-article for short homepage-style content', () => {
    const document = loadFixtureDocument('non-article.html', 'https://example.com/')
    const analysis = analyzeDocument(document, defaultSettings)

    expect(analysis.status).toBe('no-article')

    if (analysis.status !== 'no-article') {
      throw new Error('Expected a no-article analysis for the non-article fixture.')
    }

    expect(analysis.reason).toBe('below-threshold')
  })

  it('returns no-article for search-results style pages', () => {
    const document = loadFixtureDocument('search-results.html', 'https://www.google.com/search?q=rate+limits+openai')
    const analysis = analyzeDocument(document, defaultSettings)

    expect(analysis.status).toBe('no-article')

    if (analysis.status !== 'no-article') {
      throw new Error('Expected a no-article analysis for the search-results fixture.')
    }
  })
})

describe('calculateReadingMinutes', () => {
  it('changes deterministically with the configured reading speed', () => {
    const wordCount = 1_020
    const slowMinutes = calculateReadingMinutes(wordCount, 170)
    const fastMinutes = calculateReadingMinutes(wordCount, 255)

    expect(slowMinutes).toBe(6)
    expect(fastMinutes).toBe(4)
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
