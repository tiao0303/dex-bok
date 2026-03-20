# ERC-20 代币标准详解：理解 DeFi 的基石

## 什么是 ERC-20

ERC-20 是以太坊上**同质化代币（ Fungible Token ）**的标准接口规范。2017 年通过 EIP-20 正式确立，成为以太坊生态中发行代币的统一协议。

**同质化**意味着每一枚代币都是等价的——我的 1 ETH 和你的 1 ETH 完全等价，可以互换。ERC-20 代币正是这种特性的代币。

ERC-20 之前，每个代币项目都需要自己定义转账逻辑，导致钱包、交易所需要为每个代币单独适配。ERC-20 的出现彻底改变了这一局面——只要遵循这个接口标准，就能无缝兼容所有钱包和交易所。

## 接口规范

ERC-20 标准定义了 6 个必须实现的核心函数和 2 个可选函数，以及 3 个事件。

### 必需函数

```solidity
interface IERC20 {
    // 代币总供应量
    function totalSupply() external view returns (uint256);
    
    // 查询指定地址的代币余额
    function balanceOf(address account) external view returns (uint256);
    
    // 从调用者地址向目标地址转账
    function transfer(address to, uint256 amount) external returns (bool);
    
    // 查询授权额度（owner 授权给 spender 的代币数量）
    function allowance(address owner, address spender) external view returns (uint256);
    
    // 授权第三方使用自己的代币（典型场景：DEX 挂单需要授权）
    function approve(address spender, uint256 amount) external returns (bool);
    
    // 执行授权转账（从 from 向 to 转账，需先 approve）
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
```

### 事件

```solidity
// 转账事件
event Transfer(address indexed from, address indexed to, uint256 value);

// 授权事件
event Approval(address indexed owner, address indexed spender, uint256 value);
```

`indexed` 关键字允许对事件参数进行过滤，这在构建前端应用时非常有用。

### 可选函数

ERC-20 标准还定义了两个可选函数，用于展示代币的元信息：

```solidity
// 代币名称（可选）
function name() external view returns (string);

// 代币符号（可选）
function symbol() external view returns (string);

// 代币小数位数（可选，默认18）
function decimals() external view returns (uint8);
```

## 完整实现示例

以下是一个完整的 ERC-20 代币实现：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = 18;
    }

    // --- 实现 IERC20 接口 ---
    
    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    // --- 内部函数 ---
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= amount, "Insufficient balance");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "Mint to zero address");
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "Burn from zero address");
        require(_balances[account] >= amount, "Insufficient balance");
        
        _balances[account] -= amount;
        _totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "Approve from zero address");
        require(spender != address(0), "Approve to zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "Insufficient allowance");
            _approve(owner, spender, currentAllowance - amount);
        }
    }
}
```

## approve + transferFrom 模式

ERC-20 的授权机制是 DeFi 生态的核心基础。典型使用场景：

```
用户想通过 DEX 交易代币 A 获取代币 B：
1. 用户先调用 A.approve(DEX地址, amount) 授权 DEX 可以使用自己的 A 代币
2. DEX 调用 A.transferFrom(用户, DEX, amount) 划走用户的 A 代币
3. DEX 将 B 代币转给用户
```

### approve 的问题：approve 陷阱

`approve` 存在一个历史遗留问题：无法将授权额度从非零值修改为零。如果用户想减少授权额度，必须先调用 `approve(0)` 清零，等待交易确认，再调用 `approve(newAmount)`。

**现代解决方案：permit 扩展（EIP-2612）**

```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```

通过离线签名，用户可以一次性完成授权+转账，避免了 approve 陷阱。

## ERC-20 扩展标准

### ERC-20 Snapshot

在特定区块记录每个地址的代币余额快照，常用于 DAO 治理投票：

```solidity
function snapshot() external returns (uint256);
function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
function totalSupplyAt(uint256 snapshotId) external view returns (uint256);
```

### ERC-20 Capped（上限代币）

限制代币最大供应量：

```solidity
function cap() external view returns (uint256);
require(totalSupply() <= cap(), "Cap exceeded");
```

### ERC-20 Burnable（可燃烧）

允许持有者销毁自己的代币：

```solidity
function burn(uint256 amount) external;
function burnFrom(address account, uint256 amount) external;
```

## 使用 OpenZeppelin 库

生产环境推荐使用 OpenZeppelin 的审计通过的标准实现：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;
    
    constructor() ERC20("MyToken", "MTK") {
        // 部署时铸造代币
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // 可选：添加燃烧功能
    function burn(uint256 amount) public override {
        super.burn(amount);
    }
}
```

OpenZeppelin 的实现经过严格审计、安全性高，且提供 Upgradeable 版本支持代理模式升级。

## 部署与验证

部署到测试网络后，在 Etherscan 上验证源码：

```bash
npx hardhat verify --network sepolia <合约地址> <构造函数参数>
```

验证通过后，Etherscan 会显示 "Contract Source Code Verified"，用户可以直接在 Etherscan 界面与合约交互。

## 总结

ERC-20 是 DeFi 世界的通用语言。理解其接口设计理念、授权机制和扩展标准，是深入学习 DeFi 协议的基础。下一篇文章我们将解析 Uniswap 等主流 DeFi 协议的核心合约设计。