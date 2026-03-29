export function createTranscriptPageUrl(
  transcriptStorageKey: string,
  getRuntimeUrl: (path: string) => string = chrome.runtime.getURL,
): string {
  const transcriptPageUrl = new URL(getRuntimeUrl('src/popup/index.html'))

  transcriptPageUrl.searchParams.set('view', 'transcript')
  transcriptPageUrl.searchParams.set('transcriptKey', transcriptStorageKey)

  return transcriptPageUrl.toString()
}

export async function openTranscriptView(
  transcriptStorageKey: string,
  openWindow: typeof window.open = window.open.bind(window),
  getRuntimeUrl: (path: string) => string = chrome.runtime.getURL,
): Promise<void> {
  const transcriptPageUrl = createTranscriptPageUrl(transcriptStorageKey, getRuntimeUrl)

  openWindow(transcriptPageUrl, '_blank', 'noopener,noreferrer')
}
