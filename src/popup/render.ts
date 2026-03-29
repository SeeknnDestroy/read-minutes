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
    createHeroSection(viewModel),
    createSupportSection(viewModel),
    createTranscriptSection(viewModel),
    createSettingsSection(settings),
  )

  return popupShellElement
}

function createHeroSection(viewModel: PopupViewModel): HTMLElement {
  const heroSectionElement = document.createElement('section')
  const heroHeaderElement = document.createElement('div')
  const eyebrowElement = document.createElement('p')
  const statusPillElement = document.createElement('p')
  const domainElement = document.createElement('p')
  const titleElement = document.createElement('h1')
  const domainText = viewModel.hostname || 'Reading time'

  heroSectionElement.className = 'popup-hero'
  heroHeaderElement.className = 'hero-header'
  eyebrowElement.className = 'eyebrow'
  eyebrowElement.textContent = 'Read Minutes'
  statusPillElement.className = 'status-pill'
  statusPillElement.textContent = viewModel.statusLabel
  domainElement.className = 'domain'
  domainElement.textContent = domainText
  titleElement.className = 'title'
  titleElement.textContent = viewModel.pageTitle
  heroHeaderElement.append(eyebrowElement, statusPillElement)
  heroSectionElement.append(heroHeaderElement, domainElement, titleElement)

  return heroSectionElement
}

function createSupportSection(viewModel: PopupViewModel): HTMLElement {
  const hasArticleMetrics = Boolean(viewModel.readingTimeValue && viewModel.wordCountValue)

  if (!hasArticleMetrics) {
    return createEmptyState(viewModel.emptyMessage)
  }

  const supportSectionElement = document.createElement('section')
  const statsGridElement = document.createElement('div')

  supportSectionElement.className = 'popup-support'
  statsGridElement.className = 'stats-grid'
  statsGridElement.append(
    createStatItem('Reading time', viewModel.readingTimeValue ?? ''),
    createStatItem('Word count', viewModel.wordCountValue ?? ''),
  )
  supportSectionElement.append(statsGridElement)

  return supportSectionElement
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
  const emptyStateElement = document.createElement('section')
  const messageElement = document.createElement('p')

  emptyStateElement.className = 'empty-state'
  messageElement.textContent = message ?? ''
  emptyStateElement.append(messageElement)

  return emptyStateElement
}

function createTranscriptSection(viewModel: PopupViewModel): HTMLElement {
  const sectionElement = document.createElement('section')
  const headingElement = document.createElement('div')
  const labelElement = document.createElement('p')
  const headingTextElement = document.createElement('p')

  sectionElement.className = 'transcript-section'
  labelElement.className = 'section-label'
  labelElement.textContent = 'Page tools'
  headingTextElement.className = 'section-heading'
  headingTextElement.textContent = 'Use the article as clean markdown.'
  headingElement.className = 'section-copy'
  headingElement.append(labelElement, headingTextElement)
  sectionElement.append(headingElement)

  if (viewModel.showTranscriptActions) {
    sectionElement.append(createTranscriptDock(viewModel))
  } else {
    sectionElement.append(createTranscriptEmptyState())
  }

  return sectionElement
}

