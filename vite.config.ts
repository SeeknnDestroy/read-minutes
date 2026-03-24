import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import manifest from './manifest.config'

const sourceRoot = path.resolve(__dirname, 'src')

export default defineConfig({
  resolve: {
    alias: {
      '@': sourceRoot,
    },
  },
  plugins: [crx({ manifest })],
})

