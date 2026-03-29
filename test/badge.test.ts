import { BADGE_HOST_ID } from '@/shared/constants'
import { removeBadge, renderBadge } from '@/content/badge'

describe('renderBadge', () => {
  afterEach(() => {
    removeBadge()
  })

  it('renders a close button that dismisses the badge', () => {
    const handleDismiss = vi.fn()

    renderBadge(
      {
        copyButtonLabel: 'Copy page',
        isActionBusy: false,
        isMenuOpen: false,
        message: null,
        openButtonLabel: 'View as Markdown',
        readingTimeLabel: '8 min read',
      },
      {
        onCloseMenu: vi.fn(),
        onCopy: vi.fn(),
        onDismiss: handleDismiss,
        onOpen: vi.fn(),
        onToggleMenu: vi.fn(),
      },
    )

    const badgeHost = document.getElementById(BADGE_HOST_ID)
    const closeButton = badgeHost?.shadowRoot?.querySelector<HTMLButtonElement>('[data-role="badge-close"]')

    expect(closeButton).not.toBeNull()

    closeButton?.click()

    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })
})
