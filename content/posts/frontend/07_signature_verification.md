# 签名与验签实战：保障用户数据完整性

> 难度：🌱🌿🌿 进阶 | 字数：约 1100 字 | 预计阅读：7 分钟

## 前言

在 Web3 世界里，签名是一种无需上链即可验证用户身份和数据完整性的机制。从"登录 Web3"到 DeFi 交易授权，签名无处不在。然而，签名也是最容易引入安全漏洞的环节之一。本篇文章将深入讲解签名的原理、常见类型以及安全实践。

---

## 一、为什么需要签名？

区块链交易需要消耗 Gas，成本真实存在。对于不需要写入链上的操作（如登录、声明资产、设置权限），签名提供了一种**零成本的验证方式**：

- **身份验证**：证明某条消息由特定私钥持有者签署
- **数据完整性**：证明消息在传输过程中未被篡改
- **不可抵赖性**：签署人无法否认其签署行为

---

## 二、以太坊签名消息标准

### 2.1 EIP-191：结构化消息格式

以太坊签名的消息必须遵循 EIP-191 规范，格式如下：

```
\x19Ethereum Signed Message:\n${message.length}${message}
```

这样的前缀设计是为了区分普通文本消息和以太坊签名的消息，防止签名被滥用（重放攻击）。

```javascript
import { hashMessage, recoverAddress } from 'ethers';

// 构造 EIP-191 消息
const message = '欢迎登录 DApp';
const paddedMessage = hashMessage(message);
console.log('消息哈希:', paddedMessage);

// 用户签名后
// const signature = await signer.signMessage(message);
```

### 2.2 personal_sign 流程

```javascript
async function signMessage(message: string) {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // ethers.js 会自动处理 EIP-191 前缀
  const signature = await signer.signMessage(message);

  // 验签：恢复签名者的地址
  const recoveredAddress = recoverAddress(hashMessage(message), signature);

  const isValid = recoveredAddress.toLowerCase() === signer.address.toLowerCase();
  console.log('签名是否有效:', isValid);

  return signature;
}
```

---

## 三、典型应用场景

### 3.1 Web3 登录（Sign-In with Ethereum）

这是目前最流行的 Web3 身份验证方式，OpenSea、ENS 等平台均采用：

```javascript
// 后端生成随机 nonce，前端请求签名
const nonce = await fetch('/api/auth/nonce').then(r => r.text());

// 用户签署
const message = `Sign in with Ethereum to access the app.\n\nNonce: ${nonce}`;
const signature = await signer.signMessage(message);

// 发送给后端验证
const response = await fetch('/api/auth/verify', {
  method: 'POST',
  body: JSON.stringify({ address: account, signature, message, nonce }),
});

const { success, token } = await response.json();
if (success) {
  // 登录成功，存储 JWT
  localStorage.setItem('authToken', token);
}
```

### 3.2 后端验签（Node.js 示例）

```javascript
import { hashMessage, recoverAddress } from 'ethers';

function verifySignature(message: string, signature: string, expectedAddress: string) {
  const messageHash = hashMessage(message);
  const recovered = recoverAddress(messageHash, signature);

  return recovered.toLowerCase() === expectedAddress.toLowerCase();
}
```

### 3.3 结构化数据签名（EIP-712）

对于复杂数据结构（如授权许可、订单详情），推荐使用 EIP-712 标准，它提供了更结构化、更友好的签名展示：

```javascript
import { TypedDataEncoder, verifyMessage } from 'ethers';

const domain = {
  name: 'MyDApp',
  version: '1',
  chainId: 1,
  verifyingContract: '0x...',
};

const types = {
  Person: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
  Mail: [
    { name: 'from', type: 'Person' },
    { name: 'to', type: 'Person' },
    { name: 'contents', type: 'string' },
  ],
};

const value = {
  from: { name: 'Alice', wallet: '0x...' },
  to: { name: 'Bob', wallet: '0x...' },
  contents: 'Hello, Bob!',
};

async function signTypedData() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const signature = await signer.signTypedData(domain, types, value);
  return signature;
}
```

---

## 四、安全风险与防范

### 4.1 签名劫持（Signature Replay）

同一签名可能被恶意重放到不同场景：

**防范措施：**

- 在消息中加入 `nonce`（随机数）
- 在消息中加入 `chainId` 和 `verifyingContract`（防止跨链重放）
- 每次签署后，后端立即将 nonce 标记为已使用

### 4.2 签名钓鱼（Silent Signing）

恶意 DApp 可能诱导用户签署隐藏交易（如授权转移资产）：

**防范措施：**

- 始终仔细阅读 MetaMask 签名请求中的原文
- 使用 EIP-712 的结构化展示，避免纯文本签名
- 签名前确认域名（dApp 域名应与预期一致）

### 4.3 模糊签名（Obfuscated Signing）

攻击者通过不可见字符或 Unicode 同形文字混淆消息内容：

**防范措施：**

- 展示签名消息时，对不可见字符进行过滤
- 使用 EIP-712 结构化数据而非纯文本消息

### 4.4 签名数据泄漏

敏感数据不应放在消息中——签名消息本身是公开的：

```javascript
// ❌ 危险：私钥或敏感信息不应在签名消息中
const message = `My private key is: 0x123...`;

// ✅ 安全：仅签名必要的业务数据
const message = `Authorize swap: 100 USDC → 0.05 ETH. OrderID: ${orderId}`;
```

---

## 五、签名的链上验证

有些场景需要在智能合约中验证签名是否合法，这需要合约实现 EIP-712 的 `ecrecover`：

```solidity
// 合约中的验签逻辑
function verify(
    bytes32 digest,
    address signer,
    bytes memory signature
) public pure returns (bool) {
    return ecrecover(digest, v, r, s) == signer;
}
```

前端负责生成符合 EIP-712 的 digest，合约负责用 `ecrecover` 验签。

---

## 小结

签名是 Web3 前端开发中最需要谨慎对待的环节之一。理解 EIP-191 / EIP-712 标准的原理，掌握签发与验签的完整流程，并时刻警惕签名劫持、钓鱼等安全风险，是每个 Web3 前端开发者的必修课。下一篇文章我们将深入 Web3 前端的安全领域，系统性地梳理常见攻击向量与防御策略。
