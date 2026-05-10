---
title: "第2章：变量、数据类型与控制流"
slug: go_02_variables_and_control_flow
date: 2026-05-10T09:45:00+08:00
description: "变量声明、数据类型、条件与循环语句详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第2章：变量、数据类型与控制流

## 变量声明

Go 有多种变量声明方式：

```go
// 方式一：var 声明 + 初始化
var name string = "张三"

// 方式二：类型推断（编译器自动判断类型）
var age = 25        // 等价于 var age int = 25

// 方式三：短变量声明（函数内部使用）
score := 98.5       // 等价于 var score float64 = 98.5

// 方式四：并行声明
var a, b, c int = 1, 2, 3
```

**注意**：`:=` 是短变量声明，只能在函数内部使用，不能用于函数外部。

### 变量零值

声明但未赋值的变量有默认零值（零并不意味着空，而是该类型的"空状态"）：

| 类型 | 零值 |
|------|------|
| 数值类型（int, float） | `0` |
| 布尔类型 bool | `false` |
| 字符串 string | `""`（空字符串） |
| 指针、接口、切片等 | `nil` |

## 基本数据类型

### 整数

| 类型 | 说明 |
|------|------|
| `int` | 有符号整数，平台相关（64位系统为64位） |
| `int8/int16/int32/int64` | 有符号定点整数 |
| `uint` | 无符号整数 |
| `uint8/uint16/uint32/uint64` | 无符号定点整数 |
| `byte` | `uint8` 的别名 |
| `rune` | `int32` 的别名，表示 Unicode 码点 |
| `uintptr` | 足以存储指针值的无符号整数 |

### 浮点数与复数

```go
var f1 float32 = 3.14
var f2 float64 = 2.718281828   // float64 为默认类型
var c1 complex128 = complex(1, 2)  // 1 + 2i
```

### 布尔与字符串

```go
var isActive bool = true
var greeting string = "你好，Go！"
```

### 类型转换

Go **不会自动转换类型**，必须显式转换：

```go
var i int = 42
var f float64 = float64(i)   // 必须显式转换
var u uint = uint(f)
```

## 字符串常用操作

```go
import "strings"

s := "hello world"
len(s)                    // 字符长度：11
s[0]                      // 字符 'h'（byte 类型）
s[0:5]                    // 切片："hello"
strings.ToUpper(s)        // "HELLO WORLD"
strings.Contains(s, "lo") // true
strings.Split(s, " ")     // ["hello", "world"]
```

## 控制流：if 条件语句

```go
score := 85

if score >= 90 {
    fmt.Println("优秀")
} else if score >= 60 {
    fmt.Println("及格")
} else {
    fmt.Println("不及格")
}

// if 初始化语句（常见用法）
if n := 10; n > 5 {
    fmt.Println("n 大于 5")
}
// 注释：这里的 n 仅在 if 块内有效
```

## 控制流：for 循环

Go 没有 `while` 关键字，所有循环都用 `for`：

```go
// 标准 for 循环
for i := 0; i < 5; i++ {
    fmt.Print(i, " ")
}
// 输出：0 1 2 3 4

// 省略初始值和递增（等价于 while）
j := 0
for j < 5 {
    fmt.Print(j, " ")
    j++
}

// 无限循环
for {
    fmt.Println("死循环")
    break  // 必须配合 break 退出
}

// for range 遍历（后面章节详述）
names := []string{"Alice", "Bob", "Carol"}
for i, name := range names {
    fmt.Printf("%d: %s\n", i, name)
}
```

## 控制流：switch

Go 的 `switch` 不需要 `break`（默认自动 break），并且 case 可以是任意表达式：

```go
day := 3

switch day {
case 1:
    fmt.Println("星期一")
case 2:
    fmt.Println("星期二")
case 3, 4, 5:          // 多个值匹配同一个分支
    fmt.Println("工作日")
default:
    fmt.Println("周末")
}

// 省略条件的 switch（等价于 if-else）
score := 85
switch {
case score >= 90:
    fmt.Println("A")
case score >= 80:
    fmt.Println("B")
default:
    fmt.Println("C")
}
```

## goto 跳转

Go 支持 `goto`，可以跳转到同一函数内的标签处：

```go
func gotoDemo() {
    i := 0
loop:
    fmt.Println(i)
    i++
    if i < 5 {
        goto loop   // 跳转到 loop 标签处
    }
}
```

## 练习题

**1. 变量声明练习：**
声明一个整型变量 `year`，赋值为 2026，计算 `year - 100` 并输出结果。

**2. 类型转换练习：**
将一个 `float64` 类型的 `3.14159` 转换为 `int`，观察结果。

**3. 条件练习：**
写一个程序，输入一个分数（0-100），输出对应等级：
- 90及以上：A
- 80-89：B
- 60-79：C
- 60以下：D

**4. 循环练习：**
用 `for` 循环计算 1+2+3+...+100 的和。

---

**答案：**

1.
```go
year := 2026
result := year - 100
fmt.Println(result)  // 输出：1926
```

2.
```go
var pi float64 = 3.14159
fmt.Println(int(pi))  // 输出：3，小数部分被截断
```

3.
```go
package main

import "bufio"
import "fmt"
import "os"

func main() {
    reader := bufio.NewReader(os.Stdin)
    fmt.Print("请输入分数：")
    var score int
    fmt.Fscan(reader, &score)

    var grade string
    switch {
    case score >= 90:
        grade = "A"
    case score >= 80:
        grade = "B"
    case score >= 60:
        grade = "C"
    default:
        grade = "D"
    }
    fmt.Printf("等级：%s\n", grade)
}
```

4.
```go
sum := 0
for i := 1; i <= 100; i++ {
    sum += i
}
fmt.Println(sum)  // 输出：5050
```