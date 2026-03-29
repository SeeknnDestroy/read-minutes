import { defaultSettings, type PageAnalysis } from '@/shared/types'

describe('popup rendering safety', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('renders page-derived values as text instead of parsing them as HTML', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const analysis: PageAnalysis = {
      status: 'article',
      hostname: 'example.com',
      pageTitle: '<img id="title-probe" src="x" />',
      siteName: '<span id="site-probe">Example</span>',
      sourceUrl: 'https://example.com/post',
      wordCount: 1_020,
      minutes: 5,
      readingTimeLabel: '5 min read',
    }
    const chromeMock = createPopupChromeMock(analysis)

    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    const titleElement = document.querySelector('.title')
    const domainElement = document.querySelector('.domain')

    expect(document.getElementById('title-probe')).toBeNull()
    expect(document.getElementById('site-probe')).toBeNull()
    expect(titleElement?.textContent).toBe('<img id="title-probe" src="x" />')
    expect(domainElement?.textContent).toBe('<span id="site-probe">Example</span>')
  })
})

function createPopupChromeMock(analysis: PageAnalysis) {
  return {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
    storage: {
      sync: {
        get: vi.fn(async () => ({
          wordsPerMinute: defaultSettings.wordsPerMinute,
          showInlineBadge: defaultSettings.showInlineBadge,
        })),
        set: vi.fn(async () => undefined),
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      create: vi.fn(async () => undefined),
      query: vi.fn(async () => [{ id: 1 }]),
      sendMessage: vi.fn(async () => analysis),
    },
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
