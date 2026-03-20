# React / Vue 框架入门：现代 DApp 的界面骨架

> 难度：🌱 入门 | 字数：约 1000 字 | 预计阅读：6 分钟

## 前言

当你的 HTML/CSS/JS 基础足够扎实，下一步就是拥抱现代前端框架。在 Web3 生态中，**React 是绝对主流**——无论是 Uniswap、OpenSea 还是 Aave，前端清一色基于 React 构建。本文以 React 为重点，Vue 为对比，帮你快速选定方向并入门。

---

## 一、为什么 Web3 DApp 普遍选择 React？

1. **生态丰富**：ethers.js、wagmi、RainbowKit、web3modal 等主流 Web3 库都以 React 为一等公民
2. **组件化天然契合**：DApp 的 UI 由"连接按钮"、"余额卡片"、"交易列表"等独立组件构成，React 的组件模型非常适合
3. **社区活跃**：遇到问题时有大量现成解决方案

Vue 也不是不能用——Compound 早期的界面就基于 Vue。但整体而言，React 的招聘需求和插件生态更占优势。

---

## 二、React 核心概念快速梳理

### 2.1 JSX：模板与逻辑共存

JSX 让你在 JavaScript 中写类 HTML 语法，组件的 UI 与逻辑内聚在一起：

```jsx
import { useState, useEffect } from 'react';

function WalletBalance({ address }) {
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟链上数据获取
    const fetchBalance = async () => {
      setLoading(true);
      const res = await getBalance(address);
      setBalance(res);
      setLoading(false);
    };
    fetchBalance();
  }, [address]);

  return (
    <div className="balance-card">
      <h3>账户余额</h3>
      {loading ? (
        <p className="loading">加载中...</p>
      ) : (
        <p className="balance">{balance} ETH</p>
      )}
    </div>
  );
}
```

### 2.2 Hooks：函数组件的状态管理

`useState` 管理组件内部状态，`useEffect` 处理副作用（链上数据获取、事件监听），`useContext` 跨组件共享全局状态（如钱包连接状态）：

```jsx
// 创建 Web3 上下文
import { createContext, useContext, useState } from 'react';

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    setAccount(accounts[0]);
  };

  return (
    <Web3Context.Provider value={{ account, connect }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);
```

### 2.3 条件渲染与列表渲染

DApp 中大量场景需要根据状态渲染不同 UI：连接前 vs 连接后、有余额 vs 无余额、加载中 vs 加载完成：

```jsx
function DAppUI() {
  const { account, connect } = useWeb3();

  return (
    <div>
      {!account ? (
        <button onClick={connect}>连接钱包</button>
      ) : (
        <>
          <p>地址: {account}</p>
          <WalletBalance address={account} />
          <TransactionHistory address={account} />
        </>
      )}
    </div>
  );
}
```

---

## 三、项目初始化：Vite + React + TypeScript

现代 React 项目推荐使用 **Vite** 作为构建工具，它比 Create React App 快得多：

```bash
# 创建项目
npm create vite@latest my-dapp -- --template react-ts

cd my-dapp
npm install

# 安装 Web3 相关依赖
npm install ethers wagmi viem @tanstack/react-query

npm run dev
```

目录结构参考：

```
src/
├── components/        # UI 组件
│   ├── ConnectButton.tsx
│   └── BalanceCard.tsx
├── context/           # 全局状态
│   └── Web3Context.tsx
├── hooks/             # 自定义 Hooks
│   └── useTokenBalance.ts
├── App.tsx
└── main.tsx
```

---

## 四、Vue 3 概览：另一个可行选择

如果你对 Vue 更加熟悉，或者所在团队技术栈是 Vue，也可以用于 Web3 开发：

```bash
npm create vite@latest my-vue-dapp -- --template vue-ts
npm install ethers vue-dapp
```

Vue 3 的 Composition API 提供了类似 React Hooks 的逻辑组织方式：

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { useEthers } from 'vue-dapp';

const { address, balance } = useEthers();

const connect = async () => {
  await connectWallet();
};
</script>

<template>
  <button @click="connect">连接 MetaMask</button>
  <p v-if="address">地址: {{ address }}</p>
</template>
```

Vue-dapp 是 Vue 生态中较为成熟的 Web3 集成库，不过总体插件丰富度仍不及 React 生态。

---

## 五、学习建议

| 建议 | 说明 |
|------|------|
| 先做 Todo List | 不要急着学 Web3，先用 React/Vue 做一个完整的任务管理应用 |
| 深入理解 Hooks | `useEffect` 的依赖数组、`useState` 的异步更新是高频踩坑点 |
| 学 TypeScript | Web3 项目几乎必用 TS，建议从 interface 和泛型开始 |
| 看源码 | 尝试阅读 wagmi 的源码或 API 设计，理解其工程思想 |

---

## 小结

React 是 Web3 前端开发的首选框架，其组件化、Hooks 生态和状态管理模式与 DApp 天然契合。下一篇文章我们将正式进入 Web3.js / Ethers.js 的世界，学习如何从 JavaScript 与区块链节点通信。
