import * as fs from 'node:fs'
import * as path from 'node:path'

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath)
  ensureDir(dir)
  fs.writeFileSync(filePath, content, 'utf-8')
}

export function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath)
}

export function isEmptyDirectory(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return true
  }
  const files = fs.readdirSync(dirPath)
  return files.length === 0
}

export function copyFile(src: string, dest: string): void {
  const dir = path.dirname(dest)
  ensureDir(dir)
  fs.copyFileSync(src, dest)
}
