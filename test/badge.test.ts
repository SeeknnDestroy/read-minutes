import { BADGE_HOST_ID } from '@/shared/constants'
import { removeBadge, renderBadge } from '@/content/badge'

describe('renderBadge', () => {
  afterEach(() => {
    removeBadge()
  })

  it('renders a close button that dismisses the badge', () => {
    const handleDismiss = vi.fn()
    const renderDismissibleBadge = renderBadge as unknown as (label: string, onDismiss: () => void) => void

    renderDismissibleBadge('8 min read', handleDismiss)

    const badgeHost = document.getElementById(BADGE_HOST_ID)
    const closeButton = badgeHost?.shadowRoot?.querySelector<HTMLButtonElement>('[data-role="badge-close"]')

    expect(closeButton).not.toBeNull()

    closeButton?.click()

    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })
})
