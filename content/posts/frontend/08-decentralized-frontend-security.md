# 去中心化前端安全：守护用户的数字资产

> 难度：🌿🌿🌿 高级 | 字数：约 1200 字 | 预计阅读：8 分钟

## 前言

Web3 前端与传统 Web 前端在安全风险上有很多重叠，但有几个独特的攻击面让 DApp 开发者如履薄冰——一次签名授权失误可能导致用户资产全部清零。本篇文章将系统梳理 Web3 前端面临的安全威胁与防御策略。

---

## 一、独特的安全攻击面

### 1.1 恶意合约授权（Token Approval Drain）

这是 Web3 中最常见、最高发的攻击手法。攻击者通过诱骗用户签署一个看似正常实则恶意的 `transferFrom` 授权，从而转移用户的所有代币。

**攻击链：**

```
攻击者部署恶意合约 → 在 DApp 前端植入钓鱼弹窗 → 用户点击"授权" →
实际签署的是恶意合约的 transferFrom → 攻击者立即转走用户资产
```

**防御措施：**

```javascript
// ✅ 推荐：使用 safeTransferFrom 代替直接授权
// 或者：设置授权额度为 0 后再设置新额度
async function setApproval(token, spender, amount) {
  const contract = new Contract(token, ERC20_ABI, signer);

  // 先检查当前授权额度
  const currentAllowance = await contract.allowance(account, spender);

  if (currentAllowance > 0) {
    // 先撤销旧授权（设置 为 0）
    const revokeTx = await contract.approve(spender, 0);
    await revokeTx.wait();
  }

  // 再设置新授权
  const approveTx = await contract.approve(spender, amount);
  await approveTx.wait();
}
```

### 1.2 签名钓鱼（Signature Phishing）

详见上篇文章，此处补充前端层面的额外防御：

```javascript
// 前端展示签名原文时，标注关键参数
function renderSignatureRequest(message) {
  const parsed = parseEIP712(message);
  return (
    <div className="signature-request">
      <h4>签名请求</h4>
      <p>来源: {window.location.hostname}</p>
      <div className="params">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key}>
            <strong>{key}:</strong> {highlightSuspicious(value)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 二、传统 Web 安全威胁

### 2.1 XSS（跨站脚本攻击）

虽然 Web3 DApp 不直接存储用户数据，但 XSS 仍可能窃取已签署的交易或钱包状态：

**防御措施：**

- 所有用户输入均做转义处理
- 使用 Content Security Policy (CSP) 头
- 避免使用 `eval()` 或 `new Function()` 处理用户数据
- React 默认对输入做转义，但小心使用 `dangerouslySetInnerHTML`

### 2.2 供应链攻击

Web3 项目依赖大量 npm 包，任何一个被污染的包都可能导致灾难：

```bash
# 定期检查依赖漏洞
npm audit
npx socketofficial audit

# 锁定依赖版本（package-lock.json 必须提交到 Git）
# 使用 pinia 或 npm ci 确保安装的版本与 lockfile 一致
```

### 2.3 钓鱼网站（Phishing Sites）

攻击者可能通过 DNS 劫持、域名抢注等手段伪造 DApp 站点：

**防御措施：**

- 用户教育：始终通过官方链接访问 DApp
- 前端检测：验证当前域名是否在白名单内
- 提供官方域名验证指南

---

## 三、RPC 节点安全

### 3.1 恶意节点数据

使用不可信的 RPC 节点，节点可能返回伪造的数据（如虚假余额）：

```javascript
// ✅ 验证来自多个独立节点的数据一致性
async function getVerifiedBalance(address) {
  const responses = await Promise.all([
    fetch(`${INFURA_RPC}/?params=...`),
    fetch(`${ALCHEMY_RPC}/?params=...`),
    fetch(`${PUBLIC_RPC}/?params=...`),
  ]);

  const balances = await Promise.all(responses.map(r => r.json()));
  const unique = [...new Set(balances)];

  if (unique.length > 1) {
    throw new Error('节点数据不一致，存在数据造假风险');
  }

  return balances[0];
}
```

### 3.2 敏感 RPC 方法暴露

`eth_sendTransaction`、`personal_sign` 等方法只能由用户主动触发，绝不能在代码中直接调用：

```javascript
// ❌ 危险：前端直接发送交易，没有用户签名
await ethereum.request({
  method: 'eth_sendTransaction',
  params: [{ from: account, to: attacker, value: '0x...' }],
});

// ✅ 正确：通过 ethers.js 的合约调用，由钱包弹出签名确认
const tx = await contract.transfer(attacker, amount);
await tx.wait();
```

---

## 四、前端安全开发规范

### 4.1 助记词/私钥管理红线

```
🚨 绝对禁止在前端代码中存储私钥或助记词
🚨 绝对禁止将私钥或助记词通过网络传输
🚨 绝对禁止将私钥或助记词写入 localStorage 或 cookie
```

### 4.2 交易参数二次确认

在用户确认交易前，二次展示交易关键参数：

```jsx
function TransactionReview({ to, amount, data }) {
  const isDangerousAddress = useDangerousAddressCheck(to);

  return (
    <div>
      <h3>交易确认</h3>
      <p>目标地址: {to}</p>
      <p>金额: {amount} ETH</p>

      {isDangerousAddress && (
        <div className="warning">
          ⚠️ 该地址已被标记为风险地址，请谨慎确认！
        </div>
      )}

      <button onClick={confirmTransaction}>确认发送</button>
    </div>
  );
}
```

### 4.3 来源验证

对于多签钱包或合约调用，验证交易发起来源：

```solidity
// 合约层面验证调用者身份
modifier onlyAuthorized() {
    require(authorizedCallers[msg.sender], "Not authorized");
    _;
}
```

---

## 五、安全检查清单

| 检查项 | 状态 |
|--------|------|
| 使用 `check-interaction` 或类似工具审计合约交互 | ☐ |
| 所有用户输入经过严格校验 | ☐ |
| 不在前端存储私钥/助记词 | ☐ |
| 授权操作前展示完整参数并二次确认 | ☐ |
| 使用 EIP-712 结构化签名替代纯文本签名 | ☐ |
| 定期运行 `npm audit` 检查依赖安全 | ☐ |
| 实现 RPC 节点数据一致性验证 | ☐ |
| 部署 CSP 和 HTTPS | ☐ |

---

## 小结

Web3 前端安全是每一个 DApp 开发者的首要责任。从签名授权到 RPC 调用，从依赖管理到 XSS 防御，每个环节都需要严谨对待。安全漏洞一旦被利用，用户的数字资产将无法挽回。下一篇文章我们将关注前端性能优化，让你的 DApp 既安全又流畅。
