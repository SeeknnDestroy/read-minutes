import { BADGE_HOST_ID } from '@/shared/constants'

export interface InlineDockHandlers {
  onCloseMenu: () => void
  onCopy: () => void
  onDismiss: () => void
  onOpen: () => void
  onToggleMenu: () => void
}

export interface InlineDockViewModel {
  copyButtonLabel: string
  isActionBusy: boolean
  isMenuOpen: boolean
  message: string | null
  openButtonLabel: string
  readingTimeLabel: string
}

let cleanupDockListeners: (() => void) | null = null

export function renderBadge(
  viewModel: InlineDockViewModel,
  handlers: InlineDockHandlers,
): void {
  const { badgeHost, mountElement } = getBadgeElements()
  const dockShellElement = createDockShell(viewModel, handlers)

  cleanupDockListeners?.()
  cleanupDockListeners = null
  mountElement.replaceChildren(dockShellElement)

  if (viewModel.isMenuOpen) {
    cleanupDockListeners = installDismissListeners(badgeHost, handlers.onCloseMenu)
  }
}

export function removeBadge(): void {
  cleanupDockListeners?.()
  cleanupDockListeners = null

  const badgeHost = document.getElementById(BADGE_HOST_ID)

  badgeHost?.remove()
}

function getBadgeElements(): {
  badgeHost: HTMLDivElement
  mountElement: HTMLDivElement
} {
  const existingHost = document.getElementById(BADGE_HOST_ID)

  if (existingHost instanceof HTMLDivElement && existingHost.shadowRoot) {
    const existingMount = existingHost.shadowRoot.querySelector<HTMLDivElement>('[data-role="dock-mount"]')

    if (existingMount) {
      return {
        badgeHost: existingHost,
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
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .split-button {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 52px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      overflow: hidden;
    }

    button {
      appearance: none;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
    }

    .dock-copy,
    .dock-menu-toggle,
    .dock-close,
    .menu-button {
      cursor: pointer;
      transition:
        background-color 160ms ease,
        transform 160ms ease,
        opacity 160ms ease;
    }

    .dock-copy,
    .dock-menu-toggle {
      min-height: 48px;
    }

    .dock-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 0 16px;
      font-size: 15px;
      font-weight: 700;
      white-space: nowrap;
    }

    .dock-menu-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-left: 1px solid rgba(255, 241, 222, 0.1);
      color: rgba(255, 247, 236, 0.8);
    }

    .dock-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 247, 236, 0.7);
      font-size: 18px;
      line-height: 1;
    }

    .dock-copy:hover,
    .dock-menu-toggle:hover,
    .dock-close:hover,
    .menu-button:hover {
      background: rgba(255, 241, 222, 0.08);
    }

    .dock-copy:focus-visible,
    .dock-menu-toggle:focus-visible,
    .dock-close:focus-visible,
    .menu-button:focus-visible {
      outline: 2px solid rgba(216, 161, 75, 0.92);
      outline-offset: -2px;
    }

    .dock-copy:disabled,
    .dock-menu-toggle:disabled,
    .menu-button:disabled {
      cursor: wait;
      opacity: 0.68;
    }

    .dock-menu {
      display: grid;
      gap: 6px;
      padding: 8px;
      border: 1px solid rgba(255, 241, 222, 0.1);
      border-radius: 18px;
      background: rgba(16, 19, 24, 0.96);
    }

    .menu-button {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      padding: 12px;
      border-radius: 14px;
      text-align: left;
    }

    .menu-copy {
      display: grid;
      gap: 3px;
    }

    .menu-label {
      font-size: 14px;
      font-weight: 700;
      color: #fff7ec;
    }

    .menu-description,
    .dock-status {
      margin: 0;
      color: rgba(255, 247, 236, 0.62);
      font-size: 12px;
      line-height: 1.45;
    }

    .dock-status {
      color: #f0be73;
    }

    .action-icon,
    .chevron-icon {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
    }

    .action-icon {
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      fill: none;
    }

    .chevron-icon {
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      fill: none;
      transition: transform 160ms ease;
    }

    .chevron-icon-open {
      transform: rotate(180deg);
    }

    @media (max-width: 720px) {
      .dock-shell {
        width: min(420px, calc(100vw - 24px));
      }

      .dock-bar {
        align-items: stretch;
      }

      .dock-controls {
        width: 100%;
        justify-content: stretch;
      }

      .split-button {
        flex: 1 1 260px;
      }
    }
  `
  shadowRoot.append(badgeStyleElement, mountElement)
  document.documentElement.append(badgeHost)

  return {
    badgeHost,
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
  const splitButtonElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const toggleButtonElement = document.createElement('button')
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
  splitButtonElement.className = 'split-button'
  copyButtonElement.className = 'dock-copy'
  copyButtonElement.dataset.role = 'badge-copy'
  copyButtonElement.type = 'button'
  copyButtonElement.disabled = viewModel.isActionBusy
  copyButtonElement.append(createIconElement('copy'), createButtonLabel(viewModel.copyButtonLabel))
  copyButtonElement.addEventListener('click', handlers.onCopy)
  toggleButtonElement.className = 'dock-menu-toggle'
  toggleButtonElement.dataset.role = 'badge-menu-toggle'
  toggleButtonElement.type = 'button'
  toggleButtonElement.disabled = viewModel.isActionBusy
  toggleButtonElement.setAttribute('aria-expanded', String(viewModel.isMenuOpen))
  toggleButtonElement.setAttribute('aria-label', 'Show more page tools')
  toggleButtonElement.append(createChevronIcon(viewModel.isMenuOpen))
  toggleButtonElement.addEventListener('click', handlers.onToggleMenu)
  closeButtonElement.className = 'dock-close'
  closeButtonElement.dataset.role = 'badge-close'
  closeButtonElement.type = 'button'
  closeButtonElement.setAttribute('aria-label', 'Close page tools')
  closeButtonElement.textContent = '×'
  closeButtonElement.addEventListener('click', handlers.onDismiss)
  splitButtonElement.append(copyButtonElement, toggleButtonElement)
  controlsElement.append(splitButtonElement, closeButtonElement)
  dockBarElement.append(contextElement, controlsElement)
  dockShellElement.append(dockBarElement)

  if (viewModel.isMenuOpen) {
    dockShellElement.append(createDockMenu(viewModel, handlers))
  }

  if (viewModel.message) {
    const statusElement = document.createElement('p')

    statusElement.className = 'dock-status'
    statusElement.textContent = viewModel.message
    dockShellElement.append(statusElement)
  }

  return dockShellElement
}

function createDockMenu(
  viewModel: InlineDockViewModel,
  handlers: InlineDockHandlers,
): HTMLElement {
  const menuElement = document.createElement('div')

  menuElement.className = 'dock-menu'
  menuElement.dataset.role = 'badge-menu'
  menuElement.append(
    createMenuButton({
      buttonRole: 'badge-copy-menu-item',
      description: 'Copy page as Markdown for LLMs',
      iconName: 'copy',
      isBusy: viewModel.copyButtonLabel === 'Copying...',
      label: viewModel.copyButtonLabel,
      onClick: handlers.onCopy,
    }),
    createMenuButton({
      buttonRole: 'badge-open',
      description: 'Open this page as plain text',
      iconName: 'markdown',
      isBusy: viewModel.openButtonLabel === 'Opening...',
      label: viewModel.openButtonLabel,
      onClick: handlers.onOpen,
    }),
  )

  return menuElement
}

function createMenuButton({
  buttonRole,
  description,
  iconName,
  isBusy,
  label,
  onClick,
}: {
  buttonRole: string
  description: string
  iconName: 'copy' | 'markdown'
  isBusy: boolean
  label: string
  onClick: () => void
}): HTMLElement {
  const buttonElement = document.createElement('button')
  const iconElement = createIconElement(iconName)
  const copyElement = document.createElement('span')
  const labelElement = document.createElement('span')
  const descriptionElement = document.createElement('span')

  buttonElement.className = 'menu-button'
  buttonElement.dataset.role = buttonRole
  buttonElement.type = 'button'
  buttonElement.disabled = isBusy
  buttonElement.addEventListener('click', onClick)
  copyElement.className = 'menu-copy'
  labelElement.className = 'menu-label'
  labelElement.textContent = label
  descriptionElement.className = 'menu-description'
  descriptionElement.textContent = description
  copyElement.append(labelElement, descriptionElement)
  buttonElement.append(iconElement, copyElement)

  return buttonElement
}

function createButtonLabel(value: string): HTMLElement {
  const labelElement = document.createElement('span')

  labelElement.textContent = value

  return labelElement
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

function createChevronIcon(isOpen: boolean): SVGElement {
  const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const chevronPathElement = document.createElementNS(iconElement.namespaceURI, 'path')

  iconElement.setAttribute('viewBox', '0 0 24 24')
  iconElement.setAttribute('aria-hidden', 'true')
  iconElement.classList.add('chevron-icon')

  if (isOpen) {
    iconElement.classList.add('chevron-icon-open')
  }

  chevronPathElement.setAttribute('d', 'm6 9 6 6 6-6')
  iconElement.append(chevronPathElement)

  return iconElement
}

function installDismissListeners(
  badgeHost: HTMLDivElement,
  onCloseMenu: () => void,
): () => void {
  const handleDocumentMouseDown = (event: MouseEvent) => {
    const eventPath = event.composedPath()
    const clickStayedInsideDock = eventPath.includes(badgeHost)

    if (clickStayedInsideDock) {
      return
    }

    onCloseMenu()
  }
  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return
    }

    onCloseMenu()
  }

  document.addEventListener('mousedown', handleDocumentMouseDown)
  document.addEventListener('keydown', handleDocumentKeyDown)

  return () => {
    document.removeEventListener('mousedown', handleDocumentMouseDown)
    document.removeEventListener('keydown', handleDocumentKeyDown)
  }
}
