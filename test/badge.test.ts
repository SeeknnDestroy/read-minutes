import { BADGE_HOST_ID } from '@/shared/constants'
import { removeBadge, renderBadge } from '@/content/badge'

describe('renderBadge', () => {
  afterEach(() => {
    removeBadge()
  })

  it('centers the reading context and renders feedback as a toast popup', () => {
    renderBadge(
      {
        copyButtonLabel: 'Copy page',
        isActionBusy: false,
        message: 'Markdown copied for LLM.',
        readingTimeLabel: '8 min read',
      },
      {
        onCopy: vi.fn(),
        onDismiss: vi.fn(),
      },
    )

    const badgeHost = document.getElementById(BADGE_HOST_ID)
    const badgeStyleElement = badgeHost?.shadowRoot?.querySelector('style')
    const toastElement = badgeHost?.shadowRoot?.querySelector<HTMLElement>('[data-role="badge-toast"]')

    expect(badgeStyleElement?.textContent).toContain('justify-self: center;')
    expect(badgeStyleElement?.textContent).toContain('text-align: center;')
    expect(toastElement?.textContent).toBe('Markdown copied for LLM.')
  })

  it('renders a close button that dismisses the badge', () => {
    const handleDismiss = vi.fn()

    renderBadge(
      {
        copyButtonLabel: 'Copy page',
        isActionBusy: false,
        message: null,
        readingTimeLabel: '8 min read',
      },
      {
        onCopy: vi.fn(),
        onDismiss: handleDismiss,
      },
    )

    const badgeHost = document.getElementById(BADGE_HOST_ID)
    const closeButton = badgeHost?.shadowRoot?.querySelector<HTMLButtonElement>('[data-role="badge-close"]')

    expect(closeButton).not.toBeNull()

    closeButton?.click()

    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })
})
