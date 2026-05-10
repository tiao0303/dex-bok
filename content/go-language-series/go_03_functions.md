date: 2026-05-10T09:50:00+08:00
---
title: "第3章：函数——多返回值、闭包、延迟调用"
slug: "go_03_functions"
description: "Go 函数定义、多返回值、可变参数、闭包、defer 与 panic/recover 详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第3章：函数——多返回值、闭包、延迟调用

## 函数定义

```go
func add(a int, b int) int {
    return a + b
}

// 相邻参数类型相同可以合并
func add(a, b int) int {
    return a + b
}
```

## 多返回值

Go 函数可以返回多个值，这是 Go 的核心特性之一，惯用法是返回 `(value, error)`：

```go
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为0")
    }
    return a / b, nil
}

result, err := divide(10, 2)
if err != nil {
    fmt.Println("错误:", err)
} else {
    fmt.Println("结果:", result)
}
```

### 命名返回值

可以为返回值指定名字，在函数内直接使用 return（裸返回）：

```go
func rectInfo(width, height float64) (area, perimeter float64) {
    area = width * height
    perimeter = (width + height) * 2
    return // 裸返回，使用命名变量
}
```

> **注意：** 裸返回（bare return）只适合短函数，长函数中使用命名返回值会让代码难以理解。

## 可变参数

使用 `...type` 声明可变参数：

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum(1, 2, 3))       // 6
fmt.Println(sum(1, 2, 3, 4, 5)) // 15
```

## 闭包

Go 的函数是第一等公民（first-class citizen），可以像值一样传递和返回。函数可以捕获外部变量，形成闭包：

```go
func makeAdder(delta int) func(int) int {
    // adder 捕获了外部的 delta
    return func(n int) int {
        return n + delta
    }
}

add5 := makeAdder(5)
add10 := makeAdder(10)

fmt.Println(add5(3))   // 8
fmt.Println(add10(3))  // 13
fmt.Println(add5(10))  // 15
```

## defer：延迟调用

`defer` 延迟执行，直到函数返回前才执行，参数在 defer 语句处求值：

```go
func readFile(filename string) {
    file, err := os.Open(filename)
    if err != nil {
        fmt.Println("打开失败:", err)
        return
    }
    defer file.Close() // 延迟关闭文件

    // ... 使用 file
}
```

**defer 执行顺序：** 后进先出（栈），越晚 defer 的越先执行：

```go
func demo() {
    defer fmt.Println("1")
    defer fmt.Println("2")
    defer fmt.Println("3")
}
demo()
// 输出: 3 2 1
```

**defer 的经典场景：**
- 关闭文件（上面示例）
- 解锁互斥锁
- 关闭数据库连接
- 打印函数退出日志

## panic 与 recover

Go 没有 `try/catch`，而是用 `panic` 触发恐慌、`recover` 恢复：

```go
func safeCall(fn func()) {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("捕获 panic:", r)
        }
    }()
    fn()
}

safeCall(func() {
    panic("出错了！")
})
// 输出: 捕获 panic: 出错了！
```

> **Go 哲学：**  Errors are values，尽量用返回 error 处理错误，只有真正无法恢复的情况才用 panic。

## 练习题

**练习 3-1：实现一个 sum 闭包**

创建一个函数 `sumUp()`，返回一个新函数，每次调用返回累计和。

```go
package main

import "fmt"

func sumUp() func(int) int {
    sum := 0
    return func(n int) int {
        sum += n
        return sum
    }
}

func main() {
    adder := sumUp()
    fmt.Println(adder(1)) // 1
    fmt.Println(adder(2)) // 3
    fmt.Println(adder(3)) // 6
}
```

**练习 3-2：** 用 defer 实现一个日志打印函数，在函数开始时打印 "start"，函数结束时打印 "end"。

---

下一章我们将学习 Go 的数据结构——数组、切片和映射。