import { ANALYSIS_DEBOUNCE_MS, BADGE_HOST_ID, CONTENT_OBSERVER_IDLE_MS } from '@/shared/constants'
import { analyzeDocument } from '@/shared/analysis'
import { isGetPageAnalysisMessage, isGetPageTranscriptMessage } from '@/shared/messages'
import { mergeSettingsFromStorageChange, readSettings } from '@/shared/settings'
import {
  createTranscriptStorageKey,
  saveTranscriptPayload,
} from '@/shared/transcript-storage'
import { createTranscriptResult } from '@/shared/transcript'
import { openTranscriptView } from '@/shared/transcript-view'
import {
  defaultSettings,
  type ArticleAnalysis,
  type PageAnalysis,
} from '@/shared/types'
import {
  dismissBadgeForAnalysis,
  shouldRenderBadge,
  updateDismissedSourceUrlForLocationChange,
} from './badge-visibility'
import { removeBadge, renderBadge } from './badge'

const IGNORED_MUTATION_TAG_NAMES = new Set([
  'link',
  'meta',
  'noscript',
  'script',
  'style',
  'template',
])

let currentAnalysis: PageAnalysis | null = null
let currentSettings = defaultSettings
let analysisTimer: number | undefined
let contentObserverIdleTimer: number | undefined
let currentLocationUrl = document.location.href
let dismissedSourceUrl: string | null = null
let contentMutationObserver: MutationObserver | null = null
let inlineDockState: InlineDockState = createDefaultInlineDockState()

interface InlineDockState {
  busyAction: 'copy' | 'open' | null
  isMenuOpen: boolean
  message: string | null
}

void initializeContentScript()

async function initializeContentScript(): Promise<void> {
  currentSettings = await readSettings()
  runAnalysis()
  installMessageListener()
  installStorageListener()
  installNavigationListeners()
  armContentMutationObserver()
}

function runAnalysis(): void {
  const previousSourceUrl = currentAnalysis?.sourceUrl ?? null

  currentAnalysis = analyzeDocument(document, currentSettings)
  const nextSourceUrl = currentAnalysis?.sourceUrl ?? null
  const sourceUrlChanged = previousSourceUrl !== nextSourceUrl

  if (sourceUrlChanged) {
    resetInlineDockState()
  }

  if (shouldRenderBadge(
    currentAnalysis,
    currentSettings.showInlineBadge,
    dismissedSourceUrl,
  )) {
    renderInlineDock(currentAnalysis)

    return
  }

  resetInlineDockState()
  removeBadge()
}

function scheduleAnalysis(): void {
  synchronizeLocationState()
  window.clearTimeout(analysisTimer)
  analysisTimer = window.setTimeout(runAnalysis, ANALYSIS_DEBOUNCE_MS)
}

function handleBadgeDismissed(): void {
  if (!currentAnalysis) {
    return
  }

  dismissedSourceUrl = dismissBadgeForAnalysis(currentAnalysis)
  resetInlineDockState()
  removeBadge()
}

function renderInlineDock(analysis: ArticleAnalysis): void {
  const isCopyActionBusy = inlineDockState.busyAction === 'copy'
  const isOpenActionBusy = inlineDockState.busyAction === 'open'

  renderBadge(
    {
      copyButtonLabel: isCopyActionBusy ? 'Copying...' : 'Copy page',
      isActionBusy: inlineDockState.busyAction !== null,
      isMenuOpen: inlineDockState.isMenuOpen,
      message: inlineDockState.message,
      openButtonLabel: isOpenActionBusy ? 'Opening...' : 'View as Markdown',
      readingTimeLabel: analysis.readingTimeLabel,
    },
    {
      onCloseMenu: handleInlineMenuClosed,
      onCopy: handleInlineCopyRequested,
      onDismiss: handleBadgeDismissed,
      onOpen: handleInlineOpenRequested,
      onToggleMenu: handleInlineMenuToggled,
    },
  )
}

function handleInlineMenuClosed(): void {
  updateInlineDockState({
    isMenuOpen: false,
  })
}

function handleInlineMenuToggled(): void {
  const nextMenuOpen = !inlineDockState.isMenuOpen

  updateInlineDockState({
    isMenuOpen: nextMenuOpen,
  })
}

function handleInlineCopyRequested(): void {
  void handleInlineCopy()
}

function handleInlineOpenRequested(): void {
  void handleInlineOpen()
}

function installMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (isGetPageAnalysisMessage(message)) {
      sendResponse(currentAnalysis)

      return
    }

    if (isGetPageTranscriptMessage(message)) {
      void respondWithTranscript(sendResponse)

      return true
    }

    return
  })
}

async function respondWithTranscript(
  sendResponse: (response?: unknown) => void,
): Promise<void> {
  const transcriptResult = await createTranscriptResult(document)

  sendResponse(transcriptResult)
}

