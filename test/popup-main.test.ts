import type { PageAnalysis, TranscriptPayload, TranscriptResult } from '@/shared/types'

describe('popup transcript actions', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it('hides transcript actions when the current page is not an article', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.stubGlobal('chrome', createChromeMock({
      analysis: createNoArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    expect(document.getElementById('copy-markdown')).toBeNull()
    expect(document.getElementById('open-markdown')).toBeNull()
  })

  it('renders the redesigned popup hierarchy for article pages', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    expect(document.querySelector('.popup-hero')?.textContent).toContain('Read Minutes')
    expect(document.querySelector('.stats-grid')?.textContent).toContain('Reading time')
    expect(document.querySelector('.transcript-dock')).not.toBeNull()
    expect(document.querySelector('.settings-section')?.textContent).toContain('Preferences')
  })

  it('copies transcript markdown for LLM use', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const clipboardWriteText = vi.fn(async () => undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    const copyButton = document.querySelector<HTMLButtonElement>('#copy-markdown')

    copyButton?.click()
    await flushMicrotasks()

    expect(clipboardWriteText).toHaveBeenCalledWith(createTranscriptPayload().exportText)
    expect(document.querySelector('.action-status')?.textContent).toBe('Markdown copied for LLM.')
  })

  it('keeps the primary copy action clickable while the menu is open', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const clipboardWriteText = vi.fn(async () => undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    const initialToggleButton = document.querySelector<HTMLButtonElement>('#toggle-transcript-menu')

    initialToggleButton?.click()
    await flushMicrotasks()

    const copyButton = document.querySelector<HTMLButtonElement>('#copy-markdown')

    copyButton?.click()
    await flushMicrotasks()

    expect(clipboardWriteText).toHaveBeenCalledWith(createTranscriptPayload().exportText)
    expect(document.querySelector('.action-status')?.textContent).toBe('Markdown copied for LLM.')
  })

  it('opens and closes the transcript menu', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    const toggleButton = document.querySelector<HTMLButtonElement>('#toggle-transcript-menu')
    const initialMenuElement = document.querySelector<HTMLDivElement>('#transcript-menu')

    expect(initialMenuElement?.hidden).toBe(true)

    toggleButton?.click()
    await flushMicrotasks()

    const openMenuElement = document.querySelector<HTMLDivElement>('#transcript-menu')

    expect(openMenuElement?.hidden).toBe(false)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushMicrotasks()

    const closedMenuElement = document.querySelector<HTMLDivElement>('#transcript-menu')

    expect(closedMenuElement?.hidden).toBe(true)

    const reopenedToggleButton = document.querySelector<HTMLButtonElement>('#toggle-transcript-menu')

    reopenedToggleButton?.click()
    await flushMicrotasks()
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await flushMicrotasks()

    const escapedMenuElement = document.querySelector<HTMLDivElement>('#transcript-menu')

    expect(escapedMenuElement?.hidden).toBe(true)
  })

  it('opens transcript view from the menu and stores the payload for the new page', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const chromeMock = createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    })

    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    const toggleButton = document.querySelector<HTMLButtonElement>('#toggle-transcript-menu')

    toggleButton?.click()
    await flushMicrotasks()

    const openButton = document.querySelector<HTMLButtonElement>('#open-markdown')

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
    expect(transcriptStorageKey).toBeTruthy()
    expect(chromeMock.storage.session.snapshot()[transcriptStorageKey as string]).toEqual(
      createTranscriptPayload(),
    )
  })
})

describe('transcript view mode', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it('renders and consumes stored transcript payloads', async () => {
    const transcriptStorageKey = 'read-minutes/transcript/view-test'
    const transcriptPayload = createTranscriptPayload()
    const chromeMock = createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    })

    chromeMock.storage.session.seed({
      [transcriptStorageKey]: transcriptPayload,
    })

    document.body.innerHTML = '<div id="root"></div>'
    window.history.replaceState(
      null,
      '',
      `/src/popup/index.html?view=transcript&transcriptKey=${encodeURIComponent(transcriptStorageKey)}`,
    )
    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    const transcriptPreElement = document.querySelector('pre')

    expect(document.body.classList.contains('transcript-body')).toBe(false)
    expect(transcriptPreElement?.className).toBe('')
    expect(transcriptPreElement?.textContent).toBe(transcriptPayload.exportText)
    expect(document.querySelector('.plain-text-page')).toBeNull()
    expect(chromeMock.storage.session.snapshot()).toEqual({})
  })
})

function createChromeMock({
  analysis,
  transcriptResult,
}: {
  analysis: PageAnalysis
  transcriptResult: TranscriptResult
}) {
  const sessionStorageArea = createStorageAreaMock()
  const localStorageArea = createStorageAreaMock()

  return {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test-extension/${path}`),
      onMessage: {
        addListener: vi.fn(),
      },
      sendMessage: vi.fn(async () => undefined),
    },
    storage: {
      local: localStorageArea,
      session: sessionStorageArea,
      sync: {
        get: vi.fn(async () => ({
          wordsPerMinute: 225,
          showInlineBadge: true,
        })),
        set: vi.fn(async () => undefined),
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(async () => [{ id: 1 }]),
      sendMessage: vi.fn(async (_tabId: number, message: { type: string }) => {
        if (message.type === 'read-minutes/get-page-analysis') {
          return analysis
        }

        if (message.type === 'read-minutes/get-page-transcript') {
          return transcriptResult
        }

        return null
      }),
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
    seed(values: Record<string, unknown>) {
      Object.assign(state, values)
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
    pageTitle: 'Example Article',
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
    pageTitle: 'Homepage',
    siteName: 'Example',
    sourceUrl: 'https://example.com',
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
    exportText: '---\ntitle: "Example Article"\nsite: "Example"\nsource: "https://example.com/article"\nword_count: 1020\n---\n\nBody copy',
    favicon: '',
    hostname: 'example.com',
    image: '',
    language: 'en',
    markdown: 'Body copy',
    pageTitle: 'Example Article',
    published: '',
    siteName: 'Example',
    sourceUrl: 'https://example.com/article',
    title: 'Example Article',
    wordCount: 1_020,
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