function createTranscriptDock(viewModel: PopupViewModel): HTMLElement {
  const transcriptDockElement = document.createElement('div')
  const splitButtonElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const copyButtonIconElement = createIconElement('copy')
  const copyButtonLabelElement = document.createElement('span')
  const toggleButtonElement = document.createElement('button')
  const toggleButtonIconElement = createIconElement('chevron')
  const menuElement = document.createElement('div')

  transcriptDockElement.className = 'transcript-dock'
  splitButtonElement.className = 'split-button'
  copyButtonElement.id = 'copy-markdown'
  copyButtonElement.className = 'dock-primary-button'
  copyButtonElement.type = 'button'
  copyButtonElement.disabled = viewModel.isTranscriptActionBusy
  copyButtonLabelElement.textContent = viewModel.copyButtonLabel
  copyButtonElement.append(copyButtonIconElement, copyButtonLabelElement)
  toggleButtonElement.id = 'toggle-transcript-menu'
  toggleButtonElement.className = 'dock-toggle-button'
  toggleButtonElement.type = 'button'
  toggleButtonElement.disabled = viewModel.isTranscriptActionBusy
  toggleButtonElement.setAttribute('aria-controls', 'transcript-menu')
  toggleButtonElement.setAttribute('aria-expanded', String(viewModel.isTranscriptMenuOpen))
  toggleButtonElement.setAttribute('aria-label', 'Show more transcript actions')
  toggleButtonIconElement.classList.add('toggle-icon')

  if (viewModel.isTranscriptMenuOpen) {
    toggleButtonIconElement.classList.add('toggle-icon-open')
  }

  toggleButtonElement.append(toggleButtonIconElement)
  splitButtonElement.append(copyButtonElement, toggleButtonElement)
  menuElement.id = 'transcript-menu'
  menuElement.className = 'transcript-menu'
  menuElement.hidden = !viewModel.isTranscriptMenuOpen
  menuElement.append(
    createTranscriptMenuItem({
      buttonId: 'copy-markdown-menu-item',
      description: 'Copy page as Markdown for LLMs',
      iconName: 'copy',
      isBusy: viewModel.copyButtonLabel === 'Copying...',
      label: viewModel.copyButtonLabel,
    }),
    createTranscriptMenuItem({
      buttonId: 'open-markdown',
      description: 'Open this page as plain text',
      iconName: 'markdown',
      isBusy: viewModel.openButtonLabel === 'Opening...',
      label: viewModel.openButtonLabel,
    }),
  )
  transcriptDockElement.append(splitButtonElement, menuElement)

  if (viewModel.transcriptActionMessage) {
    const actionStatusElement = document.createElement('p')

    actionStatusElement.className = 'action-status'
    actionStatusElement.textContent = viewModel.transcriptActionMessage
    transcriptDockElement.append(actionStatusElement)
  }

  return transcriptDockElement
}

function createTranscriptMenuItem({
  buttonId,
  description,
  iconName,
  isBusy,
  label,
}: {
  buttonId: string
  description: string
  iconName: 'copy' | 'markdown'
  isBusy: boolean
  label: string
}): HTMLElement {
  const buttonElement = document.createElement('button')
  const iconElement = createIconElement(iconName)
  const copyElement = document.createElement('span')
  const labelElement = document.createElement('span')
  const descriptionElement = document.createElement('span')

  buttonElement.id = buttonId
  buttonElement.className = 'menu-button'
  buttonElement.type = 'button'
  buttonElement.disabled = isBusy
  copyElement.className = 'menu-copy'
  labelElement.className = 'menu-label'
  labelElement.textContent = label
  descriptionElement.className = 'menu-description'
  descriptionElement.textContent = description
  copyElement.append(labelElement, descriptionElement)
  buttonElement.append(iconElement, copyElement)

  return buttonElement
}

function createTranscriptEmptyState(): HTMLElement {
  const emptyCopyElement = document.createElement('p')

  emptyCopyElement.className = 'empty-action-copy'
  emptyCopyElement.textContent = 'Transcript actions appear when an article is detected.'

  return emptyCopyElement
}

function createSettingsSection(settings: ExtensionSettings): HTMLElement {
  const settingsSectionElement = document.createElement('section')
  const headingElement = document.createElement('div')
  const labelElement = document.createElement('p')
  const headingTextElement = document.createElement('p')
  const inlineBadgeControlElement = createInlineBadgeControl(settings.showInlineBadge)
  const wordsPerMinuteFieldElement = createWordsPerMinuteField(settings.wordsPerMinute)

  settingsSectionElement.className = 'settings-section'
  headingElement.className = 'section-copy'
  labelElement.className = 'section-label'
  labelElement.textContent = 'Preferences'
  headingTextElement.className = 'section-heading'
  headingTextElement.textContent = 'Tune the inline dock and your reading-speed estimate.'
  headingElement.append(labelElement, headingTextElement)
  settingsSectionElement.append(
    headingElement,
    inlineBadgeControlElement,
    wordsPerMinuteFieldElement,
  )

  return settingsSectionElement
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
  controlLabelElement.textContent = 'Show inline dock'
  controlHelpElement.className = 'control-help'
  controlHelpElement.textContent = 'Keep the floating page tools visible on article pages.'
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

  labelElement.className = 'field-group'
  labelElement.htmlFor = 'words-per-minute'
  controlCopyElement.className = 'control-copy'
  controlLabelElement.className = 'control-label'
  controlLabelElement.textContent = 'Words per minute'
  controlHelpElement.className = 'control-help'
  controlHelpElement.textContent = 'Update the reading-time estimate for this browser.'
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

function createIconElement(iconName: 'chevron' | 'copy' | 'markdown'): SVGElement {
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

  const chevronPathElement = document.createElementNS(iconElement.namespaceURI, 'path')

  iconElement.classList.add('chevron-icon')
  chevronPathElement.setAttribute('d', 'm6 9 6 6 6-6')
  iconElement.append(chevronPathElement)

  return iconElement
}
