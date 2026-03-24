# DApp 前端架构设计：从 Demo 到生产级应用

> 难度：🌱🌿 进阶 | 字数：约 1150 字 | 预计阅读：7 分钟

## 前言

一个能跑通的 Demo 和一个生产级的 DApp 之间，差距不仅是代码量，更是架构设计、工程化思维和用户体验的全面提升。本篇文章将从目录结构、状态管理、Web3 交互层分离、错误处理等多个维度，探讨 DApp 前端架构的最佳实践。

---

## 一、常见 DApp 前端架构问题

很多开发者在入门阶段会写出这样的代码：

```jsx
// ❌ 所有逻辑堆在一个组件里——难以维护
function App() {
  const [balance, setBalance] = useState();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ABI、合约地址、RPC URL 全都硬编码在这里
    const contract = new Contract(ADDR, ABI, provider);
    contract.BalanceOf().then(setBalance);
  }, []);

  // ... 几百行后
}
```

这样的代码在功能简单时尚可运行，一旦功能增加（多合约、多网络、多用户状态）就会迅速失控。

---

## 二、分层架构设计

推荐采用以下四层架构：

```
┌─────────────────────────────────────┐
│          UI Layer (React)            │  视图渲染、用户交互
├─────────────────────────────────────┤
│         Hooks / Business Logic       │  业务逻辑、状态管理
├─────────────────────────────────────┤
│         Web3 Service Layer           │  合约交互、交易发送
├─────────────────────────────────────┤
│           Provider Layer            │  钱包、节点连接
└─────────────────────────────────────┘
```

### 2.1 目录结构参考

```
src/
├── contracts/               # 合约相关
│   ├── abis/                # ABI 文件
│   └── addresses.ts          # 各网络的合约地址
├── hooks/                   # 自定义 Hooks（业务逻辑）
│   ├── useTokenBalance.ts
│   ├── useTransaction.ts
│   └── useNetwork.ts
├── services/                # Web3 服务层
│   ├── tokenService.ts       # 代币相关操作
│   ├── swapService.ts        # 交换逻辑
│   └── transactionService.ts
├── providers/               # Context Providers
│   ├── Web3Provider.tsx
│   └── ThemeProvider.tsx
├── components/              # UI 组件
│   ├── common/               # 通用组件（Button、Card）
│   ├── wallet/              # 钱包相关（ConnectButton、NetworkSelector）
│   └── features/             # 功能组件（SwapPanel、LiquidityPanel）
├── utils/                   # 工具函数
│   ├── format.ts             # 格式化（地址、金额）
│   └── errors.ts             # 错误定义
├── config/
│   └── chains.ts             # 链配置（ChainID、RPC、Explorer）
└── App.tsx
```

---

## 三、状态管理策略

### 3.1 React 内置状态 vs 全局状态

| 场景 | 推荐方案 |
|------|----------|
| 组件内部 UI 状态（弹窗开关、loading） | `useState` |
| 跨组件共享的 Web3 状态（账户、余额） | Context + `useReducer` |
| 复杂列表数据（交易历史） | `react-query`（推荐）或 Zustand |
| 持久化状态（用户偏好） | `localStorage` + Context |

### 3.2 使用 react-query 管理链上数据

`react-query`（也称 TanStack Query）是管理服务端/链上数据获取的利器，天然支持缓存、自动刷新、分页等能力：

```bash
npm install @tanstack/react-query
```

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Contract } from 'ethers';
import { useWallet } from '@/hooks/useWallet';

// 获取 Token 余额
function useTokenBalance(tokenAddress: string) {
  const { provider, account } = useWallet();

  return useQuery({
    queryKey: ['balance', tokenAddress, account],
    queryFn: async () => {
      const contract = new Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(account);
      return formatEther(balance);
    },
    enabled: !!provider && !!account,
    staleTime: 30_000, // 30 秒内不重新请求
    refetchInterval: 60_000, // 每 60 秒自动刷新
  });
}

// 发送交易
function useTransfer() {
  const queryClient = useQueryClient();
  const { provider } = useWallet();

  return useMutation({
    mutationFn: async ({ to, amount }: { to: string; amount: string }) => {
      const signer = await provider.getSigner();
      const contract = new Contract(USDT_ADDR, ERC20_ABI, signer);
      const tx = await contract.transfer(to, parseEther(amount));
      return tx.wait(); // 等待链上确认
    },
    onSuccess: () => {
      // 交易成功后，自动刷新余额
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}
```

---

## 四、错误处理体系

区块链交互的错误类型远比传统 HTTP 请求复杂，建议建立统一的错误处理层：

```typescript
// utils/errors.ts
export class Web3Error extends Error {
  constructor(
    message: string,
    public code: 'USER_REJECTED' | 'INSUFFICIENT_FUNDS' | 'NETWORK_ERROR' | 'CONTRACT_ERROR' | 'TIMEOUT'
  ) {
    super(message);
    this.name = 'Web3Error';
  }
}

export function parseEthersError(error: any): Web3Error {
  if (error.code === 4001) {
    return new Web3Error('用户拒绝了交易', 'USER_REJECTED');
  }
  if (error.code === -32000 && error.message.includes('insufficient funds')) {
    return new Web3Error('余额不足以支付 Gas', 'INSUFFICIENT_FUNDS');
  }
  return new Web3Error(error.message || '未知错误', 'NETWORK_ERROR');
}
```

---

## 五、配置与常量管理

### 5.1 多链配置

```typescript
// config/chains.ts
export const SUPPORTED_CHAINS = {
  1: {
    name: 'Ethereum',
    rpcUrl: process.env.REACT_APP_ETH_RPC,
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  137: {
    name: 'Polygon',
    rpcUrl: process.env.REACT_APP_POLYGON_RPC,
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
} as const;
```

### 5.2 环境变量管理

```bash
# .env.example
REACT_APP_ETH_RPC=https://mainnet.infura.io/v3/YOUR_KEY
REACT_APP_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
REACT_APP_CHAIN_ID=1
```

---

## 六、测试策略

DApp 前端测试比传统 Web 应用更复杂，因为涉及与真实区块链的交互：

1. **单元测试**：使用 Jest + @testing-library/react 测试组件逻辑
2. **集成测试**：使用 Hardhat 本地节点（或 Anvil）启动一条本地链进行端到端测试
3. **E2E 测试**：使用 Playwright 测试完整的用户操作流程（连接钱包 → 发起交易 → 验证状态变化）

---

## 小结

一个好的 DApp 前端架构需要：分层设计清晰、状态管理合理、错误处理完善、多链支持优雅。下一篇文章我们将深入探讨 Web3 前端中最敏感的部分——签名与验签。
