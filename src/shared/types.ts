import { DEFAULT_WORDS_PER_MINUTE } from './constants'

export interface ExtensionSettings {
  wordsPerMinute: number
  showInlineBadge: boolean
}

export interface AnalysisMetadata {
  hostname: string
  pageTitle: string
  siteName: string
  sourceUrl: string
}

export interface ArticleAnalysis extends AnalysisMetadata {
  status: 'article'
  minutes: number
  readingTimeLabel: string
  wordCount: number
}

export interface NoArticleAnalysis extends AnalysisMetadata {
  status: 'no-article'
  reason: 'below-threshold' | 'parse-failed'
}

export type PageAnalysis = ArticleAnalysis | NoArticleAnalysis

export interface GetPageAnalysisMessage {
  type: typeof import('./constants').GET_PAGE_ANALYSIS_MESSAGE_TYPE
}

export const defaultSettings: ExtensionSettings = {
  wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
  showInlineBadge: true,
}

