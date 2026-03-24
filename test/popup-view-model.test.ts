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
    expect(viewModel.emptyMessage).toBeNull()
  })

  it('shows a clean empty state when no article is available', () => {
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
    expect(viewModel.emptyMessage).toBe('No article-like content found on this page.')
  })
})
