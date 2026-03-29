import { createOpenTranscriptViewMessage } from '@/shared/messages'
import { createTranscriptPageUrl } from '@/shared/transcript-view'

describe('background transcript view handling', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('opens a transcript tab for open-transcript messages', async () => {
    const chromeMock = createChromeMock()

    vi.stubGlobal('chrome', chromeMock)

    await import('@/background/main')

    const addListener = chromeMock.runtime.onMessage.addListener as ReturnType<typeof vi.fn>
    const messageHandler = addListener.mock.calls[0]?.[0]

    await messageHandler?.(createOpenTranscriptViewMessage('read-minutes/transcript/test'))

    expect(chromeMock.tabs.create).toHaveBeenCalledWith({
      url: createTranscriptPageUrl(
        'read-minutes/transcript/test',
        chromeMock.runtime.getURL,
      ),
    })
  })

  it('ignores unrelated runtime messages', async () => {
    const chromeMock = createChromeMock()

    vi.stubGlobal('chrome', chromeMock)

    await import('@/background/main')

    const addListener = chromeMock.runtime.onMessage.addListener as ReturnType<typeof vi.fn>
    const messageHandler = addListener.mock.calls[0]?.[0]

    await messageHandler?.({ type: 'read-minutes/other-message' })

    expect(chromeMock.tabs.create).not.toHaveBeenCalled()
  })
})

function createChromeMock() {
  return {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test-extension/${path}`),
      onMessage: {
        addListener: vi.fn(),
      },
      sendMessage: vi.fn(async () => undefined),
    },
    tabs: {
      create: vi.fn(async () => undefined),
    },
  }
}
