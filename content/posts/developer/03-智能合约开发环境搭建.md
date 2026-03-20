# 智能合约开发环境搭建：工具链全景指南

## 前言

在编写第一个 Solidity 合约之前，我们需要一套完整的开发环境。与传统 Web 开发不同，智能合约开发涉及区块链本地测试、Gas 模拟、部署脚本等特殊需求。本文将详细介绍从零搭建专业级开发环境的完整流程。

## 核心工具栈

一套完整的智能合约开发环境通常包含：

```
编辑器/IDE        → VS Code + Solidity 插件
编译工具          → solc（Solidity 编译器）
开发框架          → Hardhat 或 Foundry
本地测试网络      → Hardhat Network 或 Ganache
前端交互库        → ethers.js 或 web3.js
包管理            → npm / yarn
```

## 第一步：安装 Node.js 与包管理器

Solidity 开发工具大多基于 Node.js，首选通过 nvm（Node Version Manager）安装：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc  # 或 source ~/.bashrc

# 安装 LTS 版本 Node.js
nvm install --lts
nvm use --lts

# 验证安装
node --version   # v20.x.x
npm --version    # 10.x.x
```

> 💡 **提示**：Windows 用户建议使用 WSL2（Windows Subsystem for Linux）或直接下载 Node.js 官方安装包。

## 第二步：选择开发框架

目前主流的两个框架是 **Hardhat** 和 **Foundry**。

### Hardhat

Hardhat 由 Nomic Labs 开发，是目前最流行的以太坊开发环境：

```bash
# 创建新项目
mkdir my-defi-project && cd my-defi-project
npm init -y

# 安装 Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 初始化 Hardhat 配置
npx hardhat init
```

生成的 `hardhat.config.js` 包含编译器版本、网络配置等：

```javascript
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      // 本地网络配置
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

### Foundry

Foundry 是用 Rust 编写的下一代开发框架，以速度著称：

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 初始化项目
forge init my-project --no-git
cd my-project
```

Foundry 核心工具：

| 工具 | 用途 |
|------|------|
| `forge` | 编译、测试、部署合约 |
| `cast` | 与链交互、ABI 编码解码 |
| `anvil` | 本地测试网络 |
| `chisel` | 交互式 Solidity REPL |

**主要区别**：

| 特性 | Hardhat | Foundry |
|------|---------|---------|
| 语言 | JavaScript/TypeScript | Rust + Solidity |
| 测试速度 | 较慢 | 极快（Rust 引擎） |
| 生态 | 插件丰富 | 性能优先 |
| 脚本 | JavaScript | Solidity（Foundry Scripts） |

**建议**：初学者从 Hardhat 入手，项目稳定后考虑迁移到 Foundry 提升效率。

## 第三步：配置 VS Code

### 安装必要插件

VS Code 扩展市场搜索安装：

1. **Solidity**（Juan Blanco）：语法高亮、格式化、AST 视图
2. **Prettier - Code formatter**：代码格式化
3. **Solidity Visual Developer**：安全反模式检测

### 配置格式化规则

创建 `.prettierrc`：

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 4,
  "trailingComma": "es5"
}
```

创建 `.prettierignore`：

```
node_modules/
cache/
artifacts/
typechain-types/
```

## 第四步：本地测试网络

Hardhat 自带 Hardhat Network，是一个专为开发设计的本地网络：

```bash
# 启动 Hardhat 节点（终端保持运行）
npx hardhat node
```

启动后你会看到一系列本地账户：

```
Available Accounts
==================
(0) 0xf39Fd6e51a1... (10000 ETH)
(1) 0x70997970C5181... (10000 ETH)
...
```

### 使用 Ganache（备选）

Ganache 是 Truffle 套件的一部分，提供图形界面：

```bash
npm install -g ganache
ganache
```

## 第五步：编写第一个合约与测试

### 创建合约文件

在 `contracts/` 目录下创建 `SimpleToken.sol`：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("SimpleToken", "STK") {
        _mint(msg.sender, initialSupply);
    }
}
```

### 编写测试

在 `test/` 目录下创建 `SimpleToken.test.js`：

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleToken", function () {
  let token;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("SimpleToken");
    token = await Token.deploy(ethers.parseEther("1000000"));
    await token.waitForDeployment();
  });

  it("should have correct total supply", async function () {
    const totalSupply = await token.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("1000000"));
  });

  it("should transfer tokens correctly", async function () {
    await token.transfer(user.address, ethers.parseEther("100"));
    
    expect(await token.balanceOf(user.address))
      .to.equal(ethers.parseEther("100"));
    expect(await token.balanceOf(owner.address))
      .to.equal(ethers.parseEther("999900"));
  });
});
```

### 运行测试

```bash
npx hardhat test
```

输出类似：

```
  SimpleToken
    ✓ should have correct total supply
    ✓ should transfer tokens correctly
```

## 第六步：部署脚本

创建 `scripts/deploy.js`：

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Token = await ethers.getContractFactory("SimpleToken");
  const token = await Token.deploy(ethers.parseEther("1000000"));
  
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

部署到本地网络：

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

## 第七步：连接前端

安装 ethers.js：

```bash
npm install ethers
```

前端代码示例：

```javascript
import { ethers } from "ethers";

async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // 连接已部署的合约
    const contract = new ethers.Contract(
      "0xYourContractAddress",
      ["function totalSupply() view returns (uint256)"],
      signer
    );
    
    const supply = await contract.totalSupply();
    console.log("Total Supply:", ethers.formatEther(supply));
  }
}
```

## 常见问题排查

| 问题 | 解决方案 |
|------|---------|
| `Error: cannot find module 'hardhat'` | `npm install` 重新安装依赖 |
| 编译报错 `Source file requires different compiler version` | 更新 `hardhat.config.js` 中的 `solidity` 版本 |
| 测试网络余额为 0 | 使用 `--network hardhat` 或重启节点 |
| 部署失败 `insufficient funds` | 确保测试账户有足够 ETH |

## 总结

本文介绍了完整的 Solidity 开发环境搭建流程：

1. **Node.js** 作为运行时基础
2. **Hardhat/Foundry** 提供编译、测试、部署能力
3. **VS Code** + 插件提供舒适的编码体验
4. **本地测试网络** 支持快速迭代
5. **ethers.js** 连接前端与区块链

环境搭建是区块链开发的第一步。下一篇文章我们将深入讲解 ERC-20 代币标准，这是所有 DeFi 项目的基石。
