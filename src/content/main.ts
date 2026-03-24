import { ANALYSIS_DEBOUNCE_MS } from '@/shared/constants'
import { analyzeDocument } from '@/shared/analysis'
import { isGetPageAnalysisMessage } from '@/shared/messages'
import { mergeSettingsFromStorageChange, readSettings } from '@/shared/settings'
import { defaultSettings, type PageAnalysis } from '@/shared/types'
import { removeBadge, renderBadge } from './badge'

let currentAnalysis = analyzeDocument(document, defaultSettings)
let currentSettings = defaultSettings
let analysisTimer: number | undefined

void initializeContentScript()

async function initializeContentScript(): Promise<void> {
  currentSettings = await readSettings()
  runAnalysis()
  installMessageListener()
  installStorageListener()
  installNavigationListeners()
  installMutationObserver()
}

function runAnalysis(): void {
  currentAnalysis = analyzeDocument(document, currentSettings)

  if (currentSettings.showInlineBadge && currentAnalysis.status === 'article') {
    renderBadge(currentAnalysis.readingTimeLabel)

    return
  }

  removeBadge()
}

function scheduleAnalysis(): void {
  window.clearTimeout(analysisTimer)
  analysisTimer = window.setTimeout(runAnalysis, ANALYSIS_DEBOUNCE_MS)
}

function installMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isGetPageAnalysisMessage(message)) {
      return
    }

    sendResponse(currentAnalysis)
  })
}

function installStorageListener(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') {
      return
    }

    currentSettings = mergeSettingsFromStorageChange(currentSettings, changes)
    runAnalysis()
  })
}

function installNavigationListeners(): void {
  const rerunAnalysis = () => scheduleAnalysis()

  patchHistoryMethod('pushState', rerunAnalysis)
  patchHistoryMethod('replaceState', rerunAnalysis)
  window.addEventListener('popstate', rerunAnalysis)
  window.addEventListener('pageshow', rerunAnalysis)
}

function installMutationObserver(): void {
  const documentElement = document.documentElement

  if (!documentElement) {
    return
  }

  const mutationObserver = new MutationObserver(() => {
    scheduleAnalysis()
  })

  mutationObserver.observe(documentElement, {
    childList: true,
    subtree: true,
  })
}

function patchHistoryMethod(
  methodName: 'pushState' | 'replaceState',
  callback: () => void,
): void {
  const originalMethod = history[methodName]

  history[methodName] = function patchedHistoryMethod(...args) {
    const result = originalMethod.apply(this, args)

    callback()

    return result
  }
}

export function getCurrentAnalysis(): PageAnalysis {
  return currentAnalysis
}

