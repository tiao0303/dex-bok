# 重入攻击原理与防范：The DAO 事件的教训

## 引言

2016年6月，一个名为 The DAO 的项目在以太坊上众筹了价值 1.5 亿美元的 ETH。然而仅仅三周后，这些 ETH 几乎全部被盗。攻击手段就是**重入攻击（Reentrancy Attack）**——它让区块链安全社区第一次深刻认识到智能合约逻辑漏洞的毁灭性。

八年后，重入攻击仍是 Web3 安全中最常见的高危漏洞之一。

## 核心原理：合约调用合约

重入攻击的本质是**一个合约在执行过程中被诱使再次调用自身（或另一个合约），而此时第一次调用的状态还未更新**。

关键在于 Solidity 的执行顺序：当你向另一个地址发送 ETH 时，Solidity 会自动调用该地址的 `receive()` 或 `fallback()` 函数。如果被调用的是一个合约地址，这个回调函数就会执行，而此时**你的合约状态可能还未修改**。

## 经典攻击模式

### 单函数重入

```solidity
// 有漏洞的提款合约
contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) external {
        // 检查：余额是否足够
        require(balances[msg.sender] >= amount);
        
        // 关键问题：先转账，后更新状态！
        // 在 msg.sender.transfer(amount) 执行期间，
        // 攻击者合约的 receive() 函数被调用
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        
        // 状态更新发生在转账之后
        balances[msg.sender] -= amount;
    }
}
```

### 攻击过程详解

1. 攻击者部署一个**恶意合约**并存入 1 ETH
2. 调用 `withdraw(1 ETH)`
3. 合约检查余额（通过），开始转账
4. 攻击者合约的 `receive()` 收到 1 ETH，被触发
5. **在 `receive()` 中，攻击者再次调用 `withdraw(1 ETH)`**
6. 此时 `balances[msg.sender]` **仍然是 1 ETH**（因为第5步的状态更新还没执行）
7. 重复以上步骤，直到合约余额耗尽

```
攻击者存款: 1 ETH
合约余额: 100 ETH

第1次 withdraw: 合约检查余额=1 ✅ → 转账1 ETH → 攻击者receive触发
                → 第2次 withdraw: 检查余额=1 ✅ → 转账1 ETH → receive触发
                → ... 重复直到合约清空

攻击者实际提走: ~100 ETH（存款1 + 利润99）
```

## 重入攻击的变体

### 1. 跨函数重入（Cross-Function Reentrancy）

即使 `withdraw()` 函数本身有保护，如果合约中存在另一个也能修改余额的函数，攻击者可能从另一个函数路径发起重入。

### 2. 跨合约重入（Cross-Contract Reentrancy）

攻击者的合约本身没有漏洞，但通过在回调中调用目标合约的其他函数，也能造成类似效果。

### 3. 只读重入（Read-Only Reentrancy）

2023 年发现的新型变体：当外部合约在**只读函数**执行期间读取了状态可能被污染的合约数据时发生——即使你没有写权限，也可能造成损失。

## The DAO 事件回顾

The DAO 是最早的大规模去中心化投资基金。其拆分（Split）函数存在重入漏洞：
- 用户先收到 DAO 代币退款
- 然后余额才更新
- 攻击者在退款期间调用 Split 递归提取资金

最终导致约 360 万 ETH 被盗（当时价值约 6000 万美元）。这次事件直接导致了以太坊的**硬分叉**——诞生了今天的 Ethereum Classic 和 ETH 两条链。

## 防御策略

### 策略一：Checks-Effects-Interactions 模式（CEI）

**先检查，再更新状态，最后交互。** 这是最基础也是最重要的防御原则：

```solidity
function withdraw(uint256 amount) external {
    // 1. 检查（Check）
    require(balances[msg.sender] >= amount);
    
    // 2. 更新状态（Effect）- 移到转账之前！
    balances[msg.sender] -= amount;
    
    // 3. 交互（Interaction）
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
}
```

### 策略二：互斥锁（Reentrancy Guard）

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant {
        // nonReentrant 修饰符防止重入
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
    }
}
```

`nonReentrant` 修饰符使用一个 `nonReentrantGuard` 状态变量，在首次调用时设为 `1`，函数结束时重置为 `0`。递归调用在进入时会检查到状态已被锁定，直接 revert。

### 策略三：使用 Pull Payment 模式

与其让用户主动"拉取"（push）资金，不如让合约管理发放流程。OpenZeppelin 的 `PullPayment` 模式：

```solidity
// 用户调用 withdraw() 取回自己的资金，而非直接 push
function withdrawPayments() public payable {
    payments[msg.sender].withdrawPayments();
}
```

### 策略四：限制 ETH 接收方式

如果合约不需要接收 ETH，重写 `receive()` 使其 revert：

```solidity
receive() external payable {
    revert("Contract does not accept ETH");
}
```

## 真实案例：2023 年仍在发生

重入攻击绝非过去式。2023 年：
- 欧易 ExChain 跨链桥因重入漏洞损失约 5700 万美元
- 多个 GameFi 项目因 NFT 转移中的重入问题被攻击

**关键教训**：任何涉及状态修改后进行外部调用的代码，都需要重新审视重入风险。

## 检测工具

- **Slither**（Trail of Bits）：内置重入检测器
- **Mythril**：符号执行分析
- **Certora Prover**：形式化验证
- **OpenZeppelin Defender**：运行时监控与紧急暂停

## 结语

重入攻击教会我们一个核心原则：**在合约中，外部调用是信任的边界**。每当你调用另一个合约，你就在信任一个外部实体——而这个实体的行为可能远超你的预期。掌握 CEI 模式、互斥锁和 Pull Payment 模式，是防御重入的基础三件套。
