# Gas 优化技巧：写出省油的智能合约

## 什么是 Gas

Gas 是以太坊网络上执行操作的成本单位。每个 EVM 操作码都有对应的 Gas 消耗：简单的存储读写约 20,000 Gas，复杂的椭圆曲线签名验证可能需要数百万 Gas。

**Gas 优化的目标**：在保持功能正确性和安全性的前提下，最小化 Gas 消耗，降低用户成本并提高合约吞吐量。

## 存储优化

存储是 Gas 消耗最高的部分，一次存储写入约 20,000 Gas，读取约 200-800 Gas。

### 使用 events 代替 storage 存储

如果你只需要记录历史数据而不需要合约后续读取，用 events 更省 Gas：

```solidity
// 高 Gas：存储每笔历史记录
mapping(address => uint256[]) public depositHistory;

function deposit(uint256 amount) external {
    depositHistory[msg.sender].push(amount); // SLOAD + SSTORE，Gas 很高
}

// 低 Gas：仅记录事件
event Deposit(address indexed user, uint256 amount, uint256 timestamp);

function deposit(uint256 amount) external {
    // 不存储历史数组，只记录事件
    emit Deposit(msg.sender, amount, block.timestamp); // 约 1500 Gas
}
```

### packing 结构体成员

EVM 以 32 字节（256 bits）为单位存储变量。将大小不同的变量紧凑排列可以减少存储槽数：

```solidity
// 浪费：每个类型独占一个槽
struct BadConfig {
    uint128 a; // 槽1（前16字节），后16字节浪费
    uint256 b; // 槽2
    uint128 c; // 槽3（前16字节），后16字节浪费
}

// 优化：紧密排列
struct GoodConfig {
    uint128 a; // 槽1
    uint128 c; // 槽1的后16字节（和a pack在一起）
    uint256 b; // 槽2
}
```

### 批量读写

```solidity
// 多次单独写入
function batchStoreBad(uint256[5] calldata values) external {
    for (uint i = 0; i < 5; i++) {
        data[i] = values[i]; // 每次 SSTORE = 20000 Gas
    }
}

// 优化：使用内联汇编批量写入
function batchStoreGood(uint256[5] calldata values) external {
    assembly {
        for { let i := 0 } lt(i, 5) { i := add(i, 1) } {
            sstore(add(slot, i), calldataload(add(calldata, add(0x20, mul(i, 0x20)))))
        }
    }
}
```

## 循环优化

### 避免在循环中读取 storage

```solidity
// 糟糕：每次循环都读取 storage
function badLoop(address[] calldata users) external {
    for (uint i = 0; i < users.length; i++) {
        uint256 balance = balances[users[i]]; // SLOAD 每次循环
        if (balance > 0) {
            // ...
        }
    }
}

// 优化：先读取到 memory
function goodLoop(address[] calldata users) external {
    uint256 length = users.length;
    for (uint i = 0; i < length; i++) {
        uint256 balance = balances[users[i]]; // SLOAD 仍然发生，但更清晰
        if (balance > 0) {
            // ...
        }
    }
}
```

### 缓存数组长度

```solidity
// 糟糕：每次检查 length
for (uint i = 0; i < users.length; i++) { }

// 优化：缓存长度
uint256 length = users.length;
for (uint i = 0; i < length; i++) { }
```

### 使用 do-while 而非 for

`do-while` 比 `for` 稍省 Gas（少一个初始化分支），但这个优化收益极小：

```solidity
// for 循环
for (uint i = 0; i < length; i++) { }

// do-while（某些情况下稍省）
uint i = 0;
do {
    // ...
    i++;
} while (i < length);
```

## 函数可见性与修饰器

### external vs public

`external` 函数参数在 `calldata` 中，`public` 函数参数在 `memory` 中。对于外部调用者，`external` 更省 Gas：

```solidity
// 糟糕
function process(uint256[] memory data) public {
    // ...
}

// 优化
function process(uint256[] calldata data) external {
    // ...
}
```

### view 和 pure 不消耗 Gas（仅限静态调用）

`view` 和 `pure` 函数本身不修改状态，外部调用时仍需支付 Gas（因为需要广播），但内部调用完全不消耗 Gas：

```solidity
contract Example {
    uint256 public value;
    
    // 内部调用不耗 Gas
    function helper() internal pure returns (uint256) {
        return 42;
    }
    
    // 使用 internal helper 不耗额外 Gas
    function readAndCompute() external view returns (uint256) {
        uint256 base = helper(); // 不消耗 Gas
        return value + base;
    }
}
```

