import { isOpenTranscriptViewMessage } from '@/shared/messages'
import { createTranscriptPageUrl } from '@/shared/transcript-view'

initializeBackground()

function initializeBackground(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (!isOpenTranscriptViewMessage(message)) {
      return
    }

    const transcriptPageUrl = createTranscriptPageUrl(message.transcriptStorageKey)

    void chrome.tabs.create({
      url: transcriptPageUrl,
    })
  })
}
