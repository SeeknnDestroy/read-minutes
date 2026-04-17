import { createPopupViewModel } from '@/popup/view-model'
import { defaultSettings, type PageAnalysis } from '@/shared/types'

describe('createPopupViewModel', () => {
  it('shows article metrics for detected article pages', () => {
    const analysis: PageAnalysis = {
      status: 'article',
      hostname: 'example.com',
      pageTitle: 'Designing Better Reading Sessions',
      siteName: 'Example',
      sourceUrl: 'https://example.com/designing-better-reading-sessions',
      wordCount: 1_020,
      minutes: 5,
      readingTimeLabel: '5 min read',
    }

    const viewModel = createPopupViewModel(analysis, defaultSettings)

    expect(viewModel.statusLabel).toBe('Article detected')
    expect(viewModel.readingTimeValue).toBe('5 min read')
    expect(viewModel.wordCountValue).toBe('1,020 words')
    expect(viewModel.copyButtonLabel).toBe('Copy page')
    expect(viewModel.openButtonLabel).toBe('View as Markdown')
    expect(viewModel.emptyMessage).toBeNull()
  })

  it('shows a reason-aware empty state when the page is below the article threshold', () => {
    const analysis: PageAnalysis = {
      status: 'no-article',
      hostname: 'example.com',
      pageTitle: 'Homepage',
      siteName: 'Example',
      sourceUrl: 'https://example.com',
      reason: 'below-threshold',
    }

    const viewModel = createPopupViewModel(analysis, defaultSettings)

    expect(viewModel.statusLabel).toBe('No article detected')
    expect(viewModel.readingTimeValue).toBeNull()
    expect(viewModel.wordCountValue).toBeNull()
    expect(viewModel.emptyMessage).toBe('This page looks too short to treat as an article.')
  })

  it('shows an extraction failure message when parsing fails', () => {
    const analysis: PageAnalysis = {
      status: 'no-article',
      hostname: 'example.com',
      pageTitle: 'Blocked Article',
      siteName: 'Example',
      sourceUrl: 'https://example.com/blocked',
      reason: 'parse-failed',
    }

    const viewModel = createPopupViewModel(analysis, defaultSettings)

    expect(viewModel.statusLabel).toBe('No article detected')
    expect(viewModel.emptyMessage).toBe(
      'Read Minutes could not extract article content from this page.',
    )
  })

  it('shows busy labels for transcript actions', () => {
    const analysis: PageAnalysis = {
      status: 'article',
      hostname: 'example.com',
      pageTitle: 'Designing Better Reading Sessions',
      siteName: 'Example',
      sourceUrl: 'https://example.com/designing-better-reading-sessions',
      wordCount: 1_020,
      minutes: 5,
      readingTimeLabel: '5 min read',
    }

    const viewModel = createPopupViewModel(analysis, defaultSettings, {
      busyAction: 'open',
      message: null,
    })

    expect(viewModel.isTranscriptActionBusy).toBe(true)
    expect(viewModel.copyButtonLabel).toBe('Copy page')
    expect(viewModel.openButtonLabel).toBe('Opening...')
  })
})
