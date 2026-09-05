# Codeblock Previewer Plus

[English](README.md) · 简体中文

为 [Typora](https://typoraio.cn) 代码块渲染预览提供浮动窗口查看功能，支持缩放与拖拽。

## 功能特性

- **浮动预览** — 在 Mermaid 代码块的渲染结果上显示「打开浮动窗口」按钮，点击即可在新浮动窗口中查看
- **缩放控制** — 浮动窗口右下角工具栏提供放大/缩小/重置按钮，支持鼠标滚轮缩放（范围 10% - 500%）
- **拖拽平移** — 在浮动窗口内按住鼠标左键拖动可平移内容
- **可调节窗口大小** — 浮动窗口支持拖拽调整尺寸

## 预览

![](docs/assets/base.gif)

## 使用

1. 在 Typora 文档中编写一个 Mermaid 代码块，例如：

   ````markdown
   ```mermaid
   graph TD
       A --> B
       B --> C
   ```
   ````

2. Typora 会在代码块下方渲染预览结果，右上角出现「打开浮动窗口」按钮（外链图标）
3. 点击该按钮即可在独立浮动窗口中查看渲染后的图表，支持缩放和拖拽操作

## 支持的代码语言

| 语言     | 说明             |
| -------- | ---------------- |
| `mermaid` | Mermaid 流程图/图表 |

## 安装方法

1. 安装 [typora-community-plugin][core]
2. 打开"设置 -> 社区插件"搜索 "Codeblock Previewer Plus" 然后安装。

## 许可证

MIT
