# 生态消化笔记 / Digest of the DSH plugin ecosystem

2026-10-20，浅克隆并通读了四个仓库（`dsh-market`、`dsh-snippets`、`dsh-deep-whale`、`dsh-whale-atelier`），
以及 `awesome-dsh-plugin` 索引（19.6k★，136 个桌宠条目）。只记录**能直接影响本项目**的东西，
以及我们已经照做的改动。

---

## 1. 已消化落地（本项目已改）

### 1.1 用 `dsh.bundle.patch` 让插件可被 `dsh plugin add` 安装
`dsh-market`、`dsh-snippets`、`dsh-whale-atelier`、`deep-whale/skin-manager` 都声明了：

```json
"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
```

加载器会把包内 patch 叠在 profile 的 bundle 层之后。我们照做了：

- `aurora/package.json` 增加 `dsh.bundle.patch` 与 `./cordis.patch.yml` 导出；
- 新增 `aurora/cordis.patch.yml`，内容是插入 `theme-aurora`、`theme-aurora-browser` 两个条目；
- 同时保留 `apply.ps1` 的"直接写 profile patch"路径（桌面端 profile 由 Electron 独占，
  CLI 的 `dsh plugin` 命令不允许改它）。

⚠️ 两条路径**不要同时用**：`dsh plugin add` 装过一次之后再跑 `apply.cmd` 会出现重复条目。

### 1.2 声明兼容性
`dsh-whale-atelier` 在 manifest 里写了：

```json
"dsh": { "compatibility": { "dshReleases": { "0.2.0-rc.2": "compatible" } } }
```

并且明确写了自己依赖"`_frame` / `_centerCol` 这类 CSS-module 类名后缀"——改名就静默失效。
我们照抄了这个声明习惯，并在备注里写清我们**只依赖 token 与语义属性**，不依赖哈希类名。

### 1.3 OKLCH + WCAG 对比度（来自 dsh-bloom-theme 的方法）
`webkubor/dsh-bloom-theme` 用 OKLCH 保证明暗感知一致、并对前景/背景做 WCAG AA 校验。
我们把它做成了可执行流水线：`aurora/tools/palette.mjs`

- 三套风格（墨银/深海/暖砂）改为在 OKLCH 里定义，脚本转 sRGB 后写回 CSS 的生成区间；
- 审计 10 组配对（正文/次要/三级文字 × 各表面、强调色、按钮底、按钮白字），
  当前 6 个组合全部 PASS，最差 3.3（按钮底/一级面，门槛 3.0）；
- `npm run check:contrast` 直接跑审计，失败退出码 1。

注意：**强调色**用于文字/描边，**按钮底**单独用更深的 `--aurora-accent-fill`——
亮色强调色配白图标在暗色下必然不达标，deep-whale 的皮肤也有同样取舍。

---

## 2. 读到了但没照抄（有意放弃）

| 来源 | 做法 | 为什么不抄 |
|---|---|---|
| `dsh-deep-whale/skin-manager` | 把皮肤管理器注册进 **Settings → Skins**，每套皮肤有自己的选项 | 需要 `@deepseek-ai/dsh-client-ui-settings` 的 settings 段落协议；我们的浮层面板零依赖、可随时卸载，先保持轻 |
| `dsh-whale-atelier` | 依赖 `_frame`/`_centerCol` 等 CSS-module 后缀做壁纸布局 | 与 DSH 构建哈希强耦合，升级即碎（作者自己也在 note 里承认） |
| `dsh-snippets` | 内置 CodeMirror 编辑器 + Gist 同步 + 本地文件夹监听 | 功能完备但体积大（CodeMirror 全家桶）；我们只需要"改 CSS 刷新即生效"，已有 `/aurora/theme.css` 热加载 |
| `dsh-market` | 用 `undici` 拉注册表、`update-api-v1` 远程更新协议、独立 `scripts/preflight.mjs` | 那是市场型插件；我们的发布面只是一个 npm 包，不需要自更新 |
| 多数桌宠 | 注册 `shell.overlay` 槽位 + `/api/*` 路由 | 与我们完全同构，**同时装两个必冲突**（槽位 id/路由重复）；我们的 README 已提醒 |

---

## 3. 生态里值得继续抄的（未做）

1. **`dsh.client.external`**：`dsh-market` 用它在 bundle 里精确声明非基线模块请求。我们目前只用
   `react`（基线），无需声明；将来要做设置页时按需加。
2. **`peerDependencies` 版本带**：`dsh-market` 对 `@deepseek-ai/dsh-settings` 写了
   `^0.1.0-rc.7 || ^0.1.1-rc.2 || ...` 的兼容带，比单一版本稳。我们的包暂时 `private: true`，
   等要发布到 npm 时补。
3. **`screenshots.json` + `THIRD-PARTY-NOTICES.md`**：`dsh-whale-atelier` 的素材合规做法，
   我们已有 `assets/pet/CREDITS.md`，发布前再补一份汇总的 NOTICES。
4. **`scripts/validate-*.mjs` + `test/*.test.mjs`**：`dsh-market`/`dsh-snippets` 都有可跑的
   最小测试（jsdom + vitest）。我们的 `palette.mjs` 已经是一个可断言的检查，后续可把
   "样式表关键选择器仍存在"也加进去。

---

## 4. 结论

- 我们的架构（host 注入 + 浏览器面 + 无客户端构建依赖）在生态里是主流做法之一，没走错；
- 最大的差距是**可安装性**（已用 `dsh.bundle.patch` 补齐）和**配色可验证性**（已用 OKLCH+WCAG 补齐）；
- 生态里桌宠/皮肤高度同质，真正稀缺的是"可撤销、可审计、不依赖哈希类名"的工程化细节——这正好是我们的定位。
