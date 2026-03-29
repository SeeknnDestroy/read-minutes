import { calculateReadingMinutes, formatReadingTime } from '@/shared/reading-time'
import type { ExtensionSettings, PageAnalysis, TranscriptPayload } from '@/shared/types'

export interface PopupTranscriptActionState {
  busyAction: 'copy' | 'open' | null
  message: string | null
}

export interface PopupViewModel {
  copyButtonLabel: string
  emptyMessage: string | null
  hostname: string
  isTranscriptActionBusy: boolean
  openButtonLabel: string
  pageTitle: string
  readingTimeValue: string | null
  showTranscriptActions: boolean
  statusLabel: string
  transcriptActionMessage: string | null
  wordCountValue: string | null
}

export interface TranscriptViewModel {
  emptyMessage: string | null
  exportText: string | null
  pageTitle: string
  sourceUrl: string
}

const defaultTranscriptActionState: PopupTranscriptActionState = {
  busyAction: null,
  message: null,
}

export function createPopupViewModel(
  analysis: PageAnalysis | null,
  settings: ExtensionSettings,
  transcriptActionState: PopupTranscriptActionState = defaultTranscriptActionState,
): PopupViewModel {
  if (!analysis) {
    return {
      copyButtonLabel: 'Copy for LLM',
      emptyMessage: 'No article-like content found on this page.',
      hostname: '',
      isTranscriptActionBusy: false,
      openButtonLabel: 'Open Markdown',
      pageTitle: 'Current page',
      readingTimeValue: null,
      showTranscriptActions: false,
      statusLabel: 'No article detected',
      transcriptActionMessage: transcriptActionState.message,
      wordCountValue: null,
    }
  }

  if (analysis.status === 'no-article') {
    return {
      copyButtonLabel: 'Copy for LLM',
      emptyMessage: 'No article-like content found on this page.',
      hostname: analysis.hostname,
      isTranscriptActionBusy: false,
      openButtonLabel: 'Open Markdown',
      pageTitle: analysis.pageTitle,
      readingTimeValue: null,
      showTranscriptActions: false,
      statusLabel: 'No article detected',
      transcriptActionMessage: transcriptActionState.message,
      wordCountValue: null,
    }
  }

  const minutes = calculateReadingMinutes(analysis.wordCount, settings.wordsPerMinute)
  const isCopyActionBusy = transcriptActionState.busyAction === 'copy'
  const isOpenActionBusy = transcriptActionState.busyAction === 'open'

  return {
    copyButtonLabel: isCopyActionBusy ? 'Copying...' : 'Copy for LLM',
    emptyMessage: null,
    hostname: analysis.siteName,
    isTranscriptActionBusy: transcriptActionState.busyAction !== null,
    openButtonLabel: isOpenActionBusy ? 'Opening...' : 'Open Markdown',
    pageTitle: analysis.pageTitle,
    readingTimeValue: formatReadingTime(minutes),
    showTranscriptActions: true,
    statusLabel: 'Article detected',
    transcriptActionMessage: transcriptActionState.message,
    wordCountValue: `${analysis.wordCount.toLocaleString()} words`,
  }
}

export function createTranscriptViewModel(payload: TranscriptPayload | null): TranscriptViewModel {
  if (!payload) {
    return {
      emptyMessage: 'Markdown transcript was unavailable or has already been opened.',
      exportText: null,
      pageTitle: 'Markdown transcript',
      sourceUrl: '',
    }
  }

  return {
    emptyMessage: null,
    exportText: payload.exportText,
    pageTitle: payload.title,
    sourceUrl: payload.sourceUrl,
  }
}
