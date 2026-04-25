import {
  ANALYSIS_DEBOUNCE_MS,
  ANALYSIS_IDLE_TIMEOUT_MS,
  BADGE_HOST_ID,
  CONTENT_OBSERVER_IDLE_MS,
  INLINE_DOCK_AUTO_CLOSE_TRACE_DURATION_MS,
  INLINE_DOCK_DISMISS_EXIT_DURATION_MS,
  NAVIGATION_ANALYSIS_SETTLE_MS,
} from '@/shared/constants'
import { isGetPageAnalysisMessage, isGetPageTranscriptMessage } from '@/shared/messages'
import { mergeSettingsFromStorageChange, readSettings } from '@/shared/settings'
import {
  defaultSettings,
  type ArticleAnalysis,
  type PageAnalysis,
} from '@/shared/types'
import { getTranscriptUnavailableMessage } from '@/shared/unavailable'
import {
  dismissBadgeForAnalysis,
  shouldRenderBadge,
  updateDismissedSourceUrlForLocationChange,
} from './badge-visibility'
import { removeBadge, renderBadge, type InlineDockViewModel } from './badge'

const IGNORED_MUTATION_TAG_NAMES = new Set([
  'link',
  'meta',
  'noscript',
  'script',
  'style',
  'template',
])
const MEANINGFUL_MUTATION_TAG_NAMES = new Set([
  'article',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'main',
  'p',
  'pre',
  'section',
])
const MEANINGFUL_MUTATION_SELECTOR = [...MEANINGFUL_MUTATION_TAG_NAMES].join(',')
const INLINE_DOCK_MESSAGE_DURATION_MS = 2400

let currentAnalysis: PageAnalysis | null = null
let currentSettings = defaultSettings
let analysisTimer: number | undefined
let analysisIdleCallbackId: number | undefined
let analysisEarliestRunAtMs = 0
let contentObserverIdleTimer: number | undefined
let inlineDockMessageTimer: number | undefined
let inlineDockExitTimer: number | undefined
let currentLocationUrl = document.location.href
let dismissedSourceUrl: string | null = null
let contentMutationObserver: MutationObserver | null = null
let inlineDockState: InlineDockState = createDefaultInlineDockState()

interface InlineDockState {
  busyAction: 'copy' | 'open' | null
  exitReason: InlineDockViewModel['exitReason']
  message: string | null
}

void initializeContentScript()

async function initializeContentScript(): Promise<void> {
  currentSettings = await readSettings()
  installMessageListener()
  installStorageListener()
  installNavigationListeners()

  if (currentSettings.showInlineBadge) {
    deferAnalysisForNavigation()
    scheduleAnalysis()
    armContentMutationObserver()
  }
}

async function runAnalysis(): Promise<PageAnalysis> {
  const previousSourceUrl = currentAnalysis?.sourceUrl ?? null
  const { analyzeDocument } = await import('@/shared/analysis')

  const nextAnalysis = analyzeDocument(document, currentSettings)
  const nextSourceUrl = nextAnalysis.sourceUrl
  const sourceUrlChanged = previousSourceUrl !== nextSourceUrl

  currentAnalysis = nextAnalysis

  if (sourceUrlChanged) {
    resetInlineDockState()
    removeBadge()
  }

  const shouldKeepVisibleDuringExit = inlineDockState.exitReason !== null
    && nextAnalysis.status === 'article'
    && nextAnalysis.sourceUrl === dismissedSourceUrl

  if (shouldKeepVisibleDuringExit) {
    renderInlineDock(nextAnalysis)

    return nextAnalysis
  }

  if (shouldRenderBadge(
    nextAnalysis,
    currentSettings.showInlineBadge,
    dismissedSourceUrl,
  )) {
    if (inlineDockState.exitReason === null) {
      inlineDockState = {
        ...inlineDockState,
        exitReason: 'auto-close',
      }
      synchronizeInlineDockTimers(inlineDockState)
    }

    renderInlineDock(nextAnalysis)

    return nextAnalysis
  }

  resetInlineDockState()
  removeBadge()

  return nextAnalysis
}

