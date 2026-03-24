import './styles.css'

const rootElement = document.querySelector<HTMLDivElement>('#root')

if (!rootElement) {
  throw new Error('Popup root element was not found.')
}

rootElement.innerHTML = `
  <main class="popup-shell">
    <p class="eyebrow">Read Minutes</p>
    <h1 class="title">Scaffold ready</h1>
    <p class="copy">
      The extension shell is set up. Reading-time analysis and controls arrive in the next commits.
    </p>
  </main>
`

