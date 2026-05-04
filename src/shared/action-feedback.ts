import { TRANSCRIPT_ACTION_MINIMUM_BUSY_MS } from './constants'

export async function waitForMinimumTranscriptActionBusyTime(
  startedAtMs: number,
): Promise<void> {
  const elapsedMs = performance.now() - startedAtMs
  const remainingMs = TRANSCRIPT_ACTION_MINIMUM_BUSY_MS - elapsedMs

  if (remainingMs <= 0) {
    return
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remainingMs)
  })
}
