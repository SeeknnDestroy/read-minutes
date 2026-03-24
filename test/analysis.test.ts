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

  it('returns no-article for short homepage-style content', () => {
    const document = loadFixtureDocument('non-article.html', 'https://example.com/')
    const analysis = analyzeDocument(document, defaultSettings)

    expect(analysis.status).toBe('no-article')

    if (analysis.status !== 'no-article') {
      throw new Error('Expected a no-article analysis for the non-article fixture.')
    }

    expect(analysis.reason).toBe('below-threshold')
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
