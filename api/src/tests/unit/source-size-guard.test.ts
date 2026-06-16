import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const MAX_FILE_LINES = 500
const MAX_WORKFLOW_LINES = 200
const MAX_CODE_LINE_LENGTH = 250
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

function listFilesByExtension (directory: string, extension: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFilesByExtension(resolved, extension))
      continue
    }
    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(resolved)
    }
  }
  return files
}

function lineCount (absolutePath: string): number {
  return readFileSync(absolutePath, 'utf8').split(/\r?\n/).length
}

function codeFilesUnder (directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...codeFilesUnder(resolved))
      continue
    }
    if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(resolved)
    }
  }
  return files
}

function findRepoRoot (start: string): string {
  let dir = start
  for (let i = 0; i < 10; i++) {
    try {
      readdirSync(path.join(dir, '.github', 'workflows'))
      return dir
    } catch {
      dir = path.dirname(dir)
    }
  }
  throw new Error(`Could not locate .github/workflows from ${start}`)
}

describe('Source size guard', () => {
  it(`enforces a ${MAX_FILE_LINES}-line maximum for non-test source files`, () => {
    const srcRoot = path.resolve(process.cwd(), 'src')
    const testRoot = path.resolve(process.cwd(), 'src/tests')
    const violations: string[] = []

    for (const absolutePath of codeFilesUnder(srcRoot)) {
      if (absolutePath.startsWith(testRoot)) continue
      const relativePath = path.relative(process.cwd(), absolutePath).replaceAll(path.sep, '/')
      const lines = lineCount(absolutePath)
      if (lines > MAX_FILE_LINES) {
        violations.push(`${relativePath} has ${lines} lines (max ${MAX_FILE_LINES}).`)
      }
    }

    expect(
      violations,
      [
        'Source file length limit exceeded.',
        'Refactor oversized files into focused modules before merging changes.',
        ...violations
      ].join('\n')
    ).toEqual([])
  })

  it(`keeps code lines at or below ${MAX_CODE_LINE_LENGTH} characters`, () => {
    const srcRoot = path.resolve(process.cwd(), 'src')
    const violations: string[] = []

    for (const absolutePath of codeFilesUnder(srcRoot)) {
      const relativePath = path.relative(process.cwd(), absolutePath).replaceAll(path.sep, '/')
      readFileSync(absolutePath, 'utf8').split(/\r?\n/).forEach((line, index) => {
        if (line.length > MAX_CODE_LINE_LENGTH) {
          violations.push(`${relativePath}:${index + 1} has ${line.length} characters (max ${MAX_CODE_LINE_LENGTH}).`)
        }
      })
    }

    expect(
      violations,
      [
        'Code line length limit exceeded.',
        'Split long expressions, object literals, strings, or test fixtures into readable multiline blocks.',
        ...violations.slice(0, 20)
      ].join('\n')
    ).toEqual([])
  })

  it(`enforces a ${MAX_WORKFLOW_LINES}-line maximum for GitHub Actions workflow files`, () => {
    const repoRoot = findRepoRoot(__dirname)
    const workflowsRoot = path.join(repoRoot, '.github', 'workflows')
    const violations: string[] = []

    for (const absolutePath of listFilesByExtension(workflowsRoot, '.yml')) {
      const relativePath = path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/')
      const lines = lineCount(absolutePath)
      if (lines > MAX_WORKFLOW_LINES) {
        violations.push(`${relativePath} has ${lines} lines (max ${MAX_WORKFLOW_LINES}).`)
      }
    }

    expect(
      violations,
      [
        'Workflow file length limit exceeded.',
        'Extract inline logic into cweb CLI commands before merging changes.',
        ...violations
      ].join('\n')
    ).toEqual([])
  })
})
