import { BADGE_HOST_ID } from '@/shared/constants'

export function renderBadge(label: string, onDismiss?: () => void): void {
  const badgeElements = getBadgeElements()
  const { badgeCloseButtonElement, badgeLabelElement } = badgeElements

  badgeLabelElement.textContent = label
  badgeCloseButtonElement.onclick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    removeBadge()
    onDismiss?.()
  }
}

export function removeBadge(): void {
  const badgeHost = document.getElementById(BADGE_HOST_ID)

  badgeHost?.remove()
}

function getBadgeElements(): {
  badgeCloseButtonElement: HTMLButtonElement
  badgeLabelElement: HTMLSpanElement
} {
  const existingHost = document.getElementById(BADGE_HOST_ID)

  if (existingHost instanceof HTMLDivElement && existingHost.shadowRoot) {
    const existingCloseButton = existingHost.shadowRoot.querySelector<HTMLButtonElement>('[data-role="badge-close"]')
    const existingLabel = existingHost.shadowRoot.querySelector<HTMLSpanElement>('[data-role="badge-label"]')

    if (existingCloseButton && existingLabel) {
      return {
        badgeCloseButtonElement: existingCloseButton,
        badgeLabelElement: existingLabel,
      }
    }

    existingHost.remove()
  }

  const badgeHost = document.createElement('div')
  const shadowRoot = badgeHost.attachShadow({ mode: 'open' })
  const badgeStyleElement = document.createElement('style')
  const badgeElement = document.createElement('div')
  const badgeCopyElement = document.createElement('div')
  const badgeCloseButtonElement = document.createElement('button')
  const badgeLabelElement = document.createElement('span')

  badgeHost.id = BADGE_HOST_ID
  badgeStyleElement.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      pointer-events: none;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 8px 8px 14px;
      border: 1px solid rgba(42, 54, 50, 0.12);
      border-radius: 999px;
      background: rgba(245, 241, 232, 0.92);
      box-shadow:
        0 10px 24px rgba(31, 42, 39, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      color: #1f2a27;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.01em;
      backdrop-filter: blur(12px);
      pointer-events: auto;
    }

    .badge-copy {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .badge-copy::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f5c35b 0%, #ba6c39 100%);
      box-shadow: 0 0 0 4px rgba(245, 195, 91, 0.18);
      flex: 0 0 auto;
    }

    .badge-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 999px;
      background: rgba(42, 54, 50, 0.08);
      color: #4a534f;
      cursor: pointer;
      font: inherit;
      font-size: 16px;
      line-height: 1;
      transition:
        background 120ms ease,
        color 120ms ease;
    }

    .badge-close:hover {
      background: rgba(42, 54, 50, 0.14);
      color: #1f2a27;
    }

    .badge-close:focus-visible {
      outline: 2px solid rgba(186, 108, 57, 0.5);
      outline-offset: 2px;
    }
  `
  badgeElement.className = 'badge'
  badgeCopyElement.className = 'badge-copy'
  badgeCloseButtonElement.className = 'badge-close'
  badgeCloseButtonElement.type = 'button'
  badgeCloseButtonElement.dataset.role = 'badge-close'
  badgeCloseButtonElement.setAttribute('aria-label', 'Close reading time badge')
  badgeCloseButtonElement.textContent = '×'
  badgeLabelElement.dataset.role = 'badge-label'
  badgeCopyElement.append(badgeLabelElement)
  badgeElement.append(badgeCopyElement, badgeCloseButtonElement)
  shadowRoot.append(badgeStyleElement, badgeElement)
  document.documentElement.append(badgeHost)

  return {
    badgeCloseButtonElement,
    badgeLabelElement,
  }
}
