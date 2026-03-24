# 智能合约测试与部署：从测试网到主网

## 为什么测试至关重要

智能合约一旦部署就无法修改（除非使用代理模式），任何漏洞都可能导致不可逆的资产损失。2021 年 Poly Network 被盗 6.11 亿美元，2022 年 Ronin Network 被盗 6.2 亿美元——这些事故几乎都与合约漏洞有关。

**智能合约测试是守门员，不是可选项。**

## 测试框架概述

### Hardhat 测试

Hardhat 原生支持使用 Waffle 库进行智能合约测试，基于 Mocha 测试框架：

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Contract", function () {
  let token;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("MyToken");
    token = await Token.deploy(ethers.parseEther("1000000"));
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      expect(await token.name()).to.equal("MyToken");
      expect(await token.symbol()).to.equal("MTK");
    });

    it("should assign total supply to owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther("1000000"));
    });
  });
});
```

### Foundry 测试

Foundry 的测试用 Solidity 编写，执行速度极快：

```solidity
// test/Token.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Token.sol";

contract TokenTest is Test {
    Token token;
    address owner;
    address user;

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        
        token = new Token("MyToken", "MTK", 1_000_000e18);
    }

    function testNameAndSymbol() public {
        assertEq(token.name(), "MyToken");
        assertEq(token.symbol(), "MTK");
    }
}
```

运行测试：

```bash
forge test
```

## 测试类型

### 1. 单元测试

测试单个函数的功能。

### 2. 集成测试

测试合约间的交互。

### 3. 场景测试（Fork Testing）

在主网分叉环境中测试，使用真实数据和协议。

### 4. 模糊测试（Fuzz Testing）

随机输入发现边界case。

## Gas 报告分析

Hardhat 的 `hardhat-gas-reporter` 插件可以追踪每个函数的 Gas 消耗。

## 部署流程

### 1. 准备部署脚本

### 2. 配置网络

### 3. 执行部署

```bash
# 本地网络
npx hardhat run scripts/deploy.js --network hardhat

# Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia

# 主网（谨慎！）
npx hardhat run scripts/deploy.js --network mainnet
```

### 4. 验证合约源码

```bash
# Etherscan 验证
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 5. 主网部署前的检查清单

```
□ 所有测试通过，覆盖率 > 95%
□ Gas 消耗在合理范围
□ 代码经过至少一次第三方审计
□ 多签钱包配置正确
□ 紧急暂停机制已测试
□ 合约已在测试网运行至少 1 周
□ 团队分配代币已锁仓
□ 准备好监控和报警系统
□ 制定好升级和迁移策略
```

## 监控与运维

部署完成后需要持续监控。

## 总结

智能合约测试需要多层次覆盖：单元测试验证基本功能，集成测试验证合约间交互，Fork 测试使用真实数据验证，模糊测试发现边界问题。部署应遵循测试网 → 审计 → 主网的流程，每一步都要谨慎。