async function handleInlineCopy(): Promise<void> {
  updateInlineDockState({
    busyAction: 'copy',
    message: null,
  })

  try {
    const transcriptResult = await createTranscriptResult(document)

    if (transcriptResult.status !== 'ready') {
      updateInlineDockState({
        busyAction: null,
        isMenuOpen: false,
        message: 'Markdown transcript is unavailable for this page.',
      })

      return
    }

    await navigator.clipboard.writeText(transcriptResult.payload.exportText)
    updateInlineDockState({
      busyAction: null,
      isMenuOpen: false,
      message: 'Markdown copied for LLM.',
    })
  } catch {
    updateInlineDockState({
      busyAction: null,
      isMenuOpen: false,
      message: 'Copying markdown failed.',
    })
  }
}

async function handleInlineOpen(): Promise<void> {
  updateInlineDockState({
    busyAction: 'open',
    message: null,
  })

  try {
    const transcriptResult = await createTranscriptResult(document)

    if (transcriptResult.status !== 'ready') {
      updateInlineDockState({
        busyAction: null,
        isMenuOpen: false,
        message: 'Markdown transcript is unavailable for this page.',
      })

      return
    }

    const transcriptStorageKey = createTranscriptStorageKey()

    await saveTranscriptPayload(transcriptStorageKey, transcriptResult.payload)
    await openTranscriptView(transcriptStorageKey)
    updateInlineDockState({
      busyAction: null,
      isMenuOpen: false,
      message: 'Opened markdown in a new tab.',
    })
  } catch {
    updateInlineDockState({
      busyAction: null,
      isMenuOpen: false,
      message: 'Opening markdown failed.',
    })
  }
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
  const rerunAnalysis = () => {
    armContentMutationObserver()
    scheduleAnalysis()
  }

  patchHistoryMethod('pushState', rerunAnalysis)
  patchHistoryMethod('replaceState', rerunAnalysis)
  window.addEventListener('popstate', rerunAnalysis)
  window.addEventListener('pageshow', rerunAnalysis)
}

function armContentMutationObserver(): void {
  const documentBody = document.body

  if (!documentBody) {
    return
  }

  contentMutationObserver?.disconnect()
  contentMutationObserver = new MutationObserver(handleDocumentMutations)
  contentMutationObserver.observe(documentBody, {
    childList: true,
    subtree: true,
  })
  scheduleContentObserverIdleStop()
}

function handleDocumentMutations(mutations: MutationRecord[]): void {
  const hasMeaningfulMutation = mutations.some(isMeaningfulMutation)

  if (!hasMeaningfulMutation) {
    return
  }

  scheduleContentObserverIdleStop()
  scheduleAnalysis()
}

function isMeaningfulMutation(mutation: MutationRecord): boolean {
  if (mutation.type !== 'childList') {
    return false
  }

  const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes]

  return changedNodes.some(isMeaningfulNode)
}

function isMeaningfulNode(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return hasMeaningfulText(node.textContent)
  }

  if (!(node instanceof Element)) {
    return false
  }

  if (isBadgeElement(node)) {
    return false
  }

  const tagName = node.tagName.toLowerCase()

  if (IGNORED_MUTATION_TAG_NAMES.has(tagName)) {
    return false
  }

  return hasMeaningfulText(node.textContent)
}

function hasMeaningfulText(value: string | null): boolean {
  const normalizedText = value?.trim() ?? ''

  return normalizedText.length > 0
}

function isBadgeElement(element: Element): boolean {
  const isBadgeHost = element.id === BADGE_HOST_ID
  const isInsideBadgeHost = Boolean(element.closest(`#${BADGE_HOST_ID}`))

  return isBadgeHost || isInsideBadgeHost
}

function scheduleContentObserverIdleStop(): void {
  window.clearTimeout(contentObserverIdleTimer)
  contentObserverIdleTimer = window.setTimeout(disconnectContentMutationObserver, CONTENT_OBSERVER_IDLE_MS)
}

function disconnectContentMutationObserver(): void {
  contentMutationObserver?.disconnect()
  contentMutationObserver = null
}

function synchronizeLocationState(): void {
  const nextLocationUrl = document.location.href

  dismissedSourceUrl = updateDismissedSourceUrlForLocationChange(
    dismissedSourceUrl,
    currentLocationUrl,
    nextLocationUrl,
  )
  currentLocationUrl = nextLocationUrl
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

export function getCurrentAnalysis(): PageAnalysis | null {
  return currentAnalysis
}

function updateInlineDockState(nextState: Partial<InlineDockState>): void {
  inlineDockState = {
    ...inlineDockState,
    ...nextState,
  }

  if (currentAnalysis && shouldRenderBadge(
    currentAnalysis,
    currentSettings.showInlineBadge,
    dismissedSourceUrl,
  )) {
    renderInlineDock(currentAnalysis)

    return
  }

  removeBadge()
}

function resetInlineDockState(): void {
  inlineDockState = createDefaultInlineDockState()
}

function createDefaultInlineDockState(): InlineDockState {
  return {
    busyAction: null,
    isMenuOpen: false,
    message: null,
  }
}
