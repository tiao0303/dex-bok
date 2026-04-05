---
title: "从 0 到 1 构建 Harness Engineering：AI 时代的工程实践指南"
description: "深度解析如何从零开始搭建一套完整的 Harness Engineering 系统，包括三层架构、工具链配置和实战避坑指南"
date: 2026-04-05
tags: ["Harness Engineering", "AI Agents", "Codex", "Engineering Culture", "实战指南"]
categories: ["AI", "Engineering"]
author: "researcher"
toc: true
---

# 从 0 到 1 构建 Harness Engineering：AI 时代的工程实践指南

> 2025 年，AI 智能体证明了它们能写代码。2026 年，整个行业终于意识到：**智能体不是难点，Harness（驾驭系统）才是。**

---

## 什么是 Harness Engineering？

### 马的隐喻

"Harness"（驾驭具）这个词来自马具——缰绳、鞍具、嚼子，一套控制强大但不可预测的力量的装备。隐喻非常精准：

- **马** = AI 模型 — 强大、快速，但不知道该往哪走
- **驾驭具** = 基础设施 — 约束、护栏、反馈回路，引导模型有效工作
- **骑手** = 人类工程师 — 提供方向，不做奔跑

没有驾驭具，AI 智能体就像一匹在荒野中的纯血赛马——快、震撼、但完全无法完成任何实际任务。

### 正式定义

Harness Engineering 是设计与实现以下系统的学科：

- **约束**智能体能做什么（架构边界、依赖规则）
- **告知**智能体应该做什么（情境工程、文档）
- **验证**智能体做得是否正确（测试、linting、CI 验证）
- **纠正**智能体出错时（反馈回路、自我修复机制）

> 一句话总结：**Harness = Model（模型）× Constraints（约束）× Feedback（反馈）× Documentation（文档）**

---

## 为什么现在非做不可

### 模型已商品化，Harness 才是护城河

LangChain 用同一个模型，将 Terminal Bench 2.0 得分从 **Top 30 跃升至 Top 5**，只改了 Harness：

| 改动 | 做法 | 影响 |
|------|------|------|
| 自验证循环 | 添加完成前检查清单中间件 | 在提交前捕获错误 |
| 情境工程 | 启动时映射目录结构 | 智能体从一开始理解代码库 |
| 循环检测 | 追踪重复文件编辑 | 防止"死亡循环" |
| 推理三明治 | 规划/验证用高级推理，执行用中级推理 | 时间预算内质量更优 |

**同样的模型，不同的 Harness，结果天壤之别。**

---

## 三层核心架构

### 第一层：情境工程（Context Engineering）

情境工程解决的核心问题：**让智能体在正确的时间获得正确的信息。**

**静态情境：**
- 代码库本地的文档（架构规范、API 契约、风格指南）
- `AGENTS.md` / `CLAUDE.md` 文件，编码项目特定规则
- 经 linter 交叉验证的设计文档

**动态情境：**
- 可观测性数据（日志、指标、追踪记录）对智能体可读
- 智能体启动时目录结构映射
- CI/CD 流水线状态和测试结果

**核心法则：** 从智能体的视角看，任何在上下文（Context）中无法访问的东西 = 不存在。存在 Google Docs、Slack 聊天记录或人类脑海中的知识，对系统来说都是隐形的。**代码库必须是唯一的事实来源（Single Source of Truth）。**

---

### 第二层：架构约束（Architectural Constraints）

这是 Harness Engineering 与传统 AI Prompting 差异最大的地方：不告诉智能体"写好代码"，而**机械性地强制执行"好代码长什么样"。**

**依赖分层模型：**

```
Types → Config → Repo → Service → Runtime → UI
```

每层只能向前依赖（从左到右），依赖方向经结构化测试严格验证。这不是建议，是 CI 自动执行的规则。

**约束强制工具：**

