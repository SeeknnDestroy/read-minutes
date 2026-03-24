import {
  dismissBadgeForAnalysis,
  shouldRenderBadge,
  updateDismissedSourceUrlForLocationChange,
} from '@/content/badge-visibility'
import type { PageAnalysis } from '@/shared/types'

describe('badge visibility state', () => {
  it('keeps the badge hidden on the same page after dismissal', () => {
    const analysis = createArticleAnalysis('https://example.com/post')
    const dismissedSourceUrl = dismissBadgeForAnalysis(analysis)
    const shouldDisplayBadge = shouldRenderBadge(analysis, true, dismissedSourceUrl)

    expect(shouldDisplayBadge).toBe(false)
  })

  it('shows the badge again after the location changes', () => {
    const dismissedSourceUrl = 'https://example.com/post'
    const nextDismissedSourceUrl = updateDismissedSourceUrlForLocationChange(
      dismissedSourceUrl,
      'https://example.com/post',
      'https://example.com/next-post',
    )
    const nextAnalysis = createArticleAnalysis('https://example.com/next-post')
    const shouldDisplayBadge = shouldRenderBadge(nextAnalysis, true, nextDismissedSourceUrl)

    expect(nextDismissedSourceUrl).toBeNull()
    expect(shouldDisplayBadge).toBe(true)
  })
})

function createArticleAnalysis(sourceUrl: string): PageAnalysis {
  return {
    status: 'article',
    hostname: 'example.com',
    pageTitle: 'Post title',
    siteName: 'Example',
    sourceUrl,
    wordCount: 1_000,
    minutes: 5,
    readingTimeLabel: '5 min read',
  }
}
