import './styles.css'
import { waitForMinimumTranscriptActionBusyTime } from '@/shared/action-feedback'
import { createGetPageAnalysisMessage, createGetPageTranscriptMessage } from '@/shared/messages'
import { saveSettings, readSettings } from '@/shared/settings'
import {
  consumeTranscriptPayload,
  createTranscriptStorageKey,
  saveTranscriptPayload,
} from '@/shared/transcript-storage'
import { createTranscriptPageUrl } from '@/shared/transcript-view'
import {
  defaultSettings,
  type ExtensionSettings,
  type PageAnalysis,
  type TranscriptResult,
} from '@/shared/types'
import { getTranscriptUnavailableMessage } from '@/shared/unavailable'
import { renderPopupContent, renderTranscriptViewContent } from './render'
import {
  createPopupViewModel,
  createTranscriptViewModel,
  type PopupTranscriptActionState,
} from './view-model'

const popupRootElement = getPopupRootElement()
const popupView = getPopupView()

const popupState = {
  analysis: null as PageAnalysis | null,
  settings: defaultSettings as ExtensionSettings,
  transcriptActionState: {
    busyAction: null,
    message: null,
  } as PopupTranscriptActionState,
}

void initializeApp()

async function initializeApp(): Promise<void> {
  if (popupView === 'transcript') {
    await initializeTranscriptView()

    return
  }

  await initializePopup()
}

async function initializePopup(): Promise<void> {
  const [settings, analysis] = await Promise.all([
    readSettings(),
    loadActiveTabAnalysis(),
  ])

  popupState.settings = settings
  popupState.analysis = analysis
  renderPopup()
}

function getPopupRootElement(): HTMLDivElement {
  const rootElement = document.querySelector<HTMLDivElement>('#root')

  if (!rootElement) {
    throw new Error('Popup root element was not found.')
  }

  return rootElement
}

function renderPopup(): void {
  const viewModel = createPopupViewModel(
    popupState.analysis,
    popupState.settings,
    popupState.transcriptActionState,
  )

  renderPopupContent(popupRootElement, viewModel, popupState.settings)

  bindControlEvents()
}

function bindControlEvents(): void {
  const copyMarkdownButton = popupRootElement.querySelector<HTMLButtonElement>('#copy-markdown')
  const inlineBadgeInput = popupRootElement.querySelector<HTMLInputElement>('#show-inline-badge')
  const openMarkdownButton = popupRootElement.querySelector<HTMLButtonElement>('#open-markdown')
  const wordsPerMinuteInput = popupRootElement.querySelector<HTMLInputElement>('#words-per-minute')

  copyMarkdownButton?.addEventListener('click', () => {
    void handleCopyMarkdown()
  })

  inlineBadgeInput?.addEventListener('change', async () => {
    popupState.settings = await saveSettings({
      showInlineBadge: inlineBadgeInput.checked,
    })
    renderPopup()
  })

  wordsPerMinuteInput?.addEventListener('change', async () => {
    const parsedValue = Number.parseInt(wordsPerMinuteInput.value, 10)
    const hasValidValue = Number.isFinite(parsedValue) && parsedValue > 0
    const nextWordsPerMinute = hasValidValue
      ? parsedValue
      : popupState.settings.wordsPerMinute

    popupState.settings = await saveSettings({
      wordsPerMinute: nextWordsPerMinute,
    })
    renderPopup()
  })

  openMarkdownButton?.addEventListener('click', () => {
    void handleOpenMarkdown()
  })
}

async function loadActiveTabAnalysis(): Promise<PageAnalysis | null> {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    if (!activeTab?.id) {
      return null
    }

    const pageAnalysis = await chrome.tabs.sendMessage(
      activeTab.id,
      createGetPageAnalysisMessage(),
    )

    return (pageAnalysis as PageAnalysis | undefined) ?? null
  } catch {
    return null
  }
}

async function handleCopyMarkdown(): Promise<void> {
  const actionStartedAtMs = performance.now()

  updateTranscriptActionState({
    busyAction: 'copy',
    message: null,
  })

  try {
    const transcriptResult = await loadActiveTabTranscript()

    if (transcriptResult.status !== 'ready') {
      updateTranscriptActionState({
        busyAction: null,
        message: getTranscriptUnavailableMessage(transcriptResult.reason),
      })

      return
    }

    await navigator.clipboard.writeText(transcriptResult.payload.exportText)
    await waitForMinimumTranscriptActionBusyTime(actionStartedAtMs)
    updateTranscriptActionState({
      busyAction: null,
      message: 'Markdown copied for LLM.',
    })
  } catch {
    updateTranscriptActionState({
      busyAction: null,
      message: 'Copying markdown failed.',
    })
  }
}

async function handleOpenMarkdown(): Promise<void> {
  updateTranscriptActionState({
    busyAction: 'open',
    message: null,
  })

  try {
    const transcriptResult = await loadActiveTabTranscript()

    if (transcriptResult.status !== 'ready') {
      updateTranscriptActionState({
        busyAction: null,
        message: getTranscriptUnavailableMessage(transcriptResult.reason),
      })

      return
    }

    const transcriptStorageKey = createTranscriptStorageKey()
    await saveTranscriptPayload(transcriptStorageKey, transcriptResult.payload)
    await chrome.tabs.create({
      url: createTranscriptPageUrl(transcriptStorageKey),
    })
    updateTranscriptActionState({
      busyAction: null,
      message: 'Opened markdown in a new tab.',
    })
  } catch {
    updateTranscriptActionState({
      busyAction: null,
      message: 'Opening markdown failed.',
    })
  }
}

async function loadActiveTabTranscript(): Promise<TranscriptResult> {
  const activeTab = await loadActiveTab()

  if (!activeTab?.id) {
    return {
      status: 'unavailable',
      reason: 'parse-failed',
    }
  }

  const transcriptResult = await chrome.tabs.sendMessage(
    activeTab.id,
    createGetPageTranscriptMessage(),
  )

  return transcriptResult as TranscriptResult
}

async function initializeTranscriptView(): Promise<void> {
  const transcriptStorageKey = getTranscriptStorageKeyFromUrl()
  const transcriptPayload = transcriptStorageKey
    ? await consumeTranscriptPayload(transcriptStorageKey)
    : null
  const viewModel = createTranscriptViewModel(transcriptPayload)

  document.body.classList.add('raw-transcript-view')

  if (transcriptPayload) {
    document.title = transcriptPayload.title
  }

  renderTranscriptViewContent(popupRootElement, viewModel)
}

function getPopupView(): 'popup' | 'transcript' {
  const searchParams = new URLSearchParams(window.location.search)
  const viewValue = searchParams.get('view')

  return viewValue === 'transcript'
    ? 'transcript'
    : 'popup'
}

function getTranscriptStorageKeyFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search)

  return searchParams.get('transcriptKey')
}

function updateTranscriptActionState(nextState: Partial<PopupTranscriptActionState>): void {
  popupState.transcriptActionState = {
    ...popupState.transcriptActionState,
    ...nextState,
  }
  renderPopup()
}

async function loadActiveTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    return activeTab ?? null
  } catch {
    return null
  }
}