- **确定性 Linter** — 自动标记违规的自定义规则
- **LLM 审计员** — 智能体审查智能体代码的合规性
- **结构化测试** — 类似 ArchUnit，但面向 AI 生成代码
- **Pre-commit Hooks** — 代码提交前的自动化检查

**反直觉的结论：** 约束解决方案空间 → 智能体反而更高效。当智能体能生成任何东西时，它浪费 tokens 探索死胡同；当 Harness 定义了清晰边界，智能体能更快收敛到正确答案。

---

### 第三层：熵管理（Entropy Management）

这是最被低估的组件。随着时间推移，AI 生成的代码库会积累熵——文档偏离现实、命名约定发散、死代码堆积。

Harness Engineering 用**周期性清理智能体**解决这个问题：

- **文档一致性智能体** — 验证文档与当前代码匹配
- **约束违规扫描器** — 发现早期检查漏掉的代码
- **模式执行智能体** — 识别并修复与既定模式的偏差
- **依赖审计员** — 追踪并解决循环或不必要依赖

这些智能体按计划运行（每日、每周或特定事件触发），保持代码库对人类审查者和未来 AI 智能体都健康。

---

## 从 0 到 1 实战路线图

### Level 1：基础 Harness（个人开发者）

适合：用 Claude Code、Cursor 或 Codex 做个人项目的开发者

**立即上手（1-2 小时）：**

```
✅ 创建 CLAUDE.md / .cursorrules 文件，定义项目约定
✅ 配置 pre-commit hooks（linting + formatting）
✅ 建立智能体可运行的测试套件用于自验证
✅ 清晰的目录结构 + 一致的命名规范
✅ 基础 .gitignore + README.md（含本地运行说明）
```

**立即见效：** 防止最常见的智能体错误

---

### Level 2：团队 Harness（3-10 人小队）

在 Level 1 基础上增加：

```
✅ AGENTS.md（~100行）— 团队级约定，作为"地图"而非说明书
✅ CI 强制执行的架构约束
✅ 共享 Prompt 模板（常见任务）
✅ Linter 验证的文档即代码（docs/ 目录）
✅ 智能体生成 PR 的专项 Code Review 清单
✅ 代码库知识库（docs/ 作为记录系统）
```

**配置示例：`AGENTS.md` 模板结构：**

```markdown
# 项目地图（约 100 行，简洁可执行）

## 入口点
- 开发：npm run dev
- 测试：npm test
- 构建：npm run build

## 架构边界
- 业务逻辑 → src/domain/
- 基础设施 → src/infrastructure/
- UI 组件 → src/components/
- 禁止：domain 层直接依赖 UI 层

## 代码风格
- 导入排序：内置 → 外部 → 内部
- 错误处理：统一使用 src/lib/errors.ts
- 日志：统一使用 src/lib/logger.ts

## 验证清单
每次提交前必须：
- [ ] npm run lint 通过
- [ ] npm test 通过
- [ ] 类型检查通过

## 更多信息
→ docs/architecture.md（架构详情）
→ docs/api.md（API 规范）
→ docs/setup.md（环境配置）
```

**立即见效：** 全队智能体行为一致

---

### Level 3：生产 Harness（工程组织）

在 Level 2 基础上增加：

```
✅ 可组合中间件层（LangChain 风格）
  → LocalContextMiddleware（代码库映射）
  → LoopDetectionMiddleware（防止重复）
  → ReasoningSandwichMiddleware（推理优化）
  → PreCompletionChecklistMiddleware（完成前验证）

✅ 可观测性集成
  → 日志、指标、追踪 → 对智能体实时可读
  → 每工作树独立的临时可观测性堆栈

✅ 熵管理智能体（定时运行）
  → 文档一致性检查
  → 模式偏差扫描
  → 依赖审计

✅ Harness 版本管理与 A/B 测试
✅ 智能体性能监控仪表盘
✅ 智能体卡住时的升级策略
```

**预期效果：** 智能体成为完全自主的开发参与者

