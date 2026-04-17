import {
  BADGE_HOST_ID,
  INLINE_DOCK_AUTO_CLOSE_TRACE_DURATION_MS,
  INLINE_DOCK_DISMISS_EXIT_DURATION_MS,
} from '@/shared/constants'

export interface InlineDockHandlers {
  onCopy: () => void
  onDismiss: () => void
}

export interface InlineDockViewModel {
  copyButtonLabel: string
  exitReason: 'auto-close' | 'dismiss' | null
  isActionBusy: boolean
  message: string | null
  readingTimeLabel: string
}

interface BadgeElements {
  closeButtonElement: HTMLButtonElement
  copyButtonElement: HTMLButtonElement
  copyButtonLabelElement: HTMLSpanElement
  copyStackElement: HTMLDivElement
  currentHandlers: InlineDockHandlers
  hostElement: HTMLDivElement
  readingTimeElement: HTMLParagraphElement
  shellElement: HTMLDivElement
  toastElement: HTMLParagraphElement | null
}

const defaultHandlers: InlineDockHandlers = {
  onCopy: () => undefined,
  onDismiss: () => undefined,
}

let badgeElements: BadgeElements | null = null

export function renderBadge(
  viewModel: InlineDockViewModel,
  handlers: InlineDockHandlers,
): void {
  const elements = ensureBadgeElements()

  elements.currentHandlers = handlers
  updateBadgeElements(elements, viewModel)
}

export function removeBadge(): void {
  badgeElements?.hostElement.remove()
  document.getElementById(BADGE_HOST_ID)?.remove()
  badgeElements = null
}

function ensureBadgeElements(): BadgeElements {
  if (badgeElements?.hostElement.isConnected) {
    return badgeElements
  }

  badgeElements?.hostElement.remove()
  badgeElements = createBadgeElements()

  return badgeElements
}

function createBadgeElements(): BadgeElements {
  document.getElementById(BADGE_HOST_ID)?.remove()

  const badgeHostElement = document.createElement('div')
  const shadowRoot = badgeHostElement.attachShadow({ mode: 'open' })
  const badgeStyleElement = document.createElement('style')
  const mountElement = document.createElement('div')
  const dockShellElement = document.createElement('div')
  const progressRailElement = document.createElement('div')
  const progressFillElement = document.createElement('div')
  const dockBarElement = document.createElement('div')
  const contextElement = document.createElement('div')
  const labelElement = document.createElement('p')
  const readingTimeElement = document.createElement('p')
  const copyStackElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const copyButtonLabelElement = document.createElement('span')
  const closeButtonElement = document.createElement('button')

  badgeHostElement.id = BADGE_HOST_ID
  mountElement.dataset.role = 'dock-mount'
  badgeStyleElement.textContent = createBadgeStyles()
  dockShellElement.className = 'dock-shell'
  progressRailElement.className = 'dock-progress'
  progressFillElement.className = 'dock-progress-fill'
  dockBarElement.className = 'dock-bar'
  contextElement.className = 'dock-context'
  labelElement.className = 'dock-label'
  labelElement.textContent = 'Read Minutes'
  readingTimeElement.className = 'dock-reading-time'
  copyStackElement.className = 'dock-copy-stack'
  copyButtonElement.className = 'dock-copy'
  copyButtonElement.dataset.role = 'badge-copy'
  copyButtonElement.type = 'button'
  copyButtonLabelElement.className = 'dock-copy-label'
  copyButtonElement.append(createCopyIconElement(), copyButtonLabelElement)
  closeButtonElement.className = 'dock-close'
  closeButtonElement.dataset.role = 'badge-close'
  closeButtonElement.type = 'button'
  closeButtonElement.setAttribute('aria-label', 'Close page tools')
  closeButtonElement.textContent = '×'

  const elements: BadgeElements = {
    closeButtonElement,
    copyButtonElement,
    copyButtonLabelElement,
    copyStackElement,
    currentHandlers: defaultHandlers,
    hostElement: badgeHostElement,
    readingTimeElement,
    shellElement: dockShellElement,
    toastElement: null,
  }

  copyButtonElement.addEventListener('click', () => {
    elements.currentHandlers.onCopy()
  })
  closeButtonElement.addEventListener('click', () => {
    elements.currentHandlers.onDismiss()
  })

  progressRailElement.append(progressFillElement)
  contextElement.append(labelElement, readingTimeElement)
  copyStackElement.append(copyButtonElement)
  dockBarElement.append(contextElement, copyStackElement, closeButtonElement)
  dockShellElement.append(progressRailElement, dockBarElement)
  mountElement.append(dockShellElement)
  shadowRoot.append(badgeStyleElement, mountElement)
  document.documentElement.append(badgeHostElement)

  return elements
}

function updateBadgeElements(
  elements: BadgeElements,
  viewModel: InlineDockViewModel,
): void {
  const {
    copyButtonElement,
    copyButtonLabelElement,
    readingTimeElement,
    shellElement,
  } = elements

  readingTimeElement.textContent = viewModel.readingTimeLabel
  copyButtonElement.disabled = viewModel.isActionBusy
  copyButtonElement.setAttribute('aria-busy', String(viewModel.isActionBusy))
  copyButtonLabelElement.textContent = viewModel.copyButtonLabel

  if (viewModel.exitReason) {
    shellElement.dataset.exitReason = viewModel.exitReason
  } else {
    delete shellElement.dataset.exitReason
  }

  updateToastElement(elements, viewModel.message)
}

