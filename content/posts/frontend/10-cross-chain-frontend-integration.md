# 跨链前端集成：让 DApp 在多链生态中自由穿梭

> 难度：🌿🌿🌿🌿 高级 | 字数：约 1150 字 | 预计阅读：8 分钟

## 前言

以太坊主网 Gas 费用高企，BSC、Polygon、Avalanche、Arbitrum 等 Layer2/Layer1 新链蓬勃发展，用户手里的资产分布在不同区块链上。跨链前端集成已成为现代 DApp 的必备能力。本篇文章将深入探讨多链架构设计、跨链通信机制以及主流跨链方案的前端集成实践。

---

## 一、为什么需要跨链？

### 1.1 用户现状

- 用户在 Ethereum 有 ETH 和主流 ERC-20 代币
- 在 BSC 有 BNB 和 BEP-20 代币
- 在 Polygon 有 MATIC 和 PRC-20 代币
- 跨链 Swap、跨链质押、跨链 NFT 交易需求激增

### 1.2 跨链 DApp 的类型

| 类型 | 说明 |
|------|------|
| 跨链桥接 | 将资产从一条链转移到另一条链 |
| 跨链 Swap | 兑换不同链上的同种资产（如 ETH on ETH ↔ ETH on Polygon） |
| 跨链聚合 | 聚合多条链的流动性（如 LI.FI、Socket） |
| 跨链消息传递 | 在一条链上触发另一条链上的合约逻辑（如 LayerZero） |

---

## 二、多链前端架构

### 2.1 链配置抽象

不要在代码中硬编码 chainId，统一管理所有链的配置：

```typescript
// config/chains.ts
export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  icon: string;
  isTestnet?: boolean;
}

export const CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: process.env.REACT_APP_ETH_RPC!,
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '/icons/ethereum.svg',
  },
  137: {
    id: 137,
    name: 'Polygon',
    rpcUrl: process.env.REACT_APP_POLYGON_RPC!,
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    icon: '/icons/polygon.svg',
  },
  56: {
    id: 56,
    name: 'BSC',
    rpcUrl: process.env.REACT_APP_BSC_RPC!,
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    icon: '/icons/bsc.svg',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.REACT_APP_ARBITRUM_RPC!,
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '/icons/arbitrum.svg',
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);
```

### 2.2 多链 Provider 管理

```typescript
import { BrowserProvider, JsonRpcProvider } from 'ethers';

class MultiChainProvider {
  private providers: Map<number, BrowserProvider | JsonRpcProvider> = new Map();

  getProvider(chainId: number): BrowserProvider {
    if (!this.providers.has(chainId)) {
      const config = CHAINS[chainId];
      if (!config) throw new Error(`Unsupported chain: ${chainId}`);

      // MetaMask 已连接时优先使用 BrowserProvider
      if (window.ethereum) {
        this.providers.set(chainId, new BrowserProvider(window.ethereum));
      } else {
        this.providers.set(chainId, new JsonRpcProvider(config.rpcUrl));
      }
    }
    return this.providers.get(chainId)!;
  }

  getContract(chainId: number, address: string, abi: any, signer?: any) {
    const provider = this.getProvider(chainId);
    return new Contract(address, abi, signer || provider);
  }
}

export const multiChainProvider = new MultiChainProvider();
```

---

## 三、链切换与网络添加

### 3.1 切换链

