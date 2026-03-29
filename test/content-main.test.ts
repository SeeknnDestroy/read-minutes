import { ANALYSIS_DEBOUNCE_MS, BADGE_HOST_ID, CONTENT_OBSERVER_IDLE_MS } from '@/shared/constants'
import { defaultSettings, type PageAnalysis, type TranscriptPayload, type TranscriptResult } from '@/shared/types'
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

  it('copies transcript markdown from the inline dock', async () => {
    const analyzeDocument = vi.fn(() => createArticleAnalysis())
    const createTranscriptResultMock = vi.fn(async () => createTranscriptReadyResult())
    const chromeMock = createContentChromeMock()
    const clipboardWriteText = vi.fn(async () => undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    mockInlineDockDependencies({
      analyzeDocument,
      chromeMock,
      createTranscriptResultMock,
    })

    await import('@/content/main')
    await flushMicrotasks()

    const badgeCopyButton = getBadgeButton('[data-role="badge-copy"]')

    badgeCopyButton?.click()
    await flushMicrotasks()

    expect(clipboardWriteText).toHaveBeenCalledWith(createTranscriptPayload().exportText)
    expect(getBadgeText()).toContain('Markdown copied for LLM.')
  })

  it('keeps the inline primary copy action clickable while the menu is open', async () => {
    const analyzeDocument = vi.fn(() => createArticleAnalysis())
    const createTranscriptResultMock = vi.fn(async () => createTranscriptReadyResult())
    const chromeMock = createContentChromeMock()
    const clipboardWriteText = vi.fn(async () => undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    mockInlineDockDependencies({
      analyzeDocument,
      chromeMock,
      createTranscriptResultMock,
    })

    await import('@/content/main')
    await flushMicrotasks()

    const toggleButton = getBadgeButton('[data-role="badge-menu-toggle"]')

    toggleButton?.click()
    await flushMicrotasks()

    const badgeCopyButton = getBadgeButton('[data-role="badge-copy"]')

    badgeCopyButton?.click()
    await flushMicrotasks()

    expect(clipboardWriteText).toHaveBeenCalledWith(createTranscriptPayload().exportText)
    expect(getBadgeText()).toContain('Markdown copied for LLM.')
  })

  it('opens transcript view from the inline dock menu', async () => {
    const analyzeDocument = vi.fn(() => createArticleAnalysis())
    const createTranscriptResultMock = vi.fn(async () => createTranscriptReadyResult())
    const chromeMock = createContentChromeMock()

    mockInlineDockDependencies({
      analyzeDocument,
      chromeMock,
      createTranscriptResultMock,
    })

    await import('@/content/main')
    await flushMicrotasks()

    const toggleButton = getBadgeButton('[data-role="badge-menu-toggle"]')

    toggleButton?.click()
    await flushMicrotasks()

    const openButton = getBadgeButton('[data-role="badge-open"]')

    openButton?.click()
    await flushMicrotasks()

    const sendMessageMock = chromeMock.runtime.sendMessage as ReturnType<typeof vi.fn>
    const openMessage = sendMessageMock.mock.calls[0]?.[0] as {
      transcriptStorageKey: string
      type: string
    } | undefined
    const transcriptStorageKey = openMessage?.transcriptStorageKey

    expect(openMessage).toMatchObject({
      type: 'read-minutes/open-transcript-view',
    })
    expect(chromeMock.storage.session.snapshot()[transcriptStorageKey as string]).toEqual(
      createTranscriptPayload(),
    )
    expect(getBadgeText()).toContain('Opened markdown in a new tab.')
  })

  it('keeps the inline dock hidden after dismissal on the same page', async () => {
    const analyzeDocument = vi.fn(() => createArticleAnalysis())
    const createTranscriptResultMock = vi.fn(async () => createTranscriptReadyResult())
    const chromeMock = createContentChromeMock()

    mockInlineDockDependencies({
      analyzeDocument,
      chromeMock,
      createTranscriptResultMock,
    })

    await import('@/content/main')
    await flushMicrotasks()

    const closeButton = getBadgeButton('[data-role="badge-close"]')

    closeButton?.click()
    await flushMicrotasks()

    expect(document.getElementById(BADGE_HOST_ID)).toBeNull()

    const lateParagraphElement = document.createElement('p')

    lateParagraphElement.textContent = 'More article copy'
    document.body.append(lateParagraphElement)
    await flushMicrotasks()
    vi.advanceTimersByTime(ANALYSIS_DEBOUNCE_MS + 1)
    await flushMicrotasks()

    expect(document.getElementById(BADGE_HOST_ID)).toBeNull()
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

function mockInlineDockDependencies({
  analyzeDocument,
  chromeMock,
  createTranscriptResultMock,
}: {
  analyzeDocument: ReturnType<typeof vi.fn>
  chromeMock: ReturnType<typeof createContentChromeMock>
  createTranscriptResultMock: ReturnType<typeof vi.fn>
}): void {
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
  vi.doMock('@/shared/transcript', () => ({
    createTranscriptResult: createTranscriptResultMock,
  }))
}

function createContentChromeMock() {
  const sessionStorageArea = createStorageAreaMock()
  const localStorageArea = createStorageAreaMock()

  return {
    runtime: {
      sendMessage: vi.fn(async () => undefined),
      onMessage: {
        addListener: vi.fn(),
      },
    },
    storage: {
      local: localStorageArea,
      session: sessionStorageArea,
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

function createStorageAreaMock() {
  const state: Record<string, unknown> = {}

  return {
    async get(keys: string[]) {
      const entries = keys.map((key) => [key, state[key]])

      return Object.fromEntries(entries)
    },
    async remove(keys: string | string[]) {
      const normalizedKeys = Array.isArray(keys) ? keys : [keys]

      normalizedKeys.forEach((key) => {
        delete state[key]
      })
    },
    async set(items: Record<string, unknown>) {
      Object.assign(state, items)
    },
    snapshot() {
      return { ...state }
    },
  }
}

function createArticleAnalysis(): PageAnalysis {
  return {
    status: 'article',
    hostname: 'example.com',
    pageTitle: 'Inline Dock Article',
    siteName: 'Example',
    sourceUrl: 'https://example.com/article',
    wordCount: 1_020,
    minutes: 5,
    readingTimeLabel: '5 min read',
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

function createTranscriptReadyResult(): TranscriptResult {
  return {
    status: 'ready',
    payload: createTranscriptPayload(),
  }
}

function createTranscriptPayload(): TranscriptPayload {
  return {
    author: '',
    description: '',
    domain: 'example.com',
    exportText: '---\ntitle: "Inline Dock Article"\nsite: "Example"\nsource: "https://example.com/article"\nword_count: 1020\n---\n\nBody copy',
    favicon: '',
    hostname: 'example.com',
    image: '',
    language: 'en',
    markdown: 'Body copy',
    pageTitle: 'Inline Dock Article',
    published: '',
    siteName: 'Example',
    sourceUrl: 'https://example.com/article',
    title: 'Inline Dock Article',
    wordCount: 1_020,
  }
}

function getBadgeButton(selector: string): HTMLButtonElement | null {
  const badgeHost = document.getElementById(BADGE_HOST_ID)

  return badgeHost?.shadowRoot?.querySelector<HTMLButtonElement>(selector) ?? null
}

function getBadgeText(): string {
  const badgeHost = document.getElementById(BADGE_HOST_ID)

  return badgeHost?.shadowRoot?.textContent ?? ''
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await vi.dynamicImportSettled()
}
