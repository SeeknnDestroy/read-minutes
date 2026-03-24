import Defuddle from 'defuddle'
import type { DefuddleResponse } from 'defuddle'
import { BADGE_HOST_ID } from './constants'
import { MINIMUM_ARTICLE_WORDS } from './constants'
import { calculateReadingMinutes, countWords, formatReadingTime, normalizeWhitespace } from './reading-time'
import type { ArticleAnalysis, ExtensionSettings, NoArticleAnalysis, PageAnalysis } from './types'

export function analyzeDocument(document: Document, settings: ExtensionSettings): PageAnalysis {
  const baseMetadata = createBaseMetadata(document)

  try {
    const analysisDocument = createAnalysisDocumentSnapshot(document)
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

function createAnalysisDocumentSnapshot(document: Document): Document {
  const html = document.documentElement.outerHTML
  const parser = new DOMParser()
  const snapshot = parser.parseFromString(`<!doctype html>${html}`, 'text/html')
  const badgeHost = snapshot.getElementById(BADGE_HOST_ID)

  badgeHost?.remove()

  return snapshot
}

function createBaseMetadata(document: Document) {
  const sourceUrl = document.location?.href ?? ''
  const hostname = getHostname(sourceUrl)
  const pageTitle = normalizeText(document.title) || hostname || 'This page'
  const siteName = hostname || 'This page'

  return {
    hostname,
    pageTitle,
    siteName,
    sourceUrl,
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

function getHostname(sourceUrl: string): string {
  try {
    const parsedUrl = new URL(sourceUrl)
    const normalizedHostname = parsedUrl.hostname.replace(/^www\./u, '')

    return normalizedHostname
  } catch {
    return ''
  }
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
