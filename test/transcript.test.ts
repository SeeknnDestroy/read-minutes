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
    expect(result.payload.exportText).toContain('title: "Designing Better Reading Sessions"')
    expect(result.payload.exportText).toContain('source: "https://example.com/designing-better-reading-sessions"')
    expect(result.payload.exportText).toContain('word_count: "')
  })

  it('returns unavailable for non-article content', async () => {
    const document = loadFixtureDocument('non-article.html', 'https://example.com/')
    const result = await createTranscriptResult(document)

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'below-threshold',
    })
  })
})

function loadFixtureDocument(fileName: string, sourceUrl: string): Document {
  const currentDirectory = dirname(fileURLToPath(import.meta.url))
  const fixturePath = resolve(currentDirectory, 'fixtures', fileName)
  const html = readFileSync(fixturePath, 'utf8')
  const dom = new JSDOM(html, { url: sourceUrl })

  return dom.window.document
}
