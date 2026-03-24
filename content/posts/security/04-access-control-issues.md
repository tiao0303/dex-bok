# 权限控制问题：被忽视的合约安全命门

## 引言

在代码安全审计中，权限控制缺陷（Access Control Issues）是最常见、同时也是最容易被忽视的漏洞类型之一。与重入攻击不同，权限控制问题往往不需要复杂的攻击技巧——只需要找到一个没有人调用的公开函数。

## 为什么权限控制如此关键

智能合约的一个重要特点是**默认公开**。除 `private` 和 `internal` 函数外，所有 `public` 和 `external` 函数都可能被任何人调用。如果关键操作（如铸造代币、修改参数、暂停合约、转走资金）缺少权限校验，等同于把金库的钥匙挂在门上。

## 权限控制漏洞的常见形态

### 形态一：缺失权限校验

最基础的错误：关键函数没有 `onlyOwner` 或等价修饰符。

```solidity
// 有漏洞
function setFeeRecipient(address _feeRecipient) external {
    feeRecipient = _feeRecipient;
}

// 正确
function setFeeRecipient(address _feeRecipient) external onlyAdmin {
    feeRecipient = _feeRecipient;
}
```

**影响**：攻击者可以将费用接收地址改为自己，持续吸走协议收入。

### 形态二：权限覆盖不足

关键参数有权限校验，但只保护了部分修改路径，其他路径同样能修改该参数。

```solidity
// setFeeRecipient 有权限
function setFeeRecipient(address _feeRecipient) external onlyAdmin {
    feeRecipient = _feeRecipient;
}

// 但 init() 初始化函数没有权限保护！
function initialize(address _feeRecipient) public {
    feeRecipient = _feeRecipient; // 任何人可重新初始化
}
```

### 形态三：过于宽松的所有权

```solidity
// owner() 是公开可读的，但 setOwner() 没有权限保护
function setOwner(address _newOwner) external {
    _transferOwnership(_newOwner); // 任何人都能把自己设为 owner
}
```

### 形态四：Owner 密钥泄露

即使代码层面权限控制完美，如果 owner 私钥被钓鱼或木马窃取，一切防护形同虚设。

## 真实案例解析

### Parity 多签钱包事件（2017）

Parity 多签钱包的**初始化函数是公开的**：
```solidity
function initMultiowned(address[] _owners, uint _required) public {
    // 未检查是否已初始化
    m_numOwners = _owners.length + 1;
    m_owners[1] = uint(_owners[0]);
    m_owners[2] = uint(_owners[1]);
    // ...
}
```

攻击者通过调用 `initMultiowned()` 将自己设为唯一 owner，然后调用 `execute()` 转走所有资金。共有 3 个钱包约 15 万 ETH 永久丢失。

### Opyn 合约漏洞（2020）

Opyn 的 oUSDC 合约中，`removeAsset` 函数允许任何人移除资产支持——攻击者利用此漏洞双重提取抵押品，获利约 37 万美元。

### Cream Finance 闪电贷攻击（2021）

合约的 `accrueInterest()` 虽然有权限，但攻击者利用 cToken 合约的治理漏洞，通过闪电贷操纵治理投票，获得了调用权限。

## 基于角色的权限控制系统

现代合约普遍采用**基于角色的访问控制（RBAC）**，而非简单的 owner 模型：

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SecureProtocol is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // 只有 ADMIN 才能修改核心参数
    function setReserveFactor(uint256 _factor) external onlyRole(ADMIN_ROLE) {
        reserveFactor = _factor;
    }
    
    // KEEPER 可以调用清算函数
    function liquidate(address borrower) external onlyRole(KEEPER_ROLE) {
        // 清算逻辑
    }
}
```

**优势**：
- 支持多签管理（多个地址持有同一角色）
- 角色可以细粒度分配（不需要把全部权限给一个地址）
- 支持权限委托和撤销

## Time-Lock 队列：限制权限的滥用

即使 owner 有权限修改关键参数，也不应该立即生效。Time-Lock（时间锁）机制要求修改在队列中等待一段时间：

```solidity
contract Timelock {
    uint public constant MIN_DELAY = 2 days;
    uint public constant MAX_DELAY = 30 days;
    
    mapping(bytes32 => bool) public queuedTransactions;
    
    function queueTransaction(
        address target, 
        uint value, 
        string calldata signature,
        bytes calldata data,
        uint eta
    ) external onlyOwner returns (bytes32) {
        // 将交易加入队列，最短等待 MIN_DELAY
        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));
        queuedTransactions[txHash] = true;
        emit QueueTransaction(txHash);
        return txHash;
    }
    
    function executeTransaction(bytes32 txHash) external onlyOwner {
        require(queuedTransactions[txHash], "Not queued");
        // 执行已排队的交易
        queuedTransactions[txHash] = false;
        // ...
    }
}
```

用户和监控系统可以在等待期内发现异常操作并采取行动（撤离资金、触发紧急治理）。

## 多签钱包的最佳实践

关键操作应通过多签钱包（如 Gnosis Safe）进行：

| 操作类型 | 推荐权限配置 |
|---------|------------|
| 修改核心参数 | 3/5 多签，24h timelock |
| 紧急暂停合约 | 2/3 多签，即时生效 |
| 大额资金转出 | 4/7 多签，48h timelock |
| 添加新 KEEPER | 3/5 多签，24h timelock |

## 权限控制检查清单

- [ ] 关键函数是否都有权限修饰符？
- [ ] 是否区分了不同角色的权限边界？
- [ ] 是否有初始化保护（防止重复初始化）？
- [ ] Owner 私钥是否安全存储（硬件钱包 / 多签）？
- [ ] 是否存在绕过权限检查的隐藏路径？
- [ ] 关键参数修改是否有 time-lock？
- [ ] 是否有紧急暂停机制（Emergency Pause）？
- [ ] 是否定期审计权限配置？

## 结语

权限控制是合约安全的"底层操作系统"——即使其他逻辑完美无缺，一个权限缺陷就可能让所有安全投入归零。无论是开发者还是审计者，都需要以"最小权限原则"审视每一行合约代码：每个函数是否只被应该调用它的人调用？
