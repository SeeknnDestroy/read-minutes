import { TRANSCRIPT_STORAGE_KEY_PREFIX } from './constants'
import type { TranscriptPayload } from './types'

interface StorageAreaLike {
  get(keys: string[]): Promise<Record<string, unknown>>
  remove(keys: string | string[]): Promise<void>
  set(items: Record<string, unknown>): Promise<void>
}

interface StorageNamespaceLike {
  local?: StorageAreaLike
  session?: StorageAreaLike
}

export function createTranscriptStorageKey(): string {
  const hasRandomUuid = typeof crypto?.randomUUID === 'function'
  const uniqueId = hasRandomUuid
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${TRANSCRIPT_STORAGE_KEY_PREFIX}${uniqueId}`
}

export async function saveTranscriptPayload(
  storageKey: string,
  payload: TranscriptPayload,
  storageNamespace: StorageNamespaceLike = chrome.storage,
): Promise<void> {
  const storageArea = getTranscriptStorageArea(storageNamespace)

  await storageArea.set({
    [storageKey]: payload,
  })
}

export async function consumeTranscriptPayload(
  storageKey: string,
  storageNamespace: StorageNamespaceLike = chrome.storage,
): Promise<TranscriptPayload | null> {
  const storageArea = getTranscriptStorageArea(storageNamespace)
  const storedValues = await storageArea.get([storageKey])
  const storedPayload = storedValues[storageKey]
  const transcriptPayload = isTranscriptPayload(storedPayload)
    ? storedPayload
    : null

  await storageArea.remove(storageKey)

  return transcriptPayload
}

function getTranscriptStorageArea(storageNamespace: StorageNamespaceLike): StorageAreaLike {
  const sessionStorageArea = storageNamespace.session

  if (sessionStorageArea) {
    return sessionStorageArea
  }

  const localStorageArea = storageNamespace.local

  if (localStorageArea) {
    return localStorageArea
  }

  throw new Error('Transcript storage is not available.')
}

function isTranscriptPayload(value: unknown): value is TranscriptPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidatePayload = value as Partial<TranscriptPayload>
  const hasExportText = typeof candidatePayload.exportText === 'string'
  const hasMarkdown = typeof candidatePayload.markdown === 'string'
  const hasSourceUrl = typeof candidatePayload.sourceUrl === 'string'
  const hasTitle = typeof candidatePayload.title === 'string'

  return hasExportText && hasMarkdown && hasSourceUrl && hasTitle
}
