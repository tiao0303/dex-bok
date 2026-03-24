# OpenClaw 记忆系统：让 AI 拥有持续进化的记忆

> **标签**：OpenClaw / 记忆系统 / 深度 / AI  
> **日期**：2026-03-24  
> **专题**：OpenClaw 深度探索

---

## 痛点：AI 为何总是"失忆"

用过 ChatGPT 的人都遇到过这个场景：聊了 50 轮之后，AI 突然忘了你们最初达成的共识。上下文窗口满了，历史被无情截断，一切从头开始。

这是所有 LLM 的本质局限：**上下文窗口有上限，记忆不是"内置"的**。

OpenClaw 的解决方案是：**让记忆变成文件**。不是依赖模型的"记住"，而是把重要信息写到磁盘——就像人类的笔记本一样。

---

## 核心设计哲学：文件即记忆

OpenClaw 的记忆系统极度简洁：

> **记忆 = Markdown 文件，文件即真相（Source of Truth）**

模型不是靠"脑子里想"来记住东西，而是靠读写文件。每次会话开始，读取相关文件；每次决策完成，写入相关文件。磁盘不丢，记忆就不丢。

```
~/.openclaw/workspace/
├── SOUL.md              # AI 的人格与行为准则
├── USER.md              # 用户档案与偏好
├── MEMORY.md            # 长期记忆（ curated )
├── HEARTBEAT.md         # 定时任务清单
└── memory/
    └── YYYY-MM-DD.md    # 每日日志（ append-only )
```

---

## 双层记忆架构

### 第一层：每日日志（Daily Log）

路径：`memory/YYYY-MM-DD.md`

- **append-only**，每次会话持续追加内容
- 会话开始时自动读取**今天 + 昨天**的文件
- 记录内容：做过的事、遇到的错误、待跟进的任务

```markdown
## 2026-03-24

### 完成
- 为用户配置了 Gemini API
- 完成了 OpenClaw 网关的安装调试

### 待跟进
- [ ] 飞书群路由配置还未测试
- [ ] 需要配置心跳任务

### 错误记录
- 首次运行 `openclaw gateway start` 报 Node 版本不兼容，升级到 Node 24 后解决
```

### 第二层：长期记忆（Long-term Memory）

路径：`MEMORY.md`（位于 workspace 根目录）

- 由每日日志提炼而来，是**精选后的精华**
- 记录：决策、偏好、重要的长期上下文
- **仅在主会话（私聊）中加载**，不在群聊中暴露

```markdown
## 用户偏好
- 喜欢简洁直接的沟通，不喜欢废话
- 技术问题偏好直接给方案，不解释原理可以但要有链接

## 重要决策
- 2026-03-20：确定使用 Gemini 作为主要 AI 提供商
- 2026-03-19：采用飞书作为主要工作群

## 教训
- 不要在群聊中暴露 API Keys
- exec 工具写文件后必须验证
```

---

## 记忆工具：memory_search 与 memory_get

OpenClaw 暴露两个内置工具给 Agent：

### memory_search：语义检索

```bash
memory_search(query="主人偏好什么沟通风格", maxResults=5)
```

基于向量相似度搜索 `MEMORY.md` 和 `memory/*.md` 中的相关片段。即使表述不同（"怎么称呼" vs "偏好什么称呼"），语义搜索也能找到相关内容。

**返回格式：**
```
文件：MEMORY.md，第 15-18 行
"喜欢简洁直接的沟通，不喜欢废话"
匹配度：0.92

文件：memory/2026-03-24.md，第 32 行
"用户说'少说废话，直接给答案'"
匹配度：0.87
```

### memory_get：精准读取

```bash
memory_get(path="memory/2026-03-24.md", from=10, lines=20)
```

按路径和行号精准读取特定片段。**优雅降级**：文件不存在时返回空文本而非报错，Agent 可以继续工作而不崩溃。

---

## 向量搜索：让记忆"语义化"

除了关键词搜索，OpenClaw 支持**向量语义搜索**：

