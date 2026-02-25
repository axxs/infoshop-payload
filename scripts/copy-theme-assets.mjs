/**
 * Copy theme assets to public/ directory so they can be served statically.
 * Runs as prebuild/predev hook.
 */
import fs from 'node:fs'
import path from 'node:path'

const THEMES_DIR = path.resolve(process.cwd(), 'themes')
const PUBLIC_DIR = path.resolve(process.cwd(), 'public', 'themes')

function copyFileIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    return true
  }
  return false
}

function copyDirIfExists(src, dest) {
  if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry)
      const destPath = path.join(dest, entry)
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirIfExists(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
    return true
  }
  return false
}

// Guard: ensure PUBLIC_DIR is inside the project root before deleting
const projectRoot = process.cwd()
if (!PUBLIC_DIR.startsWith(path.resolve(projectRoot, 'public'))) {
  console.error(`[themes] PUBLIC_DIR "${PUBLIC_DIR}" is outside public/ — aborting.`)
  process.exit(1)
}

// Clean existing public/themes
if (fs.existsSync(PUBLIC_DIR)) {
  fs.rmSync(PUBLIC_DIR, { recursive: true })
}

if (!fs.existsSync(THEMES_DIR)) {
  console.log('[themes] No themes/ directory found, skipping.')
  process.exit(0)
}

const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true })
let count = 0

for (const entry of entries) {
  if (!entry.isDirectory()) continue

  const themeDir = path.join(THEMES_DIR, entry.name)
  const destDir = path.join(PUBLIC_DIR, entry.name)

  fs.mkdirSync(destDir, { recursive: true })

  // Copy CSS files
  copyFileIfExists(path.join(themeDir, 'variables.css'), path.join(destDir, 'variables.css'))
  copyFileIfExists(path.join(themeDir, 'overrides.css'), path.join(destDir, 'overrides.css'))

  // Copy assets directory
  copyDirIfExists(path.join(themeDir, 'assets'), path.join(destDir, 'assets'))

  count++
}

console.log(`[themes] Copied ${count} theme(s) to public/themes/`)
