import { describe, expect, it } from 'vitest'
import { documentSummaries, renderStoryDirective } from '../src/shared/directive.ts'
import type { StoryDocument } from '../src/story-store.ts'

describe('renderStoryDirective', () => {
  it('renders the boundary with no documents', () => {
    const text = renderStoryDirective({ documents: [], truncated: false, dir: null })
    expect(text).toContain('<story-mode>')
    expect(text).toContain('</story-mode>')
    expect(text).toContain('以你当前的人格设定为身份')
    expect(text).toContain('工作区暂未找到剧情文档')
  })

  it('embeds documents with filenames as headings', () => {
    const documents: StoryDocument[] = [
      { name: 'scene.md', text: '深夜的鲸鱼咖啡馆' },
      { name: 'rules.md', text: '不许偷吃主人的布丁' },
    ]
    const text = renderStoryDirective({ documents, truncated: false, dir: '/work/story' })
    expect(text).toContain('【scene.md】')
    expect(text).toContain('深夜的鲸鱼咖啡馆')
    expect(text).toContain('【rules.md】')
    expect(text).toContain('不许偷吃主人的布丁')
    expect(text).toContain('退出剧情模式')
  })

  it('notes truncation when flagged', () => {
    const text = renderStoryDirective({ documents: [{ name: 'a.md', text: 'x' }], truncated: true, dir: '/w' })
    expect(text).toContain('被截断')
  })
})

describe('documentSummaries', () => {
  it('lists names and char counts', () => {
    const documents: StoryDocument[] = [{ name: 'scene.md', text: 'abc' }]
    expect(documentSummaries(documents)).toEqual(['scene.md（3 字符）'])
  })

  it('caps the shown list and reports the remainder', () => {
    const documents: StoryDocument[] = Array.from({ length: 10 }, (_, i) => ({ name: `${i}.md`, text: 'x' }))
    const summaries = documentSummaries(documents, 3)
    expect(summaries.length).toBe(4)
    expect(summaries[3]).toContain('另有 7 个文件')
  })
})