```javascript
async function switchChain(targetChainId: number) {
  const hexChainId = `0x${targetChainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (switchError) {
    // Chain not added yet, add it
    if (switchError.code === 4902) {
      await addChain(targetChainId);
    } else {
      throw switchError;
    }
  }
}
```

### 3.2 添加自定义链

```javascript
async function addChain(chainId: number) {
  const config = CHAINS[chainId];

  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${chainId.toString(16)}`,
        chainName: config.name,
        rpcUrls: [config.rpcUrl],
        blockExplorerUrls: [config.explorer],
        nativeCurrency: config.nativeCurrency,
      },
    ],
  });
}
```

---

## 四、跨链桥接集成

### 4.1 桥接服务选型

| 方案 | 特点 | 前端集成方式 |
|------|------|-------------|
| LayerZero | 消息跨链，通用性强 | SDK (`@layerzerolabs/sdk`) |
| Chainlink CCIP | 跨链互操作协议 | SDK (`@chainlink/ccip`) |
| LI.FI | 聚合多条桥接路线 | SDK (`@lifinance/sdk`) |
| Socket | 流动性聚合 | SDK (`@socket.tech/sdk`) |

### 4.2 LI.FI 集成示例

```bash
npm install @lifinance/sdk
```

```typescript
import { LiFi, Route } from '@lifinance/sdk';

const lifi = new LiFi({});

async function getCrossChainRoute(
  fromChain: number,
  toChain: number,
  fromToken: string,
  toToken: string,
  amount: string
) {
  const route = await lifi.getRoutes({
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount,
    options: {
      order: 'RECOMMENDED',
      maxPriceImpact: 0.03, // 价格影响不超过 3%
    },
  });

  return route;
}

async function executeCrossChainSwap(route: Route) {
  const signer = await provider.getSigner();

  const { status } = await lifi.executeRoute(route, {
    signer,
    updateHandler: (update) => {
      // 实时更新交易状态
      console.log('跨链进度:', update.status, update.substatus);
    },
  });

  console.log('跨链交易最终状态:', status);
}
```

---

## 五、跨链数据聚合

### 5.1 多链余额查询

```typescript
async function getMultiChainBalances(address: string, tokens: TokenConfig[]) {
  const results = await Promise.allSettled(
    tokens.map(async ({ chainId, address: tokenAddress }) => {
      try {
        const contract = multiChainProvider.getContract(
          chainId,
          tokenAddress,
          ERC20_ABI
        );
        const balance = await contract.balanceOf(address);
        return { chainId, tokenAddress, balance: balance.toString() };
      } catch (err) {
        return { chainId, tokenAddress, balance: null, error: err.message };
      }
    })
  );

  return results.map((r, i) => ({
    ...tokens[i],
    ...(r.status === 'fulfilled' ? r.value : { balance: null, error: r.reason }),
  }));
}
```

### 5.2 统一交易历史

不同链的交易记录来自不同的 Explorer API，需要分别查询后合并展示：

```typescript
async function getUnifiedTransactionHistory(address: string) {
  const chains = [1, 137, 56, 42161]; // Ethereum, Polygon, BSC, Arbitrum

  const histories = await Promise.all(
    chains.map(async (chainId) => {
      const explorerApi = `${CHAINS[chainId].explorer}/api`;
      const params = new URLSearchParams({
        module: 'account',
        action: 'txlist',
        address,
        sort: 'desc',
        limit: '20',
      });

      const res = await fetch(`${explorerApi}?${params}`);
      const data = await res.json();

      return (data.result || []).map((tx: any) => ({
        ...tx,
        chainId,
        explorer: CHAINS[chainId].explorer,
      }));
    })
  );

  // 按时间戳合并排序
  return histories.flat().sort((a, b) => b.timeStamp - a.timeStamp);
}
```

---

## 六、跨链开发注意事项

1. **Gas 费估算**：不同链的 Gas 计算方式不同（ETH 用 Wei，BNB 用 Gwei，MATIC 费用极低），需要分别处理
2. **确认数差异**：不同链的区块确认速度差异巨大（Arbitrum ~1分钟 vs Ethereum ~12分钟），UI 需要分别展示
3. **地址差异**：部分链使用与以太坊相同的地址格式，但也有链（如 Solana）使用不同的地址方案
4. **跨链延迟**：跨链交易比单链交易慢得多，乐观更新需要更长的时间窗口

---

## 小结

跨链前端集成涉及链配置抽象、多链 Provider 管理、桥接服务集成、交易历史聚合等多个复杂环节。本篇文章提供了多链架构的核心设计思路和主要集成方案。现代 Web3 DApp 必然是多链的，掌握跨链集成能力是高级 Web3 前端开发者的核心竞争力。

---

## 系列总结

从第一篇的入门路径规划，到最后一篇的跨链集成，我们完成了 Web3 前端开发的完整知识图谱覆盖。这十篇文章涵盖了：

- **入门**：前端基础、框架入门
- **进阶**：Web3 库使用、钱包连接、架构设计、签名验签
- **高级**：安全防护、性能优化、跨链集成

Web3 前端是一个快速演进的领域，持续学习和关注生态变化是保持竞争力的关键。祝你在 Web3 的世界中写出优秀的去中心化应用！