---

## 常见错误与避坑指南

### ❌ 错误 1：过度设计控制流

> "如果过度设计控制流，下一个模型更新会打破你的系统。"

模型进化极快。2024 年需要复杂流水线的功能，2026 年一个上下文窗口 Prompt 就搞定了。**构建可撕毁的 Harness** — 当模型足够聪明不需要它时，你应该能移除"聪明"的逻辑。

### ❌ 错误 2：把 Harness 当静态的

Harness 需要随模型演进。当新模型发布改善了推理能力时，你推理优化的中间件可能反而适得其反。**每次大版本模型更新时审查并更新 Harness 组件。**

### ❌ 错误 3：忽视文档层

最有效的 Harness 改进往往最简单：**更好的文档。** 如果你的 AGENTS.md 模糊，智能体输出就会模糊。投资于精确的、机器可读的文档，作为智能体的基本事实（Ground Truth）。

### ❌ 错误 4：没有反馈回路

没有反馈的 Harness 是笼子，不是指南。智能体需要知道何时成功、何时失败。必须内置：
- 任务完成前的自验证步骤
- 测试执行作为智能体工作流的一部分
- 按任务类型追踪智能体成功率指标

### ❌ 错误 5：只有人类可读的文档

如果架构决策存在人类脑海或智能体无法访问的页面中，Harness 就有了缺口。**智能体需要的一切必须在代码库中。**

---

## 工具链推荐配置

| 工具 | 用途 | 适用 Level |
|------|------|-----------|
| **Claude Code** / **Codex CLI** | 核心智能体 | 所有 |
| **AGENTS.md** | 项目级指令 | 所有 |
| **Pre-commit** | 提交前检查 | 所有 |
| **ESLint + 自定义规则** | 代码质量 | L1+ |
| **Vitest / Jest** | 测试执行 | L1+ |
| **Husky** | Git hooks | L2+ |
| **MCP Servers** | 模型上下文协议 | L2+ |
| **OpenTelemetry** | 可观测性 | L3 |
| **ArchUnit** / 自定义结构测试 | 架构强制 | L3 |

---

## 判断你 Harness 是否有效的信号

**Harness 起作用时：**
- 智能体第一次运行就能导航代码库（不需要人类复制粘贴上下文）
- 同一问题智能体不会重复犯错
- Code Review 中关于 Harness 缺陷的反馈 > 关于智能体错误的反馈
- 智能体可以自主完成"发现→复现→修复→验证→提交"的全流程

**Harness 需要加强时：**
- 智能体反复在同一个点卡住
- 人类需要不断告诉智能体"在 docs/ 里找答案"
- PR 中的错误类型可以预见（说明检查缺失）
- 文档与代码实际行为持续不一致

---

## 工程师角色的演变

| 传统工程 | Harness Engineering |
|---------|-------------------|
| 写代码 | 设计 AI 写代码的环境 |
| Debug 代码 | Debug 智能体行为 |
| Code Review | Review 智能体输出 + Harness 有效性 |
| 写测试 | 设计测试策略（智能体执行） |
| 维护文档 | 构建作为机器可读基础设施的文档 |

**核心转变：** 从"写代码的人"变成"设计环境的人"。技术深度不减反增——你需要更深度的架构思维，去设计那些无需你持续干预就能运行的系统。

---

## 一句话总结

> **Harness Engineering = 让 AI 智能体从"能干活"升级到"能可靠地干活"的那套系统。**

模型会越来越强，但只有掌握了 Harness 工程能力的团队，才能把模型的潜力真正释放出来。

---

*延伸阅读：*
- [OpenAI Harness Engineering 原版文章](https://openai.com/index/harness-engineering/)
- [AGENTS.md 官方规范](https://agents.md/)
- [LangChain 中间件方法论](https://www.langchain.com/)
- [Codex CLI 最佳实践](https://developers.openai.com/codex/guides/agents-md)
