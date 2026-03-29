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
