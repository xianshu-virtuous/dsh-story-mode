import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadStoryDocuments, resolveStoryDir } from '../src/story-store.ts'

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'story-mode-'))
}

describe('loadStoryDocuments', () => {
  it('returns empty when the directory is missing', () => {
    const dir = join(tempDir(), 'nope')
    const result = loadStoryDocuments(dir, 12_000)
    expect(result.documents).toEqual([])
    expect(result.dir).toBeNull()
    expect(result.truncated).toBe(false)
    expect(result.chars).toBe(0)
  })

  it('loads and sorts md/txt documents, ignoring other files', () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'rules.md'), '须知内容')
    writeFileSync(join(dir, 'scene.md'), '场景内容')
    writeFileSync(join(dir, 'notes.txt'), '旁注')
    writeFileSync(join(dir, 'ignore.png'), 'not a doc')
    const result = loadStoryDocuments(dir, 12_000)
    expect(result.documents.map(d => d.name)).toEqual(['notes.txt', 'rules.md', 'scene.md'])
    expect(result.dir).toBe(dir)
    expect(result.truncated).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('skips blank documents', () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'blank.md'), '   \n\n  ')
    writeFileSync(join(dir, 'real.md'), '真实内容')
    const result = loadStoryDocuments(dir, 12_000)
    expect(result.documents.map(d => d.name)).toEqual(['real.md'])
    rmSync(dir, { recursive: true, force: true })
  })

  it('truncates at the total char cap in filename order', () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'a.md'), 'a'.repeat(400))
    writeFileSync(join(dir, 'b.md'), 'b'.repeat(400))
    const result = loadStoryDocuments(dir, 500)
    expect(result.truncated).toBe(true)
    expect(result.documents.length).toBe(2)
    expect(result.documents[0].text.length).toBeLessThanOrEqual(500)
    expect(result.chars).toBe(500)
    expect(result.documents[1].text).toContain('截断')
    rmSync(dir, { recursive: true, force: true })
  })

  it('respects a cap smaller than one document', () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'big.md'), 'x'.repeat(2000))
    const result = loadStoryDocuments(dir, 100)
    expect(result.truncated).toBe(true)
    expect(result.documents.length).toBe(1)
    expect(result.documents[0].text.startsWith('x'.repeat(100))).toBe(true)
    expect(result.documents[0].text).toContain('截断')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('resolveStoryDir', () => {
  it('uses the configured absolute path as-is', () => {
    expect(resolveStoryDir('D:\\stories', 'C:\\work')).toBe('D:\\stories')
  })

  it('resolves a relative configured path against the cwd', () => {
    expect(resolveStoryDir('my-story', 'C:\\work')).toBe(join('C:\\work', 'my-story'))
  })

  it('defaults to story/ under the cwd', () => {
    expect(resolveStoryDir(undefined, 'C:\\work')).toBe(join('C:\\work', 'story'))
  })

  it('falls back to process cwd when cwd is missing', () => {
    const result = resolveStoryDir(undefined, undefined)
    expect(result.endsWith(join('story')) || result.endsWith('story')).toBe(true)
  })
})