function updateToastElement(
  elements: BadgeElements,
  message: string | null,
): void {
  if (!message) {
    elements.toastElement?.remove()
    elements.toastElement = null

    return
  }

  const toastElement = elements.toastElement ?? createToastElement()

  toastElement.textContent = message

  if (!toastElement.isConnected) {
    elements.copyStackElement.append(toastElement)
  }

  elements.toastElement = toastElement
}

function createToastElement(): HTMLParagraphElement {
  const toastElement = document.createElement('p')

  toastElement.className = 'dock-toast'
  toastElement.dataset.role = 'badge-toast'
  toastElement.setAttribute('aria-live', 'polite')

  return toastElement
}

function createBadgeStyles(): string {
  return `
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
      position: relative;
      width: min(348px, calc(100vw - 24px));
      padding: 14px 12px 12px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 16px;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(216, 161, 75, 0.14) 0, rgba(12, 14, 17, 0) 42%),
        linear-gradient(180deg, rgba(22, 26, 31, 0.96) 0%, rgba(11, 13, 16, 0.98) 100%);
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.24),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
      color: #fff7ec;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      isolation: isolate;
      pointer-events: auto;
      --dock-exit-duration: ${INLINE_DOCK_DISMISS_EXIT_DURATION_MS}ms;
    }

    .dock-shell[data-exit-reason="auto-close"] {
      --dock-exit-duration: ${INLINE_DOCK_AUTO_CLOSE_TRACE_DURATION_MS}ms;
    }

    .dock-progress {
      position: absolute;
      top: 0;
      left: 12px;
      right: 12px;
      height: 2px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 241, 222, 0.08);
      opacity: 0;
      pointer-events: none;
    }

    .dock-progress-fill {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      transform-origin: right center;
      transform: scaleX(1);
      background: linear-gradient(90deg, rgba(240, 190, 115, 0.96) 0%, rgba(255, 255, 255, 0.96) 48%, rgba(255, 248, 225, 0.38) 100%);
      box-shadow: 0 0 10px rgba(255, 248, 225, 0.42);
    }

    .dock-bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    .dock-context {
      display: grid;
      gap: 3px;
      min-width: 0;
      padding-inline-start: 14px;
      justify-self: stretch;
      text-align: left;
    }

    .dock-label {
      margin: 0;
      color: #d6a356;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .dock-reading-time {
      margin: 0;
      color: #fff8ef;
      font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1;
    }

    button {
      appearance: none;
      border: none;
      color: inherit;
      font: inherit;
    }

    .dock-copy-stack {
      position: relative;
      display: grid;
    }

    .dock-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.03) 100%);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color 160ms ease,
        opacity 160ms ease;
    }

    .dock-copy-label {
      color: #fff7ec;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .dock-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.035) 100%);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      transition: background-color 160ms ease;
    }

    .dock-copy:hover,
    .dock-close:hover {
      background: rgba(255, 241, 222, 0.08);
    }

    .dock-copy:focus-visible,
    .dock-close:focus-visible {
      outline: 2px solid rgba(216, 161, 75, 0.92);
      outline-offset: -2px;
    }

    .dock-copy:disabled {
      cursor: wait;
      opacity: 0.68;
    }

    .dock-toast {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      margin: 0;
      max-width: min(240px, calc(100vw - 48px));
      padding: 8px 12px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 12px;
      background: rgba(15, 18, 22, 0.96);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
      color: #f0be73;
      font-size: 12px;
      line-height: 1.35;
      text-align: center;
    }

    .dock-shell[data-exit-reason="dismiss"] {
      pointer-events: none;
    }

    .dock-shell[data-exit-reason] .dock-progress {
      opacity: 1;
    }

    .dock-shell[data-exit-reason] .dock-progress-fill {
      animation: dock-progress-countdown var(--dock-exit-duration) linear forwards;
    }

    .dock-shell[data-exit-reason="dismiss"] .dock-bar,
    .dock-shell[data-exit-reason="dismiss"] .dock-toast {
      animation: dock-dismiss-fade var(--dock-exit-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    .dock-shell[data-exit-reason="auto-close"] .dock-bar,
    .dock-shell[data-exit-reason="auto-close"] .dock-toast {
      animation: dock-auto-close-fade var(--dock-exit-duration) linear forwards;
    }

    @keyframes dock-progress-countdown {
      0% {
        opacity: 0.96;
        transform: scaleX(1);
      }

      100% {
        opacity: 0.18;
        transform: scaleX(0);
      }
    }

    @keyframes dock-auto-close-fade {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      96% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      100% {
        opacity: 0;
        transform: translateY(-4px) scale(0.992);
      }
    }

    @keyframes dock-dismiss-fade {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      72% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      100% {
        opacity: 0;
        transform: translateY(-6px) scale(0.988);
      }
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

    @media (max-width: 520px) {
      .dock-shell {
        width: min(280px, calc(100vw - 24px));
      }

      .dock-bar {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .dock-copy-stack {
        grid-column: 1 / -1;
      }

      .dock-copy {
        justify-content: center;
        width: 100%;
      }

      .dock-toast {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
      }
    }
  `
}

function createCopyIconElement(): SVGElement {
  const iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const firstRectElement = document.createElementNS(iconElement.namespaceURI, 'rect')
  const secondRectElement = document.createElementNS(iconElement.namespaceURI, 'rect')

  iconElement.setAttribute('viewBox', '0 0 24 24')
  iconElement.setAttribute('aria-hidden', 'true')
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
