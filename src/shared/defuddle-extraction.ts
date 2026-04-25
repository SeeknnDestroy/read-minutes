import type { DefuddleOptions, DefuddleResponse } from 'defuddle'
import { MINIMUM_ARTICLE_WORDS } from './constants'
import { countWords } from './reading-time'

interface DefuddleParser {
  parse(): DefuddleResponse
}

export type DefuddleConstructor = new (
  document: Document,
  options?: DefuddleOptions,
) => DefuddleParser

export interface ReadableContentExtraction {
  result: DefuddleResponse
  wordCount: number
}

export type ReadableContentExtractionOutcome =
  | {
      status: 'ready'
      extraction: ReadableContentExtraction
    }
  | {
      status: 'below-threshold' | 'parse-failed'
    }

interface ExtractionAttempt {
  contentSelector?: string
}

const STRUCTURED_CONTENT_SELECTORS = [
  '[itemprop="articleBody"]',
  '.entry-content',
  '.post-content',
  '.h-entry',
  '.system-card-richtext',
]

const DOCUMENT_CONTENT_SELECTORS = ['main', '[role="main"]']

export function extractReadableContent(
  Defuddle: DefuddleConstructor,
  document: Document,
  sourceUrl: string,
  getContentText: (content: string) => string,
  baseOptions: DefuddleOptions = {},
): ReadableContentExtractionOutcome {
  const attempts = createExtractionAttempts(document)
  let parsedAnyAttempt = false

  for (const attempt of attempts) {
    try {
      const attemptDocument = document.cloneNode(true) as Document
      const result = parseDefuddleAttempt(Defuddle, attemptDocument, sourceUrl, attempt, baseOptions)
      const wordCount = getWordCount(result, getContentText)
      parsedAnyAttempt = true

      if (wordCount >= MINIMUM_ARTICLE_WORDS) {
        return {
          status: 'ready',
          extraction: {
            result,
            wordCount,
          },
        }
      }
    } catch {
      continue
    }
  }

  if (parsedAnyAttempt) {
    return {
      status: 'below-threshold',
    }
  }

  return {
    status: 'parse-failed',
  }
}

function parseDefuddleAttempt(
  Defuddle: DefuddleConstructor,
  document: Document,
  sourceUrl: string,
  attempt: ExtractionAttempt,
  baseOptions: DefuddleOptions,
): DefuddleResponse {
  const options: DefuddleOptions = {
    ...baseOptions,
    url: sourceUrl,
    useAsync: false,
  }

  if (attempt.contentSelector) {
    options.contentSelector = attempt.contentSelector
  }

  const parser = new Defuddle(document, options)

  return parser.parse()
}

function createExtractionAttempts(document: Document): ExtractionAttempt[] {
  const attempts: ExtractionAttempt[] = [{}]
  const fallbackSelectors = getFallbackContentSelectors(document)

  fallbackSelectors.forEach((contentSelector) => {
    attempts.push({ contentSelector })
  })

  return attempts
}

function getFallbackContentSelectors(document: Document): string[] {
  const selectors = STRUCTURED_CONTENT_SELECTORS.filter((selector) =>
    Boolean(document.querySelector(selector)),
  )
  const hasStructuredLongformContent = selectors.length > 0

  if (hasStructuredLongformContent) {
    DOCUMENT_CONTENT_SELECTORS.forEach((selector) => {
      if (document.querySelector(selector)) {
        selectors.push(selector)
      }
    })
  }

  if (hasArticleMetadata(document)) {
    selectors.push('body')
  }

  return [...new Set(selectors)]
}

function hasArticleMetadata(document: Document): boolean {
  const openGraphType = getMetaContent(document, 'meta[property="og:type"]')
  const hasArticleOpenGraphType = /\barticle\b/iu.test(openGraphType)
  const hasArticlePublishedTime = Boolean(
    getMetaContent(document, 'meta[property="article:published_time"]'),
  )
  const hasArticleSchema = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .some((scriptElement) => /\b(?:Article|BlogPosting|NewsArticle|TechArticle)\b/u.test(scriptElement.textContent ?? ''))

  return hasArticleOpenGraphType || hasArticlePublishedTime || hasArticleSchema
}

function getMetaContent(document: Document, selector: string): string {
  return document.querySelector<HTMLMetaElement>(selector)?.content ?? ''
}

function getWordCount(
  result: DefuddleResponse,
  getContentText: (content: string) => string,
): number {
  const extractedWordCount = Math.round(result.wordCount)
  const hasWordCount = Number.isFinite(extractedWordCount) && extractedWordCount > 0

  if (hasWordCount) {
    return extractedWordCount
  }

  const extractedText = getContentText(result.content)

  return countWords(extractedText)
}
