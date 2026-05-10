---
title: "第8章：内存模型与性能优化"
slug: "go_08_memory_and_performance"
date: 2026-05-10T09:40:00+08:00
description: "Go 语言逃逸分析、垃圾回收机制、性能优化与 pprof 使用详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第8章：内存模型与性能优化

## 逃逸分析

Go 编译器通过逃逸分析决定变量分配在栈还是堆上。栈分配快速（分配/释放O(1)），堆分配需要 GC 介入。

查看逃逸分析结果：

```bash
go build -gcflags="-m" main.go
```

**常见逃逸场景：**

```go
// 返回指针 → 逃逸到堆
func foo() *int {
    tmp := 10
    return &tmp // tmp 逃逸
}

// 全局变量引用 → 逃逸
var global *int

func bar() {
    x := 10
    global = &x // x 逃逸
}

// interface 类型 → 逃逸
var i any = 10  // 装箱，分配在堆
```

**栈 vs 堆：**

| 特性 | 栈 | 堆 |
|------|------|------|
| 分配速度 | O(1)，只需移动栈指针 | O(log n)，需要分配算法 |
| 释放速度 | O(1)，只需恢复栈指针 | 依赖 GC |
| 生命周期 | 函数退出即释放 | 依赖 GC 回收 |

## 垃圾回收（GC）

Go 使用**三色标记**并发 GC：

1. **白色：** 未处理的对象
2. **灰色：** 已发现但未处理完的对象
3. **黑色：** 已处理完的对象

GC 流程：
- 初始所有白色
- 从根节点（全局变量、栈）出发，标记灰色
- 处理灰色对象，标记其引用为灰色，本身为黑色
- 无灰色对象时，清除白色对象

**GC 触发时机：**
- 堆大小达到阈值（默认 100% 增长）
- `runtime.GC()` 手动触发
- `debug.SetGCPercent()`

## 性能优化建议

### 1. 减少内存分配

```go
// 反例：频繁分配
func process(data []int) {
    for _, v := range data {
        result := append([]int{}, v*2...) // 每次分配
        fmt.Println(result)
    }
}

// 正例：预分配
func process(data []int) {
    result := make([]int, len(data))
    for i, v := range data {
        result[i] = v * 2
    }
}
```

### 2. 预分配切片容量

```go
// 反例
s := []int{}
for i := 0; i < 1000; i++ {
    s = append(s, i) // 多次扩容
}

// 正例
s := make([]int, 0, 1000)
for i := 0; i < 1000; i++ {
    s = append(s, i) // 一次扩容
}
```

### 3. 对象池（sync.Pool）

复用对象，减少 GC 压力：

```go
var bufferPool = sync.Pool{
    New: func() any {
        return &bytes.Buffer{}
    },
}

func getBuffer() *bytes.Buffer {
    buf := bufferPool.Get().(*bytes.Buffer)
    buf.Reset()
    return buf
}

func putBuffer(buf *bytes.Buffer) {
    bufferPool.Put(buf)
}
```

### 4. 减少指针使用

结构体字段使用值而非指针，减少 GC 扫描范围：

```go
// 反例
type Node struct {
    Value *int
    Next  *Node
}

// 正例（如果 Value 不需要为 nil）
type Node struct {
    Value int
    Next  *Node
}
```

## 基准测试

```go
package main

import "testing"

func Sum(n int) int {
    total := 0
    for i := 0; i <= n; i++ {
        total += i
    }
    return total
}

// 基准测试
func BenchmarkSum(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Sum(100000)
    }
}
```

运行基准测试：

```bash
go test -bench=. -benchmem main_test.go
```

输出示例：
```
goos: darwin
goarch: arm64
BenchmarkSum-8      1000000000           0.305 ns/op       0 B/op          0 allocs/op
```

| 指标 | 说明 |
|------|------|
| `ns/op` | 每次操作耗时 |
| `B/op` | 每次操作分配字节数 |
| `allocs/op` | 每次操作分配次数 |

## pprof 使用

pprof 是 Go 的性能分析工具，可以分析 CPU 和内存热点。

**CPU 分析：**

```go
import _ "net/http/pprof"

func main() {
    go http.ListenAndServe(":6060", nil)
    // 访问 http://localhost:6060/debug/pprof/
}
```

然后用 `go tool pprof` 分析：

```bash
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile
```

**内存分析：**

```bash
go tool pprof http://localhost:6060/debug/pprof/heap
```

## 内存泄漏常见场景

1. **全局 map 持续增长**：不断写入不清理
2. **Channel 未关闭**：goroutine 永久阻塞
3. **Timer 未清理**：`time.NewTicker` 后不调用 `Stop()`
4. **闭包捕获大对象**：闭包持有大对象引用

## 练习题

**练习 8-1：使用 pprof 分析 CPU 热点**

写一个程序，计算 1-100000 的所有质数，对比不同算法的性能差异。

```go
package main

import (
    "fmt"
    "testing"
)

func isPrime(n int) bool {
    if n < 2 {
        return false
    }
    for i := 2; i*i <= n; i++ {
        if n%i == 0 {
            return false
        }
    }
    return true
}

func primes1(n int) []int {
    var result []int
    for i := 2; i <= n; i++ {
        if isPrime(i) {
            result = append(result, i)
        }
    }
    return result
}

func BenchmarkPrimes1(b *testing.B) {
    for i := 0; i < b.N; i++ {
        primes1(100000)
    }
}
```

运行 `go test -bench=BenchmarkPrimes1 -benchmem` 查看性能。

---

下一章我们将学习 Go 标准库的重要模块。