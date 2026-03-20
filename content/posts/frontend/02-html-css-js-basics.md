# HTML / CSS / JavaScript：Web3 前端的基石

> 难度：🌱 入门 | 字数：约 950 字 | 预计阅读：6 分钟

## 引言

很多刚入门 Web3 的同学急于学习ethers.js和智能合约交互，却忽略了前端基础的重要性。实际上，HTML/CSS/JS 构成了所有 DApp 用户界面的底层支撑，扎实的根基能让你在后续学习中事半功倍。

---

## 一、HTML：在 Web3 世界里的特殊角色

### 1.1 语义化标签与可访问性

区块链浏览器、链上数据看板等应用对可访问性要求极高。使用 `<main>`、`<nav>`、`<article>`、`<section>` 等语义化标签，不仅有助于 SEO，也能让屏幕阅读器正确解析页面结构。

```html
<!-- 典型 DApp 布局 -->
<header>
  <nav>钱包连接按钮 | 导航链接</nav>
</header>
<main>
  <section id="balance">账户余额展示区</section>
  <section id="transactions">交易记录区</section>
</main>
<footer>Powered by Ethereum</footer>
```

### 1.2 表单与用户输入

DApp 中大量场景依赖用户输入：钱包地址查询、代币合约地址、交易金额等。正确使用 `<input>` 的 `type` 属性（`text`、`number`）配合 `pattern` 校验，能在提交前拦截无效数据。

```html
<input
  type="text"
  id="addressInput"
  placeholder="0x..."
  pattern="^0x[a-fA-F0-9]{40}$"
  title="请输入有效的以太坊地址"
/>
```

---

## 二、CSS：构建 Web3 视觉体验

### 2.1 CSS 变量与主题切换

Web3 应用通常需要支持深色/浅色主题切换，这与钱包的深色模式高度契合。利用 CSS 变量可以轻松实现主题管理：

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --accent: #627eea;
}

[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --text-primary: #e0e0e0;
  --accent: #8b9df7;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}
```

### 2.2 Flexbox 与 Grid：复杂布局不再难

DApp 的仪表盘通常包含侧边栏、主内容区、卡片网格等复杂布局。Flexbox 适合单轴排列，Grid 适合二维布局：

```css
/* 卡片网格 */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* 导航栏 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### 2.3 Web3 动画与微交互

链上交易具有天然的延迟，用户需要视觉反馈。CSS 动画可以优雅地表达"加载中"、"成功"、"失败"等状态：

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tx-pending {
  animation: pulse 1.5s ease-in-out infinite;
}
```

---

## 三、JavaScript：连接用户与区块链

### 3.1 异步编程：与链通信的核心

与区块链节点的通信本质上是网络请求。理解 Promise 和 async/await 是必修课：

```javascript
// 模拟获取链上数据（类似 ethers.js 的调用方式）
async function getBalance(address) {
  try {
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest`
    );
    const data = await response.json();
    return ethers.formatEther(data.result); // Wei → ETH
  } catch (error) {
    console.error("获取余额失败:", error);
    throw error;
  }
}
```

### 3.2 事件驱动：监听链上变化

Web3 应用需要监听账户切换、网络切换、交易状态变化等事件：

```javascript
// 监听 MetaMask 账户变化
window.ethereum.on("accountsChanged", (accounts) => {
  if (accounts.length === 0) {
    // 用户已断开连接
    disconnectWallet();
  } else {
    // 切换到了新账户
    loadAccountData(accounts[0]);
  }
});

// 监听网络切换
window.ethereum.on("chainChanged", (chainId) => {
  window.location.reload(); // 推荐：刷新页面以重置状态
});
```

### 3.3 数字精度处理

区块链中的数字处理是 JS 前端的经典陷阱。JavaScript 的 `Number` 类型最大安全整数为 `2^53 - 1`，而以太坊的金额单位 Wei 可能远超这个范围：

```javascript
// ❌ 错误：大数相除精度丢失
const price = 1000000000000000000 / 3;

// ✅ 正确：使用 BigInt 或库方法
const price = BigInt("1000000000000000000") / BigInt(3);
const formatted = ethers.formatEther(price.toString());
```

---

## 四、小结

HTML/CSS/JS 不仅是 Web 开发的通用技能，更是 Web3 前端specialized 能力的底座。语义化标记带来可访问性，CSS 变量带来主题适配，JS 异步与 BigInt 处理能力则是与链上数据打交道的必备技能。

掌握这些基础后，下一篇文章我们将正式进入 React 框架的世界，看看现代 DApp 前端是如何组织的。
