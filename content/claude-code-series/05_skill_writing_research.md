---
title: "Skill 写作深度调研：如何构建真正好用的 AI 插件"
slug: "05_skill_writing_research"
date: 2026-03-24T00:00:00+08:00
draft: false
tags: ["Claude Code", "OpenClaw", "Skill", "AI工具"]
categories: ["Claude Code 专题"]
---

# Skill 写作深度调研：如何构建真正好用的 AI 插件

## 什么是 Skill

Skill 是 AI 智能体的"插件系统"——把专业领域的知识、工作流程和工具封装成可复用的模块。OpenClaw 的 Skill 本质上是一个目录，包含：

```
skill-name/
├── SKILL.md (必需)        # 触发条件和执行指南
├── scripts/               # 可执行脚本（Python/Bash 等）
├── references/            # 参考文档（按需加载）
└── assets/               # 静态资源（模板、图标等）
```

Skill 让 AI 不再是通用模型，而是能胜任特定专业任务的专家。

## 为什么 Skill 如此重要

模型本身再强，也无法凭空知道：
- 你的内部 API 接口和认证方式
- 公司特有的代码规范和业务逻辑
- 需要特定序列操作的复杂工作流
- 特定工具的调用方式和错误处理

Skill 就是填补这个缺口的机制。把"只有你知道"的知识注入 AI 的执行上下文。

## Skill 的核心设计原则

### 原则 1：越简洁越好

Context window 是公共资源。Skill 和所有内容共享有限的上下文空间：

- 系统提示词
- 对话历史
- 其他 Skill 的元数据
- 用户的实际请求

**每个 Skill 应当只提供 AI 真正不知道的内容。** 每写一段话都要问自己：AI 真的需要这个解释吗？这段文字值得花多少 token？

优先用简洁的代码示例替代冗长的文字说明。

### 原则 2：自由度要匹配任务的脆弱程度

| 任务类型 | 自由度 | 说明 |
|---------|--------|------|
| 开放性任务（多种解法） | 高 | 用自然语言描述，允许多种路径 |
| 有偏好模式的任务 | 中 | 提供参数化脚本，允许一定变化 |
| 脆弱易错的任务 | 低 | 具体脚本，参数少，执行顺序固定 |

```
高自由度示例（自然语言）：
"使用 docx-js 创建文档。生成后检查段落数量是否合理。"

低自由度示例（固定脚本）：
python scripts/create_docx.py --template contract.docx --data data.json
```

### 原则 3：触发条件要精准

SKILL.md 的 description 字段是唯一的触发机制。描述要同时说明：
- **这个 Skill 做什么**
- **什么场景下应该调用它**

❌ 差的描述：`GitHub 操作`
✅ 好的描述：`通过 gh CLI 操作 GitHub 仓库、Issues、PRs 和 CI。当需要检查 PR 状态、查看 CI 日志、创建 Issue、合并 PR 时触发。NOT for: 本地 git 操作（用 git 直接）、非 GitHub 平台。`

## Skill 文件结构详解

### SKILL.md 的标准格式

```yaml
---
name: skill-name                    # 小写字母 + 数字 + 连字符
description: "详细描述：做什么、什么时候用、什么场景触发"
metadata: {                         # 可选，OpenClaw 扩展字段
  openclaw: {
    emoji: "🔧",
    requires: { bins: ["gh"] }
  }
}
---

# 标题（可选，通常是 Skill 名称）

## When to Use            # 简洁，不需要长篇大论

✅ **使用这个 Skill 当：**
- 具体场景 1
- 具体场景 2

❌ **不要使用当：**
- 场景 1
- 场景 2

## Setup                  # 环境配置（如需要）

```bash
npm install -g some-cli
gh auth login
```

## 使用指南               # 核心内容
...
```

### 三种可选资源目录

**scripts/ — 需要确定性执行的代码**

何时使用：
- 同一段代码被反复重写
- 需要确定性的执行结果
- 复杂计算或文件转换

何时避免：
- 代码很短且简单（直接内联）
- 需要根据上下文灵活调整

**references/ — 按需加载的大文档**

何时使用：
- 不常用但需要精确的参考资料（如 API schema、配置格式）
- 内容太长不适合放在 SKILL.md
- 需要精确匹配的信息（版本号、字段名等）

何时避免：
- 常用内容（每次都用到的应该内联）
- 嵌套超过 1 层深的引用

**assets/ — 模板和静态文件**

何时使用：
- 需要复用的模板文件（合同、邮件、代码框架）
- 图标、图片等静态资源
- 示例输入/输出文件

## 触发机制与描述写作

### 描述的黄金公式

```
description = "这个 Skill 做 X。当你需要 [具体动作 1]、[具体动作 2]、[具体动作 3] 时使用。NOT for：[不应该触发的情况 1]、[不应该触发的情况 2]。"
```

### 实际案例对比

❌ **模糊触发：**
```
description: "GitHub 相关操作"
```
问题：AI 无法判断哪些算"相关"，哪些不算。

✅ **精准触发：**
```
description: "GitHub operations via gh CLI: issues, PRs, CI runs, code review, API queries.
Use when: (1) checking PR status or CI, (2) creating/commenting on issues,
(3) listing/filtering PRs or issues, (4) viewing run logs.
NOT for: local git operations, non-GitHub repos, cloning repos, code review of actual changes."
```

### 条件详情模式

对于内容较长的 Skill，使用条件详情模式避免 context overflow：

```markdown
# DOCX Processing

## Creating documents
使用 docx-js。详见 [DOCX-JS.md](references/DOCX-JS.md)。

## Editing documents
简单编辑直接修改 XML。

**For tracked changes**: See [references/REDLINING.md](references/REDLINING.md)
**For OOXML details**: See [references/OOXML.md](references/OOXML.md)
```

