---
title: "第6章：接口——Go 的多态哲学"
slug: go_06_interfaces
date: 2026-05-10T10:05:00+08:00
description: "接口隐式实现、多态与类型断言"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第6章：接口——Go 的多态哲学

## 接口是什么？

接口（Interface）定义了**行为的契约**。在 Go 中，接口是一组方法签名的集合，实现接口不需要显式声明（隐式实现）。这是一种"duck typing"——"如果它走起来像鸭子，叫起来像鸭子，那它就是鸭子"。

### 定义接口

```go
// 定义一个动物接口
type Animal interface {
    Speak()        // 会叫
    Move() string   // 移动方式
}
```

### 实现接口

任何类型只要实现了接口的所有方法，就自动实现了该接口，无需 `implements` 关键字：

```go
type Dog struct {
    Name string
}

// Dog 实现了 Animal 接口
func (d Dog) Speak() {
    fmt.Println(d.Name + "说：汪汪汪！")
}

func (d Dog) Move() string {
    return "用四条腿跑"
}

// Cat 也实现了 Animal 接口
type Cat struct {
    Name string
}

func (c Cat) Speak() {
    fmt.Println(c.Name + "说：喵喵喵！")
}

func (c Cat) Move() string {
    return "用四条腿走"
}
```

## 接口的使用

### 多态：同一接口，不同实现

```go
func describeAnimal(a Animal) {
    fmt.Printf("名字：%s，移动方式：%s\n", a.Speak(), a.Move())
    // 注意：上面一行有问题，Speak() 无返回值，应该分开调用
}

func main() {
    dog := Dog{Name: "旺财"}
    cat := Cat{Name: "小白"}

    animals := []Animal{dog, cat}
    for _, a := range animals {
        a.Speak()          // 每个动物叫的方式不同
        fmt.Println(a.Move())
    }
}
```

### 空接口

`interface{}` 表示空接口，所有类型都实现了空接口（类似于其他语言的 `Object`）：

```go
// 可以存放任意类型的值
var anything interface{} = 42
anything = "hello"
anything = []int{1, 2, 3}

fmt.Println(anything)  // [1 2 3]
```

### 接口作为函数参数

```go
// fmt.Println 的签名就是接受 interface{} 参数
// Println 可以打印任意类型的值

fmt.Println(42)          // int
fmt.Println("hello")     // string
fmt.Println([]int{1,2})  // slice
```

### 接口组合

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// 组合接口：同时实现 Read 和 Write
type ReadWriter interface {
    Reader
    Writer
}
```

## 类型断言

接口可以存储任意具体类型的值，但需要**类型断言**来提取具体值：

### 基本语法

```go
var i interface{} = "hello"

// 语法一：ok 模式（安全）
s, ok := i.(string)
if ok {
    fmt.Println("字符串值：", s)
}

// 语法二：switch 类型分支
switch v := i.(type) {
case string:
    fmt.Println("字符串：", v)
case int:
    fmt.Println("整数：", v)
default:
    fmt.Println("未知类型")
}
```

### 断言失败示例

```go
var i interface{} = 42

s, ok := i.(string)
if !ok {
    fmt.Println("断言失败，i 不是 string 类型")
}
fmt.Println(s)  // 空字符串（断言失败时 s 为零值）
```

## 错误接口

Go 内置的 `error` 接口是错误处理的核心：

```go
type error interface {
    Error() string
}
```

自定义错误：

```go
import "errors"

type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return e.Field + ": " + e.Message
}

func validate(name string) error {
    if name == "" {
        return ValidationError{Field: "name", Message: "不能为空"}
    }
    return nil
}

err := validate("")
if err != nil {
    fmt.Println(err)  // name: 不能为空
}
```

## 接口的 nil

```go
var a Animal  // nil 接口，没有实现者
fmt.Println(a == nil)  // true

// 注意：nil 接口不能调用方法，否则会 panic
// a.Speak()  // 运行时错误：panic: invalid memory address or nil pointer dereference
```

### 接口非 nil 的情况

```go
var a Animal = (*Dog)(nil)  // 值为 nil，但类型为 *Dog，非 nil 接口
fmt.Println(a == nil)  // false
```

## 练习题

**1. 实现接口：**
定义一个 `Shape` 接口，包含 `Area() float64` 方法。实现 `Circle`（圆形）和 `Rectangle`（矩形）两个结构体，并让它们实现 `Shape` 接口。

**2. 多态练习：**
写一个函数 `printArea(shapes []Shape)`，遍历并打印每个图形的面积。

**3. 类型断言练习：**
写一个函数 `printType(i interface{})`，使用 switch 判断并打印传入值的类型和值。

**4. 错误处理练习：**
实现一个 `divide(a, b float64) (float64, error)` 函数，当 `b == 0` 时返回一个自定义错误。

---

**答案：**

1.
```go
type Shape interface {
    Area() float64
}

type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 {
    return 3.14159 * c.Radius * c.Radius
}

type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}
```

2.
```go
func printArea(shapes []Shape) {
    for _, s := range shapes {
        fmt.Printf("面积：%.2f\n", s.Area())
    }
}

func main() {
    shapes := []Shape{
        Circle{Radius: 5},
        Rectangle{Width: 4, Height: 6},
    }
    printArea(shapes)
    // 面积：78.54
    // 面积：24.00
}
```

3.
```go
func printType(i interface{}) {
    switch v := i.(type) {
    case string:
        fmt.Printf("string: %s\n", v)
    case int:
        fmt.Printf("int: %d\n", v)
    case float64:
        fmt.Printf("float64: %f\n", v)
    case bool:
        fmt.Printf("bool: %t\n", v)
    default:
        fmt.Printf("unknown type: %T\n", v)
    }
}

printType("hello")   // string: hello
printType(42)        // int: 42
printType(3.14)     // float64: 3.140000
```

4.
```go
import "errors"

type DivideError struct {
    Dividend float64
    Divisor  float64
}

func (e DivideError) Error() string {
    return fmt.Sprintf("不能除以零：%.2f / %.2f", e.Dividend, e.Divisor)
}

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, DivideError{Dividend: a, Divisor: b}
    }
    return a / b, nil
}

result, err := divide(10, 0)
if err != nil {
    fmt.Println("错误：", err)  // 不能除以零：10.00 / 0.00
} else {
    fmt.Println("结果：", result)
}
```