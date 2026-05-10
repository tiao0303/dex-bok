---
title: "第1章：Go 入门——环境搭建与 Hello World"
slug: go_01_hello_world
date: 2026-05-10T09:40:00+08:00
description: "Go 语言入门第一步：环境搭建、第一个程序、常用命令详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第1章：Go 入门——环境搭建与 Hello World

## 什么是 Go？

Go（又称 Golang）是 Google 于 2009 年推出的编程语言，主打**简洁、高效、并发**。它的设计哲学是：Less is more，少即是多。Go 的编译速度极快，标准库丰富，天然支持并发编程，非常适合构建后端服务、网络工具和云原生应用。

## 环境搭建

### macOS / Linux 安装

下载对应系统的安装包或使用包管理器：

```bash
# macOS (Homebrew)
brew install go

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install golang-go

# 验证安装
go version
# 输出类似：go version go1.22.2 darwin/arm64
```

### Windows 安装

前往 https://go.dev/dl/ 下载 Windows 安装包（.msi），一路 Next 安装完成，然后在 PowerShell 中验证：

```powershell
go version
```

### 环境变量说明

Go 安装后会自动设置 `GOPATH`（工作区路径）和 `PATH`。默认情况下：
- **Linux/macOS**：`GOPATH=$HOME/go`，二进制安装到 `$GOPATH/bin`
- **Windows**：`GOPATH=%USERPROFILE%\go`

从 Go 1.11 开始支持 **Go Modules**（项目级依赖管理），不再强制依赖 `GOPATH`，推荐使用 `go mod init` 初始化项目。

## 第一个程序：Hello World

创建文件 `hello.go`：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

运行方式：

```bash
# 方式一：直接运行（适合单文件脚本）
go run hello.go

# 方式二：编译为可执行文件
go build -o hello hello.go
./hello        # Linux/macOS
hello.exe      # Windows
```

**输出：**

```
Hello, World!
```

## 代码结构解读

```go
package main          // 1. 包声明：所有 .go 文件第一行必须是 package
import "fmt"          // 2. 导入标准库 fmt（格式化 I/O）
func main() {         // 3. main 函数：程序入口，无参数无返回值
    fmt.Println("Hello, World!")  // 4. 打印输出
}
```

- Go 没有分号结尾，编译器自动推断（一行一条语句时换行即代表语句结束）
- `package main` 表明这是一个**可执行程序**；库代码通常用 `package something`
- 每个可执行程序必须有且仅有一个 `main()` 函数

## go run / go build / go install

| 命令 | 作用 | 场景 |
|------|------|------|
| `go run 文件.go` | 编译并运行，不留可执行文件 | 开发调试单文件 |
| `go build -o name file.go` | 编译为指定名称的可执行文件 | 构建发布 |
| `go build file.go` | 编译为与文件名同名的可执行文件 | 快速构建 |
| `go install` | 编译并安装到 `$GOPATH/bin` | 安装全局工具 |

## Go Modules 初始化

```bash
# 创建项目目录
mkdir myproject && cd myproject

# 初始化 Go 模块（生成 go.mod 文件）
go mod init github.com/username/myproject

# 创建 main.go
cat > main.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Go Modules 项目初始化成功！")
}
EOF

# 运行
go run main.go
```

`go.mod` 文件示例：

```go
module github.com/username/myproject

go 1.22
```

## 常用命令速查

```bash
go fmt        # 格式化代码（自动对齐，符合 Go 规范）
go vet        # 检查代码潜在错误
go test       # 运行测试
go get        # 下载依赖包
go mod tidy   # 整理依赖，移除未使用的包
go env        # 查看 Go 环境变量
```

## 练习题

**1. 编写程序**：输出你的名字和当前年份。

**2. 修改代码**：将 `fmt.Println` 改为 `fmt.Printf`，使用格式化输出：

```go
name := "小明"
age := 18
fmt.Printf("我叫 %s，今年 %d 岁\n", name, age)
```

**3. 思考题**：Go 为什么不需要分号作为语句结束符？

---

**答案：**

1. 参考代码：
```go
package main
import "fmt"
func main() {
    fmt.Println("我是张三")
    fmt.Println("2026")
}
```

2. 提示：字符串中的 `\n` 表示换行符，`%s` 格式化字符串，`%d` 格式化整数。

3. Go 编译器会自动在每行末尾（非括号内）插入分号，因此程序员不必手动添加。这是 Go 语言的设计选择，让代码更简洁。