# Web3.js / Ethers.js 入门：连接前端与区块链

> 难度：🌱🌿 进阶 | 字数：约 1050 字 | 预计阅读：7 分钟

## 前言

传统前端通过 HTTP 请求与后端 API 通信，而 Web3 前端则需要与区块链节点交互。Web3.js 和 Ethers.js 就是这座桥梁的核心库。本篇文章将详细对比两者，并手把手带你写出入门级的链上交互代码。

---

## 一、Web3.js vs Ethers.js：选哪个？

| 维度 | Web3.js | Ethers.js |
|------|---------|-----------|
| 体积 | 较大（~500KB） | 轻量（~80KB） |
| API 风格 | 命令式，接近底层 | 简洁，抽象良好 |
| 钱包支持 | 自己实现 | 内置 Wallet 类 |
| 当前维护 | Ethereum 官方维护 | 独立社区，更新活跃 |
| 生态采用 | 较老项目使用较多 | 新项目首选 |

**结论**：新项目建议优先选择 **Ethers.js**（v6），它更轻量、API 更友好，且是当前主流 DApp 开发的首选。Web3.js 适合需要与节点底层细节频繁打交道的场景。

---

## 二、Ethers.js 核心概念

### 2.1 Provider：连接区块链节点

Provider 是与区块链节点通信的抽象。你可以使用公开的 RPC 节点，也可以使用付费的专业节点服务（如 Infura、Alchemy）：

```javascript
import { BrowserProvider } from 'ethers';

// 方式一：使用 MetaMask 提供的 BrowserProvider（最常用）
const provider = new BrowserProvider(window.ethereum);

// 方式二：使用公开 RPC
import { JsonRpcProvider } from 'ethers';
const provider = new JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_PROJECT_ID');

// 方式三：使用 WSS（WebSocket）——适合监听实时事件
import { WebSocketProvider } from 'ethers';
const wsProvider = new WebSocketProvider('wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID');
```

### 2.2 Signer：交易签名者

Signer 持有私钥，可以签署交易并发送至网络。通过 MetaMask 连接时，`BrowserProvider.getSigner()` 返回的就是当前钱包的签名者：

```javascript
const signer = await provider.getSigner();
const address = await signer.getAddress();
console.log('当前签名账户:', address);
```

### 2.3 Contract：智能合约交互

`Contract` 是 Ethers.js 最核心的抽象，用于与部署在链上的智能合约通信。你需要准备两样东西：

- **合约地址**：已部署合约在链上的位置
- **ABI**：合约的接口定义，描述了有哪些可调用的方法

```javascript
import { Contract } from 'ethers';

// ERC-20 代币合约示例（USDT on Ethereum Mainnet）
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
];

const contract = new Contract(USDT_ADDRESS, USDT_ABI, provider);

// 只读调用（不需要签名）
const symbol = await contract.symbol();
const balance = await contract.balanceOf('0x...');
console.log(`代币符号: ${symbol}, 余额: ${balance}`);

// 写入交易（需要签名）
const signer = await provider.getSigner();
const contractWithSigner = contract.connect(signer);
const tx = await contractWithSigner.transfer(toAddress, amount);
await tx.wait(); // 等待链上确认
console.log('交易已发送，哈希:', tx.hash);
```

---

## 三、实战：从零构建一个余额查询工具

### 3.1 安装依赖

```bash
npm install ethers
```

### 3.2 完整代码

```javascript
import { BrowserProvider, parseEther, formatEther } from 'ethers';

async function main() {
  // 1. 检查 MetaMask 是否安装
  if (!window.ethereum) {
    alert('请安装 MetaMask 钱包');
    return;
  }

  // 2. 请求账户授权
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const account = accounts[0];

  // 3. 获取 ETH 余额
  const balance = await provider.getBalance(account);
  console.log(`账户 ${account} 的 ETH 余额: ${formatEther(balance)}`);

  // 4. 监听账户切换
  window.ethereum.on('accountsChanged', async (newAccounts) => {
    if (newAccounts.length === 0) {
      console.log('钱包已断开');
    } else {
      const newBalance = await provider.getBalance(newAccounts[0]);
      console.log(`新账户余额: ${formatEther(newBalance)} ETH`);
    }
  });
}

main().catch(console.error);
```

---

## 四、ABI 从哪来？

### 4.1 Solidity 源文件生成

如果你有合约的 Solidity 源码，可以使用 Hardhat 或 Foundry 的编译器自动生成 ABI：

```bash
# Hardhat 项目中，ABI 自动生成到 artifacts/
npx hardhat compile
```

### 4.2 Etherscan 验证后获取

在 Etherscan 上验证过的合约，可以直接在页面查看 ABI：

```
https://api.etherscan.io/api?module=contract&action=getabi&address=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

### 4.3 ABI 编码器注意事项

Ethers.js v6 对 ABI 的解析更加严格。如果遇到 `Invalid ABI` 错误，检查：

- 函数名是否拼写正确
- `view` / `pure`（只读）vs 无标记（写入）的区分
- `returns (uint256)` vs `returns(uint256)` —— 注意空格

---

## 五、常见错误与排查

| 错误信息 | 常见原因 |
|----------|----------|
| `insufficient funds for gas` | 账户 ETH 余额不足以支付 gas |
| `nonce too low` | 交易 nonce 重复，通常由未正确处理 pending 状态导致 |
| `execution reverted` | 合约内部逻辑拒绝执行（余额不足、权限问题等） |
| `network changed` | 网络切换后 provider 未重建 |

---

## 小结

Ethers.js 是 Web3 前端开发的核心工具，掌握 Provider / Signer / Contract 三大概念就能完成大部分链上交互。下篇文章我们将深入实战，完整实现"连接钱包"这一 Web3 DApp 的必备功能。
