---
title: "第8章：内存模型与性能优化"
slug: go_08_memory_and_performance
date: 2026-05-10T09:50:00+08:00
description: "逃逸分析、垃圾回收、pprof 性能调优"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第8章：内存模型与性能优化

## Go 的内存分配

Go 的内存分配基于 TCMalloc（Thread-Caching Malloc）算法，分为三个层次：

1. **微对象**（0~32B）：微分配器管理
2. **小对象**（32B~32KB）：使用 mcache 中的小对象缓存
3. **大对象**（>32KB）：直接从堆分配

### new vs make

```go
// new：分配任意类型的零值内存，返回指针
p := new(int)        // *int，值为 0
s := new([]int)      // *[]int，值为 nil

// make：专门用于切片、Map、Channel 的初始化
s := make([]int, 5)  // slice，长度5，容量5
m := make(map[string]int)  // 空 map
ch := make(chan int, 10)   // 有缓冲 channel
```

## 逃逸分析（Escape Analysis）

Go 编译器会分析变量的作用域，决定变量应该分配在**栈（Stack）**还是**堆（Heap）**上。

- **栈分配**：函数返回即释放，无需垃圾回收，速度快
- **堆分配**：生命周期超出函数作用域，需要 GC 回收

### 逃逸示例

```go
// 这个变量不会逃逸（栈上分配）
func notEscape() {
    x := 10
    fmt.Println(x)  // x 不会逃逸
}

// 这个变量会逃逸（堆上分配）
func escapeToHeap() *int {
    x := 10
    return &x  // &x 被返回，x 逃逸到堆
}
```

### 逃逸分析工具

```bash
# 编译时加上 -gcflags="-m" 可以看到逃逸分析结果
go build -gcflags="-m" main.go
```

示例输出：

```
./main.go:10:6: cannot inline foo: unexported function
./main.go:13:2: x escapes to heap  <-- x 逃逸到堆
./main.go:13:2:   from return (./main.go:13:2)
./main.go:13:2:   from assignment (./main.go:13:2)
```

### 避免逃逸的原则

- 尽量使用**值传递**而非指针传递（小对象复制开销小于指针）
- 返回局部变量的指针要谨慎（必然逃逸）
- 短生命周期对象尽量在栈上分配

## 垃圾回收（GC）

Go 使用**并发三色标记清扫回收器**，GC 期间应用仍可运行（Stop The World 时间极短）。

### GC 调优参数

```bash
# 设置 GC 目标时间（默认 2ms）
GOGC=off     # 禁用 GC（调试用，不推荐）
GOGC=100     # 默认，下次 GC 前堆增长 100%
GOGC=50      # 更激进，更频繁 GC，堆更小
GOGC=200     # 更宽松，GC 更少，堆更大
```

### runtime 包

```go
import "runtime"

runtime.GC()          // 手动触发 GC
runtime.MemStats{}    // 内存统计
runtime.NumCPU()      // CPU 核心数
runtime.NumGoroutine() // 当前 goroutine 数量
```

## pprof 性能分析

Go 内置了 pprof 性能分析工具，可以分析 CPU、内存、goroutine、阻塞等：

### CPU 分析

```go
import _ "net/http/pprof"
import "net/http"

func main() {
    // 启用 pprof
    go http.ListenAndServe(":6060", nil)

    // ... 业务代码 ...
}
```

启动后访问：
```bash
# 查看 CPU 占用（30秒采样）
go tool pprof http://localhost:6060/debug/pprof/profile

# 查看内存分配
go tool pprof http://localhost:6060/debug/pprof/heap
```

### 手动采样

```go
import (
    "runtime/pprof"
    "os"
)

func main() {
    // 创建 CPU profile 文件
    f, _ := os.Create("cpu.prof")
    pprof.StartCPUProfile(f)
    defer pprof.StopCPUProfile()

    // ... 需要分析的业务代码 ...

    f.Close()
}
```

### 内存分析

```go
import "runtime/pprof"

func main() {
    f, _ := os.Create("mem.prof")
    pprof.WriteHeapProfile(f)
    f.Close()
}
```

### benchmem 基准测试看内存

