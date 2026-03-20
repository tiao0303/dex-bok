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
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Token Contract", function () {
  let token;
  let owner;
  let user;
  let anotherUser;

  beforeEach(async function () {
    [owner, user, anotherUser] = await ethers.getSigners();
    
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

  describe("Transfers", function () {
    it("should transfer tokens between accounts", async function () {
      await token.transfer(user.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user.address))
        .to.equal(ethers.parseEther("100"));
    });

    it("should fail if sender doesn't have enough tokens", async function () {
      await expect(
        token.connect(user).transfer(anotherUser.address, ethers.parseEther("1000"))
      ).to.be.revertedWith("Insufficient balance");
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

    function testTransfer() public {
        token.transfer(user, 100e18);
        assertEq(token.balanceOf(user), 100e18);
    }

    function testInsufficientBalance() public {
        vm.expectRevert("Insufficient balance");
        token.transfer(user, 1_000_001e18);
    }
}
```

运行测试：

```bash
forge test
```

## 测试类型

### 1. 单元测试

测试单个函数的功能：

```javascript
it("should calculate reward correctly", async function () {
  const reward = await staking.calculateReward(holder.address);
  // 预期奖励 = 质押量 × 年化收益率 × 质押时长 / 365天
  const expected = stakeAmount * 1000 / 10000 * stakingDays / (365 * 86400) * 1e18;
  expect(reward).to.be.closeTo(expected, 1); // 允许 1 wei 误差
});
```

### 2. 集成测试

测试合约间的交互：

```javascript
describe("Staking Integration", function () {
  it("should integrate with reward token", async function () {
    // 1. 质押代币
    await staking.stake(stakeAmount);
    
    // 2. 时间推进
    await time.increase(30 * 86400); // 30天后
    
    // 3. 领取奖励
    await staking.claimReward();
    
    // 4. 验证奖励代币到账
    const rewardBalance = await rewardToken.balanceOf(staker.address);
    expect(rewardBalance).to.be.gt(0);
  });
});
```

### 3. 场景测试（Fork Testing）

在主网分叉环境中测试，使用真实数据和协议：

```javascript
// Hardhat Fork 测试
describe("Uniswap Integration", function () {
  beforeEach(async function () {
    // Fork Sepolia 测试网
    await network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: process.env.SEPOLIA_RPC_URL
        }
      }]
    });
  });

  it("should swap ETH for USDC via Uniswap", async function () {
    // 使用真实的 Uniswap V2 Router
    const router = await ethers.getContractAt(
      "IUniswapV2Router02",
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    );
    
    const path = [WETH, USDC]; // 路径
    const amountOutMin = 1800 * 1e6; // 至少收到 1800 USDC
    
    await router.swapExactETHForTokens(
      amountOutMin,
      path,
      owner.address,
      deadline,
      { value: ethers.parseEther("1") }
    );
  });
});
```

### 4. 模糊测试（Fuzz Testing）

随机输入发现边界case：

```solidity
// Foundry Fuzz Testing
function testTransferRandomAmounts(uint256 amount) public {
    amount = bound(amount, 1, 1000e18);
    
    token.transfer(user, amount);
    assertEq(token.balanceOf(user), amount);
}
```

## Gas 报告分析

Hardhat 的 `hardhat-gas-reporter` 插件可以追踪每个函数的 Gas 消耗：

```bash
npm install --save-dev hardhat-gas-reporter @nomicfoundation/hardhat-ignition-gnache
```

```javascript
// hardhat.config.js
module.exports = {
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  }
};
```

输出示例：

```
·---------------------------|------------|------------|-------------|-------------·
|  Solc version: 0.8.24     ·  Optimizer enabled: false  ·  Runs: 200      ·
·---------------------------|------------|------------|-------------|-------------·
|  Methods                  ·               ·               ·       │
|  Contract                 ·  Min  ·  Avg  ·    Max  ·   # calls │
·---------------------------|------------|------------|-------------|-------------·
|  Token                    ·     -  ·     -  ·       -  ·        - │
|  ├─ transfer              ·  51625  · 51625  ·   51625  ·        6 │
|  ├─ approve               ·  24669  · 24669  ·   24669  ·        2 │
|  └─ transferFrom          ·  46967  · 46967  ·   46967  ·        3 │
·---------------------------|------------|------------|-------------|-------------·
```

## 部署流程

### 1. 准备部署脚本

```javascript
// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 部署主合约
  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  
  console.log("Token deployed to:", await token.getAddress());
  
  // 如果有依赖合约，先部署依赖
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(token.getAddress());
  await staking.waitForDeployment();
  
  console.log("Staking deployed to:", await staking.getAddress());
  
  // 验证部署
  const totalSupply = await token.totalSupply();
  console.log("Total Supply:", totalSupply);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 2. 配置网络

```javascript
// hardhat.config.js
module.exports = {
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 11155111
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 1
    }
  }
};
```

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

# 多文件合约验证
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> --contract contracts/Token.sol:MyToken
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

部署完成后需要持续监控：

```javascript
// 监控大额转账（使用 The Graph 或直接监听事件）
token.on("Transfer", (from, to, value, event) => {
  if (value.gt(ethers.parseEther("1000"))) {
    console.log(`Large transfer detected: ${value} from ${from} to ${to}`);
    // 发送告警：邮件/Telegram/Slack
  }
});
```

## 总结

智能合约测试需要多层次覆盖：单元测试验证基本功能，集成测试验证合约间交互，Fork 测试使用真实数据验证，模糊测试发现边界问题。部署应遵循测试网 → 审计 → 主网的流程，每一步都要谨慎。

下一篇文章我们将深入讨论智能合约的常见安全漏洞与防范措施。
