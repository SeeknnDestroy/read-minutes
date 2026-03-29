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

  it('sends an open-transcript runtime message', async () => {
    const sendMessage = vi.fn(async () => undefined)

    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage,
      },
    })

    await openTranscriptView('read-minutes/transcript/example')

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'read-minutes/open-transcript-view',
      transcriptStorageKey: 'read-minutes/transcript/example',
    })
  })
})
