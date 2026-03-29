import { ANALYSIS_DEBOUNCE_MS, BADGE_HOST_ID, CONTENT_OBSERVER_IDLE_MS } from '@/shared/constants'
import { defaultSettings, type PageAnalysis } from '@/shared/types'
import { createGetPageTranscriptMessage } from '@/shared/messages'

describe('content script lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<main><article><p>Initial page</p></article></main>'
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.doUnmock('@/shared/analysis')
    vi.doUnmock('@/shared/settings')
    vi.doUnmock('@/shared/transcript')
    vi.doUnmock('@/content/badge')
    document.body.innerHTML = ''
    document.title = ''
    window.history.replaceState(null, '', '/')
  })

  it('analyzes the page once during startup after settings load', async () => {
    const analyzeDocument = vi.fn(() => createNoArticleAnalysis())

    mockContentScriptDependencies(analyzeDocument)

    await import('@/content/main')
    await flushMicrotasks()

    expect(analyzeDocument).toHaveBeenCalledTimes(1)
  })

  it('ignores badge-host mutations when scheduling analysis', async () => {
    const analyzeDocument = vi.fn(() => createNoArticleAnalysis())

    mockContentScriptDependencies(analyzeDocument)

    await import('@/content/main')
    await flushMicrotasks()

    analyzeDocument.mockClear()

    const badgeHost = document.createElement('div')

    badgeHost.id = BADGE_HOST_ID
    document.body.append(badgeHost)
    badgeHost.append(document.createElement('span'))

    await flushMicrotasks()
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1)
    await flushMicrotasks()

    expect(analyzeDocument).not.toHaveBeenCalled()
  })

  it('ignores irrelevant DOM churn but reacts to article content and SPA navigation', async () => {
    const analyzeDocument = vi.fn(() => createNoArticleAnalysis())

    mockContentScriptDependencies(analyzeDocument)

    await import('@/content/main')
    await flushMicrotasks()

    analyzeDocument.mockClear()

    const styleElement = document.createElement('style')

    styleElement.textContent = 'body { color: rgb(0, 0, 0); }'
    document.body.append(styleElement)

    await flushMicrotasks()
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1)
    await flushMicrotasks()

    expect(analyzeDocument).not.toHaveBeenCalled()

    const articleElement = document.createElement('article')
    const paragraphElement = document.createElement('p')

    paragraphElement.textContent = 'Late loaded article content'
    articleElement.append(paragraphElement)
    document.body.append(articleElement)

    await flushMicrotasks()
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1)
    await flushMicrotasks()

    expect(analyzeDocument).toHaveBeenCalledTimes(1)

    analyzeDocument.mockClear()
    vi.advanceTimersByTime(CONTENT_OBSERVER_IDLE_MS + 1)
    await flushMicrotasks()

    window.history.pushState({}, '', '/next')

    await flushMicrotasks()
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1)
    await flushMicrotasks()

    expect(analyzeDocument).toHaveBeenCalledTimes(1)
  })

  it('responds to transcript messages with local transcript results', async () => {
    const analyzeDocument = vi.fn(() => createNoArticleAnalysis())
    const chromeMock = createContentChromeMock()
    const longArticleCopy = 'word '.repeat(220)

    document.title = 'Transcript Example'
    document.body.innerHTML = `<main><article><h1>Transcript Example</h1><p>${longArticleCopy}</p></article></main>`

    vi.stubGlobal('chrome', chromeMock)
    vi.doMock('@/shared/analysis', () => ({
      analyzeDocument,
    }))
    vi.doMock('@/shared/settings', async () => {
      const actualSettingsModule = await vi.importActual<typeof import('@/shared/settings')>('@/shared/settings')

      return {
        ...actualSettingsModule,
        readSettings: vi.fn(async () => defaultSettings),
      }
    })
    vi.doMock('@/content/badge', () => ({
      renderBadge: vi.fn(),
      removeBadge: vi.fn(),
    }))

    await import('@/content/main')
    await flushMicrotasks()

    const addListener = chromeMock.runtime.onMessage.addListener as ReturnType<typeof vi.fn>
    const messageHandler = addListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const listenerResult = messageHandler(createGetPageTranscriptMessage(), {}, sendResponse)

    expect(listenerResult).toBe(true)
    await flushMicrotasks()
    expect(sendResponse).toHaveBeenCalledTimes(1)
    expect(sendResponse.mock.calls[0]?.[0]).toMatchObject({
      status: 'ready',
      payload: {
        pageTitle: 'Transcript Example',
        sourceUrl: 'http://localhost:3000/',
      },
    })
  })
})

function mockContentScriptDependencies(
  analyzeDocument: ReturnType<typeof vi.fn>,
): void {
  vi.stubGlobal('chrome', createContentChromeMock())
  vi.doMock('@/shared/analysis', () => ({
    analyzeDocument,
  }))
  vi.doMock('@/shared/settings', async () => {
    const actualSettingsModule = await vi.importActual<typeof import('@/shared/settings')>('@/shared/settings')

    return {
      ...actualSettingsModule,
      readSettings: vi.fn(async () => defaultSettings),
    }
  })
  vi.doMock('@/content/badge', () => ({
    renderBadge: vi.fn(),
    removeBadge: vi.fn(),
  }))
}

function createContentChromeMock() {
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
  }
}

function createNoArticleAnalysis(): PageAnalysis {
  return {
    status: 'no-article',
    hostname: 'example.com',
    pageTitle: 'Example',
    siteName: 'Example',
    sourceUrl: window.location.href,
    reason: 'below-threshold',
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await vi.dynamicImportSettled()
}
