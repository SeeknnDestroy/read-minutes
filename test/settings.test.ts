import { defaultSettings } from '@/shared/types'
import { readSettings, saveSettings } from '@/shared/settings'

describe('settings persistence', () => {
  it('returns default settings when storage is empty', async () => {
    const storageArea = createStorageAreaMock({})

    const settings = await readSettings(storageArea)

    expect(settings).toEqual(defaultSettings)
  })

  it('persists the reading speed and badge visibility toggle', async () => {
    const storageArea = createStorageAreaMock({
      wordsPerMinute: defaultSettings.wordsPerMinute,
      showInlineBadge: defaultSettings.showInlineBadge,
    })

    const settings = await saveSettings(
      {
        wordsPerMinute: 260,
        showInlineBadge: false,
      },
      storageArea,
    )

    expect(settings).toEqual({
      wordsPerMinute: 260,
      showInlineBadge: false,
    })
    expect(storageArea.snapshot()).toEqual({
      wordsPerMinute: 260,
      showInlineBadge: false,
    })
  })

  it('persists enabling the badge visibility toggle', async () => {
    const storageArea = createStorageAreaMock({
      wordsPerMinute: defaultSettings.wordsPerMinute,
      showInlineBadge: false,
    })

    const settings = await saveSettings(
      {
        showInlineBadge: true,
      },
      storageArea,
    )

    expect(settings.showInlineBadge).toBe(true)
    expect(storageArea.snapshot()).toEqual({
      wordsPerMinute: defaultSettings.wordsPerMinute,
      showInlineBadge: true,
    })
  })

  it('preserves independent concurrent updates', async () => {
    const storageArea = createStorageAreaWithDelayedWrites({
      wordsPerMinute: defaultSettings.wordsPerMinute,
      showInlineBadge: defaultSettings.showInlineBadge,
    })

    await Promise.all([
      saveSettings(
        {
          wordsPerMinute: 260,
        },
        storageArea,
      ),
      saveSettings(
        {
          showInlineBadge: false,
        },
        storageArea,
      ),
    ])

    expect(storageArea.snapshot()).toEqual({
      wordsPerMinute: 260,
      showInlineBadge: false,
    })
  })
})

function createStorageAreaMock(initialState: Record<string, unknown>) {
  const state = { ...initialState }

  return {
    async get(keys: string[]) {
      const entries = keys.map((key) => [key, state[key]])

      return Object.fromEntries(entries)
    },
    async set(items: Record<string, unknown>) {
      Object.assign(state, items)
    },
    snapshot() {
      return { ...state }
    },
  }
}

function createStorageAreaWithDelayedWrites(initialState: Record<string, unknown>) {
  const state = { ...initialState }

  return {
    async get(keys: string[]) {
      const entries = keys.map((key) => [key, state[key]])

      return Object.fromEntries(entries)
    },
    async set(items: Record<string, unknown>) {
      const writesWordsPerMinute = 'wordsPerMinute' in items
      const writeDelayMs = writesWordsPerMinute ? 5 : 20

      await delay(writeDelayMs)
      Object.assign(state, items)
    },
    snapshot() {
      return { ...state }
    },
  }
}

async function delay(durationMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}
