import {
  GET_PAGE_ANALYSIS_MESSAGE_TYPE,
  GET_PAGE_TRANSCRIPT_MESSAGE_TYPE,
  OPEN_TRANSCRIPT_VIEW_MESSAGE_TYPE,
} from './constants'
import type {
  GetPageAnalysisMessage,
  GetPageTranscriptMessage,
  OpenTranscriptViewMessage,
} from './types'

export function createGetPageAnalysisMessage(): GetPageAnalysisMessage {
  return {
    type: GET_PAGE_ANALYSIS_MESSAGE_TYPE,
  }
}

export function isGetPageAnalysisMessage(value: unknown): value is GetPageAnalysisMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidateMessage = value as Partial<GetPageAnalysisMessage>

  return candidateMessage.type === GET_PAGE_ANALYSIS_MESSAGE_TYPE
}

export function createGetPageTranscriptMessage(): GetPageTranscriptMessage {
  return {
    type: GET_PAGE_TRANSCRIPT_MESSAGE_TYPE,
  }
}

export function isGetPageTranscriptMessage(value: unknown): value is GetPageTranscriptMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidateMessage = value as Partial<GetPageTranscriptMessage>

  return candidateMessage.type === GET_PAGE_TRANSCRIPT_MESSAGE_TYPE
}

export function createOpenTranscriptViewMessage(
  transcriptStorageKey: string,
): OpenTranscriptViewMessage {
  return {
    transcriptStorageKey,
    type: OPEN_TRANSCRIPT_VIEW_MESSAGE_TYPE,
  }
}

export function isOpenTranscriptViewMessage(value: unknown): value is OpenTranscriptViewMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidateMessage = value as Partial<OpenTranscriptViewMessage>
  const hasTranscriptStorageKey = typeof candidateMessage.transcriptStorageKey === 'string'

  return candidateMessage.type === OPEN_TRANSCRIPT_VIEW_MESSAGE_TYPE && hasTranscriptStorageKey
}
