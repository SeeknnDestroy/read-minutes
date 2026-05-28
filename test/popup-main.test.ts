import { TRANSCRIPT_ACTION_MINIMUM_BUSY_MS } from '@/shared/constants'
import type { PageAnalysis, TranscriptPayload, TranscriptResult } from '@/shared/types'

describe('popup transcript actions', () => {
  afterEach(() => {
    vi.useRealTimers()
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
    expect(document.getElementById('save-markdown')).toBeNull()
  })

  it('renders the redesigned popup hierarchy for article pages', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    expect(document.querySelector('.popup-header')?.textContent).toContain('Read Minutes')
    expect(document.querySelector('.stats-grid')?.textContent).toContain('Reading time')
    expect(document.querySelector('.transcript-toolbar')).not.toBeNull()
    expect(document.querySelector('#copy-markdown')).not.toBeNull()
    expect(document.querySelector('#open-markdown')).not.toBeNull()
    expect(document.querySelector('#save-markdown')).not.toBeNull()
    expect(document.querySelector('#toggle-transcript-menu')).toBeNull()
    expect(document.querySelector('.settings-section')?.textContent).toContain('Preferences')
  })

  it('copies transcript markdown for LLM use', async () => {
    vi.useFakeTimers()
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
    expect(document.querySelector<HTMLButtonElement>('#copy-markdown')?.disabled).toBe(true)
    expect(document.querySelector('#copy-markdown')?.textContent).toContain('Copying...')
    expect(document.querySelector('.action-status')).toBeNull()

    await vi.advanceTimersByTimeAsync(TRANSCRIPT_ACTION_MINIMUM_BUSY_MS)
    await flushMicrotasks()

    expect(document.querySelector<HTMLButtonElement>('#copy-markdown')?.disabled).toBe(false)
    expect(document.querySelector('.action-status')?.textContent).toBe('Markdown copied for LLM.')
  })

  it('shows a reason-aware message when markdown is unavailable because the page is too short', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: {
        status: 'unavailable',
        reason: 'below-threshold',
      },
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    const copyButton = document.querySelector<HTMLButtonElement>('#copy-markdown')

    copyButton?.click()
    await flushMicrotasks()

    expect(document.querySelector('.action-status')?.textContent).toBe(
      'Markdown is unavailable because this page looks too short to treat as an article.',
    )
  })

  it('shows a reason-aware message when markdown extraction fails', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    vi.stubGlobal('chrome', createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: {
        status: 'unavailable',
        reason: 'parse-failed',
      },
    }))

    await import('@/popup/main')
    await flushMicrotasks()

    const openButton = document.querySelector<HTMLButtonElement>('#open-markdown')

    openButton?.click()
    await flushMicrotasks()

    expect(document.querySelector('.action-status')?.textContent).toBe(
      'Markdown is unavailable because Read Minutes could not extract article content from this page.',
    )
  })

  it('opens transcript view from the side-by-side action row and stores the payload for the new page', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const chromeMock = createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    })

    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    const openButton = document.querySelector<HTMLButtonElement>('#open-markdown')

    openButton?.click()
    await flushMicrotasks()

    const createTabMock = chromeMock.tabs.create as ReturnType<typeof vi.fn>
    const createdTab = createTabMock.mock.calls[0]?.[0] as { url: string } | undefined

    expect(createdTab).toBeDefined()

    if (!createdTab) {
      throw new Error('Expected a transcript tab to be created.')
    }

    const createdUrl = new URL(createdTab.url)
    const transcriptStorageKey = createdUrl.searchParams.get('transcriptKey')

    expect(createdUrl.searchParams.get('view')).toBe('transcript')
    expect(transcriptStorageKey).toBeTruthy()
    expect(chromeMock.storage.session.snapshot()[transcriptStorageKey as string]).toEqual(
      createTranscriptPayload(),
    )
  })

  it('saves transcript markdown as a local file without popup-scoped blob URLs', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const createObjectUrlMock = vi.fn(() => {
      throw new Error('Save should not create popup-scoped blob URLs.')
    })
    const revokeObjectUrlMock = vi.fn()
    const chromeMock = createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: createTranscriptReadyResult(),
    })

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlMock,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlMock,
    })
    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    const saveButton = document.querySelector<HTMLButtonElement>('#save-markdown')

    saveButton?.click()
    await flushMicrotasks()

    expect(createObjectUrlMock).not.toHaveBeenCalled()
    expect(chromeMock.downloads.download).toHaveBeenCalledWith({
      conflictAction: 'uniquify',
      filename: 'example-article.md',
      url: `data:text/markdown;charset=utf-8,${encodeURIComponent(createTranscriptPayload().exportText)}`,
    })
    expect(revokeObjectUrlMock).not.toHaveBeenCalled()
    expect(document.querySelector('.action-status')?.textContent).toBe('Saved markdown.')
  })

  it('saves repeated article exports with independent filenames and stable download URLs', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const chromeMock = createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: [
        createTranscriptReadyResult(createTranscriptPayload({
          exportText: '# First article\n\nFirst body.',
          title: 'First Article',
        })),
        createTranscriptReadyResult(createTranscriptPayload({
          exportText: '# Second article\n\nSecond body.',
          title: 'Second Article',
        })),
      ],
    })

    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    document.querySelector<HTMLButtonElement>('#save-markdown')?.click()
    await flushMicrotasks()
    document.querySelector<HTMLButtonElement>('#save-markdown')?.click()
    await flushMicrotasks()

    expect(chromeMock.downloads.download).toHaveBeenNthCalledWith(1, {
      conflictAction: 'uniquify',
      filename: 'first-article.md',
      url: `data:text/markdown;charset=utf-8,${encodeURIComponent('# First article\n\nFirst body.')}`,
    })
    expect(chromeMock.downloads.download).toHaveBeenNthCalledWith(2, {
      conflictAction: 'uniquify',
      filename: 'second-article.md',
      url: `data:text/markdown;charset=utf-8,${encodeURIComponent('# Second article\n\nSecond body.')}`,
    })
  })

  it('does not open the native save-as dialog for repeated same-site saves', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    const chromeMock = createChromeMock({
      analysis: createArticleAnalysis(),
      transcriptResult: [
        createTranscriptReadyResult(),
        createTranscriptReadyResult(),
        createTranscriptReadyResult(),
      ],
    })

    vi.stubGlobal('chrome', chromeMock)

    await import('@/popup/main')
    await flushMicrotasks()

    document.querySelector<HTMLButtonElement>('#save-markdown')?.click()
    await flushMicrotasks()
    document.querySelector<HTMLButtonElement>('#save-markdown')?.click()
    await flushMicrotasks()
    document.querySelector<HTMLButtonElement>('#save-markdown')?.click()
    await flushMicrotasks()

    expect(chromeMock.downloads.download).toHaveBeenCalledTimes(3)

    for (const [downloadOptions] of chromeMock.downloads.download.mock.calls) {
      expect(downloadOptions).toMatchObject({
        conflictAction: 'uniquify',
        filename: 'example-article.md',
      })
      expect(downloadOptions).not.toHaveProperty('saveAs')
    }
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
  transcriptResult: TranscriptResult | TranscriptResult[]
}) {
  const sessionStorageArea = createStorageAreaMock()
  const localStorageArea = createStorageAreaMock()
  const transcriptResults = Array.isArray(transcriptResult)
    ? [...transcriptResult]
    : [transcriptResult]
  const fallbackTranscriptResult = transcriptResults.at(-1) ?? transcriptResult

  return {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test-extension/${path}`),
      onMessage: {
        addListener: vi.fn(),
      },
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
    downloads: {
      download: vi.fn(async (_options: chrome.downloads.DownloadOptions) => 1),
    },
    tabs: {
      create: vi.fn(async () => undefined),
      query: vi.fn(async () => [{ id: 1 }]),
      sendMessage: vi.fn(async (_tabId: number, message: { type: string }) => {
        if (message.type === 'read-minutes/get-page-analysis') {
          return analysis
        }

        if (message.type === 'read-minutes/get-page-transcript') {
          return transcriptResults.shift() ?? fallbackTranscriptResult
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

function createTranscriptReadyResult(payload: TranscriptPayload = createTranscriptPayload()): TranscriptResult {
  return {
    status: 'ready',
    payload,
  }
}

function createTranscriptPayload(overrides: Partial<TranscriptPayload> = {}): TranscriptPayload {
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
    ...overrides,
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
