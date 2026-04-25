import Defuddle from 'defuddle'
import { extractReadableContent } from './defuddle-extraction'
import { createExtractionDocumentSnapshot, createPageMetadata } from './page-context'
import { calculateReadingMinutes, formatReadingTime, normalizeWhitespace } from './reading-time'
import type { ArticleAnalysis, ExtensionSettings, NoArticleAnalysis, PageAnalysis } from './types'

export function analyzeDocument(document: Document, settings: ExtensionSettings): PageAnalysis {
  const baseMetadata = createPageMetadata(document)

  const analysisDocument = createExtractionDocumentSnapshot(document)
  const extractionOutcome = extractReadableContent(
    Defuddle,
    analysisDocument,
    baseMetadata.sourceUrl,
    getTextFromHtml,
  )

  if (extractionOutcome.status !== 'ready') {
    return createNoArticleAnalysis(baseMetadata, extractionOutcome.status)
  }

  const { result, wordCount } = extractionOutcome.extraction
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
