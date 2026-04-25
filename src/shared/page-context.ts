import { BADGE_HOST_ID } from './constants'
import { normalizeWhitespace } from './reading-time'
import type { AnalysisMetadata } from './types'

export function createExtractionDocumentSnapshot(document: Document): Document {
  const snapshot = document.cloneNode(true) as Document
  const badgeHost = snapshot.getElementById(BADGE_HOST_ID)

  badgeHost?.remove()
  removePicturesWithoutImgFallback(snapshot)

  return snapshot
}

export function createPageMetadata(document: Document): AnalysisMetadata {
  const sourceUrl = document.location?.href ?? ''
  const hostname = getHostname(sourceUrl)
  const pageTitle = normalizeText(document.title) || hostname || 'This page'
  const siteName = hostname || 'This page'

  return {
    hostname,
    pageTitle,
    siteName,
    sourceUrl,
  }
}

function normalizeText(value: string | null | undefined): string {
  const safeValue = value ?? ''

  return normalizeWhitespace(safeValue)
}

function getHostname(sourceUrl: string): string {
  try {
    const parsedUrl = new URL(sourceUrl)
    const normalizedHostname = parsedUrl.hostname.replace(/^www\./u, '')

    return normalizedHostname
  } catch {
    return ''
  }
}

function removePicturesWithoutImgFallback(document: Document): void {
  const pictureElements = document.querySelectorAll('picture')

  pictureElements.forEach((pictureElement) => {
    const imgElement = pictureElement.querySelector('img')

    if (imgElement) {
      return
    }

    pictureElement.remove()
  })
}
