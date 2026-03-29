import { createOpenTranscriptViewMessage } from './messages'

export function createTranscriptPageUrl(
  transcriptStorageKey: string,
  getRuntimeUrl: (path: string) => string = chrome.runtime.getURL,
): string {
  const transcriptPageUrl = new URL(getRuntimeUrl('src/popup/index.html'))

  transcriptPageUrl.searchParams.set('view', 'transcript')
  transcriptPageUrl.searchParams.set('transcriptKey', transcriptStorageKey)

  return transcriptPageUrl.toString()
}

export async function openTranscriptView(transcriptStorageKey: string): Promise<void> {
  await chrome.runtime.sendMessage(createOpenTranscriptViewMessage(transcriptStorageKey))
}