function scheduleAnalysis(): void {
  synchronizeLocationState()
  clearScheduledAnalysis()
  analysisTimer = window.setTimeout(() => {
    analysisTimer = undefined
    runAnalysisWhenIdle()
  }, getAnalysisDelayMs())
}

function runAnalysisWhenIdle(): void {
  if ('requestIdleCallback' in window) {
    analysisIdleCallbackId = window.requestIdleCallback(() => {
      analysisIdleCallbackId = undefined
      void runAnalysis()
    }, {
      timeout: ANALYSIS_IDLE_TIMEOUT_MS,
    })

    return
  }

  void runAnalysis()
}

function clearScheduledAnalysis(): void {
  window.clearTimeout(analysisTimer)
  analysisTimer = undefined

  if (analysisIdleCallbackId === undefined || !('cancelIdleCallback' in window)) {
    return
  }

  window.cancelIdleCallback(analysisIdleCallbackId)
  analysisIdleCallbackId = undefined
}

function getAnalysisDelayMs(): number {
  const settleDelayMs = Math.max(0, analysisEarliestRunAtMs - performance.now())

  return Math.max(ANALYSIS_DEBOUNCE_MS, settleDelayMs)
}

function deferAnalysisForNavigation(): void {
  analysisEarliestRunAtMs = performance.now() + NAVIGATION_ANALYSIS_SETTLE_MS
}

function handleBadgeDismissed(): void {
  if (!currentAnalysis) {
    return
  }

  dismissedSourceUrl = dismissBadgeForAnalysis(currentAnalysis)
  updateInlineDockState({
    busyAction: null,
    exitReason: 'dismiss',
    message: null,
  })
}

function renderInlineDock(analysis: ArticleAnalysis): void {
  const isCopyActionBusy = inlineDockState.busyAction === 'copy'

  renderBadge(
    {
      copyButtonLabel: isCopyActionBusy
        ? 'Copying...'
        : 'Copy page',
      exitReason: inlineDockState.exitReason,
      isActionBusy: inlineDockState.busyAction !== null,
      message: inlineDockState.message,
      readingTimeLabel: analysis.readingTimeLabel,
    },
    {
      onCopy: handleInlineCopyRequested,
      onDismiss: handleBadgeDismissed,
    },
  )
}

function handleInlineCopyRequested(): void {
  void handleInlineCopy()
}

function installMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (isGetPageAnalysisMessage(message)) {
      void runAnalysis().then(sendResponse)

      return true
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
  const { createTranscriptResult } = await import('@/shared/transcript')
  const transcriptResult = await createTranscriptResult(document)

  sendResponse(transcriptResult)
}

async function handleInlineCopy(): Promise<void> {
  updateInlineDockState({
    busyAction: 'copy',
    message: null,
  })

  try {
    const { createTranscriptResult } = await import('@/shared/transcript')
    const transcriptResult = await createTranscriptResult(document)

    if (transcriptResult.status !== 'ready') {
      updateInlineDockState({
        busyAction: null,
        message: getTranscriptUnavailableMessage(transcriptResult.reason),
      })

      return
    }

    await navigator.clipboard.writeText(transcriptResult.payload.exportText)
    updateInlineDockState({
      busyAction: null,
      message: 'Markdown copied for LLM.',
    })
  } catch {
    updateInlineDockState({
      busyAction: null,
      message: 'Copying markdown failed.',
    })
  }
}

function installStorageListener(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') {
      return
    }

    const previousShowInlineBadge = currentSettings.showInlineBadge

    currentSettings = mergeSettingsFromStorageChange(currentSettings, changes)

    if (!currentSettings.showInlineBadge) {
      disconnectContentMutationObserver()
      resetInlineDockState()
      removeBadge()

      return
    }

    runAnalysis()

    if (!previousShowInlineBadge) {
      armContentMutationObserver()
    }
  })
}

