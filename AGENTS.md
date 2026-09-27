# dsh-story-mode — 仓库规则

## 项目定位
DeepSeek Harness 外部插件（`@dsh-external/dsh-story-mode`）。给深深加一个「剧情模式」开关：开启后以当前人格身份进入剧情扮演，并读取会话工作区 `story/` 目录下的 `.md` / `.txt` 文档作为场景与须知注入 system prompt；关闭即恢复正常对话，无需重启。

## 硬性边界与约定
- 只注入「扮演指令 + 场景文档」，**不包含人格文本**，也不覆盖任何 system prompt；身份由 whale-companion 的深深人设提供，两个插件可独立安装。
- 插件以追加 section 实现（order 15）；关闭时 section 返回空串，不参与组装。
- 开关状态持久化在 `$DSH_HOME/plugins/dsh-story-mode/state.json`，属用户数据，不得写入仓库或提交。
- 插件对工作区 `story/` 文档只读取、不写回（场景文档由主人或会话侧维护，插件不修改它）；文档总字符数超过 `maxChars`（默认 12000）时按文件名顺序截断。
- `storyDir` 的相对路径相对会话工作区解析，也支持绝对路径；`enabled: false` 时插件完全禁用。
- 状态文件缺失或损坏时按默认关闭处理，不能让 Harness 启动失败。
- **不得声明 `prepare` / `postinstall` 等安装期生命周期脚本**:pnpm 10+ 会拦截依赖的构建脚本（需 `allowBuilds`）而使 `dsh plugin add` 失败，插件市场也据此判为不可安装；入口依赖仓库里已提交的 `lib/`。
- `lib/` 是已跟踪的构建产物：改动 `src/` 后必须 `pnpm run build` 再提交。

## 构建与验收
- 包管理器：pnpm（依据 `pnpm-lock.yaml`）。
- 命令逐字取自 package.json scripts：`pnpm run build`（tsdown）、`pnpm run typecheck`（tsc -p tsconfig.json --noEmit）、`pnpm test`（vitest run --config vitest.config.ts）。
- 单元测试位于 `tests/*.spec.ts`（directive / story-store）。

## 文档路由
- 项目状态看 `PROJECT_INDEX.md`。
- 动态上下文放 `docs/context/`（NOW / MAP / RUNBOOK / DECISIONS / RISKS）。
- 旧内容进 `history/`。
