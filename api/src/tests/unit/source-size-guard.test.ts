import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const MAX_WORKFLOW_LINES = 200

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
