// Regenerate the PWA PNG icons from the 2Up mark. Run: npm run icons
//
// Full-bleed SQUARE (no rounded corners) so adaptive / maskable OS masks don't
// reveal transparent corners; the mark sits inside the maskable safe zone. The
// browser-tab icon (public/favicon.svg) keeps its rounded corners separately.
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'node:fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g fill="none" stroke="#ffffff" stroke-width="50" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="156,262 256,162 356,262"/>
    <polyline points="156,352 256,252 356,352"/>
  </g>
</svg>`

const targets = [
  ['public/apple-touch-icon.png', 180],
  ['public/pwa-192x192.png', 192],
  ['public/pwa-512x512.png', 512],
  ['public/maskable-512x512.png', 512],
]

for (const [path, size] of targets) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  writeFileSync(path, resvg.render().asPng())
  console.log(`wrote ${path} (${size}px)`)
}
