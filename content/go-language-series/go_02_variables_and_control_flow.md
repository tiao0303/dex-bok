date: 2026-05-10T09:45:00+08:00
---
title: "第2章：变量、数据类型与控制流"
slug: "go_02_variables_and_control_flow"
description: "Go 语言变量声明、基本数据类型、条件语句、循环语句详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第2章：变量、数据类型与控制流

## 变量声明

Go 有多种变量声明方式：

```go
// 标准声明
var name string = "Alice"

// 类型推断（常用）
var age = 25

// 短变量声明（函数内推荐）
city := "Beijing"

// 批量声明
var (
    firstName string = "Zhang"
    lastName         = "San"
)
```

> **注意：** `:=` 是短变量声明，只能在函数内部使用，不能用于全局变量。

## 基本数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `int` | 有符号整数（平台相关，64位系统为 64bit） | `42` |
| `int64` / `int32` | 指定位数的整数 | `int64(42)` |
| `float64` | 64位浮点数（Go 中默认） | `3.14` |
| `float32` | 32位浮点数 | `float32(3.14)` |
| `bool` | 布尔值 `true` / `false` | `true` |
| `string` | 字符串（不可变） | `"Hello"` |
| `rune` | Unicode 码点（相当于 `int32`） | `'中'` |
| `byte` | 字节（相当于 `uint8`） | `255` |

### 零值

Go 的变量未初始化时有默认值：

```go
var i int      // 0
var f float64  // 0
var b bool     // false
var s string   // ""
```

## 条件语句

### if / else

```go
if age >= 18 {
    fmt.Println("成年人")
} else if age >= 6 {
    fmt.Println("未成年人")
} else {
    fmt.Println("儿童")
}
```

**if 的短声明：** 可以在条件前执行一条语句，作用域仅限 if/else 块内：

```go
if n := len(str); n > 10 {
    fmt.Printf("字符串长度 %d 超过10\n", n)
}
```

### switch

Go 的 switch 非常灵活，不需要 `break`（自动 break），可以没有表达式，也可以带初始化：

```go
// 经典用法
day := 3
switch day {
case 1:
    fmt.Println("周一")
case 2:
    fmt.Println("周二")
case 3:
    fmt.Println("周三")
default:
    fmt.Println("其他")
}

// 不带表达式（相当于 if-else 链）
score := 85
var grade string
switch {
case score >= 90:
    grade = "A"
case score >= 80:
    grade = "B"
default:
    grade = "C"
}
fmt.Println("等级:", grade)
```

## 循环语句

Go 只有 `for` 一种循环语句，但可以模拟 while 和无限循环：

```go
// 标准 for
sum := 0
for i := 0; i <= 100; i++ {
    sum += i
}

// 模拟 while（条件前移）
n := 1
for n < 100 {
    n *= 2
}

// 无限循环（配合 break 或 return 退出）
// for {
//     fmt.Println("死循环")
// }
```

## 练习题

**练习 2-1：实现 FizzBuzz**

打印 1-20 的数字，但如果数字是 3 的倍数输出 "Fizz"，5 的倍数输出 "Buzz"，既是 3 又是 5 的倍数输出 "FizzBuzz"。

```go
package main

import "fmt"

func main() {
    for i := 1; i <= 20; i++ {
        if i%15 == 0 {
            fmt.Println("FizzBuzz")
        } else if i%3 == 0 {
            fmt.Println("Fizz")
        } else if i%5 == 0 {
            fmt.Println("Buzz")
        } else {
            fmt.Println(i)
        }
    }
}
```

**练习 2-2：** 输入一个年份，判断是否为闰年。

**闰年规则：** 能被 4 整除但不能被 100 整除，或者能被 400 整除。

---

下一章我们将学习函数——Go 中的一等公民。