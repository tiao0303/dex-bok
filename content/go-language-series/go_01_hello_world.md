date: 2026-05-10T09:40:00+08:00
---
title: "第1章：Go 入门——环境搭建与 Hello World"
slug: "go_01_hello_world"
description: "Go 语言入门第一步：环境搭建、第一个程序、常用命令详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第1章：Go 入门——环境搭建与 Hello World

## Go 的诞生与定位

Go（又称 Golang）是 Google 于 2009 年推出的编程语言，由 Robert Griesemer、Rob Pike 和 Ken Thompson 等人设计。Go 的设计目标是**简单、高效、可靠**，特别适合服务端开发、云计算和并发编程。

Go 语言的主要特点：
- 静态类型，编译型语言，性能接近 C
- 语法简洁，学习曲线平缓
- 天生支持并发（goroutine + channel）
- 内置垃圾回收（GC）
- 丰富的标准库

## 安装 Go

从 [go.dev/dl](https://go.dev/dl) 下载对应平台的安装包。macOS 用户推荐用 Homebrew 安装：

```bash
brew install go
```

安装完成后，验证版本：

```bash
go version
# go version go1.22.3 darwin/arm64
```

## GOPATH vs Go Modules

早期 Go 使用 `GOPATH` 管理依赖，Go 1.11 引入 **Go Modules** 后成为主流。本教程全部使用 Modules 方式。

初始化一个新项目：

```bash
mkdir myproject && cd myproject
go mod init github.com/yourname/myproject
```

这会生成 `go.mod` 文件，后续依赖会自动管理。

## 第一个程序：Hello World

创建文件 `main.go`：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
```

运行它：

```bash
go run main.go
# Hello, Go!
```

或者编译成可执行文件：

```bash
go build -o hello main.go
./hello
# Hello, Go!
```

**代码解析：**

| 元素 | 说明 |
|------|------|
| `package main` | 声明包名，可执行程序必须为 `main` |
| `import "fmt"` | 导入格式化 I/O 包 |
| `func main()` | 程序入口，无参数无返回值 |

## 常用命令一览

| 命令 | 作用 |
|------|------|
| `go run <file>` | 编译并运行（临时，不生成二进制） |
| `go build [-o name] <file>` | 编译为可执行文件 |
| `go get <package>` | 下载并安装依赖包 |
| `go test` | 运行测试 |
| `go mod tidy` | 整理 `go.mod`，移除未使用的依赖 |
| `go fmt` | 格式化代码 |
| `go vet` | 检查代码潜在问题 |

## 练习题

**练习 1-1：** 写一个程序，接收两个整数参数，输出它们的和。

```go
package main

import "fmt"

func main() {
    var a, b int
    fmt.Print("请输入两个整数（用空格分隔）：")
    fmt.Scan(&a, &b)
    fmt.Printf("%d + %d = %d\n", a, b, a+b)
}
```

**练习 1-2：** 写一个程序，计算圆的面积（输入半径，输出面积）。

**提示：** 使用 `fmt.Scan` 读取输入，`math.Pi` 获取 π 值。

---

下一章我们将学习 Go 的变量、数据类型与控制流语句。