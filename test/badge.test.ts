import { BADGE_HOST_ID } from '@/shared/constants'
import { removeBadge, renderBadge } from '@/content/badge'

describe('renderBadge', () => {
  afterEach(() => {
    removeBadge()
  })

  it('left-aligns the reading context with inset spacing and renders feedback as a toast popup', () => {
    renderBadge(
      {
        copyButtonLabel: 'Copy page',
        exitReason: null,
        isActionBusy: false,
        message: 'Copying markdown failed.',
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

    expect(badgeStyleElement?.textContent).toContain('padding-inline-start: 14px;')
    expect(badgeStyleElement?.textContent).toContain('text-align: left;')
    expect(toastElement?.textContent).toBe('Copying markdown failed.')
  })

  it('renders the perimeter trace exit state for animated dismissal', () => {
    renderBadge(
      {
        copyButtonLabel: 'Copy page',
        exitReason: 'auto-close',
        isActionBusy: true,
        message: null,
        readingTimeLabel: '8 min read',
      },
      {
        onCopy: vi.fn(),
        onDismiss: vi.fn(),
      },
    )

    const badgeHost = document.getElementById(BADGE_HOST_ID)
    const badgeStyleElement = badgeHost?.shadowRoot?.querySelector('style')
    const dockShellElement = badgeHost?.shadowRoot?.querySelector<HTMLElement>('.dock-shell')
    const traceElement = badgeHost?.shadowRoot?.querySelector<SVGElement>('.dock-trace')

    expect(badgeStyleElement?.textContent).toContain('stroke-dashoffset')
    expect(dockShellElement?.dataset.exitReason).toBe('auto-close')
    expect(traceElement?.querySelectorAll('.dock-trace-rect')).toHaveLength(2)
  })

  it('renders a close button that dismisses the badge', () => {
    const handleDismiss = vi.fn()

    renderBadge(
      {
        copyButtonLabel: 'Copy page',
        exitReason: null,
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
