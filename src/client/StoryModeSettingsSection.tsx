import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import css from './StoryModeSettingsSection.module.css'

const ENDPOINT = '/api/dsh-story-mode/state'

type StoryModeSectionProps = PropsRuntime<'settings.section'>

interface StateResponse {
  enabled?: unknown
  updatedAt?: unknown
  exists?: unknown
  storyDir?: unknown
  documents?: unknown
  truncated?: unknown
  error?: unknown
}

interface DocumentInfo {
  name: string
  chars: number
}

interface StoryModeState {
  enabled: boolean
  updatedAt: string
  storyDir: string | null
  documents: DocumentInfo[]
  truncated: boolean
  loading: boolean
  error: string | null
}

const IDLE_STATE: StoryModeState = {
  enabled: false,
  updatedAt: '',
  storyDir: null,
  documents: [],
  truncated: false,
  loading: true,
  error: null,
}

/** 剧情模式设置页：显示当前开关状态、切换按钮与已加载的剧情文档清单。 */
export function StoryModeSettingsSection(_props: StoryModeSectionProps): ReactNode {
  const [state, setState] = useState<StoryModeState>(IDLE_STATE)
  const [saving, setSaving] = useState(false)

  const refresh = (): void => {
    setState(current => ({ ...current, loading: true, error: null }))
    void requestState().then(
      (value) => {
        setState({ ...value, loading: false, error: null })
      },
      (reason: unknown) => {
        setState(current => ({
          ...current,
          loading: false,
          error: reason instanceof Error ? reason.message : String(reason),
        }))
      },
    )
  }

  useEffect(() => {
    refresh()
    // 切换剧情模式后重新拉取（工具侧也可能改动状态）。
    const timer = window.setInterval(refresh, 8000)
    return () => { window.clearInterval(timer) }
  }, [])

  const toggle = async (enabled: boolean): Promise<void> => {
    setSaving(true)
    try {
      const response = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-dsh-story-mode': '1',
        },
        body: JSON.stringify({ enabled }),
      })
      const body = await responseBody(response)
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${response.status}`)
      refresh()
    } catch (reason: unknown) {
      setState(current => ({
        ...current,
        error: reason instanceof Error ? reason.message : String(reason),
      }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={css.section} data-story-mode-settings>
      <div className={css.heading}>
        <span className={css.crest} aria-hidden="true" />
        <div>
          <h2>剧情模式</h2>
          <p>
            {state.loading
              ? '正在读取状态…'
              : state.enabled
                ? '已开启：以当前人格身份进入剧情扮演'
                : '已关闭：正常对话'}
          </p>
        </div>
      </div>

      {state.error === null ? null : <p className={css.error} role="alert">{state.error}</p>}

      <div className={css.actions}>
        <Button
          disabled={saving || state.loading}
          onClick={() => { void toggle(!state.enabled) }}
        >
          {saving ? '正在切换…' : state.enabled ? '关闭剧情模式' : '开启剧情模式'}
        </Button>
        {state.enabled && state.updatedAt !== ''
          ? <span className={css.meta}>开启于 {formatTime(state.updatedAt)}</span>
          : null}
      </div>

      <div className={css.docs}>
        <div className={css.docsHeading}>
          <span>剧情文档</span>
          <small>放在工作区 story/ 目录下的 .md / .txt 文件</small>
        </div>
        {state.documents.length === 0
          ? <p className={css.empty}>暂无剧情文档。可在当前工作区创建 story/ 目录，放入 scene.md（场景）、rules.md（须知）等文件。</p>
          : <ul>
            {state.documents.map(doc => (
              <li key={doc.name}>
                <code>{doc.name}</code>
                <span>{doc.chars.toLocaleString()} 字符</span>
              </li>
            ))}
          </ul>}
        {state.truncated ? <p className={css.warn}>部分文档因超出注入上限被截断。</p> : null}
        {state.storyDir !== null ? <p className={css.path}>目录：<code>{state.storyDir}</code></p> : null}
      </div>
    </div>
  )
}

async function requestState(): Promise<StoryModeState> {
  const response = await fetch(ENDPOINT, { cache: 'no-store' })
  const body = await responseBody(response)
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${response.status}`)
  return {
    enabled: body.enabled === true,
    updatedAt: typeof body.updatedAt === 'string' ? body.updatedAt : '',
    storyDir: typeof body.storyDir === 'string' ? body.storyDir : null,
    documents: Array.isArray(body.documents)
      ? body.documents
        .filter((d): d is DocumentInfo => typeof d === 'object' && d !== null
          && typeof (d as DocumentInfo).name === 'string'
          && typeof (d as DocumentInfo).chars === 'number')
        .map(d => ({ name: d.name, chars: d.chars }))
      : [],
    truncated: body.truncated === true,
    loading: false,
    error: null,
  }
}

async function responseBody(response: Response): Promise<StateResponse> {
  const text = await response.text()
  try {
    return JSON.parse(text) as StateResponse
  } catch {
    throw new Error(`剧情模式接口返回了无效响应（HTTP ${response.status}）。`)
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-CN', { hour12: false })
}