function installNavigationListeners(): void {
  const rerunAnalysis = () => {
    if (!currentSettings.showInlineBadge) {
      synchronizeLocationState()
      currentAnalysis = null

      return
    }

    deferAnalysisForNavigation()
    armContentMutationObserver()
    scheduleAnalysis()
  }

  patchHistoryMethod('pushState', rerunAnalysis)
  patchHistoryMethod('replaceState', rerunAnalysis)
  window.addEventListener('popstate', rerunAnalysis)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      rerunAnalysis()
    }
  })
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

  return MEANINGFUL_MUTATION_TAG_NAMES.has(tagName)
    || hasDirectMeaningfulText(node)
    || Boolean(node.querySelector(MEANINGFUL_MUTATION_SELECTOR))
}

function hasMeaningfulText(value: string | null): boolean {
  const normalizedText = value?.trim() ?? ''

  return normalizedText.length > 0
}

function hasDirectMeaningfulText(element: Element): boolean {
  return [...element.childNodes].some((childNode) => (
    childNode.nodeType === Node.TEXT_NODE
      && hasMeaningfulText(childNode.textContent)
  ))
}

function isBadgeElement(element: Element): boolean {
  const isBadgeHost = element.id === BADGE_HOST_ID
  const isInsideBadgeHost = Boolean(element.closest(`#${BADGE_HOST_ID}`))

  return isBadgeHost || isInsideBadgeHost
}

function scheduleContentObserverIdleStop(): void {
  window.clearTimeout(contentObserverIdleTimer)
  contentObserverIdleTimer = window.setTimeout(
    disconnectContentMutationObserver,
    getContentObserverIdleDelayMs(),
  )
}

function getContentObserverIdleDelayMs(): number {
  const analysisSettleDelayMs = Math.max(0, analysisEarliestRunAtMs - performance.now())

  return Math.max(CONTENT_OBSERVER_IDLE_MS, analysisSettleDelayMs + CONTENT_OBSERVER_IDLE_MS)
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
  const mergedInlineDockState = {
    ...inlineDockState,
    ...nextState,
  }
  const shouldKeepVisibleDuringExit = mergedInlineDockState.exitReason !== null
    && currentAnalysis?.status === 'article'
    && currentAnalysis.sourceUrl === dismissedSourceUrl

  inlineDockState = mergedInlineDockState
  synchronizeInlineDockTimers(mergedInlineDockState)

  if (currentAnalysis?.status === 'article' && shouldKeepVisibleDuringExit) {
    renderInlineDock(currentAnalysis)

    return
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
  clearInlineDockMessageTimer()
  clearInlineDockExitTimer()
  inlineDockState = createDefaultInlineDockState()
}

function createDefaultInlineDockState(): InlineDockState {
  return {
    busyAction: null,
    exitReason: null,
    message: null,
  }
}

function synchronizeInlineDockTimers(state: InlineDockState): void {
  clearInlineDockExitTimer()
  const shouldAutoClearMessage = state.busyAction === null && state.message !== null

  clearInlineDockMessageTimer()

  if (state.exitReason) {
    inlineDockExitTimer = window.setTimeout(
      finalizeInlineDockExit,
      getInlineDockExitDurationMs(state.exitReason),
    )

    return
  }

  if (!shouldAutoClearMessage) {
    return
  }

  inlineDockMessageTimer = window.setTimeout(() => {
    updateInlineDockState({
      message: null,
    })
  }, INLINE_DOCK_MESSAGE_DURATION_MS)
}

function clearInlineDockMessageTimer(): void {
  window.clearTimeout(inlineDockMessageTimer)
  inlineDockMessageTimer = undefined
}

function clearInlineDockExitTimer(): void {
  window.clearTimeout(inlineDockExitTimer)
  inlineDockExitTimer = undefined
}

function finalizeInlineDockExit(): void {
  if (currentAnalysis) {
    dismissedSourceUrl = dismissBadgeForAnalysis(currentAnalysis)
  }

  resetInlineDockState()
  removeBadge()
}

function getInlineDockExitDurationMs(
  exitReason: InlineDockState['exitReason'],
): number {
  return exitReason === 'dismiss'
    ? INLINE_DOCK_DISMISS_EXIT_DURATION_MS
    : INLINE_DOCK_AUTO_CLOSE_TRACE_DURATION_MS
}
