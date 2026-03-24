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

