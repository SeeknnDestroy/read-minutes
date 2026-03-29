import { createTranscriptPageUrl, openTranscriptView } from '@/shared/transcript-view'

describe('transcript view helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates transcript page URLs with the expected query params', () => {
    const transcriptPageUrl = createTranscriptPageUrl(
      'read-minutes/transcript/example',
      (path) => `chrome-extension://test-extension/${path}`,
    )
    const parsedUrl = new URL(transcriptPageUrl)

    expect(parsedUrl.pathname).toBe('/src/popup/index.html')
    expect(parsedUrl.searchParams.get('view')).toBe('transcript')
    expect(parsedUrl.searchParams.get('transcriptKey')).toBe('read-minutes/transcript/example')
  })

  it('opens the transcript page in a new window', async () => {
    const openWindow = vi.fn()

    vi.stubGlobal('chrome', {
      runtime: {
        getURL: (path: string) => `chrome-extension://test-extension/${path}`,
      },
    })

    await openTranscriptView(
      'read-minutes/transcript/example',
      openWindow as typeof window.open,
    )

    expect(openWindow).toHaveBeenCalledWith(
      'chrome-extension://test-extension/src/popup/index.html?view=transcript&transcriptKey=read-minutes%2Ftranscript%2Fexample',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
