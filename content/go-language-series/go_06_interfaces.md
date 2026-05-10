---
title: "第6章：接口——Go 的多态哲学"
slug: "go_06_interfaces"
date: 2026-05-10T09:40:00+08:00
description: "Go 语言接口定义、隐式实现、空接口、类型断言与常用标准接口详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第6章：接口——Go 的多态哲学

## 接口定义

接口定义了一组方法的集合，实现者不需要显式声明（隐式实现）：

```go
// 定义接口
type Writer interface {
    Write([]byte) (int, error)
}

// 隐式实现：任何实现了 Write 方法的类型都满足 Writer 接口
type File struct {
    name string
}

func (f *File) Write(data []byte) (int, error) {
    // 实现细节...
    return len(data), nil
}
```

> **注意：** Go 没有 `implements` 关键字，只要方法签名匹配，类型自动实现接口。

## 空接口

空接口 `interface{}` 等价于"所有类型"，可用于接收任意类型的值（相当于其他语言的 `any`）：

```go
var anything interface{}
anything = 42
anything = "hello"
anything = []int{1, 2, 3}

// 函数参数接受任意类型
func printAll(items ...interface{}) {
    for _, item := range items {
        fmt.Println(item)
    }
}
```

Go 1.18 引入 `any` 作为 `interface{}` 的别名，推荐使用 `any`：

```go
func printAll(items ...any) {
    for _, item := range items {
        fmt.Println(item)
    }
}
```

## 接口组合

接口可以组合其他接口：

```go
type ReadWriter interface {
    Reader
    Writer
}

type Reader interface {
    Read([]byte) (int, error)
}

type Writer interface {
    Write([]byte) (int, error)
}
```

## 类型断言

从接口值中提取具体类型：

```go
var i any = "hello"

// 方式1：ok idiom（安全）
s, ok := i.(string)
if ok {
    fmt.Println("是字符串:", s)
}

// 方式2：不安全，类型不对会 panic
s2 := i.(string)

// 方式3：类型 switch
switch v := i.(type) {
case string:
    fmt.Println("字符串:", v)
case int:
    fmt.Println("整数:", v)
default:
    fmt.Println("未知类型")
}
```

## 常用标准接口

Go 标准库中有很多预定义接口，以下是最常见的几个：

### error 接口

```go
type error interface {
    Error() string
}

// 自定义错误
type MyError struct {
    msg string
}

func (e *MyError) Error() string {
    return e.msg
}
```

### Stringer 接口

```go
type Stringer interface {
    String() string
}

// 实现后 fmt.Print 会调用 String()
type Person struct {
    Name string
    Age  int
}

func (p Person) String() string {
    return fmt.Sprintf("%s(%d岁)", p.Name, p.Age)
}
fmt.Println(Person{Name: "张三", Age: 25})
// 输出: 张三(25岁)
```

### Reader / Writer 接口

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}
```

## 练习题

**练习 6-1：** 实现一个 `Writer` 接口，把字符串写入文件。

```go
package main

import (
    "fmt"
    "os"
)

type FileWriter struct {
    filename string
}

func (fw *FileWriter) Write(data []byte) (int, error) {
    return os.WriteFile(fw.filename, data, 0644)
}

func writeContent(w fmt.Stringer) {
    content := w.String()
    fmt.Printf("写入内容: %s\n", content)
}

func main() {
    fw := &FileWriter{filename: "output.txt"}
    n, err := fw.Write([]byte("Hello, Go!"))
    if err != nil {
        fmt.Println("写入失败:", err)
        return
    }
    fmt.Printf("成功写入 %d 字节\n", n)
}
```

**练习 6-2：** 定义一个 `Speaker` 接口，包含 `Speak()` 方法，创建 `Dog` 和 `Cat` 结构体实现该接口，用 `type switch` 判断具体类型。

---

下一章我们将学习 Go 的并发特性——Goroutine 与 Channel。