import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  loadState, loadStoryDocuments, resolveStoryDir, saveState,
  type StoryModeState, type StoryDocument, type StoryLoadResult,
} from './story-store.ts'
import { documentSummaries, renderStoryDirective, STORY_MODE_ORDER, STORY_MODE_SECTION } from './shared/directive.ts'

export const name = '@dsh-external/dsh-story-mode'
export const inject = ['systemPrompt', 'tools']

export interface Config {
  /** 插件总开关；false 时剧情模式完全禁用。 */
  enabled?: boolean
  /** 剧情文档目录；相对路径相对会话工作区解析，缺省为工作区下 story/。 */
  storyDir?: string
  /** 注入 system prompt 的文档总字符上限（超出按文件名顺序截断）。 */
  maxChars?: number
}

/** system prompt 组装作用域（scope 即 agent，见 agent dispatch 的 assembleContextFor）。 */
interface StoryScope {
  session?: {
    requestHeader(): { cwd?: string } | undefined
  }
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  storyDir: z.string().default('story'),
  maxChars: z.number().default(12_000),
})

const MAX_DOCUMENT_CHARS_MIN = 500

/** 空加载结果：剧情模式关闭时复用，避免重复分配。 */
function emptyLoad(): StoryLoadResult {
  return { documents: [], dir: null, truncated: false, chars: 0 }
}

export function apply(ctx: Context, config: Config = {}): void {
  if (config.enabled === false) return
  const storyDirConfig = config.storyDir ?? 'story'
  const maxChars = Math.max(config.maxChars ?? 12_000, MAX_DOCUMENT_CHARS_MIN)

  const assembly = (scope: unknown): { state: StoryModeState; loaded: StoryLoadResult } => {
    const state = loadState()
    if (!state.enabled) return { state, loaded: emptyLoad() }
    const agent = scope as StoryScope | undefined
    const cwd = agent?.session?.requestHeader()?.cwd
    const dir = resolveStoryDir(storyDirConfig, cwd)
    return { state, loaded: loadStoryDocuments(dir, maxChars) }
  }

  // 剧情模式开启时注入扮演指令；关闭时 section 返回空串（等于不参与组装）。
  ctx.effect(() => ctx.systemPrompt.section({
    name: STORY_MODE_SECTION,
    order: STORY_MODE_ORDER,
    text: ({ scope }) => {
      const { loaded } = assembly(scope)
      return renderStoryDirective({
        documents: loaded.documents,
        truncated: loaded.truncated,
        dir: loaded.dir,
      })
    },
  }), 'story-mode: directive section')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'story_mode',
    description: '剧情模式开关：以当前人格为身份进入剧情扮演，并读取工作区 story/ 目录下的文档作为场景与须知。action 传 on/off/status；status 返回当前状态与已加载文档清单。',
    parameters: {
      action: { type: 'string', required: true, description: 'on：开启剧情模式；off：关闭并恢复正常对话；status：仅查询当前状态。' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', required: true },
          changed: { type: 'boolean' },
          storyDir: { type: 'string' },
          documents: { type: 'array', items: { type: 'string' } },
          truncated: { type: 'boolean' },
          hint: { type: 'string' },
        },
        additionalProperties: false,
      },
      render: (_args, value) => {
        const parts: string[] = []
        if (value.hint !== undefined && value.hint !== '') parts.push(value.hint)
        if (value.storyDir !== undefined && value.storyDir !== '') {
          parts.push(`剧情文档目录：${value.storyDir}`)
        }
        if (Array.isArray(value.documents) && value.documents.length > 0) {
          parts.push(`已加载：${value.documents.join('、')}`)
        } else if (value.enabled) {
          parts.push('剧情文档：暂无（可在工作区创建 story/ 目录放入 .md 文件）')
        }
        const text = parts.join('\n')
        return [{ type: 'text', text: text !== '' ? text : `剧情模式已${value.enabled ? '开启' : '关闭'}` }]
      },
    },
    presentCall: (args) => ({ card: 'generic', title: `剧情模式 ${String(args.action ?? 'status')}` }),
    execute: async (args) => {
      const action = String(args.action ?? 'status')
      const current = loadState()
      const enabled = action === 'on'
      if (action !== 'on' && action !== 'off') {
        const { loaded } = assembly(undefined)
        return {
          enabled: current.enabled,
          changed: false,
          storyDir: loaded.dir ?? undefined,
          documents: documentSummaries(loaded.documents),
          truncated: loaded.truncated,
          hint: `剧情模式当前${current.enabled ? '已开启' : '已关闭'}`,
        }
      }
      if (current.enabled === enabled) {
        return {
          enabled,
          changed: false,
          storyDir: resolveStoryDir(storyDirConfig, undefined),
          hint: `剧情模式已经是${enabled ? '开启' : '关闭'}状态`,
        }
      }
      const saved = saveState(enabled)
      const { loaded } = assembly(undefined)
      return {
        enabled: saved.enabled,
        changed: true,
        storyDir: loaded.dir ?? undefined,
        documents: documentSummaries(loaded.documents),
        truncated: loaded.truncated,
        hint: `剧情模式已${saved.enabled ? '开启，以当前人格身份进入扮演' : '关闭，恢复正常对话'}`,
      }
    },
  })), 'story-mode: story_mode tool')

  ctx.inject(['webServer'], (scope: Context) => {
    scope.effect(() => scope.webServer.register({
      kind: 'exact',
      path: '/api/dsh-story-mode/state',
      handler: async (request, response) => {
        response.setHeader('cache-control', 'no-store')
        response.setHeader('content-type', 'application/json; charset=utf-8')
        if (request.method === 'GET') {
          const state = loadState()
          const dir = resolveStoryDir(storyDirConfig, undefined)
          const loaded = loadStoryDocuments(dir, maxChars)
          response.writeHead(200)
          response.end(JSON.stringify({
            enabled: state.enabled,
            updatedAt: state.updatedAt,
            exists: state.exists,
            storyDir: loaded.dir,
            documents: loaded.documents.map(d => ({ name: d.name, chars: d.text.length })),
            truncated: loaded.truncated,
          }))
          return
        }
        if (request.method !== 'PUT') {
          response.writeHead(405, { allow: 'GET, PUT' })
          response.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        if (request.headers['x-dsh-story-mode'] !== '1'
          || !String(request.headers['content-type'] ?? '').startsWith('application/json')) {
          response.writeHead(403)
          response.end(JSON.stringify({ error: 'same-origin configuration request required' }))
          return
        }
        try {
          const body = await readJsonBody(request, 2048)
          if (typeof body !== 'object' || body === null || Array.isArray(body)
            || typeof (body as { enabled?: unknown }).enabled !== 'boolean') {
            throw new Error('request body must contain a boolean "enabled" field')
          }
          const saved = saveState((body as { enabled: boolean }).enabled)
          response.writeHead(200)
          response.end(JSON.stringify({ saved: true, enabled: saved.enabled, updatedAt: saved.updatedAt }))
        } catch (error: unknown) {
          response.writeHead(400)
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      },
    }), 'story-mode: state route')
  })
}

async function readJsonBody(request: AsyncIterable<Uint8Array>, maxBytes: number): Promise<unknown> {
  const chunks: Uint8Array[] = []
  let bytes = 0
  for await (const chunk of request) {
    bytes += chunk.byteLength
    if (bytes > maxBytes) throw new Error(`request body exceeds ${maxBytes} bytes`)
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}
