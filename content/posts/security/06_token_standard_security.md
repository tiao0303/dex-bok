# 代币标准安全考量：ERC-20 与 ERC-721 的隐藏陷阱

## 引言

ERC-20 是 DeFi 的血液，ERC-721（NFT）是 Web3 经济的基石。这些标准带来了互操作性和生态系统繁荣，但同时也埋下了安全隐患。理解代币标准的安全边界，是每个智能合约开发者的必修课。

## ERC-20 的七大安全陷阱

### 陷阱一：transfer() 返回值被忽略

ERC-20 规范中 `transfer()` 和 `transferFrom()` 返回 `bool` 值，但许多合约调用后不检查返回值：

```solidity
// 危险：未检查返回值
token.transfer(to, amount);

// 安全：检查返回值
require(token.transfer(to, amount), "Transfer failed");
```

如果代币转账失败（如代币有白名单限制、Gas Token 等），返回 `false` 但调用方仍继续执行，可能导致资产损失或逻辑不一致。

**更安全的做法**：`SafeERC20` 库会在底层自动检查返回值并在失败时 revert。

```solidity
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;
token.safeTransfer(to, amount);
```

### 陷阱二：approve + transferFrom 的竞态条件

经典的 ERC-20 approve 竞态问题：

```
1. Alice 授权 DEX 1000 TOKEN
2. DEX 使用 1000 TOKEN（正常）
3. Alice 想把授权改为 500 TOKEN，调用 approve(DEX, 500)
4. 此时 DEX 在同一区块内也调用 transferFrom，想再花 1000 TOKEN
5. approve 还没执行完，DEX 却仍能花掉 1000（旧授权）
6. 结果：DEX 实际花了 1000，Alice 只剩 500，但授权改成了 500
7. 再次调用 transferFrom 时，授权不足，交易 revert
```

**解决方案**：先调用 `approve()` 设为 0，再设为目标值（两笔交易），或使用 `increaseAllowance` / `decreaseAllowance`。

### 陷阱三：转账精度丢失

ERC-20 代币的 `decimals` 字段表示精度（通常是 18）。转账金额计算时必须考虑精度：

```solidity
// 错误：直接除以 10 可能丢失精度
uint256 share = userBalance / 10; // 1.5 -> 1

// 正确：使用高精度计算
uint256 share = (userBalance * 10) / 100; // 1.5 ETH -> 1500000000000000000 * 10 / 100
```

### 陷阱四：approve(0) 设为零地址

如果代币不允许零地址转账，`approve(address(0), amount)` 会失败。虽然这不常见，但会导致依赖 `approve(0)` 来撤销授权的合约出错。

### 陷阱五：代币转移的递归调用风险

在 DeFi 合约中收到代币后执行逻辑，如果合约又调用了 `transfer()`，可能导致重入——与我们在第3篇讨论的原则一致。

### 陷阱六：Mint 和 Burn 的不平衡

如果代币的 mint（铸造）和 burn（销毁）逻辑有漏洞，可能导致代币总量无限通胀或流通量无法核实。

### 陷阱七：Fee-on-Transfer 代币

某些代币（如某些税收代币）会在每次转账时扣除一部分作为手续费。合约如果基于固定金额计算余额，会出现资金锁定：

```solidity
// 危险：假设收到金额等于发送金额
uint256 balance = token.balanceOf(address(this));
require(balance >= expectedAmount, "Insufficient");

// 实际收到的可能少于 expectedAmount
token.transfer(user, balance); // 实际转出少于 balance
```

## ERC-721 / NFT 安全考量

### 安全一：批量转账的 gas 限制

ERC-721 的 `safeTransferFrom` 在批量转账时，如果遍历大量 NFT，可能超出区块 gas 上限，导致交易永久无法成功。

```solidity
// 危险：批量转移所有 NFT
function transferAll(address to) external {
    for (uint i = 0; i < userNFTs[msg.sender].length; i++) {
        safeTransferFrom(msg.sender, to, userNFTs[msg.sender][i]);
    }
}
```

**优化**：使用元交易（Meta Transaction）或分批处理。

### 安全二：随机数 mint 的可预测性

某些 NFT 项目在铸造时使用 `block.timestamp` 或 `block.difficulty` 作为随机数种子。由于这些值在区块打包前可以被矿工/验证者部分控制，可能导致稀有 NFT 被提前"预订"。

```solidity
// 危险：随机性可预测
uint256 random = uint256(keccak256(abi.encodePacked(
    block.timestamp, msg.sender, totalMinted
)));
uint256 tokenId = random % maxSupply;
```

**解决方案**：使用 Chainlink VRF（可验证随机函数）在链上生成真正不可预测的随机数。

### 安全三：transfer 后的 NFT 归属

ERC-721 转移后，`ownerOf()` 立即返回新地址。合约如果在 transfer 回调中使用 `ownerOf()` 但缓存了旧值，可能导致逻辑错误。

### 安全四：元数据 API 的完整性

NFT 的元数据（图片、属性）通常存储在链外服务器或 IPFS。如果项目方修改了元数据（如稀有度属性），NFT 的实际价值可能与购买时不符。

**防范**：对于高价值 NFT，检查元数据是否存储在链上（如使用 SVG 生成）或 IPFS 上，并验证 URI 不可变性。

## ERC-1155：两者的安全融合

ERC-1155 允许多种代币类型在同一合约中管理，提供了更高的效率，但也引入了新的安全考量：

- **余额原子性**：同一笔交易中修改多种代币余额时，需要确保原子性验证
- **Batch 操作的权限校验**：批量转账需要确保调用者有权限操作所有涉及的类型

## 代币标准安全的实践建议

| 类型 | 实践要点 |
|------|---------|
| ERC-20 转账 | 始终使用 SafeERC20，检查返回值 |
| ERC-20 授权 | 使用 increaseAllowance/decreaseAllowance |
| ERC-20 余额计算 | 始终通过代币余额变化量，而非假设金额 |
| ERC-721 mint | 使用 Chainlink VRF 生成随机数 |
| ERC-721 批量操作 | 分批处理，设置合理的上限 |
| 通用 | 对每个代币进行兼容性测试（非标准行为） |

## 结语

代币标准是 DeFi 和 NFT 的基础设施，但"标准"并不意味着"完美"。每个标准都有其设计权衡和安全边界。开发者在使用这些标准时，需要理解其底层实现，而非仅仅依赖接口定义。
