import { JSDOM } from 'jsdom'

describe('analyzeDocument DOM safety', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('defuddle')
  })

  it('does not let the extractor mutate the live page document', async () => {
    vi.doMock('defuddle', () => {
      return {
        default: class MockDefuddle {
          private readonly document: Document

          public constructor(document: Document) {
            this.document = document
          }

          public parse() {
            this.document.body.innerHTML = '<main><article><h1>Mutated</h1></article></main>'

            return {
              author: '',
              content: '<article><p>word '.repeat(220) + '</p></article>',
              description: '',
              domain: 'example.com',
              favicon: '',
              image: '',
              language: 'en',
              parseTime: 1,
              published: '',
              schemaOrgData: {},
              site: 'Example',
              title: 'Example post',
              wordCount: 220,
            }
          }
        },
      }
    })

    const { analyzeDocument } = await import('@/shared/analysis')
    const { defaultSettings } = await import('@/shared/types')
    const dom = new JSDOM(
      '<!doctype html><html><head><title>Example</title></head><body><header id="header">Header</header><main id="main"><p>Original page</p></main></body></html>',
      { url: 'https://example.com/post' },
    )
    const originalMarkup = dom.window.document.body.innerHTML

    analyzeDocument(dom.window.document, defaultSettings)

    expect(dom.window.document.body.innerHTML).toBe(originalMarkup)
    expect(dom.window.document.getElementById('header')).not.toBeNull()
  })

  it('removes picture elements without img fallbacks from extraction snapshots', async () => {
    const { createExtractionDocumentSnapshot } = await import('@/shared/page-context')
    const dom = new JSDOM(
      '<!doctype html><html><head><title>Example</title></head><body><main><article><picture><source srcset="/hero.webp" type="image/webp"></picture><p>Body copy</p></article></main></body></html>',
      { url: 'https://example.com/post' },
    )
    const snapshot = createExtractionDocumentSnapshot(dom.window.document)

    expect(snapshot.querySelector('picture')).toBeNull()
  })
})
