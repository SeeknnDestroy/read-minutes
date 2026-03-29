import type { TranscriptPayload } from '@/shared/types'
import {
  consumeTranscriptPayload,
  createTranscriptStorageKey,
  saveTranscriptPayload,
} from '@/shared/transcript-storage'

describe('transcript storage', () => {
  it('prefers session storage for temporary transcript payloads', async () => {
    const sessionStorageArea = createStorageAreaMock()
    const localStorageArea = createStorageAreaMock()
    const storageKey = 'transcript/session'
    const payload = createTranscriptPayload()

    await saveTranscriptPayload(storageKey, payload, {
      local: localStorageArea,
      session: sessionStorageArea,
    })

    expect(sessionStorageArea.snapshot()).toEqual({
      [storageKey]: payload,
    })
    expect(localStorageArea.snapshot()).toEqual({})
  })

  it('falls back to local storage and removes consumed payloads', async () => {
    const localStorageArea = createStorageAreaMock()
    const storageKey = 'transcript/local'
    const payload = createTranscriptPayload()

    await saveTranscriptPayload(storageKey, payload, {
      local: localStorageArea,
    })

    const storedPayload = await consumeTranscriptPayload(storageKey, {
      local: localStorageArea,
    })

    expect(storedPayload).toEqual(payload)
    expect(localStorageArea.snapshot()).toEqual({})
  })

  it('creates prefixed transcript storage keys', () => {
    const storageKey = createTranscriptStorageKey()

    expect(storageKey.startsWith('read-minutes/transcript/')).toBe(true)
  })
})

function createStorageAreaMock() {
  const state: Record<string, unknown> = {}

  return {
    async get(keys: string[]) {
      const entries = keys.map((key) => [key, state[key]])

      return Object.fromEntries(entries)
    },
    async remove(keys: string | string[]) {
      const normalizedKeys = Array.isArray(keys) ? keys : [keys]

      normalizedKeys.forEach((key) => {
        delete state[key]
      })
    },
    async set(items: Record<string, unknown>) {
      Object.assign(state, items)
    },
    snapshot() {
      return { ...state }
    },
  }
}

function createTranscriptPayload(): TranscriptPayload {
  return {
    author: '',
    description: '',
    domain: 'example.com',
    exportText: 'title: "Example"\n\nBody copy',
    favicon: '',
    hostname: 'example.com',
    image: '',
    language: 'en',
    markdown: 'Body copy',
    pageTitle: 'Example',
    published: '',
    siteName: 'Example',
    sourceUrl: 'https://example.com/post',
    title: 'Example',
    wordCount: 250,
  }
}
