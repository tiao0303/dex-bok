date: 2026-05-10T10:10:00+08:00
---
title: "第7章：并发——Goroutine 与 Channel"
slug: "go_07_concurrency"
description: "Go 语言轻量级并发 Goroutine、双向 Channel、Select 与 sync 包详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第7章：并发——Goroutine 与 Channel

## Goroutine

Goroutine 是 Go 轻量级线程，创建成本极低（初始栈仅 2KB），由 Go 运行时（runtime）管理：

```go
// 启动一个 goroutine
go func() {
    fmt.Println("后台任务执行中...")
}()

fmt.Println("主函数继续执行")
time.Sleep(time.Second) // 等待 goroutine 完成
```

**goroutine vs 线程：**
- 线程：操作系统调度，栈空间 1-8MB
- Goroutine：Go runtime 调度，栈空间 2KB（按需扩展）

## Channel

Channel 是 goroutine 间的通信机制，保证同步：

```go
// 创建无缓冲 channel
ch := make(chan int)

// 发送数据
ch <- 42

// 接收数据
value := <-ch
```

### 有缓冲 vs 无缓冲

```go
// 无缓冲：发送和接收必须同时准备好（同步）
ch := make(chan int)

// 有缓冲：缓冲区满才阻塞
ch := make(chan int, 3)
ch <- 1 // 不阻塞，直到缓冲区满
```

### 单向 Channel

限制 channel 的方向，提高安全性：

```go
// 仅发送
func producer(ch chan<- int) {
    ch <- 42
}

// 仅接收
func consumer(ch <-chan int) {
    val := <-ch
    fmt.Println(val)
}
```

## Select 语句

`select` 类似于 `switch`，但用于 channel 操作，可以同时等待多个 channel：

```go
ch1 := make(chan string)
ch2 := make(chan string)

go func() { ch1 <- "A" }()
go func() { ch2 <- "B" }()

select {
case msg1 := <-ch1:
    fmt.Println("收到:", msg1)
case msg2 := <-ch2:
    fmt.Println("收到:", msg2)
case <-time.After(time.Second):
    fmt.Println("超时")
}
```

## sync 包

| 类型 | 用途 |
|------|------|
| `sync.WaitGroup` | 等待一组 goroutine 完成 |
| `sync.Mutex` | 互斥锁，保护共享资源 |
| `sync.RWMutex` | 读写锁，读多写少场景 |
| `sync.Once` | 保证只执行一次 |
| `sync.Cond` | 条件变量，通知机制 |
| `sync.Map` | 并发安全的 map |

### WaitGroup

等待所有任务完成：

```go
var wg sync.WaitGroup

for i := 0; i < 3; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        fmt.Printf("任务 %d 完成\n", id)
    }(i)
}

wg.Wait() // 阻塞，直到所有 goroutine 调用 Done()
fmt.Println("所有任务完成")
```

### Mutex

保护共享变量：

```go
var (
    counter int
    mutex   sync.Mutex
)

func increment() {
    mutex.Lock()
    defer mutex.Unlock()
    counter++
}
```

## context 包

用于传递请求作用域的上下文、取消信号和超时控制：

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

// 或者带超时
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

// 在 goroutine 中检查 ctx.Done()
go func() {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("上下文取消，退出")
            return
        default:
            // 做点事
        }
    }
}()
```

## 常见并发问题

| 问题 | 说明 |
|------|------|
| **Deadlock** | 所有 goroutine 互相等待，无人能推进 |
| **Channel 泄漏** | channel 只发送不接收，或只接收不发送 |
| **Race condition** | 多个 goroutine 同时读写共享变量，无同步保护 |

使用 `go run -race main.go` 可以检测数据竞争。

## 练习题

**练习 7-1：并发爬取多个 URL**

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"
)

func fetchURL(ctx context.Context, url string) (string, error) {
    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    return fmt.Sprintf("%s: %d", url, resp.StatusCode), nil
}

func main() {
    urls := []string{
        "https://go.dev",
        "https://golang.org",
        "https://pkg.go.dev",
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    results := make(chan string, len(urls))
    for _, url := range urls {
        go func(u string) {
            result, err := fetchURL(ctx, u)
            if err != nil {
                results <- fmt.Sprintf("%s: 错误 - %v", u, err)
            } else {
                results <- result
            }
        }(url)
    }

    for i := 0; i < len(urls); i++ {
        fmt.Println(<-results)
    }
}
```

**练习 7-2：** 用 WaitGroup 和 Mutex 实现一个线程安全的计数器，并发运行 100 个 goroutine 同时加 1，最终结果应为 100。

---

下一章我们将学习 Go 的内存模型与性能优化。