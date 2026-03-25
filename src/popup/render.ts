import type { ExtensionSettings } from '@/shared/types'
import type { PopupViewModel } from './view-model'

export function renderPopupContent(
  rootElement: HTMLDivElement,
  viewModel: PopupViewModel,
  settings: ExtensionSettings,
): void {
  rootElement.replaceChildren(createPopupShell(viewModel, settings))
}

function createPopupShell(
  viewModel: PopupViewModel,
  settings: ExtensionSettings,
): HTMLElement {
  const popupShellElement = document.createElement('main')

  popupShellElement.className = 'popup-shell'
  popupShellElement.append(
    createHeroCard(viewModel),
    createMetricsSection(viewModel),
    createControlsCard(settings),
  )

  return popupShellElement
}

function createHeroCard(viewModel: PopupViewModel): HTMLElement {
  const heroCardElement = document.createElement('section')
  const eyebrowElement = document.createElement('p')
  const heroCopyElement = document.createElement('div')
  const headerContainerElement = document.createElement('div')
  const domainElement = document.createElement('p')
  const titleElement = document.createElement('h1')
  const statusPillElement = document.createElement('p')
  const domainText = viewModel.hostname || 'Reading time'

  heroCardElement.className = 'hero-card'
  eyebrowElement.className = 'eyebrow'
  eyebrowElement.textContent = 'Read Minutes'
  heroCopyElement.className = 'hero-copy'
  domainElement.className = 'domain'
  domainElement.textContent = domainText
  titleElement.className = 'title'
  titleElement.textContent = viewModel.pageTitle
  statusPillElement.className = 'status-pill'
  statusPillElement.textContent = viewModel.statusLabel
  headerContainerElement.append(domainElement, titleElement)
  heroCopyElement.append(headerContainerElement, statusPillElement)
  heroCardElement.append(eyebrowElement, heroCopyElement)

  return heroCardElement
}

function createMetricsSection(viewModel: PopupViewModel): HTMLElement {
  const hasArticleMetrics = Boolean(viewModel.readingTimeValue && viewModel.wordCountValue)

  if (!hasArticleMetrics) {
    return createEmptyState(viewModel.emptyMessage)
  }

  const metricsGridElement = document.createElement('section')

  metricsGridElement.className = 'metrics-grid'
  metricsGridElement.append(
    createMetricCard('Reading time', viewModel.readingTimeValue ?? ''),
    createMetricCard('Word count', viewModel.wordCountValue ?? ''),
  )

  return metricsGridElement
}

function createMetricCard(label: string, value: string): HTMLElement {
  const metricCardElement = document.createElement('article')
  const metricLabelElement = document.createElement('p')
  const metricValueElement = document.createElement('p')

  metricCardElement.className = 'metric-card'
  metricLabelElement.className = 'metric-label'
  metricLabelElement.textContent = label
  metricValueElement.className = 'metric-value'
  metricValueElement.textContent = value
  metricCardElement.append(metricLabelElement, metricValueElement)

  return metricCardElement
}

function createEmptyState(message: string | null): HTMLElement {
  const emptyStateElement = document.createElement('section')
  const messageElement = document.createElement('p')

  emptyStateElement.className = 'empty-state'
  messageElement.textContent = message ?? ''
  emptyStateElement.append(messageElement)

  return emptyStateElement
}

function createControlsCard(settings: ExtensionSettings): HTMLElement {
  const controlsCardElement = document.createElement('section')
  const inlineBadgeControlElement = createInlineBadgeControl(settings.showInlineBadge)
  const wordsPerMinuteFieldElement = createWordsPerMinuteField(settings.wordsPerMinute)

  controlsCardElement.className = 'controls-card'
  controlsCardElement.append(inlineBadgeControlElement, wordsPerMinuteFieldElement)

  return controlsCardElement
}

function createInlineBadgeControl(showInlineBadge: boolean): HTMLElement {
  const labelElement = document.createElement('label')
  const controlCopyElement = document.createElement('span')
  const controlLabelElement = document.createElement('span')
  const controlHelpElement = document.createElement('span')
  const inputElement = document.createElement('input')

  labelElement.className = 'control-row'
  labelElement.htmlFor = 'show-inline-badge'
  controlCopyElement.className = 'control-copy'
  controlLabelElement.className = 'control-label'
  controlLabelElement.textContent = 'Show inline badge'
  controlHelpElement.className = 'control-help'
  controlHelpElement.textContent = 'Display a floating read-time pill on article pages.'
  inputElement.id = 'show-inline-badge'
  inputElement.type = 'checkbox'
  inputElement.checked = showInlineBadge
  controlCopyElement.append(controlLabelElement, controlHelpElement)
  labelElement.append(controlCopyElement, inputElement)

  return labelElement
}

function createWordsPerMinuteField(wordsPerMinute: number): HTMLElement {
  const labelElement = document.createElement('label')
  const controlLabelElement = document.createElement('span')
  const inputElement = document.createElement('input')

  labelElement.className = 'field-group'
  labelElement.htmlFor = 'words-per-minute'
  controlLabelElement.className = 'control-label'
  controlLabelElement.textContent = 'Words per minute'
  inputElement.id = 'words-per-minute'
  inputElement.className = 'number-input'
  inputElement.type = 'number'
  inputElement.min = '1'
  inputElement.step = '1'
  inputElement.value = String(wordsPerMinute)
  labelElement.append(controlLabelElement, inputElement)

  return labelElement
}
