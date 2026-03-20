# Solidity 基础语法：从变量到函数

## 概述

Solidity 是以太坊智能合约开发的首选语言，语法融合了 JavaScript 的简洁与 Java 的强类型特性。本文将系统讲解 Solidity 的基础语法，帮助你快速上手智能合约编写。

## 第一个 Solidity 合约

每个 Solidity 源文件通常以许可证声明和版本约束开头：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
```

- `SPDX-License-Identifier`：声明代码许可证，主流项目多用 MIT 或 GPL-3.0
- `pragma solidity ^0.8.24`：约束编译器版本，`^` 表示兼容 0.8.24 及以上 0.8.x 版本

## 数据类型

Solidity 是一门静态类型语言，变量必须在声明时指定类型。

### 值类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `bool` | 布尔值 | `bool public isActive = true;` |
| `int/uint` | 有/无符号整数 | `int256 public balance = -100;` |
| `address` | 20字节以太坊地址 | `address public owner = msg.sender;` |
| `bytes1~bytes32` | 固定长度字节数组 | `bytes32 public hash;` |

### 引用类型

```solidity
// 数组（动态大小）
uint[] public numbers;
address[] public investors;

// 结构体
struct Token {
    string name;
    uint256 supply;
    address creator;
}

// 映射：键值对，类似哈希表
mapping(address => uint256) public balances;
mapping(address => mapping(address => uint256)) public allowances;
```

> ⚠️ **重要**：声明映射时，值类型的默认值为 `0`，地址类型为 `address(0)`，布尔为 `false`。

## 函数

### 函数声明与可见性

```solidity
// 完整语法
function functionName(params) [visibility] [stateMutability] [modifiers] returns (returnType) {
    // 函数体
}

// 示例
function transfer(address to, uint256 amount) public returns (bool) {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    balances[to] += amount;
    return true;
}
```

### 可见性修饰符

- **public**：可被内部调用或外部账户调用，自动生成 getter 函数
- **external**：只能从外部调用，不能内部调用（省 Gas）
- **internal**：只能从当前合约或派生合约调用
- **private**：只能从当前合约调用，派生合约也无法访问

### 状态可变性

- **view**：读取状态变量但不修改，不消耗 Gas（外部调用仍需付费）
- **pure**：既不读取也不修改状态，完全是纯计算
- **payable**：允许接收 ETH，标记此修饰符的函数可接收转账

```solidity
contract Example {
    uint256 public totalSupply;
    address public owner;
    
    constructor() {
        owner = msg.sender; // constructor 只在部署时执行一次
    }
    
    // view 函数：读取状态
    function getBalance(address _addr) public view returns (uint256) {
        return address(_addr).balance;
    }
    
    // pure 函数：纯计算
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    
    // payable 函数：可接收 ETH
    function deposit() public payable {
        totalSupply += msg.value;
    }
}
```

## 控制流与错误处理

### 条件判断

```solidity
if (condition) {
    // do something
} else {
    // do other
}
```

### 循环

```solidity
for (uint256 i = 0; i < 10; i++) {
    // 避免在循环中调用外部合约（重入风险）
    // 注意循环中的存储读写操作会消耗大量 Gas
}
```

### 错误处理

Solidity 的错误处理与其他语言不同，失败时**回退所有状态变更**。

```solidity
function withdraw(uint256 amount) public {
    // require：推荐用于验证输入条件和权限
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // revert：适合复杂条件或分支判断
    if (amount > maxWithdrawAmount) {
        revert("Amount exceeds maximum limit");
    }
    
    // assert：仅用于检查不应该发生的内部错误
    assert(totalSupply >= amount);
    
    balances[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);
}
```

> 💡 **Gas 优化提示**：`require` 失败会退还剩余 Gas，而 `assert` 失败会消耗所有 Gas。

## 事件（Events）

事件是 Solidity 中重要的日志机制，用于记录链上发生的重要操作：

```solidity
contract Token {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    mapping(address => uint256) public balanceOf;
    
    function transfer(address to, uint256 amount) public {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        // 触发事件：前端可通过 web3.js/ethers.js 监听
        emit Transfer(msg.sender, to, amount);
    }
}
```

`indexed` 参数允许在 Etherscan 等平台进行过滤搜索，每个事件最多有 3 个 `indexed` 参数。

## 函数修饰器（Modifiers）

修饰器用于在函数执行前插入检查逻辑，实现代码复用：

```solidity
contract Ownable {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _; // 下划线表示函数体执行位置
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }
}
```

## 继承与接口

### 继承

```solidity
contract Base {
    uint256 public value;
    
    function setValue(uint256 _value) public virtual {
        value = _value;
    }
}

contract Derived is Base {
    // override 表示重写基类函数
    function setValue(uint256 _value) public override {
        value = _value * 2;
    }
}
```

### 接口

接口定义了一组函数签名，用于与其他合约交互：

```solidity
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
```

## 全局变量与函数

EVM 提供了一系列内置变量和函数：

| 变量 | 说明 |
|------|------|
| `msg.sender` | 调用者地址 |
| `msg.value` | 调用时发送的 ETH 数量（单位：wei） |
| `msg.data` | 调用数据负载 |
| `block.number` | 当前区块高度 |
| `block.timestamp` | 当前区块时间戳 |
| `gasleft()` | 剩余 Gas 量 |
| `tx.origin` | 原始交易发送者（慎用！） |

## 总结

本文涵盖了 Solidity 最核心的语法要素：数据类型、函数、错误处理、事件、修饰器与继承。下一篇文章我们将讨论如何搭建完整的智能合约开发环境，包括编辑器配置、私链测试、框架使用等内容。

**核心要点回顾**：
- Solidity 是静态类型语言，状态变量存储在链上
- `view/pure` 函数不修改状态，`payable` 函数可接收 ETH
- `require/revert/assert` 用于错误处理，失败时全部回退
- 事件是链上日志，前端通过监听事件获取合约状态变化
