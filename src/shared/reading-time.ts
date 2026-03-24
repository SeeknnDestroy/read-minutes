export function calculateReadingMinutes(wordCount: number, wordsPerMinute: number): number {
  const normalizedWordCount = normalizePositiveInteger(wordCount)
  const normalizedWordsPerMinute = normalizePositiveInteger(wordsPerMinute)
  const rawMinutes = normalizedWordCount / normalizedWordsPerMinute
  const roundedMinutes = Math.ceil(rawMinutes)
  const minimumMinuteCount = 1

  return Math.max(minimumMinuteCount, roundedMinutes)
}

export function formatReadingTime(minutes: number): string {
  const normalizedMinutes = normalizePositiveInteger(minutes)

  return `${normalizedMinutes} min read`
}

export function countWords(text: string): number {
  const normalizedText = normalizeWhitespace(text)

  if (!normalizedText) {
    return 0
  }

  const words = normalizedText.split(/\s+/u)

  return words.length
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function normalizePositiveInteger(value: number): number {
  const finiteValue = Number.isFinite(value) ? value : 0
  const roundedValue = Math.round(finiteValue)
  const minimumValue = 1

  return Math.max(minimumValue, roundedValue)
}

