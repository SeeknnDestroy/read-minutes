import Defuddle from 'defuddle'
import type { DefuddleResponse } from 'defuddle'
import { MINIMUM_ARTICLE_WORDS } from './constants'
import { createExtractionDocumentSnapshot, createPageMetadata } from './page-context'
import { calculateReadingMinutes, countWords, formatReadingTime, normalizeWhitespace } from './reading-time'
import type { ArticleAnalysis, ExtensionSettings, NoArticleAnalysis, PageAnalysis } from './types'

export function analyzeDocument(document: Document, settings: ExtensionSettings): PageAnalysis {
  const baseMetadata = createPageMetadata(document)

  try {
    const analysisDocument = createExtractionDocumentSnapshot(document)
    const parser = new Defuddle(analysisDocument, {
      url: baseMetadata.sourceUrl,
      useAsync: false,
    })
    const result = parser.parse()
    const wordCount = getWordCount(result)
    const hasEnoughWords = wordCount >= MINIMUM_ARTICLE_WORDS

    if (!hasEnoughWords) {
      return createNoArticleAnalysis(baseMetadata, 'below-threshold')
    }

    const minutes = calculateReadingMinutes(wordCount, settings.wordsPerMinute)
    const pageTitle = pickPreferredText(result.title, baseMetadata.pageTitle)
    const siteName = pickPreferredText(result.site, baseMetadata.siteName)

    return {
      ...baseMetadata,
      pageTitle,
      siteName,
      status: 'article',
      minutes,
      readingTimeLabel: formatReadingTime(minutes),
      wordCount,
    }
  } catch {
    return createNoArticleAnalysis(baseMetadata, 'parse-failed')
  }
}

function getWordCount(result: DefuddleResponse): number {
  const extractedWordCount = Math.round(result.wordCount)
  const hasWordCount = Number.isFinite(extractedWordCount) && extractedWordCount > 0

  if (hasWordCount) {
    return extractedWordCount
  }

  const extractedText = getTextFromHtml(result.content)

  return countWords(extractedText)
}

function getTextFromHtml(html: string): string {
  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(html, 'text/html')
  const parsedText = parsedDocument.body.textContent ?? ''

  return normalizeWhitespace(parsedText)
}

function pickPreferredText(candidateValue: string, fallbackValue: string): string {
  const normalizedCandidate = normalizeText(candidateValue)

  if (normalizedCandidate) {
    return normalizedCandidate
  }

  return fallbackValue
}

function normalizeText(value: string | null | undefined): string {
  const safeValue = value ?? ''

  return normalizeWhitespace(safeValue)
}

function createNoArticleAnalysis(
  metadata: Omit<ArticleAnalysis, 'status' | 'minutes' | 'readingTimeLabel' | 'wordCount'>,
  reason: NoArticleAnalysis['reason'],
): NoArticleAnalysis {
  return {
    ...metadata,
    status: 'no-article',
    reason,
  }
}
