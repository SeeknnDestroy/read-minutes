import fs from 'node:fs'
import path from 'node:path'

const distDirectory = path.resolve('dist')
const manifestPath = path.join(distDirectory, 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const contentScriptFile = manifest.content_scripts?.[0]?.js?.[0]

if (!contentScriptFile) {
  throw new Error('No content script entry found in dist/manifest.json.')
}

const loaderCode = fs.readFileSync(path.join(distDirectory, contentScriptFile), 'utf8')
const contentEntryMatch = loaderCode.match(/chrome\.runtime\.getURL\("([^"]+)"\)/u)

if (!contentEntryMatch) {
  throw new Error('Content script loader does not use chrome.runtime.getURL().')
}

const contentEntryPath = path.join(distDirectory, contentEntryMatch[1])
const contentEntryCode = fs.readFileSync(contentEntryPath, 'utf8')

if (contentEntryCode.includes('__vite__mapDeps')) {
  throw new Error(
    'Content script build includes Vite preload dependency mapping. ' +
    'That can inject /assets modulepreload links into host pages and violate site CSP.',
  )
}

if (contentEntryCode.includes('modulepreload')) {
  throw new Error(
    'Content script build includes modulepreload behavior. ' +
    'Content scripts must lazy-load extension chunks without touching host-page preload links.',
  )
}
