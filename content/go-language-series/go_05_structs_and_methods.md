date: 2026-05-10T10:00:00+08:00
---
title: "第5章：结构体与方法"
slug: "go_05_structs_and_methods"
description: "Go 语言结构体定义、字段标签、方法、组合与可见性详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第5章：结构体与方法

## 结构体定义

结构体是由多个字段组成的复合类型：

```go
type Person struct {
    Name    string
    Age     int
    Email   string
}

// 初始化
p := Person{
    Name:  "张三",
    Age:   30,
    Email: "zhang@example.com",
}

// 省略字段名（必须全部字段按顺序赋值）
p2 := Person{"李四", 25, "li@example.com"}

// 部分字段（省略的字段为零值）
p3 := Person{Name: "王五"}
```

## 字段标签（Struct Tag）

用反引号包裹的元数据，用于标注字段的序列化、验证等元信息：

```go
type Person struct {
    Name  string `json:"name"`            // JSON 序列化为 "name"
    Age   int    `json:"age,omitempty"`   // 为空时忽略
    Phone string `json:"-"`               // 序列化时忽略
}
```

常见标签：
- `json:"fieldName"` — JSON 序列化字段名
- `json:"-"` — 跳过该字段
- `json:",omitempty"` — 零值时忽略
- `xml:"fieldName"` — XML 序列化
- `db:"column_name"` — 数据库列名

## 方法定义

Go 没有类，但可以在结构体上定义方法。方法的接收者（receiver）可以是值或指针：

```go
// 值接收者
func (p Person) Greet() string {
    return "你好，我是" + p.Name
}

// 指针接收者（可以修改原对象）
func (p *Person) SetAge(age int) {
    p.Age = age
}

// 调用
p := Person{Name: "张三", Age: 30}
fmt.Println(p.Greet())   // 你好，我是张三
p.SetAge(31)
fmt.Println(p.Age)      // 31
```

## 值接收者 vs 指针接收者

| 场景 | 推荐 |
|------|------|
| 方法不需要修改对象 | 值接收者 `func (p Person)` |
| 需要修改对象 | 指针接收者 `func (p *Person)` |
| 对象较大（避免复制） | 指针接收者 |
| 结构体有指针字段可能为 nil | 指针接收者 |

**惯用法：** 通常给所有方法都使用指针接收者，保持一致性。

```go
type Person struct {
    Name string
    Age  int
}

// 推荐：全部用指针
func (p *Person) Speak() {
    fmt.Printf("%s 说：我 %d 岁了\n", p.Name, p.Age)
}
```

## 组合（Composition）

Go 没有继承，而是用**组合**（Embedding）实现代码复用：

```go
type Address struct {
    City    string
    ZipCode string
}

type Person struct {
    Name    string
    Address        // 匿名嵌套，组合 Address 的所有字段
}

// 使用
p := Person{
    Name: "张三",
    Address: Address{
        City:    "北京",
        ZipCode: "100000",
    },
}
// 直接访问组合的字段
fmt.Println(p.City)    // 北京
fmt.Println(p.ZipCode) // 100000
```

**注意：** 匿名嵌套字段的方法会被"提升"，可以直接调用，但方法中 `self` 指针不变。

## 可见性

Go 用**首字母大写**控制导出性：

```go
type person struct { // 小写，私有，只能本包内访问
    name string // 私有字段
}

// 大写，公开，可导出
type Person struct {
    Name string // 公开字段
}

func (p *Person) Greet() { // 大写，公开
    fmt.Println("Hello")
}
```

## 练习题

**练习 5-1：** 定义一个 `Person` 结构体，包含 `Name`（string）和 `Age`（int）字段，实现一个 `Speak()` 方法，输出 "我叫xxx，我xx岁了"。

```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

func (p *Person) Speak() {
    fmt.Printf("我叫%s，我%d岁了\n", p.Name, p.Age)
}

func main() {
    p := &Person{Name: "张三", Age: 25}
    p.Speak()
}
```

**练习 5-2：** 定义一个 `Rectangle` 结构体（宽 `Width`、高 `Height`），用组合的方式嵌套一个 `Position` 结构体（x, y 坐标），实现计算面积的方法。

---

下一章我们将学习 Go 的接口——实现多态的核心机制。