# 宠物形象来源 / Pet art credits

本目录与 `aurora-browser/assets/pet/` 下的鲸鱼娘立绘均来自社区二创整理仓库
[xxnb0/deepseek-chan-fanpack](https://github.com/xxnb0/deepseek-chan-fanpack)
（`assets/stickers/common/`）：

| 文件 | 原始素材 | 用途 |
|---|---|---|
| `pet/wave.png` | `新Q_01_挥手问好.png` | 默认 / 待机 |
| `pet/done.png` | `新Q_04_完成交付.png` | 完成、悬停 |
| `pet/task.png` | `新Q_02_收到任务.png` | 接活、点击 |
| `pet/surprised.png` | `06_惊讶.webp` | 惊讶 |
| `pet/pout.png` | `10_气鼓鼓.png` | 鼓气 |
| `pet/slack.png` | `08_摸鱼玩梗.webp` | 摸鱼 |
| `pet/sleepy.png` | `09_困了.webp` | 久置犯困 |

- 形象溯源：**上善无形**（bilibili 动态）与 **ZipZipPipe** 的 DeepSeek 娘二创；
  原作者对发布内容标注 **CC BY-NC-SA 4.0**。
- 以上素材按 **CC BY-NC-SA 4.0**（署名—非商业性使用—相同方式共享）使用：
  - 署名：上善无形、ZipZipPipe，以及 fanpack 整理者 xxnb0；
  - 仅限非商业用途；
  - 二次修改（本仓库做了去底、裁切、缩放到 320px）需以相同许可共享。
- 这些图片**不属于**本仓库代码的 MIT 许可范围；MIT 仅覆盖 `aurora/` 与
  `aurora-browser/` 下的代码与 `aurora.css`。
- 与 DeepSeek 官方无隶属关系；商用请自行联系原作者取得授权。

处理方式：Pillow 以边框连通域泛洪去底（适配白/浅灰背景）→ 按 alpha 裁切 →
高斯羽化 0.4px → 缩放到 320×320 PNG。
