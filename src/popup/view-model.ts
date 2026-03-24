import { calculateReadingMinutes, formatReadingTime } from '@/shared/reading-time'
import type { ExtensionSettings, PageAnalysis } from '@/shared/types'

export interface PopupViewModel {
  emptyMessage: string | null
  hostname: string
  pageTitle: string
  readingTimeValue: string | null
  statusLabel: string
  wordCountValue: string | null
}

export function createPopupViewModel(
  analysis: PageAnalysis | null,
  settings: ExtensionSettings,
): PopupViewModel {
  if (!analysis) {
    return {
      emptyMessage: 'No article-like content found on this page.',
      hostname: '',
      pageTitle: 'Current page',
      readingTimeValue: null,
      statusLabel: 'No article detected',
      wordCountValue: null,
    }
  }

  if (analysis.status === 'no-article') {
    return {
      emptyMessage: 'No article-like content found on this page.',
      hostname: analysis.hostname,
      pageTitle: analysis.pageTitle,
      readingTimeValue: null,
      statusLabel: 'No article detected',
      wordCountValue: null,
    }
  }

  const minutes = calculateReadingMinutes(analysis.wordCount, settings.wordsPerMinute)

  return {
    emptyMessage: null,
    hostname: analysis.siteName,
    pageTitle: analysis.pageTitle,
    readingTimeValue: formatReadingTime(minutes),
    statusLabel: 'Article detected',
    wordCountValue: `${analysis.wordCount.toLocaleString()} words`,
  }
}

