import { defaultSettings, type ExtensionSettings } from './types'

interface StorageAreaLike {
  get(keys: string[]): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
}

export function normalizeSettings(rawSettings: Partial<Record<keyof ExtensionSettings, unknown>> | undefined): ExtensionSettings {
  const candidateWordsPerMinute = Number(rawSettings?.wordsPerMinute)
  const hasValidWordsPerMinute = Number.isFinite(candidateWordsPerMinute) && candidateWordsPerMinute > 0
  const normalizedWordsPerMinute = hasValidWordsPerMinute
    ? Math.round(candidateWordsPerMinute)
    : defaultSettings.wordsPerMinute
  const hasValidBadgeSetting = typeof rawSettings?.showInlineBadge === 'boolean'
  const normalizedShowInlineBadge = hasValidBadgeSetting
    ? Boolean(rawSettings?.showInlineBadge)
    : defaultSettings.showInlineBadge

  return {
    wordsPerMinute: normalizedWordsPerMinute,
    showInlineBadge: normalizedShowInlineBadge,
  }
}

export async function readSettings(storageArea: StorageAreaLike = chrome.storage.sync): Promise<ExtensionSettings> {
  const storageKeys = ['wordsPerMinute', 'showInlineBadge']
  const storedValues = await storageArea.get(storageKeys)

  return normalizeSettings(storedValues)
}

export async function saveSettings(
  updates: Partial<ExtensionSettings>,
  storageArea: StorageAreaLike = chrome.storage.sync,
): Promise<ExtensionSettings> {
  const currentSettings = await readSettings(storageArea)
  const nextSettings = normalizeSettings({ ...currentSettings, ...updates })
  const storedSettings = {
    wordsPerMinute: nextSettings.wordsPerMinute,
    showInlineBadge: nextSettings.showInlineBadge,
  }

  await storageArea.set(storedSettings)

  return nextSettings
}

export function mergeSettings(
  currentSettings: ExtensionSettings,
  updates: Partial<Record<keyof ExtensionSettings, unknown>>,
): ExtensionSettings {
  const mergedSettings = { ...currentSettings, ...updates }

  return normalizeSettings(mergedSettings)
}

export function mergeSettingsFromStorageChange(
  currentSettings: ExtensionSettings,
  changes: Partial<Record<keyof ExtensionSettings, chrome.storage.StorageChange>>,
): ExtensionSettings {
  const updatedValues = {
    wordsPerMinute: changes.wordsPerMinute?.newValue,
    showInlineBadge: changes.showInlineBadge?.newValue,
  }

  return mergeSettings(currentSettings, updatedValues)
}
