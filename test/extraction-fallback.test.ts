import { JSDOM } from 'jsdom'

describe('Defuddle extraction fallbacks', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('defuddle')
    vi.doUnmock('defuddle/full')
  })

  it('retries structured document content when article detection first extracts a short slice', async () => {
    vi.doMock('defuddle', () => {
      return {
        default: createMockDefuddleClass('<main><p>Recovered article body.</p></main>'),
      }
    })

    const { analyzeDocument } = await import('@/shared/analysis')
    const { defaultSettings } = await import('@/shared/types')
    const document = createStructuredFallbackDocument()
    const analysis = analyzeDocument(document, defaultSettings)

    expect(analysis.status).toBe('article')

    if (analysis.status !== 'article') {
      throw new Error('Expected fallback article analysis.')
    }

    expect(analysis.wordCount).toBe(220)
    expect(analysis.pageTitle).toBe('Recovered fallback article')
  })

  it('retries structured document content when markdown extraction first extracts a short slice', async () => {
    vi.doMock('defuddle/full', () => {
      return {
        default: createMockDefuddleClass('Recovered article markdown.'),
      }
    })

    const { createTranscriptResult } = await import('@/shared/transcript')
    const document = createStructuredFallbackDocument()
    const result = await createTranscriptResult(document)

    expect(result.status).toBe('ready')

    if (result.status !== 'ready') {
      throw new Error('Expected fallback markdown extraction.')
    }

    expect(result.payload.wordCount).toBe(220)
    expect(result.payload.markdown).toBe('Recovered article markdown.')
  })
})

function createStructuredFallbackDocument(): Document {
  const dom = new JSDOM(
    `
      <!doctype html>
      <html lang="en">
        <head>
          <title>Fallback Fixture</title>
          <meta property="og:title" content="Recovered fallback article">
        </head>
        <body>
          <main>
            <section data-section>
              <article>
                <div class="system-card-richtext">
                  <p>${'fallback '.repeat(220)}</p>
                </div>
              </article>
            </section>
          </main>
        </body>
      </html>
    `,
    { url: 'https://deploymentsafety.openai.com/example' },
  )

  return dom.window.document
}

function createMockDefuddleClass(recoveredContent: string) {
  return class MockDefuddle {
    private readonly options: { contentSelector?: string } | undefined

    public constructor(_document: Document, options?: { contentSelector?: string }) {
      this.options = options
    }

    public parse() {
      if (this.options?.contentSelector === 'main') {
        return createDefuddleResponse({
          content: recoveredContent,
          title: 'Recovered fallback article',
          wordCount: 220,
        })
      }

      return createDefuddleResponse({
        content: 'Short leading fragment.',
        title: 'Short fragment',
        wordCount: 3,
      })
    }
  }
}

function createDefuddleResponse({
  content,
  title,
  wordCount,
}: {
  content: string
  title: string
  wordCount: number
}) {
  return {
    author: '',
    content,
    description: '',
    domain: 'deploymentsafety.openai.com',
    favicon: '',
    image: '',
    language: 'en',
    parseTime: 1,
    published: '',
    schemaOrgData: {},
    site: 'Deployment Safety',
    title,
    wordCount,
  }
}
