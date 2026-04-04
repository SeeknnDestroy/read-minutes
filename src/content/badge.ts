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
      position: relative;
      width: min(360px, calc(100vw - 24px));
      padding: 12px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 18px;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(216, 161, 75, 0.18) 0, rgba(12, 14, 17, 0) 44%),
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

    .dock-trace {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0;
      overflow: visible;
      z-index: 2;
    }

    .dock-trace-rect {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .dock-trace-head {
      stroke: rgba(255, 255, 255, 1);
      stroke-width: 2.6;
      stroke-dasharray: 11 89;
      stroke-dashoffset: 0;
      filter:
        drop-shadow(0 0 9px rgba(255, 255, 255, 1))
        drop-shadow(0 0 16px rgba(255, 248, 225, 0.66));
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
      min-height: 42px;
      padding: 0 18px;
      border: 1px solid rgba(255, 241, 222, 0.12);
      border-radius: 14px;
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
      width: 38px;
      height: 38px;
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

    .dock-shell[data-exit-reason] .dock-trace {
      opacity: 1;
    }

    .dock-shell[data-exit-reason="dismiss"] .dock-bar,
    .dock-shell[data-exit-reason="dismiss"] .dock-toast {
      animation: dock-dismiss-fade var(--dock-exit-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    .dock-shell[data-exit-reason="auto-close"] .dock-bar,
    .dock-shell[data-exit-reason="auto-close"] .dock-toast {
      animation: dock-auto-close-fade var(--dock-exit-duration) linear forwards;
    }

    .dock-shell[data-exit-reason] .dock-trace-head {
      animation: dock-border-head var(--dock-exit-duration) linear forwards;
    }

    @keyframes dock-border-head {
      0% {
        opacity: 1;
        stroke-dashoffset: 0;
      }

      100% {
        opacity: 1;
        stroke-dashoffset: -100;
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

      78% {
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
  const traceElement = createTraceElement()
  const contextElement = document.createElement('div')
  const labelElement = document.createElement('p')
  const readingTimeElement = document.createElement('p')
  const copyStackElement = document.createElement('div')
  const copyButtonElement = document.createElement('button')
  const copyButtonLabelElement = document.createElement('span')
  const closeButtonElement = document.createElement('button')

  dockShellElement.className = 'dock-shell'
  if (viewModel.exitReason) {
    dockShellElement.dataset.exitReason = viewModel.exitReason
  }
  dockBarElement.className = 'dock-bar'
  contextElement.className = 'dock-context'
  labelElement.className = 'dock-label'
  labelElement.textContent = 'Read Minutes'
  readingTimeElement.className = 'dock-reading-time'
  readingTimeElement.textContent = viewModel.readingTimeLabel
  contextElement.append(labelElement, readingTimeElement)
  copyStackElement.className = 'dock-copy-stack'
  copyButtonElement.className = 'dock-copy'
  copyButtonElement.dataset.role = 'badge-copy'
  copyButtonElement.type = 'button'
  copyButtonElement.disabled = viewModel.isActionBusy
  copyButtonLabelElement.className = 'dock-copy-label'
  copyButtonLabelElement.textContent = viewModel.copyButtonLabel
  copyButtonElement.append(createCopyIconElement(), copyButtonLabelElement)
  copyButtonElement.addEventListener('click', handlers.onCopy)
  copyStackElement.append(copyButtonElement)
  closeButtonElement.className = 'dock-close'
  closeButtonElement.dataset.role = 'badge-close'
  closeButtonElement.type = 'button'
  closeButtonElement.setAttribute('aria-label', 'Close page tools')
  closeButtonElement.textContent = '×'
  closeButtonElement.addEventListener('click', handlers.onDismiss)
  dockBarElement.append(contextElement, copyStackElement, closeButtonElement)
  dockShellElement.append(traceElement, dockBarElement)

  if (viewModel.message) {
    const toastElement = document.createElement('p')

    toastElement.className = 'dock-toast'
    toastElement.dataset.role = 'badge-toast'
    toastElement.setAttribute('aria-live', 'polite')
    toastElement.textContent = viewModel.message
    copyStackElement.append(toastElement)
  }

  return dockShellElement
}

function createTraceElement(): SVGElement {
  const traceElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const headPathElement = document.createElementNS(traceElement.namespaceURI, 'path')
  const roundedRectPath = [
    'M 20 2',
    'H 340',
    'A 18 18 0 0 1 358 20',
    'V 58',
    'A 18 18 0 0 1 340 76',
    'H 20',
    'A 18 18 0 0 1 2 58',
    'V 20',
    'A 18 18 0 0 1 20 2',
  ].join(' ')

  traceElement.classList.add('dock-trace')
  traceElement.setAttribute('viewBox', '0 0 360 78')
  traceElement.setAttribute('preserveAspectRatio', 'none')
  traceElement.setAttribute('aria-hidden', 'true')

  headPathElement.setAttribute('d', roundedRectPath)
  headPathElement.setAttribute('pathLength', '100')
  headPathElement.classList.add('dock-trace-rect')
  headPathElement.classList.add('dock-trace-head')
  traceElement.append(headPathElement)

  return traceElement
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