```go
// benchmark_test.go
package main

import "testing"

func BenchmarkAllocate(b *testing.B) {
    for i := 0; i < b.N; i++ {
        _ = make([]int, 1024)  // 每次分配 1024 个 int
    }
}
```

```bash
go test -bench=. -benchmem benchmark_test.go
# 输出：
# BenchmarkAllocate-8      1000000        1022 ns/op       8192 B/op          1 allocs/op
```

## 性能优化技巧

### 1. 对象池（sync.Pool）

重复使用的对象用 `sync.Pool` 复用，减少 GC 压力：

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return &bytes.Buffer{}
    },
}

func getBuffer() *bytes.Buffer {
    return bufferPool.Get().(*bytes.Buffer)
}

func putBuffer(b *bytes.Buffer) {
    b.Reset()
    bufferPool.Put(b)
}

// 使用
buf := getBuffer()
buf.WriteString("hello")
putBuffer(buf)
```

### 2. 减少分配

```go
// 不推荐：频繁分配
func concat() string {
    var s string
    for i := 0; i < 10; i++ {
        s += fmt.Sprintf("%d-", i)
    }
    return s
}

// 推荐：使用 strings.Builder
func concatGood() string {
    var b strings.Builder
    for i := 0; i < 10; i++ {
        b.WriteString(fmt.Sprintf("%d-", i))
    }
    return b.String()
}
```

### 3. 使用切片预分配

```go
// 不推荐：多次 append 扩容
s := []int{}
for i := 0; i < 1000; i++ {
    s = append(s, i)
}

// 推荐：预分配容量
s := make([]int, 0, 1000)  // 预分配容量 1000
for i := 0; i < 1000; i++ {
    s = append(s, i)
}
```

### 4. 避免反射

反射开销较大，尽可能使用具体类型或接口：

```go
// 反射慢
v := reflect.ValueOf(x)
v.Interface()

// 直接调用快
fmt.Sprintf("%v", x)
```

## 练习题

**1. 逃逸分析练习：**
用 `-gcflags="-m"` 编译以下代码，找出哪些变量会逃逸：

```go
func main() {
    a := 10
    b := &a
    fmt.Println(*b)
    c := make([]int, 5)
    fmt.Println(c)
}
```

**2. GC 调优练习：**
设置 `GOGC=50` 运行一个内存密集型程序，观察内存使用变化。

**3. pprof 练习：**
编写一个有性能瓶颈的 Web 服务，用 pprof 分析 CPU 占用最高的函数。

**4. 对象池练习：**
使用 `sync.Pool` 实现一个整数类型的对象池，复用频繁分配的数字。

---

**答案：**

1. 逃逸分析结果：
- `a`：不逃逸，栈上分配
- `b`：指向 `a`，但 `b` 本身不逃逸
- `*b`：仍然是 `a`，不逃逸
- `c`（切片）：make 创建的切片会逃逸（因为 `fmt.Println` 可能保留引用）
- `c` 本身：会逃逸到堆

2. 运行方式：
```bash
GOGC=50 go run main.go
# 或者
export GOGC=50
go run main.go
```

3. 示例（有性能瓶颈的代码）：
```go
package main

import (
    "net/http"
    _ "net/http/pprof"
)

func slowFunction() int {
    sum := 0
    for i := 0; i < 10000000; i++ {
        sum += i
    }
    return sum
}

func handler(w http.ResponseWriter, r *http.Request) {
    result := slowFunction()
    w.Write([]byte(fmt.Sprintf("结果：%d", result)))
}

func main() {
    http.HandleFunc("/", handler)
    http.ListenAndServe(":6060", nil)
}
```
用 `curl localhost:6060/debug/pprof/profile` 采样，然后用 `go tool pprof` 分析。

4.
```go
var intPool = sync.Pool{
    New: func() interface{} {
        return new(int)
    },
}

func getInt() *int {
    return intPool.Get().(*int)
}

func putInt(p *int) {
    *p = 0
    intPool.Put(p)
}

func main() {
    p := getInt()
    *p = 42
    fmt.Println(*p)   // 42
    putInt(p)
}
```