AI 只有在需要时才会读取 referenced 文件。

## OpenClaw Skill 的扩展字段

OpenClaw 的 SKILL.md 支持 `metadata.openclaw` 扩展，可以声明：

```yaml
metadata:
  openclaw:
    emoji: "🔧"                        # Skill 图标
    requires:
      bins: ["gh", "forge"]           # 需要的二进制命令
      anyBins: ["claude", "codex"]    # 任一可用的命令
      env: ["OPENAI_API_KEY"]          # 必需的环境变量
    install:
      - id: brew
        kind: brew
        formula: gh
        label: "Install via Homebrew"
```

这些元数据让 OpenClaw 在 Skill 触发前自动检查依赖是否满足。

## 常见反模式（避坑指南）

### 反模式 1：把所有知识都塞进 SKILL.md

❌ 错误做法：
```markdown
# GitHub Skill

## GitHub 简介
GitHub 是一个代码托管平台...

## 基本概念
Repository、Branch、Commit、Pull Request...

## gh CLI 安装
...（200 行安装教程）
```

✅ 正确做法：
```markdown
# GitHub Skill

## Setup
gh CLI 是必需工具。安装方式：
- macOS: brew install gh
- Linux: apt install gh
- 详见 https://cli.github.com

## When to Use
...（精准的触发描述）
```

把长内容拆分到 references/ 按需加载。

### 反模式 2：自由度与任务不匹配

❌ 错误：对简单操作给高自由度
```markdown
# PDF 处理
"处理 PDF 文件，旋转、合并、拆分都行"
```
→ AI 可能每次用不同工具、不同参数，执行不稳定。

✅ 正确：对简单操作给低自由度
```markdown
# PDF 处理
旋转 PDF：
python scripts/rotate_pdf.py --input <file> --degrees 90

合并 PDF：
python scripts/merge_pdfs.py --inputs <file1> <file2> --output <out>
```

### 反模式 3：触发条件重复或重叠

当多个 Skill 都可以处理同一请求时，AI 会困惑。确保：
- 每个 Skill 有清晰的边界
- 相似的 Skill 用 NOT for 明确区分
- 避免"什么都能干"的超级 Skill

### 反模式 4：忽略错误处理

好的 Skill 要预见错误：

```markdown
## 常见错误

### gh auth login 失败
→ 检查是否有 GitHub 账号：https://github.com/signup
→ Token 需要 repo 权限：在 https://github.com/settings/tokens 生成

### forge test 通过但 CI 失败
→ 常见原因：本地 node 版本与 CI 不同。检查 .nvmrc 或 engines 字段。
```

## 优秀 Skill 案例分析

### 案例 1：github Skill — 精准边界

```yaml
name: github
description: "GitHub operations via gh CLI: issues, PRs, CI runs, code review, API queries.
Use when: (1) checking PR status or CI, (2) creating/commenting on issues,
(3) listing/filtering PRs or issues, (4) viewing run logs.
NOT for: local git operations, non-GitHub repos, cloning repos, code review of actual changes."
```

亮点：
- 明确列出 4 种使用场景
- 明确排除 4 种不应该用的情况
- 触发条件精确到"检查 CI 日志"这类具体动作

### 案例 2：coding-agent Skill — 低自由度高确定性

```bash
# Claude Code（无 PTY）
cd /path && claude --permission-mode bypassPermissions --print 'task'

# Codex/Pi/OpenCode（需要 PTY）
bash pty:true command:"codex exec 'task'"
```

亮点：
- 对不同工具有不同的精确命令
- 明确说明 PTY 模式的选择
- 直接给出可运行的命令模板

### 案例 3：skill-creator Skill — 元技能设计

skill-creator 是一个"教 AI 写 Skill 的 Skill"，它自己就是最好的示范：

```yaml
name: skill-creator
description: "Create, edit, improve, or audit AgentSkills. Use when:
(1) creating a new skill from scratch, (2) improving/cleaning up existing skills,
(3) auditing or reviewing skills, (4) restructuring skill directories."
```

亮点：
- 触发条件用编号列表，清晰无歧义
- 覆盖 Skill 的全生命周期（创建→改进→审核）
- description 本身就只有 2 行，精简到极致

## Skill 开发流程

```
1. 理解需求 → 收集具体使用场景（向用户提问）
2. 规划内容 → 确定 scripts/references/assets
3. 初始化 → 运行 init_skill.py 生成模板
4. 编写 SKILL.md → 精准触发 + 简洁内容
5. 实现脚本 → 测试每段代码
6. 打包发布 → 运行 package_skill.py
7. 迭代优化 → 收集真实使用反馈
```

## 自检清单

发布前检查：

- [ ] description 是否精准覆盖主要场景？
- [ ] 是否有明确的 NOT for 排除不适用场景？
- [ ] 内容是否精简（内联常用内容，引用不常用内容）？
- [ ] 所有脚本是否实际运行测试过？
- [ ] metadata.requires 的依赖是否完整？
- [ ] 触发关键词是否自然融入 description？
- [ ] 是否有错误处理和常见问题章节？

## 总结

好的 Skill 三要素：

1. **精准触发**：description 让 AI 一眼判断该不该用
2. **精简内容**：只提供 AI 不知道的，按需加载长内容
3. **确定性执行**：脆弱任务用脚本固定，易错路径给出错误处理

Skill 是 AI 专业化的核心机制。一个精心设计的 Skill，可以让 AI 从"通用助手"变成"领域专家"。

---

## 相关资源

- OpenClaw 官方 Skill 集合：https://clawhub.com
- Skill 创建工具源码：OpenClaw 内置 `skill-creator` Skill
- 本博客 OpenClaw 专题：/dex-bok/openclaw-series/
