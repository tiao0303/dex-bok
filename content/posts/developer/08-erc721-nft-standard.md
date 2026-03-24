---
title: "ERC721 NFT 标准 - 数字所有权革命"
slug: "08-erc721-nft-standard"
date: 2026-03-21T11:00:00+08:00
description: "深入理解 ERC721 非同质化代币标准，掌握 NFT 的核心接口、元数据扩展和实际应用场景"
tags: ["ERC721", "NFT", "非同质化代币", "数字收藏"]
categories: ["技术指南"]
draft: false
---

## 什么是 ERC721

ERC721 是 Ethereum 上**非同质化代币（NFT）**的标准接口，于 2018 年正式标准化（EIP-721）。由 William Entriken 等人提出。

**核心特点**：每个代币**独一无二**，不可互换。就像蒙娜丽莎的画作，每一幅都有独特的价值。

## ERC20 vs ERC721

| 特性 | ERC20 | ERC721 |
|------|-------|--------|
| 类型 | 可替代代币 | 非同质化代币 |
| 可互换 | ✅ 完全相同 | ❌ 每个唯一 |
| 标识 | 无 | uint256 tokenId |
| 典型用途 | 稳定币、治理 | 艺术、游戏、域名 |

## 核心接口规范

### 必需函数

```solidity
// 查询地址持有的 NFT 数量
function balanceOf(address owner) view returns (uint256)

// 查询 NFT 的持有者
function ownerOf(uint256 tokenId) view returns (address)

// 安全转账（含接收合约检查）
function safeTransferFrom(
    address from, 
    address to, 
    uint256 tokenId, 
    bytes data
) external;

// 授权单个 NFT
function approve(address to, uint256 tokenId) external;

// 授权所有 NFT
function setApprovalForAll(address operator, bool approved) external;

// 查询授权
function getApproved(uint256 tokenId) view returns (address);
function isApprovedForAll(address owner, address operator) view returns (bool);
```

### 事件

```solidity
// 转账事件
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

// 授权事件
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
```

## 元数据扩展（可选）

让 NFT 关联外部信息：

```solidity
interface ERC721Metadata {
    function name() view returns (string);        // 名称
    function symbol() view returns (string);     // 符号
    function tokenURI(uint256 tokenId) view returns (string);  // 元数据 URI
}
```

### tokenURI 返回的 JSON 格式

```json
{
  "name": "Bored Ape #1234",
  "description": "A rare bored ape NFT",
  "image": "ipfs://QmXx...",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Fur", "value": "Gold" }
  ]
}
```

## 实际使用示例

### 铸造 NFT

```javascript
const nft = new web3.eth.Contract(ERC721_ABI, nftAddress);

// 铸造一个新 NFT
await nft.methods
  .mint(recipientAddress, tokenId)
  .send({ from: minterAddress });
```

### 转移 NFT

```javascript
// 安全的转账（推荐）
await nft.methods
  .safeTransferFrom(ownerAddress, newOwnerAddress, tokenId)
  .send({ from: ownerAddress });
```

### 查询元数据

```javascript
// 获取 NFT 的元数据 URI
const uri = await nft.methods.tokenURI(tokenId).call();

// 解析 JSON
const response = await fetch(uri);
const metadata = await response.json();
console.log(metadata.name); // "Bored Ape #1234"
```

## ERC721 的应用场景

| 场景 | 代表项目 | 用途 |
|------|----------|------|
| 数字艺术 | OpenSea, Foundation | 艺术品确权与交易 |
| 游戏道具 | Axie Infinity, Gods Unchained | 游戏资产拥有权 |
| 域名 | ENS, Unstoppable Domains | 区块链域名 |
| 会员卡 | 世界杯门票, Bored Ape Yacht Club | 专属权益 |
| 凭证 | Gitcoin Passport, POAP | 身份与成就 |

## 安全考虑

### 1. 无限授权风险

```solidity
// ❌ 危险：允许市场管理所有 NFT
await nft.methods.setApprovalForAll(marketplace, true).send({...});

// ✅ 安全：仅授权特定 NFT
await nft.methods.approve(marketplace, specificTokenId).send({...});
```

### 2. 合约接收检查

ERC721 的 `safeTransferFrom` 会检查接收方是否实现了 `onERC721Received`，防止 NFT 发送至黑洞地址。

### 3. 元数据变更风险

- 元数据通常存储在链下（IPFS/中心化服务器）
- 确保使用不可变的存储方案（如 IPFS）

## 扩展标准

- **ERC721A**：降低 Gas 成本的优化实现（Azuki 提出）
- **ERC721URIStorage**：可变更的元数据存储
- **ERC4973**：账户绑定代币（ABT）

## 总结

ERC721 重新定义了数字所有权。从艺术到游戏，从域名到身份凭证，NFT 正在成为 Web3 的基础设施标准。

**记住**：每个 ERC721 代币都有唯一的身份ID，这使其成为数字世界中"独一无二"的存在。

---

**相关阅读**：
- [AMM 原理详解](/dex-bok/posts/01-amm-principles/)
- [ERC20 代币标准](/dex-bok/posts/06-erc20-token-standard/)
