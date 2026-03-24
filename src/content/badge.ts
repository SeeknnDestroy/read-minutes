import { BADGE_HOST_ID } from '@/shared/constants'

export function renderBadge(label: string): void {
  const badgeLabelElement = getBadgeLabelElement()

  badgeLabelElement.textContent = label
}

export function removeBadge(): void {
  const badgeHost = document.getElementById(BADGE_HOST_ID)

  badgeHost?.remove()
}

function getBadgeLabelElement(): HTMLSpanElement {
  const existingHost = document.getElementById(BADGE_HOST_ID)

  if (existingHost instanceof HTMLDivElement && existingHost.shadowRoot) {
    const existingLabel = existingHost.shadowRoot.querySelector<HTMLSpanElement>('[data-role="badge-label"]')

    if (existingLabel) {
      return existingLabel
    }
  }

  const badgeHost = document.createElement('div')
  const shadowRoot = badgeHost.attachShadow({ mode: 'open' })
  const badgeStyleElement = document.createElement('style')
  const badgeElement = document.createElement('div')
  const badgeLabelElement = document.createElement('span')

  badgeHost.id = BADGE_HOST_ID
  badgeStyleElement.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
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
    }

    .badge::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f5c35b 0%, #ba6c39 100%);
      box-shadow: 0 0 0 4px rgba(245, 195, 91, 0.18);
      flex: 0 0 auto;
    }
  `
  badgeElement.className = 'badge'
  badgeLabelElement.dataset.role = 'badge-label'
  badgeElement.append(badgeLabelElement)
  shadowRoot.append(badgeStyleElement, badgeElement)
  document.documentElement.append(badgeHost)

  return badgeLabelElement
}

