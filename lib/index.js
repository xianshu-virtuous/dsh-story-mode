import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
//#region src/story-store.ts
/**
* 剧情模式状态存取与工作区剧情文档读取。
*
* 状态文件存 `$DSH_HOME/plugins/dsh-story-mode/state.json`，开关即时生效
* （system prompt section 每次组装时同步读取，无需重启）。
* 剧情文档约定放在工作区（会话 cwd）下的 story 目录（可配置），
* 读取其中全部 .md/.txt 文件作为场景与须知注入。
*/
/** 剧情模式持久化状态文件。 */
function statePath() {
	return dshHomePath("plugins", "dsh-story-mode", "state.json");
}
/** 读取持久化开关状态；文件缺失或损坏时按默认关闭处理。 */
function loadState(path = statePath()) {
	if (!existsSync(path)) return {
		enabled: false,
		updatedAt: "",
		exists: false
	};
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("state document must be an object");
		const record = parsed;
		return {
			enabled: record.enabled === true,
			updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
			exists: true
		};
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.warn(`story-mode: ignoring invalid state file "${path}": ${reason}`);
		return {
			enabled: false,
			updatedAt: "",
			exists: false
		};
	}
}
/** 校验并持久化开关状态（覆盖写，原子替换）。 */
function saveState(enabled, path = statePath()) {
	mkdirSync(dirname(path), { recursive: true });
	const record = {
		enabled,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, {
		encoding: "utf8",
		flag: "wx"
	});
	writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8" });
	rmSync(temporary, { force: true });
	return record;
}
const STORY_EXTENSIONS = /* @__PURE__ */ new Set([".md", ".txt"]);
/**
* 从工作区目录读取剧情文档。
* @param storyDir - 剧情文档目录（已解析为绝对路径）。
* @param maxChars - 全部文档正文的字符总上限，超出按文件名顺序截断。
*/
function loadStoryDocuments(storyDir, maxChars) {
	if (!existsSync(storyDir) || !statSync(storyDir).isDirectory()) return {
		documents: [],
		dir: null,
		truncated: false,
		chars: 0
	};
	const names = readdirSync(storyDir).filter((name) => STORY_EXTENSIONS.has(name.slice(name.lastIndexOf(".")).toLowerCase())).sort();
	const documents = [];
	let chars = 0;
	let truncated = false;
	for (const name of names) {
		const file = join(storyDir, name);
		if (!statSync(file).isFile()) continue;
		const text = readFileSync(file, "utf8").trim();
		if (text === "") continue;
		const remaining = maxChars - chars;
		if (remaining <= 0) {
			truncated = true;
			break;
		}
		if (text.length > remaining) {
			documents.push({
				name,
				text: `${text.slice(0, remaining)}\n\n（文档过长，已截断）`
			});
			chars = maxChars;
			truncated = true;
			break;
		}
		documents.push({
			name,
			text
		});
		chars += text.length;
	}
	return {
		documents,
		dir: storyDir,
		truncated,
		chars
	};
}
/**
* 解析剧情文档目录：配置为绝对路径直接用，否则相对会话 cwd 解析。
* @param configured - 配置的 storyDir（可能为空）。
* @param cwd - 会话工作目录；为空时回退到当前进程目录。
*/
function resolveStoryDir(configured, cwd) {
	if (configured !== void 0 && configured.trim() !== "") return isAbsolute(configured) ? configured : resolve(cwd ?? process.cwd(), configured);
	return resolve(cwd ?? process.cwd(), "story");
}
//#endregion
//#region src/shared/directive.ts
/** 剧情模式系统提示 section 的唯一名称。 */
const STORY_MODE_SECTION = "story-mode:directive";
/** 渲染注入的剧情模式指令；文档为空时仍给出边界说明。 */
function renderStoryDirective(input) {
	const parts = ["<story-mode>", "【剧情模式】已开启。以你当前的人格设定为身份，完整地进入剧情扮演："];
	if (input.documents.length > 0) {
		parts.push("", "以下是工作区加载的剧情设定，场景与须知以此为准，严格遵守：", "");
		for (const document of input.documents) parts.push(`【${document.name}】`, document.text, "");
		if (input.truncated) parts.push("（部分文档因超出注入上限被截断）");
	} else parts.push("", "（工作区暂未找到剧情文档：可在当前工作区创建 story/ 目录并放入 .md 场景与须知文件，切换开关后生效）");
	parts.push("", "扮演规则：", "1. 全程以该人格身份说话与行动，不跳出角色、不解释自己在扮演。", "2. 剧情中的场景、人物、规则以工作区文档为准；文档未覆盖处自由发挥。", "3. 主人说“退出剧情模式”或关闭剧情模式开关时，立即恢复正常对话。", "</story-mode>");
	return parts.join("\n");
}
/** 剧情模式工具输出里的文档摘要（不含正文，省 token）。 */
function documentSummaries(documents, maxShown = 8) {
	const shown = documents.slice(0, maxShown);
	const names = shown.map((d) => `${d.name}（${d.text.length} 字符）`);
	if (documents.length > shown.length) names.push(`…另有 ${documents.length - shown.length} 个文件`);
	return names;
}
//#endregion
//#region src/index.ts
const name = "@dsh-external/dsh-story-mode";
const inject = ["systemPrompt", "tools"];
const Config = z.object({
	enabled: z.boolean().default(true),
	storyDir: z.string().default("story"),
	maxChars: z.number().default(12e3)
});
const MAX_DOCUMENT_CHARS_MIN = 500;
/** 空加载结果：剧情模式关闭时复用，避免重复分配。 */
function emptyLoad() {
	return {
		documents: [],
		dir: null,
		truncated: false,
		chars: 0
	};
}
function apply(ctx, config = {}) {
	if (config.enabled === false) return;
	const storyDirConfig = config.storyDir ?? "story";
	const maxChars = Math.max(config.maxChars ?? 12e3, MAX_DOCUMENT_CHARS_MIN);
	const assembly = (scope) => {
		const state = loadState();
		if (!state.enabled) return {
			state,
			loaded: emptyLoad()
		};
		const cwd = scope?.session?.requestHeader()?.cwd;
		return {
			state,
			loaded: loadStoryDocuments(resolveStoryDir(storyDirConfig, cwd), maxChars)
		};
	};
	ctx.effect(() => ctx.systemPrompt.section({
		name: STORY_MODE_SECTION,
		order: 15,
		text: ({ scope }) => {
			const { loaded } = assembly(scope);
			return renderStoryDirective({
				documents: loaded.documents,
				truncated: loaded.truncated,
				dir: loaded.dir
			});
		}
	}), "story-mode: directive section");
	ctx.effect(() => ctx.tools.register(defineTool({
		name: "story_mode",
		description: "剧情模式开关：以当前人格为身份进入剧情扮演，并读取工作区 story/ 目录下的文档作为场景与须知。action 传 on/off/status；status 返回当前状态与已加载文档清单。",
		parameters: { action: {
			type: "string",
			required: true,
			description: "on：开启剧情模式；off：关闭并恢复正常对话；status：仅查询当前状态。"
		} },
		output: {
			schema: {
				type: "object",
				properties: {
					enabled: {
						type: "boolean",
						required: true
					},
					changed: { type: "boolean" },
					storyDir: { type: "string" },
					documents: {
						type: "array",
						items: { type: "string" }
					},
					truncated: { type: "boolean" },
					hint: { type: "string" }
				},
				additionalProperties: false
			},
			render: (_args, value) => {
				const parts = [];
				if (value.hint !== void 0 && value.hint !== "") parts.push(value.hint);
				if (value.storyDir !== void 0 && value.storyDir !== "") parts.push(`剧情文档目录：${value.storyDir}`);
				if (Array.isArray(value.documents) && value.documents.length > 0) parts.push(`已加载：${value.documents.join("、")}`);
				else if (value.enabled) parts.push("剧情文档：暂无（可在工作区创建 story/ 目录放入 .md 文件）");
				const text = parts.join("\n");
				return [{
					type: "text",
					text: text !== "" ? text : `剧情模式已${value.enabled ? "开启" : "关闭"}`
				}];
			}
		},
		presentCall: (args) => ({
			card: "generic",
			title: `剧情模式 ${String(args.action ?? "status")}`
		}),
		execute: async (args) => {
			const action = String(args.action ?? "status");
			const current = loadState();
			const enabled = action === "on";
			if (action !== "on" && action !== "off") {
				const { loaded } = assembly(void 0);
				return {
					enabled: current.enabled,
					changed: false,
					storyDir: loaded.dir ?? void 0,
					documents: documentSummaries(loaded.documents),
					truncated: loaded.truncated,
					hint: `剧情模式当前${current.enabled ? "已开启" : "已关闭"}`
				};
			}
			if (current.enabled === enabled) return {
				enabled,
				changed: false,
				storyDir: resolveStoryDir(storyDirConfig, void 0),
				hint: `剧情模式已经是${enabled ? "开启" : "关闭"}状态`
			};
			const saved = saveState(enabled);
			const { loaded } = assembly(void 0);
			return {
				enabled: saved.enabled,
				changed: true,
				storyDir: loaded.dir ?? void 0,
				documents: documentSummaries(loaded.documents),
				truncated: loaded.truncated,
				hint: `剧情模式已${saved.enabled ? "开启，以当前人格身份进入扮演" : "关闭，恢复正常对话"}`
			};
		}
	})), "story-mode: story_mode tool");
	ctx.inject(["webServer"], (scope) => {
		scope.effect(() => scope.webServer.register({
			kind: "exact",
			path: "/api/dsh-story-mode/state",
			handler: async (request, response) => {
				response.setHeader("cache-control", "no-store");
				response.setHeader("content-type", "application/json; charset=utf-8");
				if (request.method === "GET") {
					const state = loadState();
					const loaded = loadStoryDocuments(resolveStoryDir(storyDirConfig, void 0), maxChars);
					response.writeHead(200);
					response.end(JSON.stringify({
						enabled: state.enabled,
						updatedAt: state.updatedAt,
						exists: state.exists,
						storyDir: loaded.dir,
						documents: loaded.documents.map((d) => ({
							name: d.name,
							chars: d.text.length
						})),
						truncated: loaded.truncated
					}));
					return;
				}
				if (request.method !== "PUT") {
					response.writeHead(405, { allow: "GET, PUT" });
					response.end(JSON.stringify({ error: "method not allowed" }));
					return;
				}
				if (request.headers["x-dsh-story-mode"] !== "1" || !String(request.headers["content-type"] ?? "").startsWith("application/json")) {
					response.writeHead(403);
					response.end(JSON.stringify({ error: "same-origin configuration request required" }));
					return;
				}
				try {
					const body = await readJsonBody(request, 2048);
					if (typeof body !== "object" || body === null || Array.isArray(body) || typeof body.enabled !== "boolean") throw new Error("request body must contain a boolean \"enabled\" field");
					const saved = saveState(body.enabled);
					response.writeHead(200);
					response.end(JSON.stringify({
						saved: true,
						enabled: saved.enabled,
						updatedAt: saved.updatedAt
					}));
				} catch (error) {
					response.writeHead(400);
					response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
				}
			}
		}), "story-mode: state route");
	});
}
async function readJsonBody(request, maxBytes) {
	const chunks = [];
	let bytes = 0;
	for await (const chunk of request) {
		bytes += chunk.byteLength;
		if (bytes > maxBytes) throw new Error(`request body exceeds ${maxBytes} bytes`);
		chunks.push(chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
//#endregion
export { Config, apply, inject, name };