```
传统搜索：关键词匹配
  搜索"狗狗" → 只找到包含"狗"字的文件

向量搜索：语义理解
  搜索"宠物" → 找到包含"猫"、"仓鼠"、"金鱼"的文件
```

### 向量搜索配置

```json
// ~/.openclaw/openclaw.json
{
  "plugins": {
    "slots": {
      "memory": "memory-core"  // 默认插件，提供向量搜索能力
    }
  }
}
```

支持多种 Embedding 提供商：

| 提供商 | 特点 |
|--------|------|
| **OpenAI** | 通用能力强，需 API Key |
| **Gemini** | Google 提供，免费额度大 |
| **Voyage AI** | 专注向量领域 |
| **Mistral** | 欧洲团队，隐私友好 |
| **Ollama** | 本地部署，完全离线 |

### 高级特性：混合搜索 + MMR

OpenClaw 还支持：

- **混合搜索（Hybrid Search）**：BM25（传统关键词）+ 向量语义，取长补短
- **MMR 去重（MMaximum Marginal Relevance）**：避免返回高度相似的重复结果
- **时序衰减（Temporal Decay）**：近期记忆权重更高，远期内容逐渐降低权重

---

## Compaction 前的记忆 Flush

当会话上下文快要满时，OpenClaw 会触发**自动 compaction（压缩）**——对历史消息做摘要，释放 token 空间。

**问题**：压缩前的重要记忆会不会丢失？

**解决**：Compaction 触发前，OpenClaw 会静默提醒 Agent："会话即将压缩，请先把重要记忆写入磁盘"。

```json
// compaction.memoryFlush 配置
{
  "compaction": {
    "reserveTokensFloor": 20000,     // 保留 20000 token 缓冲
    "memoryFlush": {
      "enabled": true,
      "softThresholdTokens": 4000,   // 剩余 4000 token 时触发
      "systemPrompt": "Session nearing compaction. Store durable memories now.",
      "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
    }
  }
}
```

**特点**：
- **静默执行**：默认回复 `NO_REPLY`，用户完全感知不到
- **只触发一次**：每个 compaction 周期只 flush 一次
- **自动跳过**：工作区只读时（`workspaceAccess: "ro"`）自动跳过

---

## 记忆系统与 Context Engine 的关系

很多人会把"记忆"和"上下文管理"混为一谈。OpenClaw 中这是两个独立模块：

| 模块 | 职责 | 接口 |
|------|------|------|
| **Memory Plugin** | 存储与检索 | `memory_search`、`memory_get` |
| **Context Engine** | 控制模型看到什么上下文 | `assemble()`、`compact()` |

**关键区别**：
- Memory Plugin 是**持久化层**——记忆写到哪里、如何检索
- Context Engine 是**组装层**——本次请求应该给模型哪些消息

两者可以协同工作：Context Engine 在 `assemble()` 时可以调用 Memory Plugin 拉取相关记忆，拼入系统提示词。

---

## 实际工作流示例

### 场景：用户说"记得上次我们说要用 MiniMax"

```
用户：记得上次说要用 MiniMax？
    │
    ▼
Agent 调用 memory_search
    │
    ▼
搜索 "MiniMax" 相关记忆片段
    │
    ▼
返回：
  MEMORY.md: "2026-03-20 决定采用 MiniMax 作为主要 AI 提供商"
  memory/2026-03-20.md: "与用户讨论后确定切换到 MiniMax，原因：..."
    │
    ▼
Agent 基于记忆回答：
"对，上周三（3月20日）我们确定使用 MiniMax。原因是..."
```

### 场景：完成重要任务后

```
Agent 完成：帮用户配置好了飞书机器人
    │
    ▼
检查需要写入记忆的内容：
  - 用户偏好：飞书是主要工作渠道
  - 重要决策：飞书机器人 token 已配置
  - 待跟进：测试飞书消息收发
    │
    ▼
写入 memory/2026-03-24.md（每日日志）
写入 MEMORY.md（长期记忆，只在私聊中）
```

