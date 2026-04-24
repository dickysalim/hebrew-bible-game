import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function stripEsvH(filePath) {
  console.log(`Processing: ${filePath}`)
  const raw = readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)

  for (const verse of data.verses) {
    if (!verse.words) continue
    for (const word of verse.words) {
      if ('esvH' in word) {
        delete word.esvH
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`✅ Stripped esvH from ${filePath}`)
}

const versesDir = resolve(__dirname, '../src/data/verses')
stripEsvH(resolve(versesDir, 'genesis-1.json'))
stripEsvH(resolve(versesDir, 'genesis-2.json'))
