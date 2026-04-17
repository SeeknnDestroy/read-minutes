import type { ExtensionSettings } from '@/shared/types'
import type { PopupViewModel, TranscriptViewModel } from './view-model'

export function renderPopupContent(
  rootElement: HTMLDivElement,
  viewModel: PopupViewModel,
  settings: ExtensionSettings,
): void {
  rootElement.replaceChildren(createPopupShell(viewModel, settings))
}

export function renderTranscriptViewContent(
  rootElement: HTMLDivElement,
  viewModel: TranscriptViewModel,
): void {
  rootElement.replaceChildren(createTranscriptContent(viewModel))
}

function createPopupShell(
  viewModel: PopupViewModel,
  settings: ExtensionSettings,
): HTMLElement {
  const popupShellElement = document.createElement('main')

  popupShellElement.className = 'popup-shell'
  popupShellElement.append(
    createHeaderSection(viewModel),
    createSummarySection(viewModel),
    createSettingsSection(settings),
  )

  return popupShellElement
}

function createHeaderSection(viewModel: PopupViewModel): HTMLElement {
  const headerSectionElement = document.createElement('section')
  const headerRowElement = document.createElement('div')
  const eyebrowElement = document.createElement('p')
  const statusPillElement = document.createElement('p')
  const domainElement = document.createElement('p')
  const titleElement = document.createElement('h1')
  const domainText = viewModel.hostname || 'Reading time'

  headerSectionElement.className = 'popup-header'
  headerRowElement.className = 'header-row'
  eyebrowElement.className = 'eyebrow'
  eyebrowElement.textContent = 'Read Minutes'
  statusPillElement.className = 'status-pill'
  statusPillElement.textContent = viewModel.statusLabel
  domainElement.className = 'domain'
  domainElement.textContent = domainText
  titleElement.className = 'title'
  titleElement.textContent = viewModel.pageTitle
  headerRowElement.append(eyebrowElement, statusPillElement)
  headerSectionElement.append(headerRowElement, domainElement, titleElement)

  return headerSectionElement
}

function createSummarySection(viewModel: PopupViewModel): HTMLElement {
  const summarySectionElement = document.createElement('section')

  summarySectionElement.className = 'popup-summary'

  if (viewModel.readingTimeValue && viewModel.wordCountValue) {
    summarySectionElement.append(
      createStatsGrid(viewModel.readingTimeValue, viewModel.wordCountValue),
    )
  } else {
    summarySectionElement.append(createEmptyState(viewModel.emptyMessage))
  }

  if (viewModel.showTranscriptActions) {
    summarySectionElement.append(createTranscriptToolbar(viewModel))
  } else {
    summarySectionElement.append(createTranscriptHint())
  }

  return summarySectionElement
}

function createStatsGrid(
  readingTimeValue: string,
  wordCountValue: string,
): HTMLElement {
  const statsGridElement = document.createElement('div')

  statsGridElement.className = 'stats-grid'
  statsGridElement.append(
    createStatItem('Reading time', readingTimeValue),
    createStatItem('Word count', wordCountValue),
  )

  return statsGridElement
}

function createStatItem(label: string, value: string): HTMLElement {
  const statItemElement = document.createElement('article')
  const statLabelElement = document.createElement('p')
  const statValueElement = document.createElement('p')

  statItemElement.className = 'stat-item'
  statLabelElement.className = 'metric-label'
  statLabelElement.textContent = label
  statValueElement.className = 'metric-value'
  statValueElement.textContent = value
  statItemElement.append(statLabelElement, statValueElement)

  return statItemElement
}

function createEmptyState(message: string | null): HTMLElement {
  const emptyStateElement = document.createElement('div')
  const messageElement = document.createElement('p')

  emptyStateElement.className = 'empty-state'
  messageElement.textContent = message ?? ''
  emptyStateElement.append(messageElement)

  return emptyStateElement
}

function createTranscriptToolbar(viewModel: PopupViewModel): HTMLElement {
  const toolbarElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const openButtonElement = document.createElement('button')

  toolbarElement.className = 'transcript-toolbar'
  copyButtonElement.id = 'copy-markdown'
  copyButtonElement.className = 'toolbar-button'
  copyButtonElement.type = 'button'
  copyButtonElement.disabled = viewModel.isTranscriptActionBusy
  copyButtonElement.append(
    createIconElement('copy'),
    createActionButtonCopy(viewModel.copyButtonLabel),
  )
  openButtonElement.id = 'open-markdown'
  openButtonElement.className = 'toolbar-button toolbar-button-secondary'
  openButtonElement.type = 'button'
  openButtonElement.disabled = viewModel.isTranscriptActionBusy
  openButtonElement.append(
    createIconElement('markdown'),
    createActionButtonCopy(viewModel.openButtonLabel),
  )
  toolbarElement.append(copyButtonElement, openButtonElement)

  if (viewModel.transcriptActionMessage) {
    const actionStatusElement = document.createElement('p')

    actionStatusElement.className = 'action-status'
    actionStatusElement.textContent = viewModel.transcriptActionMessage
    toolbarElement.append(actionStatusElement)
  }

  return toolbarElement
}

function createActionButtonCopy(label: string): HTMLElement {
  const labelElement = document.createElement('span')

  labelElement.className = 'action-button-label'
  labelElement.textContent = label

  return labelElement
}

