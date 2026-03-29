import type { ExtensionSettings } from '@/shared/types'
import type { PopupViewModel, TranscriptViewModel } from './view-model'

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
    createTranscriptActionsCard(viewModel),
    createControlsCard(settings),
  )

  return popupShellElement
}

export function renderTranscriptViewContent(
  rootElement: HTMLDivElement,
  viewModel: TranscriptViewModel,
): void {
  rootElement.replaceChildren(createTranscriptShell(viewModel))
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

function createTranscriptActionsCard(viewModel: PopupViewModel): HTMLElement {
  const shouldShowTranscriptActions = viewModel.showTranscriptActions

  if (!shouldShowTranscriptActions) {
    return document.createDocumentFragment() as unknown as HTMLElement
  }

  const actionsCardElement = document.createElement('section')
  const actionsHeaderElement = document.createElement('div')
  const actionsLabelElement = document.createElement('p')
  const actionsHelpElement = document.createElement('p')
  const buttonsRowElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const openButtonElement = document.createElement('button')

  actionsCardElement.className = 'actions-card'
  actionsHeaderElement.className = 'actions-header'
  actionsLabelElement.className = 'control-label'
  actionsLabelElement.textContent = 'Markdown tools'
  actionsHelpElement.className = 'control-help'
  actionsHelpElement.textContent = 'Copy clean markdown for an LLM or open it in a dedicated page.'
  buttonsRowElement.className = 'actions-row'
  copyButtonElement.id = 'copy-markdown'
  copyButtonElement.className = 'action-button'
  copyButtonElement.type = 'button'
  copyButtonElement.textContent = viewModel.copyButtonLabel
  copyButtonElement.disabled = viewModel.isTranscriptActionBusy
  openButtonElement.id = 'open-markdown'
  openButtonElement.className = 'action-button action-button-secondary'
  openButtonElement.type = 'button'
  openButtonElement.textContent = viewModel.openButtonLabel
  openButtonElement.disabled = viewModel.isTranscriptActionBusy
  actionsHeaderElement.append(actionsLabelElement, actionsHelpElement)
  buttonsRowElement.append(copyButtonElement, openButtonElement)
  actionsCardElement.append(actionsHeaderElement, buttonsRowElement)

  if (viewModel.transcriptActionMessage) {
    const actionStatusElement = document.createElement('p')

    actionStatusElement.className = 'action-status'
    actionStatusElement.textContent = viewModel.transcriptActionMessage
    actionsCardElement.append(actionStatusElement)
  }

  return actionsCardElement
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

function createTranscriptShell(viewModel: TranscriptViewModel): HTMLElement {
  const transcriptShellElement = document.createElement('main')
  const transcriptHeaderElement = document.createElement('section')

  transcriptShellElement.className = 'transcript-shell'
  transcriptHeaderElement.className = 'transcript-header'
  transcriptHeaderElement.append(
    createTranscriptKicker(),
    createTranscriptTitle(viewModel.pageTitle),
  )

  if (viewModel.sourceUrl.length > 0) {
    transcriptHeaderElement.append(createTranscriptSourceLink(viewModel.sourceUrl))
  }

  transcriptShellElement.append(transcriptHeaderElement)

  if (!viewModel.exportText) {
    transcriptShellElement.append(createEmptyState(viewModel.emptyMessage))

    return transcriptShellElement
  }

  const transcriptCardElement = document.createElement('section')
  const transcriptMarkdownElement = document.createElement('pre')

  transcriptCardElement.className = 'transcript-card'
  transcriptMarkdownElement.className = 'transcript-markdown'
  transcriptMarkdownElement.textContent = viewModel.exportText
  transcriptCardElement.append(transcriptMarkdownElement)
  transcriptShellElement.append(transcriptCardElement)

  return transcriptShellElement
}

function createTranscriptKicker(): HTMLElement {
  const transcriptKickerElement = document.createElement('p')

  transcriptKickerElement.className = 'eyebrow'
  transcriptKickerElement.textContent = 'Local Markdown Transcript'

  return transcriptKickerElement
}

function createTranscriptTitle(pageTitle: string): HTMLElement {
  const transcriptTitleElement = document.createElement('h1')

  transcriptTitleElement.className = 'title'
  transcriptTitleElement.textContent = pageTitle

  return transcriptTitleElement
}

function createTranscriptSourceLink(sourceUrl: string): HTMLElement {
  const transcriptSourceElement = document.createElement('a')

  transcriptSourceElement.className = 'transcript-source'
  transcriptSourceElement.href = sourceUrl
  transcriptSourceElement.rel = 'noreferrer'
  transcriptSourceElement.target = '_blank'
  transcriptSourceElement.textContent = sourceUrl

  return transcriptSourceElement
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
