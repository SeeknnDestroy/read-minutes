import './styles.css'
import { createGetPageAnalysisMessage } from '@/shared/messages'
import { saveSettings, readSettings } from '@/shared/settings'
import { defaultSettings, type ExtensionSettings, type PageAnalysis } from '@/shared/types'
import { renderPopupContent } from './render'
import { createPopupViewModel } from './view-model'

const popupRootElement = getPopupRootElement()

const popupState = {
  analysis: null as PageAnalysis | null,
  settings: defaultSettings as ExtensionSettings,
}

void initializePopup()

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
  const viewModel = createPopupViewModel(popupState.analysis, popupState.settings)
  renderPopupContent(popupRootElement, viewModel, popupState.settings)

  bindControlEvents()
}

function bindControlEvents(): void {
  const inlineBadgeInput = popupRootElement.querySelector<HTMLInputElement>('#show-inline-badge')
  const wordsPerMinuteInput = popupRootElement.querySelector<HTMLInputElement>('#words-per-minute')

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
