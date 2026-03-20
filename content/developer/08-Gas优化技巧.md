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

// 低 Gas：仅记录事件
event Deposit(address indexed user, uint256 amount, uint256 timestamp);
```

### packing 结构体成员

EVM 以 32 字节（256 bits）为单位存储变量。将大小不同的变量紧凑排列可以减少存储槽数：

```solidity
// 优化：紧密排列
struct GoodConfig {
    uint128 a; // 槽1
    uint128 c; // 槽1的后16字节（和a pack在一起）
    uint256 b; // 槽2
}
```

### 批量读写

批量操作比分次操作省 Gas。

## 循环优化

### 避免在循环中读取 storage

### 缓存数组长度

```solidity
// 糟糕：每次检查 length
for (uint i = 0; i < users.length; i++) { }

// 优化：缓存长度
uint256 length = users.length;
for (uint i = 0; i < length; i++) { }
```

## 函数可见性与修饰器

### external vs public

`external` 函数参数在 `calldata` 中，`public` 函数参数在 `memory` 中。对于外部调用者，`external` 更省 Gas：

```solidity
// 优化
function process(uint256[] calldata data) external {
    // ...
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
}
```

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