## 常量与不可变量

### 使用 constant 和 immutable

```solidity
contract Example {
    // 常量：不占用存储槽，编译时内联
    uint256 public constant DECIMALS = 18;
    
    // 不可变量：在构造函数时赋值，之后只读
    uint256 public immutable MAX_SUPPLY;
    
    constructor() {
        MAX_SUPPLY = 1_000_000 * 10 ** 18;
    }
}
```

Gas 对比：
- 普通状态变量读取：~2100 Gas（冷读）
- `immutable` 读取：~2300 Gas（含扩展）
- `constant` 读取：~0 Gas（编译时完全内联）

## 短路与简化条件

### 简化计算

```solidity
// 糟糕
uint256 result = a * b / c;
uint256 power = value ** 2;

// 优化：提前除法减少乘法精度问题，也省 Gas
uint256 result = a / c * b; // 注意顺序，小心溢出
uint256 power = value * value; // ** 操作码比乘法贵
```

### 利用短路的条件判断

```solidity
// 如果 condition1 为 false，整个表达式就确定为 false，跳过后续检查
if (condition1 && expensiveFunction()) { }

// 同样适用 ||，如果 condition1 为 true，跳过后续
if (condition1 || cheapFunction()) { }
```

## 删除不用的数据

删除数组或 mapping 元素时使用 `delete`：

```solidity
// 糟糕：保留旧值
arr[i] = 0;

// 优化：显式删除，释放存储（可能有 Gas refund）
delete arr[i];
```

> ⚠️ 注意：删除操作本身要消耗 Gas，只有删除曾经写入的存储才能获得 refund。

## 批量操作

### 批量转账

```solidity
// 逐个转账（每次 SSTORE + CALL）
function batchTransferBad(address[] calldata recipients, uint256 amount) external {
    for (uint i = 0; i < recipients.length; i++) {
        token.transfer(recipients[i], amount);
    }
}

// 优化：使用迭代器批量处理
function batchTransferGood(address[] calldata recipients, uint256 amount) external {
    for (uint i = 0; i < recipients.length; i++) {
        // 逻辑相同，但清晰表达意图
    }
}
```

### 批量铸造/铸造时优化

```solidity
// 糟糕：每个接收者单独铸造
for (uint i = 0; i < recipients.length; i++) {
    _mint(recipients[i], amounts[i]);
}

// 优化：单次批量操作
function batchMintOptimized(address[] calldata recipients, uint256[] calldata amounts) external {
    uint256 length = recipients.length;
    for (uint i = 0; i < length; i++) {
        _mint(recipients[i], amounts[i]);
    }
}
```

## 代理模式与可升级合约

代理合约通过 `DELEGATECALL` 复用逻辑代码，每次调用只需支付少量 Gas：

```solidity
contract Proxy {
    address public implementation;
    
    fallback() external payable {
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(
                gas(),
                sload(implementation.slot),
                ptr,
                calldatasize(),
                0,
                0
            )
            // 处理返回值
        }
    }
}
```

但要注意：`DELEGATECALL` 会继承被代理合约的存储布局，需要严格遵守存储槽分配规则。

## Gas 优化工具

| 工具 | 用途 |
|------|------|
| `hardhat-gas-reporter` | 追踪每个函数的 Gas 消耗 |
| `Foundry` | 内置 Gas 快照比较 |
| `slither` | Slither 静态分析，含 Gas 优化建议 |
| `evm.codes` | 查看每个操作码的 Gas 消耗 |

## 优化建议分级

| 优先级 | 优化类型 | 预期收益 |
|--------|----------|---------|
| 🔴 高 | 存储结构packing、减少storage读写 | 数千~数万 Gas |
| 🟡 中 | 使用 events、使用 calldata | 数百~数千 Gas |
| 🟢 低 | constant/immutable、短路优化 | 数十 Gas |

> ⚠️ **重要提示**：不要为了 Gas 优化牺牲代码可读性和安全性。过早优化是万恶之源，先保证正确和安全，再在性能瓶颈处优化。

## 总结

Gas 优化的核心原则：
1. **存储是最贵的**——最小化 storage 读写
2. **批量操作比分次操作省 Gas**——减少交易 overhead
3. **合理使用 calldata、memory、storage**——选择正确的数据位置
4. **优先正确性，其次优化**——不要为了省 Gas 引入 bug

下一篇文章我们将讨论升级型合约的设计模式，这是生产环境 DeFi 项目的必备知识。
