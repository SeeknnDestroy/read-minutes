import type { ArticleAnalysis, PageAnalysis } from '@/shared/types'

export function dismissBadgeForAnalysis(analysis: PageAnalysis): string | null {
  const isArticleAnalysis = analysis.status === 'article'

  if (!isArticleAnalysis) {
    return null
  }

  return analysis.sourceUrl
}

export function shouldRenderBadge(
  analysis: PageAnalysis,
  showInlineBadge: boolean,
  dismissedSourceUrl: string | null,
): analysis is ArticleAnalysis {
  const isInlineBadgeEnabled = showInlineBadge === true
  const isArticleAnalysis = analysis.status === 'article'

  if (!isInlineBadgeEnabled || !isArticleAnalysis) {
    return false
  }

  const isDismissedForCurrentPage = analysis.sourceUrl === dismissedSourceUrl

  return !isDismissedForCurrentPage
}

export function updateDismissedSourceUrlForLocationChange(
  dismissedSourceUrl: string | null,
  previousLocationUrl: string,
  nextLocationUrl: string,
): string | null {
  const hasLocationChanged = previousLocationUrl !== nextLocationUrl

  if (hasLocationChanged) {
    return null
  }

  return dismissedSourceUrl
}

