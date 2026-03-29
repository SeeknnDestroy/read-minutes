import { BADGE_HOST_ID } from '@/shared/constants'

export interface InlineDockHandlers {
  onCopy: () => void
  onDismiss: () => void
  onOpen: () => void
}

export interface InlineDockViewModel {
  copyButtonLabel: string
  isActionBusy: boolean
  message: string | null
  openButtonLabel: string
  readingTimeLabel: string
}

export function renderBadge(
  viewModel: InlineDockViewModel,
  handlers: InlineDockHandlers,
): void {
  const { mountElement } = getBadgeElements()
  const dockShellElement = createDockShell(viewModel, handlers)

  mountElement.replaceChildren(dockShellElement)
}

export function removeBadge(): void {
  const badgeHost = document.getElementById(BADGE_HOST_ID)

  badgeHost?.remove()
}

function getBadgeElements(): {
  mountElement: HTMLDivElement
} {
  const existingHost = document.getElementById(BADGE_HOST_ID)

  if (existingHost instanceof HTMLDivElement && existingHost.shadowRoot) {
    const existingMount = existingHost.shadowRoot.querySelector<HTMLDivElement>('[data-role="dock-mount"]')

    if (existingMount) {
      return {
        mountElement: existingMount,
      }
    }

    existingHost.remove()
  }

  const badgeHost = document.createElement('div')
  const shadowRoot = badgeHost.attachShadow({ mode: 'open' })
  const badgeStyleElement = document.createElement('style')
  const mountElement = document.createElement('div')

  badgeHost.id = BADGE_HOST_ID
  mountElement.dataset.role = 'dock-mount'
  badgeStyleElement.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      pointer-events: none;
    }

    .dock-shell {
      box-sizing: border-box;
      display: grid;
      gap: 10px;
      width: min(560px, calc(100vw - 24px));
      padding: 12px;
      border: 1px solid rgba(255, 241, 222, 0.14);
      border-radius: 22px;
      background:
        radial-gradient(circle at top left, rgba(216, 161, 75, 0.2) 0, rgba(12, 14, 17, 0) 42%),
        linear-gradient(180deg, rgba(22, 26, 31, 0.98) 0%, rgba(11, 13, 16, 0.98) 100%);
      box-shadow:
        0 24px 54px rgba(0, 0, 0, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
      color: #fff7ec;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      pointer-events: auto;
    }

    .dock-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 12px;
      justify-content: space-between;
    }

    .dock-context {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .dock-label {
      margin: 0;
      color: #d6a356;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .dock-reading-time {
      margin: 0;
      color: #fff8ef;
      font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      font-size: 25px;
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 0.95;
    }

    .dock-controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
      align-items: stretch;
      gap: 10px;
      flex: 1 1 320px;
    }

    button {
      appearance: none;
      border: none;
      color: inherit;
      font: inherit;
    }

    .dock-action {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      align-items: start;
      gap: 12px;
      min-height: 60px;
      padding: 12px 14px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      cursor: pointer;
      text-align: left;
      transition:
        background-color 160ms ease,
        opacity 160ms ease;
    }

    .dock-action-secondary {
      background: rgba(255, 255, 255, 0.03);
    }

    .dock-action-copy {
      display: grid;
      gap: 3px;
    }

    .dock-action-label {
      color: #fff7ec;
      font-size: 14px;
      font-weight: 700;
    }

    .dock-action-description,
    .dock-status {
      margin: 0;
      color: rgba(255, 247, 236, 0.62);
      font-size: 12px;
      line-height: 1.45;
    }

    .dock-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      transition: background-color 160ms ease;
    }

    .dock-action:hover,
    .dock-close:hover {
      background: rgba(255, 241, 222, 0.08);
    }

    .dock-action:focus-visible,
    .dock-close:focus-visible {
      outline: 2px solid rgba(216, 161, 75, 0.92);
      outline-offset: -2px;
    }

    .dock-action:disabled {
      cursor: wait;
      opacity: 0.68;
    }

    .dock-status {
      color: #f0be73;
    }

    .action-icon {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      fill: none;
    }

    @media (max-width: 720px) {
      .dock-shell {
        width: min(420px, calc(100vw - 24px));
      }

      .dock-controls {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dock-close {
        justify-self: end;
      }
    }
  `
  shadowRoot.append(badgeStyleElement, mountElement)
  document.documentElement.append(badgeHost)

  return {
    mountElement,
  }
}

function createDockShell(
  viewModel: InlineDockViewModel,
  handlers: InlineDockHandlers,
): HTMLElement {
  const dockShellElement = document.createElement('div')
  const dockBarElement = document.createElement('div')
  const contextElement = document.createElement('div')
  const labelElement = document.createElement('p')
  const readingTimeElement = document.createElement('p')
  const controlsElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const openButtonElement = document.createElement('button')
  const closeButtonElement = document.createElement('button')

  dockShellElement.className = 'dock-shell'
  dockBarElement.className = 'dock-bar'
  contextElement.className = 'dock-context'
  labelElement.className = 'dock-label'
  labelElement.textContent = 'Read Minutes'
  readingTimeElement.className = 'dock-reading-time'
  readingTimeElement.textContent = viewModel.readingTimeLabel
  contextElement.append(labelElement, readingTimeElement)
  controlsElement.className = 'dock-controls'
  copyButtonElement.className = 'dock-action'
  copyButtonElement.dataset.role = 'badge-copy'
  copyButtonElement.type = 'button'
  copyButtonElement.disabled = viewModel.isActionBusy
  copyButtonElement.append(
    createIconElement('copy'),
    createActionButtonCopy(viewModel.copyButtonLabel, 'Copy page as Markdown for LLMs'),
  )
  copyButtonElement.addEventListener('click', handlers.onCopy)
  openButtonElement.className = 'dock-action dock-action-secondary'
  openButtonElement.dataset.role = 'badge-open'
  openButtonElement.type = 'button'
  openButtonElement.disabled = viewModel.isActionBusy
  openButtonElement.append(
    createIconElement('markdown'),
    createActionButtonCopy(viewModel.openButtonLabel, 'Open this page as plain text'),
  )
  openButtonElement.addEventListener('click', handlers.onOpen)
  closeButtonElement.className = 'dock-close'
  closeButtonElement.dataset.role = 'badge-close'
  closeButtonElement.type = 'button'
  closeButtonElement.setAttribute('aria-label', 'Close page tools')
  closeButtonElement.textContent = '×'
  closeButtonElement.addEventListener('click', handlers.onDismiss)
  controlsElement.append(copyButtonElement, openButtonElement, closeButtonElement)
  dockBarElement.append(contextElement, controlsElement)
  dockShellElement.append(dockBarElement)

  if (viewModel.message) {
    const statusElement = document.createElement('p')

    statusElement.className = 'dock-status'
    statusElement.textContent = viewModel.message
    dockShellElement.append(statusElement)
  }

  return dockShellElement
}

function createActionButtonCopy(
  label: string,
  description: string,
): HTMLElement {
  const copyElement = document.createElement('span')
  const labelElement = document.createElement('span')
  const descriptionElement = document.createElement('span')

  copyElement.className = 'dock-action-copy'
  labelElement.className = 'dock-action-label'
  labelElement.textContent = label
  descriptionElement.className = 'dock-action-description'
  descriptionElement.textContent = description
  copyElement.append(labelElement, descriptionElement)

  return copyElement
}

function createIconElement(iconName: 'copy' | 'markdown'): SVGElement {
  const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  iconElement.setAttribute('viewBox', '0 0 24 24')
  iconElement.setAttribute('aria-hidden', 'true')
  iconElement.classList.add('action-icon')

  if (iconName === 'copy') {
    const firstRectElement = document.createElementNS(iconElement.namespaceURI, 'rect')
    const secondRectElement = document.createElementNS(iconElement.namespaceURI, 'rect')

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

  const frameElement = document.createElementNS(iconElement.namespaceURI, 'rect')
  const leftPathElement = document.createElementNS(iconElement.namespaceURI, 'path')
  const rightPathElement = document.createElementNS(iconElement.namespaceURI, 'path')

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
