# 前端性能优化：让 DApp 跑得更快更轻

> 难度：🌿🌿🌿 高级 | 字数：约 1100 字 | 预计阅读：7 分钟

## 前言

区块链交互天然存在网络延迟（区块确认时间、RPC 响应），如果前端再慢，用户体验将非常糟糕。性能优化不仅是用户体验问题，更直接影响 DeFi 协议的交易执行成功率（滑点、时效性）。本篇文章从加载性能、渲染性能、链上交互优化三个维度全面展开。

---

## 一、加载性能：首屏秒开

### 1.1 代码分割与懒加载

DApp 通常不需要一次性加载所有路由和组件。使用 React 的 `lazy` 和 `Suspense` 实现按需加载：

```jsx
import { lazy, Suspense } from 'react';

const SwapPage = lazy(() => import('./pages/SwapPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/swap" element={<SwapPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 1.2 依赖体积优化

Web3 库体积普遍较大，需要精打细算：

```bash
# 使用 bundlephobia 检查每个包的体积
npx bundlephobia-cli ethers

# 替换重型库
# ❌ 使用 web3.js (~500KB)
# ✅ 使用 ethers.js v6 (~80KB) 或 viem (~30KB)
```

```javascript
// 按需导入，而非全量导入
// ❌
import { ethers } from 'ethers';

// ✅ 只导入需要的部分
import { Contract, BrowserProvider } from 'ethers';
```

### 1.3 Tree Shaking 与构建配置

确保 Vite/Webpack 配置支持 Tree Shaking：

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ethers': ['ethers'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
};
```

---

## 二、渲染性能：减少不必要的重绘

### 2.1 React.memo 与 useMemo

链上数据变化频繁，如果每次变化都触发全组件重渲染，性能会急剧下降：

```jsx
import { memo, useMemo } from 'react';

// memo 防止父组件更新导致子组件不必要的重渲染
const TokenBalanceCard = memo(function TokenBalanceCard({ balance, symbol }) {
  return (
    <div className="card">
      <span>{symbol}</span>
      <span>{balance}</span>
    </div>
  );
});

// useMemo 缓存计算结果，只在依赖变化时重新计算
function Portfolio({ tokens }) {
  const totalValue = useMemo(
    () => tokens.reduce((sum, t) => sum + t.balance * t.price, 0),
    [tokens]
  );

  return (
    <div>
      <p>总价值: ${totalValue.toFixed(2)}</p>
      {tokens.map(token => (
        <TokenBalanceCard key={token.address} balance={token.balance} symbol={token.symbol} />
      ))}
    </div>
  );
}
```

### 2.2 虚拟列表：海量交易记录

当用户交易历史有数千条时，一次性渲染所有 DOM 节点会导致页面卡顿。使用虚拟列表只渲染可视区域的内容：

```bash
npm install @tanstack/react-virtual
```

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function TransactionList({ transactions }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // 每行高度
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(({ index, start, size }) => (
          <div
            key={transactions[index].hash}
            style={{
              position: 'absolute',
              top: start,
              height: size,
            }}
          >
            <TxRow tx={transactions[index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 三、链上交互优化：减少等待感

### 3.1 乐观更新（Optimistic UI）

区块链交易需要等待区块确认，通常需要 12-30 秒。乐观更新允许在交易发送后立即更新 UI，让用户感觉"秒响应"：

```jsx
const queryClient = useQueryClient();

const swapMutation = useMutation({
  mutationFn: executeSwap,
  onMutate: async (variables) => {
    // 立即更新缓存，乐观预估结果
    await queryClient.cancelQueries({ queryKey: ['balance'] });
    const previousBalance = queryClient.getQueryData(['balance']);

    queryClient.setQueryData(['balance'], (old) =>
      old - variables.amount
    );

    return { previousBalance };
  },
  onError: (err, variables, context) => {
    // 出错时回滚
    queryClient.setQueryData(['balance'], context.previousBalance);
  },
  onSuccess: () => {
    // 交易确认后，再从链上拉取真实数据覆盖
    queryClient.invalidateQueries({ queryKey: ['balance'] });
  },
});
```

### 3.2 交易状态追踪

即使使用了乐观更新，也需要准确追踪链上真实状态：

```javascript
async function sendTransactionWithTracking(txRequest) {
  const signer = await provider.getSigner();
  const tx = await signer.sendTransaction(txRequest);

  // 立即显示_pending 状态
  setTxStatus('pending');
  setTxHash(tx.hash);

  try {
    // 等待 1 个区块确认（适用于低风险操作）
    const receipt = await tx.wait(1);
    setTxStatus('confirmed');

    // 或等待 12 个区块确认（适用于大额交易）
    const deepReceipt = await tx.wait(12);
    setTxStatus('finalized');
  } catch (err) {
    setTxStatus('failed');
    setError(err);
  }

  return tx;
}
```

---

## 四、网络请求优化

### 4.1 批量请求

```javascript
// ❌ 串行请求：5 个 token 余额需要 5 次 RTT
const balances = await Promise.all(
  tokens.map(token => contract.balanceOf(account))
);

// ✅ Multicall：1 次请求获取所有余额（部分 RPC 支持）
const { MultiCallService } = await import('@/services/multicall');
const results = await multiCallService.aggregate(
  tokens.map(token => ({
    address: token.address,
    name: 'balanceOf',
    params: [account],
  }))
);
```

### 4.2 缓存策略

```javascript
// react-query 的智能缓存
const { data: price } = useQuery({
  queryKey: ['tokenPrice', tokenAddress],
  queryFn: () => fetchPrice(tokenAddress),
  staleTime: 10_000,    // 10 秒内不重新请求
  cacheTime: 300_000,   // 5 分钟后从缓存清除
  refetchInterval: 60_000, // 后台每 60 秒刷新
});
```

---

## 五、性能监控

```bash
npm install web-vitals
```

```javascript
import { getLCP, getFID, getCLS } from 'web-vitals';

function sendToAnalytics({ name, value }) {
  // 上报到数据分析服务
  console.log(`${name}: ${value}`);
}

getLCP(sendToAnalytics);
getFID(sendToAnalytics);
getCLS(sendToAnalytics);
```

**DApp 性能目标参考：**

| 指标 | 目标值 |
|------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Time to Interactive | < 3s |

---

## 小结

Web3 前端性能优化需要从加载、渲染、链上交互三个维度综合施策。乐观更新、虚拟列表、Multicall 批量请求是三个最高效的手段。下一篇文章是本系列的最后一篇，我们将讨论跨链前端集成——让 DApp 在多链生态中自如穿梭。