function createTranscriptHint(): HTMLElement {
  const hintElement = document.createElement('p')

  hintElement.className = 'transcript-hint'
  hintElement.textContent = 'Article tools appear when long-form content is detected.'

  return hintElement
}

function createSettingsSection(settings: ExtensionSettings): HTMLElement {
  const settingsSectionElement = document.createElement('section')
  const headerElement = document.createElement('div')
  const labelElement = document.createElement('p')
  const headingTextElement = document.createElement('p')
  const settingsGridElement = document.createElement('div')

  settingsSectionElement.className = 'settings-section'
  headerElement.className = 'section-copy'
  labelElement.className = 'section-label'
  labelElement.textContent = 'Preferences'
  headingTextElement.className = 'section-heading'
  headingTextElement.textContent = 'Keep the page tools useful and out of the way.'
  settingsGridElement.className = 'settings-grid'
  settingsGridElement.append(
    createInlineBadgeControl(settings.showInlineBadge),
    createWordsPerMinuteField(settings.wordsPerMinute),
  )
  headerElement.append(labelElement, headingTextElement)
  settingsSectionElement.append(headerElement, settingsGridElement)

  return settingsSectionElement
}

function createInlineBadgeControl(showInlineBadge: boolean): HTMLElement {
  const labelElement = document.createElement('label')
  const controlCopyElement = document.createElement('span')
  const controlLabelElement = document.createElement('span')
  const controlHelpElement = document.createElement('span')
  const inputElement = document.createElement('input')

  labelElement.className = 'preference-card preference-toggle'
  labelElement.htmlFor = 'show-inline-badge'
  controlCopyElement.className = 'control-copy'
  controlLabelElement.className = 'control-label'
  controlLabelElement.textContent = 'Show inline dock'
  controlHelpElement.className = 'control-help'
  controlHelpElement.textContent = 'Keep the floating tools on article pages.'
  inputElement.id = 'show-inline-badge'
  inputElement.type = 'checkbox'
  inputElement.checked = showInlineBadge
  controlCopyElement.append(controlLabelElement, controlHelpElement)
  labelElement.append(controlCopyElement, inputElement)

  return labelElement
}

function createWordsPerMinuteField(wordsPerMinute: number): HTMLElement {
  const labelElement = document.createElement('label')
  const controlCopyElement = document.createElement('span')
  const controlLabelElement = document.createElement('span')
  const controlHelpElement = document.createElement('span')
  const inputElement = document.createElement('input')

  labelElement.className = 'preference-card preference-field'
  labelElement.htmlFor = 'words-per-minute'
  controlCopyElement.className = 'control-copy'
  controlLabelElement.className = 'control-label'
  controlLabelElement.textContent = 'Words per minute'
  controlHelpElement.className = 'control-help'
  controlHelpElement.textContent = 'Set the pace for this browser.'
  inputElement.id = 'words-per-minute'
  inputElement.className = 'number-input'
  inputElement.type = 'number'
  inputElement.min = '1'
  inputElement.step = '1'
  inputElement.value = String(wordsPerMinute)
  controlCopyElement.append(controlLabelElement, controlHelpElement)
  labelElement.append(controlCopyElement, inputElement)

  return labelElement
}

function createTranscriptContent(viewModel: TranscriptViewModel): HTMLElement {
  if (!viewModel.exportText) {
    return createEmptyState(viewModel.emptyMessage)
  }

  const transcriptMarkdownElement = document.createElement('pre')

  transcriptMarkdownElement.textContent = viewModel.exportText

  return transcriptMarkdownElement
}

function createIconElement(iconName: 'copy' | 'markdown'): SVGElement {
  const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  iconElement.setAttribute('viewBox', '0 0 24 24')
  iconElement.setAttribute('aria-hidden', 'true')

  if (iconName === 'copy') {
    const firstRectElement = document.createElementNS(iconElement.namespaceURI, 'rect')
    const secondRectElement = document.createElementNS(iconElement.namespaceURI, 'rect')

    iconElement.classList.add('action-icon')
    firstRectElement.setAttribute('x', '9')
    firstRectElement.setAttribute('y', '7')
    firstRectElement.setAttribute('width', '10')
    firstRectElement.setAttribute('height', '12')
    firstRectElement.setAttribute('rx', '2')
    secondRectElement.setAttribute('x', '5')
    secondRectElement.setAttribute('y', '3')
    secondRectElement.setAttribute('width', '10')
    secondRectElement.setAttribute('height', '12')
    secondRectElement.setAttribute('rx', '2')
    iconElement.append(firstRectElement, secondRectElement)

    return iconElement
  }

  if (iconName === 'markdown') {
    const frameElement = document.createElementNS(iconElement.namespaceURI, 'rect')
    const leftPathElement = document.createElementNS(iconElement.namespaceURI, 'path')
    const rightPathElement = document.createElementNS(iconElement.namespaceURI, 'path')

    iconElement.classList.add('action-icon')
    frameElement.setAttribute('x', '3')
    frameElement.setAttribute('y', '5')
    frameElement.setAttribute('width', '18')
    frameElement.setAttribute('height', '14')
    frameElement.setAttribute('rx', '3')
    leftPathElement.setAttribute('d', 'M7 15V9l3 3 3-3v6')
    rightPathElement.setAttribute('d', 'M15 15h2.5a1.5 1.5 0 0 0 0-3H15')
    iconElement.append(frameElement, leftPathElement, rightPathElement)

    return iconElement
  }

  return iconElement
}
