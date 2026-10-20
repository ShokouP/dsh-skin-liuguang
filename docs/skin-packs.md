# 皮肤包 / Skin packs

Liuguang 支持**投放式皮肤包**：一个目录 + 一份 `pack.json` + 一份 `theme.css`，放到
`<DSH_HOME>/liuguang-packs/<id>/` 就会出现在 `✦ → 外观 → 皮肤包` 里，点一下即时切换，
**不需要重启、也不需要改任何配置**。

格式参考了 `dsh-whale-atelier` 的 skin pack 做法（目录 + manifest + 索引，坏包只影响自己）。

## 目录结构

```
%USERPROFILE%\.dsh\liuguang-packs\
└── mist\
    ├── pack.json     # 必需：id / name / desc
    └── theme.css     # 必需：≤512 KiB 的纯 CSS
```

`DSH_HOME` 环境变量存在时用它的值，否则用 `%USERPROFILE%\.dsh`。

## pack.json

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | `^[a-z0-9][a-z0-9-]{0,31}$`，**必须与目录名一致** |
| `name` | 是 | 面板里显示的名字，≤40 字 |
| `desc` | 否 | 悬停提示，≤120 字 |
| `version` | 否 | 目前恒为 `1` |

## theme.css

- 在皮肤之后加载，可直接覆盖 `--dsw-*` / `--lg-*` 变量，也可以写选择器改形状；
- 只用 `html[data-lg-style] body…` 这类前缀，能保证优先级高于内置三套风格；
- 文件读取上限 **512 KiB**，超出返回 413。

## 安全边界

- 路由只接受 `<id>.css` 形式，`id` 用白名单正则校验，**无法目录穿越**；
- 只返回 `text/css` + `nosniff`，包内**没有 JS 执行路径**；
- 包来自本地磁盘，走的是用户自己的账号权限，与 DSH 其他插件一致；
- 每次请求重读文件（`no-store`），改完 CSS 刷新页面即生效。

## 示例

仓库里带了一个可直接安装的示例：`examples/packs/mist/`（樱雾，浅粉 + 藕荷强调色）。

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.dsh\liuguang-packs" | Out-Null
Copy-Item -Recurse -Force D:\yangchengcup\ui\examples\packs\mist "$env:USERPROFILE\.dsh\liuguang-packs\mist"
```

刷新 GUI → `✦` → 外观 → 皮肤包 → 樱雾。

## 校验

- `GET /liuguang/packs` 返回 `{ packs: [{id,name,desc}], problems: [...] }`；
- `GET /liuguang/packs/<id>.css` 返回该包的样式表；
- 坏包（缺 `pack.json` / JSON 损坏 / `id` 与目录名不符 / 缺 `theme.css` / 超过大小）只记入
  `problems`，其它包照常工作，面板「关于」页会提示坏包数量。
