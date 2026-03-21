---
title: "ERC20 代币标准 - DeFi 世界的基石"
date: 2026-03-21T10:00:00+08:00
description: "深入理解 ERC20 代币标准的技术规范、核心函数、以及在 DeFi 中的广泛应用"
tags: ["ERC20", "代币标准", "Ethereum", "DeFi"]
categories: ["技术指南"]
draft: false
---

## 什么是 ERC20

ERC20 是 Ethereum 上**可替代代币（Fungible Token）**的技术标准，于 2017 年正式标准化（EIP-20）。由 Fabian Vogelsteller 提出，旨在为所有基于 Ethereum 的代币建立一套统一的接口规范。

**核心特点**：每个代币单元完全相同、可互换 —— 就像美元一样，每一张的价值相等。

## 为什么要用 ERC20

在 ERC20 出现之前，每个代币项目都要自己定义接口，导致：
- 钱包需要为每个代币单独适配
- 交易所上线新代币成本极高
- DeFi 协议无法通用地兼容各种代币

ERC20 彻底解决了这些问题，实现了**代币的即插即用**。

## 核心接口规范

### 必需函数

```solidity
// 查询代币总供应量
function totalSupply() view returns (uint256)

// 查询指定地址的余额
function balanceOf(address owner) view returns (uint256)

// 转账代币
function transfer(address to, uint256 value) returns (bool)

// 授权第三方转账
function approve(address spender, uint256 value) returns (bool)

// 第三方代理转账
function transferFrom(address from, address to, uint256 value) returns (bool)

// 查询授权额度
function allowance(address owner, address spender) view returns (uint256)
```

### 可选函数（增强可用性）

```solidity
// 代币名称（如 "USD Coin"）
function name() view returns (string)

// 代币符号（如 "USDC"）
function symbol() view returns (string)

// 小数位数（通常为 18）
function decimals() view returns (uint8)
```

## 实际使用示例

### 1. 查询余额

```javascript
const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
const token = new web3.eth.Contract(ERC20_ABI, tokenAddress);

const balance = await token.methods.balanceOf(userAddress).call();
console.log(`余额: ${balance / 1e6} USDC`); // USDC decimals = 6
```

### 2. 转账代币

```javascript
await token.methods.transfer(recipientAddress, amount).send({ from: senderAddress });
```

### 3. 授权 DeFi 协议

```javascript
// 授权 Uniswap 使用你的代币
await token.methods.approve(uniswapRouter, amount).send({ from: userAddress });
```

## ERC20 的安全性考虑

### 常见漏洞

1. **假充值攻击**：仅检查返回值而非实际到账
   ```solidity
   // ❌ 不安全
   require(token.transferFrom(msg.sender, address(this), amount));

   // ✅ 安全：检查返回值
   require(token.transferFrom(msg.sender, address(this), amount));
   ```

2. **授权无限额**：过度授权导致资金风险
   ```solidity
   // ❌ 建议设置具体金额
   await token.methods.approve(protocol, MAX_UINT).send({...});

   // ✅ 最佳实践：按需授权
   await token.methods.approve(protocol, neededAmount).send({...});
   ```

3. **精度问题**：decimals 处理不当

## ERC20 在 DeFi 中的应用

| 场景 | 代表项目 | 用途 |
|------|----------|------|
| 稳定币 | USDC, DAI, USDT | 价值锚定 |
| 治理代币 | UNI, AAVE | 协议治理 |
| 收益代币 | cToken, aToken | 借贷收益 |
| 流动性代币 | LP Token | 流动性凭证 |

## ERC20 的局限与演进

- **不支持元交易**：需要 ETH 支付 Gas
- **无法表示唯一资产**：需用 ERC721
- **无原生金库功能**：需用 ERC4626

**演进标准**：
- **ERC2612**： Permit（签名授权）
- **ERC2678**：代币接口冻结标准

## 总结

ERC20 是 Ethereum 生态最重要的标准之一，它让所有代币"说同一种语言"。无论是开发 DeFi 协议还是使用钱包，理解 ERC20 都是必备技能。

---

**下一步阅读**：[ERC4626 金库标准](/dex-bok/posts/07-erc4626-vault-standard/)
