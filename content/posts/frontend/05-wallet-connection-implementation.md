# 连接钱包功能实现：从 MetaMask 到多链钱包

> 难度：🌱🌿 进阶 | 字数：约 1100 字 | 预计阅读：7 分钟

## 前言

"连接钱包"是每个 DApp 的入口功能。表面看只是一个按钮，背后却涉及钱包检测、账户获取、网络切换、断开重连等一系列交互逻辑。本文将手把手实现一个健壮的钱包连接模块。

---

## 一、核心逻辑概览

```
检查钱包是否安装
  ├─ 未安装 → 提示安装 MetaMask
  └─ 已安装 → 请求连接
                ├─ 用户授权 → 获取账户地址 + 渲染 DApp 内容
                └─ 用户拒绝 → 显示错误提示
```

---

## 二、基础实现：原生 ethers.js

### 2.1 检测钱包安装

```javascript
const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
};

if (!isMetaMaskInstalled()) {
  console.warn('MetaMask 未安装，请前往 https://metamask.io 下载');
}
```

### 2.2 连接钱包

```javascript
import { BrowserProvider } from 'ethers';

async function connectWallet() {
  try {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask wallet is not installed');
    }

    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);

    if (accounts.length === 0) {
      throw new Error('No authorized accounts found');
    }

    const address = accounts[0];
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(address);

    return {
      address,
      network,
      balance,
      provider,
    };
  } catch (error) {
    console.error('连接钱包失败:', error.message);
    throw error;
  }
}
```

### 2.3 断开钱包

MetaMask 本身不提供程序化断开的 API（出于安全考虑），但你可以清除本地状态：

```javascript
function disconnectWallet() {
  // 清除本地存储的账户信息
  localStorage.removeItem('connectedWallet');
  // 重置 UI 状态
  setAccount(null);
  setBalance(null);
}
```

---

## 三、网络切换与 Chain ID 检测

DApp 通常需要运行在特定网络中（如 BSC、Polygon）。连接后应主动检测当前网络，不匹配时提示切换：

```javascript
const SUPPORTED_CHAINS = {
  1: 'Ethereum Mainnet',
  56: 'BSC Mainnet',
  137: 'Polygon Mainnet',
  11155111: 'Sepolia Testnet',
};

async function checkNetwork(provider) {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (!SUPPORTED_CHAINS[chainId]) {
    const switchTo = prompt(
      `当前网络 (ChainID: ${chainId}) 不支持，请切换到支持的网络`
    );
    return false;
  }
  return true;
}

async function switchNetwork(targetChainId) {
  const hexChainId = `0x${targetChainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (switchError) {
    // 如果目标网络未添加，尝试添加
    if (switchError.code === 4902) {
      await addNetwork(targetChainId);
    }
  }
}
```

---

## 四、React Hooks 封装：useWallet

为了在 React 项目中优雅地复用钱包状态，建议封装为自定义 Hook：

```javascript
import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // 连接钱包
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('请安装 MetaMask 钱包');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);

      setAccount(accounts[0]);
      setProvider(browserProvider);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 监听事件
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      // 建议网络变化时刷新页面以重置状态
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
  };

  return { account, provider, connect, disconnect, isConnecting, error };
}
```

### 使用方式

```jsx
function App() {
  const { account, connect, disconnect, isConnecting } = useWallet();

  return (
    <div>
      {account ? (
        <>
          <p>已连接: {account}</p>
          <button onClick={disconnect}>断开</button>
        </>
      ) : (
        <button onClick={connect} disabled={isConnecting}>
          {isConnecting ? '连接中...' : '连接 MetaMask'}
        </button>
      )}
    </div>
  );
}
```

---

## 五、wagmi：更优雅的解决方案

如果你的项目使用 React + ethers.js，强烈推荐 **wagmi** —— 一个为 React 设计的 Web3 Hooks 库，它帮你处理了大量边界情况：

```bash
npm install wagmi viem @tanstack/react-query
```

```jsx
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { injected } from 'wagmi/connectors';

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <p>地址: {address}</p>
        <button onClick={() => disconnect()}>断开</button>
      </div>
    );
  }

  return <button onClick={() => connect({ connector: injected() })}>连接钱包</button>;
}
```

wagmi 还内置了多钱包支持（MetaMask、WalletConnect、Coinbase Wallet）、链切换、消息签名等完整能力，是生产级 DApp 的推荐选择。

---

## 六、安全提醒

1. **不要在每次渲染时都调用 `eth_requestAccounts`**——这会每次都弹出授权窗口，应在用户点击按钮后才触发
2. **敏感操作前再次确认账户**：多标签页场景下，用户可能切换账户
3. **不要将私钥或助记词存放在前端代码或 localStorage 中**

---

## 小结

钱包连接是 Web3 前端的入口功能，涉及钱包检测、账户授权、网络切换、事件监听等多个环节。建议从原生 ethers.js 实现入手理解原理，后续使用 wagmi 提升开发效率。下篇文章我们将讨论 DApp 的前端架构设计。
