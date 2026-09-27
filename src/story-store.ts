/**
 * 剧情模式状态存取与工作区剧情文档读取。
 *
 * 状态文件存 `$DSH_HOME/plugins/dsh-story-mode/state.json`，开关即时生效
 * （system prompt section 每次组装时同步读取，无需重启）。
 * 剧情文档约定放在工作区（会话 cwd）下的 story 目录（可配置），
 * 读取其中全部 .md/.txt 文件作为场景与须知注入。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'

/** 剧情模式持久化状态文件。 */
export function statePath(): string {
  return dshHomePath('plugins', 'dsh-story-mode', 'state.json')
}

export interface StoryModeState {
  /** 剧情模式是否开启。 */
  enabled: boolean
  /** 最近一次切换时间（ISO 字符串）。 */
  updatedAt: string
}

export interface LoadedState extends StoryModeState {
  /** 状态文件是否存在（从未切换过 = 默认关闭）。 */
  exists: boolean
}

/** 读取持久化开关状态；文件缺失或损坏时按默认关闭处理。 */
export function loadState(path = statePath()): LoadedState {
  if (!existsSync(path)) return { enabled: false, updatedAt: '', exists: false }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('state document must be an object')
    }
    const record = parsed as { enabled?: unknown; updatedAt?: unknown }
    return {
      enabled: record.enabled === true,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
      exists: true,
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`story-mode: ignoring invalid state file "${path}": ${reason}`)
    return { enabled: false, updatedAt: '', exists: false }
  }
}

/** 校验并持久化开关状态（覆盖写，原子替换）。 */
export function saveState(enabled: boolean, path = statePath()): StoryModeState {
  mkdirSync(dirname(path), { recursive: true })
  const record: StoryModeState = { enabled, updatedAt: new Date().toISOString() }
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  // 同步覆盖替换，避免半写状态被 system prompt 组装读到。
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8' })
  rmSync(temporary, { force: true })
  return record
}

export interface StoryDocument {
  /** 文档文件名（含扩展名）。 */
  name: string
  /** 文档正文（已按总上限截断）。 */
  text: string
}

export interface StoryLoadResult {
  /** 读取到的文档列表（按文件名排序）。 */
  documents: StoryDocument[]
  /** 实际用于注入的目录；不存在时为 null。 */
  dir: string | null
  /** 是否因超过总字符上限而截断。 */
  truncated: boolean
  /** 截断后实际注入的字符总数。 */
  chars: number
}

const STORY_EXTENSIONS = new Set(['.md', '.txt'])

/**
 * 从工作区目录读取剧情文档。
 * @param storyDir - 剧情文档目录（已解析为绝对路径）。
 * @param maxChars - 全部文档正文的字符总上限，超出按文件名顺序截断。
 */
export function loadStoryDocuments(storyDir: string, maxChars: number): StoryLoadResult {
  if (!existsSync(storyDir) || !statSync(storyDir).isDirectory()) {
    return { documents: [], dir: null, truncated: false, chars: 0 }
  }
  const names = readdirSync(storyDir)
    .filter(name => STORY_EXTENSIONS.has(name.slice(name.lastIndexOf('.')).toLowerCase()))
    .sort()
  const documents: StoryDocument[] = []
  let chars = 0
  let truncated = false
  for (const name of names) {
    const file = join(storyDir, name)
    if (!statSync(file).isFile()) continue
    const text = readFileSync(file, 'utf8').trim()
    if (text === '') continue
    const remaining = maxChars - chars
    if (remaining <= 0) {
      truncated = true
      break
    }
    if (text.length > remaining) {
      documents.push({ name, text: `${text.slice(0, remaining)}\n\n（文档过长，已截断）` })
      chars = maxChars
      truncated = true
      break
    }
    documents.push({ name, text })
    chars += text.length
  }
  return { documents, dir: storyDir, truncated, chars }
}

/**
 * 解析剧情文档目录：配置为绝对路径直接用，否则相对会话 cwd 解析。
 * @param configured - 配置的 storyDir（可能为空）。
 * @param cwd - 会话工作目录；为空时回退到当前进程目录。
 */
export function resolveStoryDir(configured: string | undefined, cwd: string | undefined): string {
  if (configured !== undefined && configured.trim() !== '') {
    return isAbsolute(configured) ? configured : resolve(cwd ?? process.cwd(), configured)
  }
  return resolve(cwd ?? process.cwd(), 'story')
}
