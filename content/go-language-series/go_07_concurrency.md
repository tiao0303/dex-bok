---
title: "第7章：并发——Goroutine 与 Channel"
slug: go_07_concurrency
date: 2026-05-10T09:55:00+08:00
description: "Goroutine、Channel、Select 与 sync 并发原语"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第7章：并发——Goroutine 与 Channel

## 并发 vs 并行

- **并发（Concurrency）**：同时管理多个任务，任务之间可以交替执行（一个 CPU 切换多个任务）
- **并行（Parallelism）**：真正同时执行多个任务，需要多个 CPU 核心

Go 的 goroutine 是**并发**的天然支持，可以让程序在少量线程上高效切换大量任务。

## Goroutine（协程）

goroutine 是 Go 最轻量的并发单元，创建一个 goroutine 的开销极小（比线程小几个数量级）：

### 启动 goroutine

```go
func sayHello(name string) {
    fmt.Println("你好，", name)
}

func main() {
    // 普通函数调用
    sayHello("同步")

    // 启动 goroutine（非阻塞）
    go sayHello("异步 goroutine 1")
    go sayHello("异步 goroutine 2")

    // 等待 goroutine 执行完成
    time.Sleep(time.Second)
    fmt.Println("主函数结束")
}
```

**注意**：如果主函数在 goroutine 执行前退出，这些 goroutine 会被直接终止。

### goroutine 与匿名函数

```go
go func() {
    fmt.Println("这是匿名函数的 goroutine")
}()

// 带参数
msg := "Hello"
go func(s string) {
    fmt.Println(s)
}(msg)
```

## Channel（通道）

channel 是 goroutine 之间通信的管道，用于传递数据和控制同步：

### 创建 channel

```go
// 创建无缓冲 channel（容量 0）
ch1 := make(chan int)

// 创建有缓冲 channel
ch2 := make(chan int, 3)  // 容量为 3

// 关闭 channel
close(ch1)
```

### 发送与接收

```go
ch := make(chan string)

// 发送数据（阻塞，直到有人接收）
ch <- "Hello"

// 接收数据（阻塞，直到有数据）
msg := <-ch

// 接收并判断 channel 是否关闭
val, ok := <-ch  // ok 为 false 表示 channel 已关闭
```

### 有缓冲 vs 无缓冲 channel

```go
// 无缓冲：发送和接收必须同时配对，否则死锁
ch1 := make(chan int)
go func() {
    ch1 <- 42  // 这里会阻塞，等待主 goroutine 接收
}()
result := <-ch1

// 有缓冲：在缓冲区满之前不会阻塞
ch2 := make(chan int, 2)
ch2 <- 1   // 不阻塞
ch2 <- 2   // 不阻塞
// ch2 <- 3 // 阻塞，缓冲区已满
```

### 单向 channel

```go
// 只发送 channel
func producer(ch chan<- int) {
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch)
}

// 只接收 channel
func consumer(ch <-chan int) {
    for v := range ch {
        fmt.Println("收到：", v)
    }
}

ch := make(chan int)
go producer(ch)
consumer(ch)
```

## Select 多路复用

`select` 监听多个 channel 的状态，哪个先就绪就先处理哪个：

```go
ch1 := make(chan string)
ch2 := make(chan string)

go func() { ch1 <- "A" }()
go func() { ch2 <- "B" }()

for i := 0; i < 2; i++ {
    select {
    case msg1 := <-ch1:
        fmt.Println("收到 ch1：", msg1)
    case msg2 := <-ch2:
        fmt.Println("收到 ch2：", msg2)
    }
}
```

### 超时处理

```go
select {
case msg := <-ch:
    fmt.Println("收到：", msg)
case <-time.After(time.Second):
    fmt.Println("超时！")
}
```

## sync 并发原语

Go 标准库 `sync` 包提供了常用的并发工具：

### WaitGroup：等待一组任务完成

