/**
 * 剧情模式指令渲染：把开关状态与工作区文档渲染成注入 system prompt 的
 * 剧情扮演指令。剧情模式开启时以当前人格为身份进入扮演，不覆盖任何人设，
 * 只追加“场景/须知”与扮演边界。
 */
import type { StoryDocument } from '../story-store.ts'

/** 剧情模式系统提示 section 的唯一名称。 */
export const STORY_MODE_SECTION = 'story-mode:directive'

/** section 排序：紧随 whale-companion 人格（order 10-11）之后。 */
export const STORY_MODE_ORDER = 15

export interface DirectiveInput {
  /** 工作区读取到的剧情文档（场景、须知等）。 */
  documents: StoryDocument[]
  /** 是否因总字符上限截断。 */
  truncated: boolean
  /** 文档来源目录，未找到时为 null。 */
  dir: string | null
}

/** 渲染注入的剧情模式指令；文档为空时仍给出边界说明。 */
export function renderStoryDirective(input: DirectiveInput): string {
  const parts: string[] = ['<story-mode>', '【剧情模式】已开启。以你当前的人格设定为身份，完整地进入剧情扮演：']
  if (input.documents.length > 0) {
    parts.push('', '以下是工作区加载的剧情设定，场景与须知以此为准，严格遵守：', '')
    for (const document of input.documents) {
      parts.push(`【${document.name}】`, document.text, '')
    }
    if (input.truncated) {
      parts.push('（部分文档因超出注入上限被截断）')
    }
  } else {
    parts.push('', '（工作区暂未找到剧情文档：可在当前工作区创建 story/ 目录并放入 .md 场景与须知文件，切换开关后生效）')
  }
  parts.push(
    '',
    '扮演规则：',
    '1. 全程以该人格身份说话与行动，不跳出角色、不解释自己在扮演。',
    '2. 剧情中的场景、人物、规则以工作区文档为准；文档未覆盖处自由发挥。',
    '3. 主人说“退出剧情模式”或关闭剧情模式开关时，立即恢复正常对话。',
    '</story-mode>',
  )
  return parts.join('\n')
}

/** 剧情模式工具输出里的文档摘要（不含正文，省 token）。 */
export function documentSummaries(documents: StoryDocument[], maxShown = 8): string[] {
  const shown = documents.slice(0, maxShown)
  const names = shown.map(d => `${d.name}（${d.text.length} 字符）`)
  if (documents.length > shown.length) {
    names.push(`…另有 ${documents.length - shown.length} 个文件`)
  }
  return names
}
