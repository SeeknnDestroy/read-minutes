import type { NoArticleAnalysis } from './types'

export function getNoArticleMessage(reason: NoArticleAnalysis['reason']): string {
  if (reason === 'below-threshold') {
    return 'This page looks too short to treat as an article.'
  }

  return 'Read Minutes could not extract article content from this page.'
}

export function getTranscriptUnavailableMessage(
  reason: NoArticleAnalysis['reason'],
): string {
  if (reason === 'below-threshold') {
    return 'Markdown is unavailable because this page looks too short to treat as an article.'
  }

  return 'Markdown is unavailable because Read Minutes could not extract article content from this page.'
}
