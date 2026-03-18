---
title: "第一次在 Uniswap 上交易 - 完整指南"
date: 2026-03-18T21:10:00+08:00
description: "从零开始，教你完成第一次 DEX 交易，包含 MetaMask 设置、Gas 费优化、滑点控制"
tags: ["教程", "Uniswap", "新手"]
categories: ["入门教程"]
draft: false
---

## 准备工作

### 1. 安装 MetaMask

1. 访问 [metamask.io](https://metamask.io)
2. 下载浏览器插件（Chrome/Firefox）
3. 创建钱包，**安全备份助记词**
4. 存入 ETH 作为 Gas 费

### 2. 选择网络

| 网络 | Gas 费 | 推荐场景 |
|------|--------|----------|
| Ethereum | 高（$10-50） | 大额交易 |
| Arbitrum | 低（$0.1-1） | 日常交易 |
| Polygon | 极低（$0.01） | 小额测试 |

---

## 第一步：连接钱包

1. 访问 [app.uniswap.org](https://app.uniswap.org)
2. 点击右上角 "Connect Wallet"
3. 选择 MetaMask
4. 确认连接

---

## 第二步：选择交易对

1. 在 "Swap" 界面
2. 上方选择卖出 Token（如 ETH）
3. 下方选择买入 Token（如 USDC）
4. 输入金额

---

## 第三步：设置滑点

**重要**：防止被 MEV 攻击

| 交易对 | 推荐滑点 |
|--------|----------|
| 稳定币 | 0.1% |
| 主流币 | 0.5% |
| 小币种 | 1-3% |

设置方法：
1. 点击齿轮图标 ⚙️
2. 选择 "Slippage Tolerance"
3. 手动输入百分比

---

## 第四步：确认交易

检查要点：
- [ ] 金额正确
- [ ] 价格影响 <1%
- [ ] Gas 费可接受
- [ ] 最低收到金额合理

---

## 第五步：执行交易

1. 点击 "Swap"
2. MetaMask 弹出确认
3. 确认 Gas 费
4. 等待区块确认（约 15 秒）

---

## 常见问题

### 交易失败怎么办？
- Gas 费太低 → 提高 Gas
- 滑点太低 → 调高滑点
- 流动性不足 → 换池子

### Gas 费太贵？
- 等低谷时段（亚洲时间凌晨）
- 用 Layer2（Arbitrum/Optimism）
- 用 Gas 追踪工具（etherscan/gastracker）

---

**下一步**：[第一次提供流动性](/guides/first-lp/)