```go
import "sync"

var wg sync.WaitGroup

func worker(id int) {
    defer wg.Done()  // 任务完成后调用
    fmt.Printf("Worker %d 开始工作\n", id)
    time.Sleep(time.Millisecond * 100)
    fmt.Printf("Worker %d 完成\n", id)
}

func main() {
    for i := 1; i <= 3; i++ {
        wg.Add(1)   // 每启动一个任务，计数 +1
        go worker(i)
    }
    wg.Wait()       // 等待计数归零
    fmt.Println("所有任务完成")
}
```

### Mutex：互斥锁

```go
import "sync"

var (
    counter int
    mu      sync.Mutex
)

func increment() {
    mu.Lock()          // 加锁
    counter++
    mu.Unlock()        // 解锁
}

func main() {
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            increment()
        }()
    }
    wg.Wait()
    fmt.Println(counter)  // 1000
}
```

### RWMutex：读写锁

读多写少场景下，读锁不阻塞读操作：

```go
var (
    data     map[string]string
    rwMu     sync.RWMutex
)

func read(key string) string {
    rwMu.RLock()         // 读锁
    defer rwMu.RUnlock()
    return data[key]
}

func write(key, value string) {
    rwMu.Lock()          // 写锁
    defer rwMu.Unlock()
    data[key] = value
}
```

### Once：只执行一次

```go
var (
    once sync.Once
    instance *Config
)

func getInstance() *Config {
    once.Do(func() {
        instance = &Config{}
        fmt.Println("初始化一次")
    })
    return instance
}

func main() {
    getInstance()  // 只会打印一次"初始化一次"
    getInstance()
    getInstance()
}
```

## 练习题

**1. Goroutine 练习：**
启动 5 个 goroutine，每个打印 "Worker N 开始工作"，主函数等待所有 goroutine 完成后打印 "全部完成"。

**2. Channel 练习：**
创建一个 goroutine 生成 0-9 的数字，通过 channel 发送到主函数，主函数打印接收到的数字。

**3. Select 练习：**
创建两个 channel，一个每秒发送一个数字，另一个每 500ms 发送一个字母。使用 select 交替接收并打印。

**4. WaitGroup 练习：**
使用 WaitGroup 并发计算 1-5 的阶乘（1!=1, 2!=2, 3!=6, 4!=24, 5!=120），将结果存入切片，最后打印所有结果。

---

**答案：**

1.
```go
import "sync"

func main() {
    var wg sync.WaitGroup
    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            fmt.Printf("Worker %d 开始工作\n", n)
        }(i)
    }
    wg.Wait()
    fmt.Println("全部完成")
}
```

2.
```go
ch := make(chan int)

go func() {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)
}()

for v := range ch {
    fmt.Println("收到：", v)
}
```

3.
```go
ch1 := make(chan int)
ch2 := make(chan string)

go func() {
    for i := 1; i <= 3; i++ {
        time.Sleep(time.Second)
        ch1 <- i
    }
}()

go func() {
    letters := []string{"A", "B", "C"}
    for _, l := range letters {
        time.Sleep(500 * time.Millisecond)
        ch2 <- l
    }
}()

for i := 0; i < 6; i++ {
    select {
    case v := <-ch1:
        fmt.Println("数字：", v)
    case v := <-ch2:
        fmt.Println("字母：", v)
    }
}
```

4.
```go
func factorial(n int) int {
    result := 1
    for i := 2; i <= n; i++ {
        result *= i
    }
    return result
}

func main() {
    var wg sync.WaitGroup
    results := make([]int, 5)

    for i := 1; i <= 5; i++ {
        wg.Add(1)
        idx := i  // 避免闭包捕获问题
        go func() {
            defer wg.Done()
            results[idx-1] = factorial(idx)
        }()
    }

    wg.Wait()
    fmt.Println("阶乘结果：", results)  // [1, 2, 6, 24, 120]
}
```