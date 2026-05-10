---
title: "第3章：函数——多返回值、闭包、延迟调用"
slug: go_03_functions
date: 2026-05-10T09:50:00+08:00
description: "Go 函数的多返回值、闭包与 defer 延迟调用机制"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第3章：函数——多返回值、闭包、延迟调用

## 函数基础

Go 的函数是一等公民（first-class citizen），可以赋值给变量、作为参数传递、作为返回值。

### 基本语法

```go
func 函数名(参数列表) 返回值类型 {
    // 函数体
    return 结果
}

// 示例
func add(a int, b int) int {
    return a + b
}

result := add(3, 5)  // result = 8
```

### 多个返回值

Go 最具特色的特性之一：**函数可以返回多个值**：

```go
// 返回两个值：商和余数
func divide(a, b int) (int, int) {
    quotient := a / b
    remainder := a % b
    return quotient, remainder
}

q, r := divide(17, 5)
fmt.Printf("商=%d, 余数=%d\n", q, r)  // 商=3, 余数=2
```

### 命名返回值

Go 允许为返回值命名，返回时直接 `return` 即可：

```go
func rectangleInfo(width, height int) (area int, perimeter int) {
    area = width * height
    perimeter = (width + height) * 2
    return  // 隐式返回命名变量
}

a, p := rectangleInfo(10, 5)
fmt.Println(a, p)  // 50 30
```

### 错误处理：多返回值的经典用法

Go 没有异常机制，错误通过返回值传递。这是 Go 的设计哲学——**错误是值**：

```go
import "errors"

func divideSafe(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("除数不能为零")
    }
    return a / b, nil
}

result, err := divideSafe(10, 0)
if err != nil {
    fmt.Println("错误：", err)  // 错误： 除数不能为零
} else {
    fmt.Println("结果：", result)
}
```

## 可变参数

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum(1, 2, 3))        // 6
fmt.Println(sum(1, 2, 3, 4, 5)) // 15
```

## 函数类型与匿名函数

函数本身有类型，可以赋值给变量：

```go
// 定义一个函数类型
type Operator func(int, int) int

// 使用匿名函数
var add Operator = func(a, b int) int {
    return a + b
}

fmt.Println(add(3, 4))  // 7

// 直接使用匿名函数
result := func(a, b int) int {
    return a * b
}(5, 6)
fmt.Println(result)  // 30
```

## 闭包（Closure）

闭包是匿名函数引用外部作用域变量的现象：

```go
func counter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

c1 := counter()
fmt.Println(c1())  // 1
fmt.Println(c1())  // 2
fmt.Println(c1())  // 3

c2 := counter()
fmt.Println(c2())  // 1（新的计数器，独立于 c1）
fmt.Println(c1())  // 4（c1 继续计数）
```

解释：每次调用 `counter()` 都创建一个新的闭包，每个闭包有独立的 `count` 变量。

## defer 延迟调用

`defer` 在函数退出前执行，常用于**资源释放、日志记录、异常处理**：

```go
func readFile(filename string) {
    fmt.Println("开始读取文件...")

    defer fmt.Println("清理：关闭文件句柄")
    defer fmt.Println("清理：释放缓冲区")

    if filename == "error" {
        fmt.Println("发生错误！")
        return
    }

    fmt.Println("文件读取成功")
}

readFile("data.txt")
// 输出：
// 开始读取文件...
// 文件读取成功
// 清理：释放缓冲区（后进先出，栈机制）
// 清理：关闭文件句柄
```

### defer 的经典用法：文件操作

```go
func copyFile(src, dst string) error {
    srcFile, err := os.Open(src)
    if err != nil {
        return err
    }
    defer srcFile.Close()  // 函数结束时自动关闭源文件

    dstFile, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer dstFile.Close()  // 关闭目标文件

    _, err = io.Copy(dstFile, srcFile)
    return err
}
```

### defer 与匿名函数

```go
func demo() {
    x := 10
    defer func(val int) {
        fmt.Println("defer x =", val)  // 输出：defer x = 10
    }(x)  // 参数在 defer 时就被复制

    x = 20
    fmt.Println("main x =", x)  // main x = 20
}
```

## 练习题

**1. 多返回值练习：**
写一个函数 `swap(a, b int) (int, int)`，交换两个整数的值。

**2. 错误处理练习：**
写一个函数 `sqrt(n float64) (float64, error)`，计算平方根。如果 `n < 0`，返回一个错误。

**3. 闭包练习：**
写一个 `makeOddGenerator()` 函数，返回一个函数。每调用一次返回函数，返回下一个奇数（从 1 开始）。

**4. defer 练习：**
写一个函数，打印 "开始"，然后 defer 打印 "结束"，最后打印 "执行中"。验证 defer 的执行时机。

---

**答案：**

1.
```go
func swap(a, b int) (int, int) {
    return b, a
}
a, b := 3, 5
a, b = swap(a, b)
fmt.Println(a, b)  // 5 3
```

2.
```go
import "math"
import "errors"

func sqrt(n float64) (float64, error) {
    if n < 0 {
        return 0, errors.New("负数没有实数平方根")
    }
    return math.Sqrt(n), nil
}

result, err := sqrt(-9)
if err != nil {
    fmt.Println("错误：", err)
} else {
    fmt.Println("平方根：", result)
}
```

3.
```go
func makeOddGenerator() func() int {
    current := 0
    return func() int {
        current += 2
        return current - 1  // 返回 1, 3, 5, ...
    }
}

nextOdd := makeOddGenerator()
fmt.Println(nextOdd())  // 1
fmt.Println(nextOdd())  // 3
fmt.Println(nextOdd())  // 5
```

4.
```go
func demo() {
    fmt.Println("开始")
    defer fmt.Println("结束")
    fmt.Println("执行中")
}
// 输出：
// 开始
// 执行中
// 结束
```