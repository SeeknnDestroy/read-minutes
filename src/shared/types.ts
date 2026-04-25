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

export interface GetPageTranscriptMessage {
  type: typeof import('./constants').GET_PAGE_TRANSCRIPT_MESSAGE_TYPE
}

export interface TranscriptPayload extends AnalysisMetadata {
  author: string
  description: string
  domain: string
  exportText: string
  favicon: string
  image: string
  language: string
  markdown: string
  published: string
  title: string
  wordCount: number
}

export interface TranscriptReadyResult {
  status: 'ready'
  payload: TranscriptPayload
}

export interface TranscriptUnavailableResult {
  status: 'unavailable'
  reason: NoArticleAnalysis['reason']
}

export type TranscriptResult = TranscriptReadyResult | TranscriptUnavailableResult

export const defaultSettings: ExtensionSettings = {
  wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
  showInlineBadge: false,
}
