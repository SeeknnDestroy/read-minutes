import type { DefuddleResponse } from 'defuddle'
import { MINIMUM_ARTICLE_WORDS } from './constants'
import { createExtractionDocumentSnapshot, createPageMetadata } from './page-context'
import { countWords, normalizeWhitespace } from './reading-time'
import type { TranscriptPayload, TranscriptResult } from './types'

export async function createTranscriptResult(document: Document): Promise<TranscriptResult> {
  const pageMetadata = createPageMetadata(document)

  try {
    const snapshotDocument = createExtractionDocumentSnapshot(document)
    const defuddleModule = await import('defuddle/full')
    const Defuddle = defuddleModule.default
    const parser = new Defuddle(snapshotDocument, {
      markdown: true,
      url: pageMetadata.sourceUrl,
      useAsync: false,
    })
    const result = parser.parse()
    const wordCount = getWordCount(result)
    const hasEnoughWords = wordCount >= MINIMUM_ARTICLE_WORDS

    if (!hasEnoughWords) {
      return {
        status: 'unavailable',
        reason: 'below-threshold',
      }
    }

    const markdown = normalizeMarkdown(result.content)
    const hasMarkdown = markdown.length > 0

    if (!hasMarkdown) {
      return {
        status: 'unavailable',
        reason: 'parse-failed',
      }
    }

    const title = pickPreferredText(result.title, pageMetadata.pageTitle)
    const siteName = pickPreferredText(result.site, pageMetadata.siteName)
    const domain = pickPreferredText(result.domain, pageMetadata.hostname)
    const payload: TranscriptPayload = {
      ...pageMetadata,
      author: normalizeMetadataValue(result.author),
      description: normalizeMetadataValue(result.description),
      domain,
      exportText: '',
      favicon: normalizeMetadataValue(result.favicon),
      image: normalizeMetadataValue(result.image),
      language: normalizeMetadataValue(result.language),
      markdown,
      pageTitle: title,
      published: normalizeMetadataValue(result.published),
      siteName,
      title,
      wordCount,
    }

    payload.exportText = createTranscriptExportText(payload)

    return {
      status: 'ready',
      payload,
    }
  } catch {
    return {
      status: 'unavailable',
      reason: 'parse-failed',
    }
  }
}

export function createTranscriptExportText(payload: TranscriptPayload): string {
  const metadataEntries = [
    ['title', payload.title],
    ['site', payload.siteName],
    ['source', payload.sourceUrl],
    ['domain', payload.domain],
    ['author', payload.author],
    ['published', payload.published],
    ['language', payload.language],
    ['description', payload.description],
    ['image', payload.image],
    ['favicon', payload.favicon],
    ['word_count', payload.wordCount],
  ]
  const populatedEntries = metadataEntries.filter(([, value]) => hasMetadataValue(value))
  const metadataLines = populatedEntries.map(([label, value]) => `${label}: ${formatMetadataValue(value)}`)

  return `---\n${metadataLines.join('\n')}\n---\n\n${payload.markdown}`
}

function getWordCount(result: DefuddleResponse): number {
  const extractedWordCount = Math.round(result.wordCount)
  const hasWordCount = Number.isFinite(extractedWordCount) && extractedWordCount > 0

  if (hasWordCount) {
    return extractedWordCount
  }

  const extractedText = normalizeMarkdown(result.content)

  return countWords(extractedText)
}

function normalizeMarkdown(markdown: string): string {
  const normalizedLineEndings = markdown.replace(/\r\n/gu, '\n')
  const normalizedCodeBlocks = removeLeadingCodeFenceLineNumbers(normalizedLineEndings)

  return normalizedCodeBlocks.trim()
}

function pickPreferredText(candidateValue: string, fallbackValue: string): string {
  const normalizedCandidate = normalizeMetadataValue(candidateValue)

  if (normalizedCandidate.length > 0) {
    return normalizedCandidate
  }

  return fallbackValue
}

function normalizeMetadataValue(value: string | null | undefined): string {
  const safeValue = value ?? ''

  return normalizeWhitespace(safeValue)
}

function hasMetadataValue(value: number | string): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  return value.trim().length > 0
}

function formatMetadataValue(value: number | string): string {
  if (typeof value === 'number') {
    return String(value)
  }

  return JSON.stringify(value)
}

function removeLeadingCodeFenceLineNumbers(markdown: string): string {
  return markdown.replace(
    /(^|\n)([ \t]*)```([^\n`]*)\n([\s\S]*?)\n\2```(?=\n|$)/gu,
    (_match, linePrefix, indentation, language, content) => {
      const cleanedContent = stripLeadingSequentialNumbers(content)

      return `${linePrefix}${indentation}\`\`\`${language}\n${cleanedContent}\n${indentation}\`\`\``
    },
  )
}

function stripLeadingSequentialNumbers(content: string): string {
  const codeLines = content.split('\n')
  const leadingNumberCount = countLeadingSequentialNumbers(codeLines)
  const hasDetectedGutter = leadingNumberCount >= 3

  if (!hasDetectedGutter) {
    return content
  }

  const cleanedLines = codeLines.slice(leadingNumberCount)

  return cleanedLines.join('\n').replace(/^\n+/u, '')
}

function countLeadingSequentialNumbers(lines: string[]): number {
  let expectedValue = 1
  let matchedLineCount = 0

  for (const line of lines) {
    const normalizedLine = line.trim()
    const hasNumberOnly = /^\d+$/u.test(normalizedLine)

    if (!hasNumberOnly) {
      break
    }

    const numericValue = Number.parseInt(normalizedLine, 10)

    if (numericValue !== expectedValue) {
      break
    }

    matchedLineCount += 1
    expectedValue += 1
  }

  return matchedLineCount
}
