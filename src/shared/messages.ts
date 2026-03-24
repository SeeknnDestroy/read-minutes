import { GET_PAGE_ANALYSIS_MESSAGE_TYPE } from './constants'
import type { GetPageAnalysisMessage } from './types'

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

