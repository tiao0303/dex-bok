# 形式化验证入门

**作者：评审 Agent** | **难度：高级** | **标签：形式化验证 · 智能合约 · Certora · K Framework · 数学证明**

---

## 引言

传统测试方法可以告诉你"代码在已知场景下没有问题"，但无法保证"代码在所有场景下都没有问题"。形式化验证（Formal Verification）通过数学方法证明程序的正确性，是智能合约安全的终极保障手段。

## 什么是形式化验证？

形式化验证是用数学方法证明程序满足其规范（Specification）的过程。类比：

- **测试**：在操场上跑几圈，证明车能开
- **形式化验证**：用物理定律证明车在任何路面上都能开

### 核心概念

- **规范（Specification）**：程序应该满足的属性描述，如"转账后双方余额之和不变"
- **证明（Proof）**：用数学逻辑推演出程序确实满足规范
- **模型（Model）**：程序的数学抽象（状态机、有限状态自动机等）

## 形式化验证的方法

### 1. 定理证明（Theorem Proving）

将程序和属性表示为数学命题，用证明助手（如 Coq、Isabelle）手工或半自动证明。

**代表项目**：
- **K Framework**：定义合约语言的语义，证明编译器正确性
- **Coq + VST**：Verifiable C，用 Coq 证明 C 程序正确性

### 2. 模型检验（Model Checking）

枚举程序的所有可能状态，检查是否满足规范。

**代表项目**：
- **Certora Prover**：自动化字节码级别验证

### 3. 符号执行（Symbolic Execution）

用符号（如 `x`）代替具体值，模拟所有执行路径。

**代表工具**：
- **Mythril**
- **Manticore**
- **echidna**（结合 Fuzzing 的符号执行）

## Certora Prover 实战

Certora Prover 是最流行的智能合约形式化验证工具之一，支持自动化 EVM 字节码验证。

### 安装与使用

```bash
npm install certora-cli
cert VERSION
```

### 示例：验证代币总量守恒

**属性描述**：`transfer` 操作不应改变代币总供应量，且双方余额变化之和为零。

```java
// MyToken.spec
methods {
    function totalSupply() external returns (uint256) envfree;
    function balanceOf(address) external returns (uint256) envfree;
    function transfer(address, uint256) external returns (bool) envfree;
}

// 规则：总量守恒
rule transferPreservesTotalSupply(method f) {
    uint256 totalBefore = totalSupply();
    env e;
    calldataarg args;
    
    invoke f(e, args);
    
    uint256 totalAfter = totalSupply();
    assert totalBefore == totalAfter;
}

// 规则：转账金额守恒
rule transferAmountConservation(address from, address to, uint256 amount) {
    env e;
    require from != to && amount > 0;
    
    uint256 fromBefore = balanceOf(from);
    uint256 toBefore = balanceOf(to);
    
    // 假设 transfer 会 revert，如果 revert 则规则不适用
    invoke transfer(e, to, amount);
    
    uint256 fromAfter = balanceOf(from);
    uint256 toAfter = balanceOf(to);
    
    assert fromBefore - amount == fromAfter;
    assert toBefore + amount == toAfter;
}
```

### 运行验证

```bash
certoraRun MyToken.spec --prover_args "-maxTransferDepthVisit 5"
```

Certora Prover 会尝试证明每个规则，或找到反例（counterexample）。

### 反例输出示例

```
[LINE:24] Transfer amount conservation violated.
  from = 0x1234...
  to = 0x5678...
  amount = 0  // 边界条件：amount = 0 未被正确处理
```

---

## Echidna：模糊测试 + 符号执行

Echidna 结合了 Fuzzing 和符号执行，能自动生成异常输入来检测漏洞。

### 安装

```bash
npm install -g echidna
```

### 属性定义（Solidity 格式）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "echidna/Echidna.sol";

contract Token {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    constructor() {
        totalSupply = 10000;
        balances[msg.sender] = totalSupply;
    }
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    // Echidna 测试属性
    function echidna_totalSupplyNotNegative() public view returns (bool) {
        return totalSupply >= 0; // 永远为真，但 Echidna 会验证
    }
    
    function echidna_balanceNotExceedTotal() public view returns (bool) {
        return balances[msg.sender] <= totalSupply;
    }
}
```

### 运行

```bash
echidna test.sol --contract Token
```

Echidna 会生成大量随机交易序列，验证属性是否始终成立。

---

## SMT 求解器：验证引擎

形式化验证工具的底层依赖是 **Satisfiability Modulo Theories (SMT) 求解器**，如 Z3、CVC5。

### SMT 在合约验证中的作用

将合约执行转换为逻辑约束，然后由求解器判断是否存在违反规范的输入：

```
状态约束: balances[alice] = 100
输入: amount = 0
执行: balances[alice] -= amount  // 100 - 0 = 100
结果: balances[alice] = 100

求解: 是否存在某条路径使 totalSupply 改变？
约束: totalSupply_before ≠ totalSupply_after
求解器回答: UNSAT（不存在）→ 证明通过
```

---

## 形式化验证的局限性

- **状态空间爆炸**：完整验证复杂合约的计算成本极高
- **规范编写难度**：正确的规范需要领域专业知识
- **外部依赖**：合约调用的外部合约难以精确建模
- **计算资源**：深度验证需要强大的计算能力
- **不是万能药**：只能证明"符合规范"，不能保证规范本身正确

## 适用场景

形式化验证特别适合：

- **核心金融逻辑**：涉及资金转移的合约
- **标准实现**：如 ERC-20 代币的核心属性验证
- **权限控制**：访问控制规则的完整性
- **数学计算**：涉及复杂算术的合约

## 实践建议

1. **从关键属性开始**：先验证最重要的安全属性，如总量守恒、权限不变
2. **结合多种方法**：形式化验证 + 单元测试 + 模糊测试，互相补充
3. **迭代完善规范**：验证过程中发现规范缺失或错误
4. **参考成熟模板**：Certora Prover 提供了大量标准属性库

## 工具生态一览

| 工具 | 方法 | 适用场景 |
|------|------|----------|
| **Certora Prover** | 模型检验 | 自动化字节码验证 |
| **Echidna** | 模糊 + 符号执行 | 属性测试 |
| **Mythril** | 符号执行 | 漏洞发现 |
| **K Framework** | 定理证明 | 语言语义、编译器验证 |
| **Coq / Lean** | 定理证明 | 数学证明辅助 |

## 结语

形式化验证不是银弹，但它是智能合约安全的强大武器。对于高价值合约（资产超过千万美元），建议在传统审计的基础上引入形式化验证，将"人工评审 + 形式化证明"结合，为合约安全提供双重保障。

下一篇文章也是本系列最后一篇——**代码评审工具与流程**，整合我们学到的所有知识，介绍完整的团队代码评审流程。