---

## 最佳实践

### ✅ 应该写入记忆的内容

- 用户的偏好和习惯（沟通风格、技术栈偏好）
- 重要决策及其原因（"为什么选了 Gemini 而不是 OpenAI"）
- 遇到的错误和解决方案（"这个错误是因为 Node 版本太低"）
- 长期项目目标和进度

### ❌ 不应该写入记忆的内容

- 临时性的中间结果（"这个查询返回了 42 条数据"）
- 群聊中的公开信息（群聊上下文不写入 MEMORY.md）
- 敏感凭证（API Keys 绝不写入记忆文件）

### 写记忆的时机

| 情况 | 是否写入 |
|------|---------|
| 用户说"记住这个" | ✅ 立即写入 |
| 完成了重要任务 | ✅ 写入 MEMORY.md |
| 遇到并解决了错误 | ✅ 写入每日日志 |
| 会话快压缩时 | ✅ 自动 flush |
| 日常闲聊 | ❌ 不需要 |

---

## 记忆系统配置参考

```json
// ~/.openclaw/openclaw.json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "compaction": {
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000,
          "systemPrompt": "Session nearing compaction. Store durable memories now.",
          "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  },
  "plugins": {
    "slots": {
      "memory": "memory-core"
    },
    "entries": {
      "memory-core": {
        "enabled": true,
        "embedding": {
          "provider": "gemini",     // 使用 Gemini 做向量嵌入
          "model": "text-embedding-004"
        },
        "search": {
          "hybrid": true,           // 混合 BM25 + 向量
          "mmr": {
            "enabled": true,
            "diversity": 0.3
          },
          "temporalDecay": {
            "enabled": true,
            "decayRate": 0.95
          }
        }
      }
    }
  }
}
```

---

## 与其他 AI 系统的记忆对比

| 系统 | 记忆方式 | 持久化 | 可干预性 |
|------|---------|--------|---------|
| ChatGPT | 靠上下文窗口 | ❌ 不持久 | ❌ 用户无法管理 |
| Claude | 同上 | ❌ 不持久 | ❌ 有限 |
| **OpenClaw** | **Markdown 文件** | **✅ 持久化** | **✅ 完全可控** |
| Mem.ai | 外部笔记集成 | ✅ 持久 | ⚠️ 依赖第三方 |

OpenClaw 的记忆系统最大优势：**记忆是纯文本文件**，不依赖任何专有格式，不依赖任何第三方服务。你可以用任何编辑器打开，任何工具处理，完全自主可控。

---

## 总结

OpenClaw 的记忆系统解决了一个根本问题：**让 AI 的记忆从玄学变成工程**。

核心设计：
- **文件即记忆**：Markdown 文件，持久化、可追溯、可编辑
- **双层结构**：每日日志（原始积累）+ 长期记忆（精选精华）
- **语义检索**：向量搜索 + 混合搜索，找得快、找得准
- **自动 flush**：上下文压缩前自动把记忆落盘，不丢东西
- **完全自主**：纯文本，不依赖第三方，主人拥有完全控制权

记忆不是 AI 的"超能力"，而是可以被设计、工程化、持续改进的系统。OpenClaw 做到了。

---

**系列其他文章：**
1. [OpenClaw 入门指南：自托管 AI 网关](../openclaw-series/01-openclaw-入门指南.md)
2. [OpenClaw 架构解析：Gateway、Agent、Channel 三层架构](../openclaw-series/02-openclaw-架构解析.md)
3. [用 OpenClaw 构建多智能体团队](../openclaw-series/03-openclaw-多智能体团队.md)
4. [OpenClaw Skills 插件系统实战](../openclaw-series/04-openclaw-skills插件系统.md)
5. [OpenClaw 安全实践：自托管数据控制与权限管理](../openclaw-series/05-openclaw-安全实践.md)
6. [OpenClaw 记忆系统：让 AI 拥有持续进化的记忆](../openclaw-series/06-openclaw-记忆系统.md)
