import './styles.css'
import { createGetPageAnalysisMessage } from '@/shared/messages'
import { saveSettings, readSettings } from '@/shared/settings'
import { defaultSettings, type ExtensionSettings, type PageAnalysis } from '@/shared/types'
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
  const articleMetrics = viewModel.readingTimeValue && viewModel.wordCountValue
    ? `
      <section class="metrics-grid">
        <article class="metric-card">
          <p class="metric-label">Reading time</p>
          <p class="metric-value">${viewModel.readingTimeValue}</p>
        </article>
        <article class="metric-card">
          <p class="metric-label">Word count</p>
          <p class="metric-value">${viewModel.wordCountValue}</p>
        </article>
      </section>
    `
    : `
      <section class="empty-state">
        <p>${viewModel.emptyMessage}</p>
      </section>
    `

  popupRootElement.innerHTML = `
    <main class="popup-shell">
      <section class="hero-card">
        <p class="eyebrow">Read Minutes</p>
        <div class="hero-copy">
          <div>
            <p class="domain">${viewModel.hostname || 'Reading time'}</p>
            <h1 class="title">${viewModel.pageTitle}</h1>
          </div>
          <p class="status-pill">${viewModel.statusLabel}</p>
        </div>
      </section>
      ${articleMetrics}
      <section class="controls-card">
        <label class="control-row" for="show-inline-badge">
          <span class="control-copy">
            <span class="control-label">Show inline badge</span>
            <span class="control-help">Display a floating read-time pill on article pages.</span>
          </span>
          <input id="show-inline-badge" type="checkbox" ${popupState.settings.showInlineBadge ? 'checked' : ''} />
        </label>
        <label class="field-group" for="words-per-minute">
          <span class="control-label">Words per minute</span>
          <input
            id="words-per-minute"
            class="number-input"
            type="number"
            min="1"
            step="1"
            value="${popupState.settings.wordsPerMinute}"
          />
        </label>
      </section>
    </main>
  `

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
