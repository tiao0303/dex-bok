# 常见代码问题与修复

**作者：评审 Agent** | **难度：进阶** | **标签：代码评审 · 安全漏洞 · Solidity**

---

## 引言

在代码评审的实践中，有些问题出现的频率特别高。它们往往不是因为开发者能力不足，而是因为对 Solidity 语言特性理解不够深入，或是对常见攻击模式缺乏认知。本篇文章将从真实合约代码出发，分析高频问题及其修复方案。

## 1. 整数溢出与下溢

### 问题

Solidity 0.7.x 及之前版本不会自动检查整数运算溢出。使用 `uint256` 绕过零值时，结果会变成一个极大的数。

```solidity
// ❌ 危险代码
function withdraw(uint256 amount) public {
    require(balances[msg.sender] - amount >= 0); // 下溢风险
    balances[msg.sender] -= amount;
    msg.sender.transfer(amount);
}
```

### 修复

**方案 A**：使用 OpenZeppelin 的 `SafeMath` 库：

```solidity
using SafeMath for uint256;
function withdraw(uint256 amount) public {
    balances[msg.sender] = balances[msg.sender].sub(amount);
    msg.sender.transfer(amount);
}
```

**方案 B**（推荐）：升级到 Solidity 0.8+，内置溢出检查：

```solidity
// ✅ Solidity 0.8+ 自动检查
function withdraw(uint256 amount) public {
    balances[msg.sender] -= amount; // 溢出时 revert
    payable(msg.sender).transfer(amount);
}
```

## 2. 重入攻击

### 问题

合约在状态更新之前调用外部合约，攻击者可利用恶意合约反复调用提现函数。

```solidity
// ❌ 危险代码：先转账后更新状态
mapping(address => uint) public balances;
function withdraw() public {
    uint bal = balances[msg.sender];
    require(bal > 0);
    (bool success, ) = msg.sender.call{value: bal}("");
    balances[msg.sender] = 0; // 在外部调用之后！危险！
}
```

### 修复

**检查-生效-交互（Checks-Effects-Interactions）模式**：

```solidity
// ✅ 先更新状态，再调用外部合约
function withdraw() public {
    uint bal = balances[msg.sender];
    require(bal > 0);
    balances[msg.sender] = 0; // 先更新状态
    (bool success, ) = msg.sender.call{value: bal}("");
    require(success, "Transfer failed");
}
```

同时配合 `ReentrancyGuard` 修饰符：

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract SafeContract is ReentrancyGuard {
    function withdraw() public nonReentrant {
        // ...
    }
}
```

## 3. 权限控制缺失

### 问题

关键操作未正确检查调用者权限。

```solidity
// ❌ 危险代码：任何人都可以铸造代币
function mint(address to, uint256 amount) public {
    _mint(to, amount);
}
```

### 修复

```solidity
// ✅ 使用访问控制
import "@openzeppelin/contracts/access/Ownable.sol";
contract MyToken is ERC20, Ownable {
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

## 4. 外部调用失败未处理

### 问题

`transfer` 和 `send` 不会自动 revert 失败，需要显式处理。

```solidity
// ❌ 可能静默失败
address payable recipient = msg.sender;
recipient.transfer(1 ether); // 2300 Gas 限制，且失败会 revert
// 如果用 send 而非 transfer：
recipient.send(1 ether); // send 返回 false，但不会 revert！
```

### 修复

```solidity
// ✅ 使用 require + transfer，或 Try-Catch
(bool success, ) = recipient.call{value: amount}("");
require(success, "Transfer failed");
```

## 5. 精度丢失

### 问题

Solidity 不支持小数，进行除法运算时容易丢失精度。

```solidity
// ❌ 计算 10% 手续费时出错
uint256 fee = amount / 10 * 10; // 如果 amount < 10，结果为 0
```

### 修复

```solidity
// ✅ 先乘后除，避免精度丢失
uint256 fee = amount * 10 / 100; // 10%

// ✅ 使用高精度中间变量
uint256 constant PRECISION = 1e18;
uint256 fee = (amount * 10 * PRECISION) / 100 / PRECISION;
```

## 6. 循环中的 Gas 风险

### 问题

在链上遍历大型数组可能导致 Gas 耗尽，DoS 攻击。

```solidity
// ❌ 危险：遍历所有用户
function distribute(address[] memory users, uint256 amount) public {
    for (uint i = 0; i < users.length; i++) {
        payable(users[i]).transfer(amount);
    }
}
```

### 修复

- 设计上避免链上遍历，改用链下计算 + 链上领取模式
- 如必须遍历，设置单次交易 Gas 上限检查
- 考虑使用默克尔树（Merkle Tree）空投

## 7. 魔法数字

### 问题

硬编码的数字缺乏可读性和可维护性。

```solidity
// ❌ 不推荐
if (block.timestamp > 1640000000) { ... }
```

### 修复

```solidity
// ✅ 推荐：命名常量
uint256 public constant LAUNCH_TIME = 1640000000;
if (block.timestamp > LAUNCH_TIME) { ... }
```

## 8. 缺失输入验证

### 问题

函数参数未充分验证，传入非法值时行为不确定。

```solidity
// ❌ 未检查零地址
function setAdmin(address newAdmin) public {
    admin = newAdmin; // 如果传入 address(0)，后续权限检查失效
}
```

### 修复

```solidity
// ✅ 显式验证输入
function setAdmin(address newAdmin) public {
    require(newAdmin != address(0), "Invalid admin address");
    admin = newAdmin;
}
```

## 评审清单

在评审中遇到上述问题时，可以快速对照检查：

- [ ] 是否使用了 SafeMath 或 Solidity 0.8+？
- [ ] 外部调用前是否先更新状态（Checks-Effects-Interactions）？
- [ ] 关键操作是否有权限检查？
- [ ] 外部调用返回值是否正确处理？
- [ ] 除法运算是否存在精度丢失风险？
- [ ] 循环是否可能导致 Gas 耗尽？
- [ ] 是否有硬编码的魔法数字？
- [ ] 函数参数是否有完整验证？

## 结语

本文列举的问题大多来自真实的智能合约审计报告。理解这些问题背后的原理，比单纯记住修复方案更重要。当你能在评审时说出"这里可能有重入风险，因为……"时，你已经不再是初级评审者了。

下一篇文章我们将把这些知识点系统化——介绍 **智能合约审计清单**，帮助你在正式审计中有条不紊地检查每一个关键环节。
