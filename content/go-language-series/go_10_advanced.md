date: 2026-05-10T10:25:00+08:00
---
title: "第10章：工程化、测试与高级主题"
slug: "go_10_advanced"
description: "Go 语言单元测试、模糊测试、Go Modules、反射、泛型、CGO、交叉编译详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第10章：工程化、测试与高级主题

## 测试

Go 内置 `testing` 包，测试文件名以 `_test.go` 结尾：

```go
package main

import "testing"

// 函数名必须以 Test 开头
func TestAdd(t *testing.T) {
    result := add(2, 3)
    expected := 5
    if result != expected {
        t.Errorf("add(2,3) = %d, 期望 %d", result, expected)
    }
}

// 测试有错误的函数
func TestAddError(t *testing.T) {
    _, err := divide(10, 0)
    if err == nil {
        t.Error("divide(10,0) 应该返回错误")
    }
}
```

运行测试：

```bash
go test ./...           # 测试所有包
go test -v              # 详细输出
go test -run TestAdd    # 只运行指定测试
go test -cover          # 显示覆盖率
```

### Table-Driven Tests（表格驱动测试）

Go 推荐的方式，减少重复代码：

```go
func TestAddTableDriven(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"正数相加", 2, 3, 5},
        {"负数相加", -1, -1, -2},
        {"零", 0, 5, 5},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("add(%d,%d) = %d, 期望 %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### 第三方测试库（testify）

```bash
go get github.com/stretchr/testify
```

```go
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestWithTestify(t *testing.T) {
    // assert：测试失败继续执行
    assert.Equal(t, 5, add(2, 3))

    // require：测试失败立即终止
    require.NoError(t, someFunc())
}
```

## 模糊测试（Fuzz Testing）

Go 1.18+ 支持模糊测试，自动生成随机输入：

```go
func FuzzAdd(f *testing.F) {
    // 添加种子语料库
    f.Add(2, 3)

    f.Fuzz(func(t *testing.T, a, b int) {
        result := add(a, b)
        // 如果 add 不支持负数，这里可能失败
        if result != a+b {
            t.Errorf("add(%d,%d) = %d", a, b, result)
        }
    })
}
```

运行：
```bash
go test -fuzz=FuzzAdd -fuzztime=10s
```

## 示例测试

函数名以 `Example` 开头，`// Output:` 注释标注期望输出：

```go
func ExampleAdd() {
    fmt.Println(add(2, 3))
    // Output:
    // 5
}
```

## Go Modules 进阶

### go.mod 详解

```go
module github.com/yourname/myproject

go 1.22

require (
    github.com/foo/bar v1.2.3
    github.com/baz/qux v2.0.0
)

replace (
    github.com/old/package => github.com/new/package v1.0.0
)

// retract 撤回版本
retract v1.0.0
```

### 常用命令

```bash
go mod tidy          # 整理依赖
go mod download      # 下载依赖到本地缓存
go list -m all       # 列出所有依赖及版本
go get foo@latest    # 升级到最新版
go get foo@v1.2.3    # 切换到指定版本
go mod why foo       # 解释为什么需要某个依赖
```

## 反射（reflect）

Go 通过 `reflect` 包实现运行时检查和修改类型：

```go
import "reflect"

func inspect(v any) {
    // reflect.TypeOf 获取类型信息
    t := reflect.TypeOf(v)
    fmt.Printf("类型: %s\n", t.Name())

    // reflect.ValueOf 获取值信息
    val := reflect.ValueOf(v)
    fmt.Printf("值: %v\n", val)

    // 遍历结构体字段
    if t.Kind() == reflect.Struct {
        for i := 0; i < t.NumField(); i++ {
            field := t.Field(i)
            fmt.Printf("字段: %s, 类型: %s\n", field.Name, field.Type)
        }
    }
}

type Person struct {
    Name string
    Age  int
}

func main() {
    inspect(Person{Name: "张三", Age: 25})
    inspect("hello")
}
```

**常见应用场景：**
- 动态解析配置（YAML/JSON → 结构体）
- 通用序列化/反序列化
- 依赖注入框架

## 泛型（Generics）

Go 1.18 引入泛型，支持类型参数：

```go
// 类型约束
type Number interface {
    int | int32 | int64 | float64 | float32
}

// 泛型函数
func sum[T Number](nums ...T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

func main() {
    fmt.Println(sum(1, 2, 3))       // int
    fmt.Println(sum(1.1, 2.2, 3.3)) // float64
}
```

### 泛型实现 Stack[T]

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top, true
}

func main() {
    intStack := &Stack[int]{}
    intStack.Push(1)
    intStack.Push(2)
    fmt.Println(intStack.Pop()) // 2 true

    strStack := &Stack[string]{}
    strStack.Push("hello")
    strStack.Push("world")
    fmt.Println(strStack.Pop()) // world true
}
```

## CGO

Go 可以调用 C 代码：

```go
// #include <stdio.h>
// void sayHello() {
//     printf("Hello from C!\n");
// }
import "C"

func main() {
    C.sayHello()
}
```

运行 CGO 需要 C 编译器（如 gcc）。

## 编译标志与交叉编译

### ldflags 修改版本信息

```bash
go build -ldflags="-X main.Version=1.0.0 -X main.BuildTime=$(date -u)" main.go
```

在代码中接收：
```go
var (
    Version   = "dev"
    BuildTime = "unknown"
)
```

### 交叉编译

```bash
# macOS → Linux
GOOS=linux GOARCH=amd64 go build main.go

# macOS → Windows
GOOS=windows GOARCH=amd64 go build -o app.exe main.go

# 常见组合
GOOS=linux GOARCH=amd64   # Linux x64
GOOS=windows GOARCH=amd64 # Windows x64
GOOS=darwin GOARCH=arm64  # macOS ARM (Apple Silicon)
GOOS=darwin GOARCH=amd64  # macOS x64
```

## 练习题

**练习 10-1：用泛型实现一个通用 Stack[T]**

```go
package main

import "fmt"

type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) IsEmpty() bool {
    return len(s.items) == 0
}

func main() {
    s := &Stack[int]{}
    s.Push(1)
    s.Push(2)
    fmt.Println("Peek:", s.Peek())   // 2
    fmt.Println("Pop:", s.Pop())    // 2
    fmt.Println("Pop:", s.Pop())    // 1
    fmt.Println("Empty:", s.IsEmpty()) // true
}
```

**练习 10-2：** 用 table-driven tests 编写 `divide` 函数的单元测试，覆盖正常情况、除数为零、负数等场景。

---

## 总结

恭喜你完成了 Go 语言系列教程的全部 10 章！回顾一下我们学到的内容：

| 章节 | 主题 | 核心要点 |
|------|------|----------|
| 第1章 | 环境与Hello World | go mod init, go run, go build |
| 第2章 | 变量与控制流 | var/:=, int/float64/bool/string, if/for |
| 第3章 | 函数 | 多返回值, 闭包, defer, panic/recover |
| 第4章 | 数据结构 | 数组/切片/Map, append/copy/range |
| 第5章 | 结构体与方法 | struct, 值/指针 receiver, 组合 |
| 第6章 | 接口 | 隐式实现, 空接口, 类型断言 |
| 第7章 | 并发 | goroutine, channel, select, sync |
| 第8章 | 内存与性能 | 逃逸分析, GC, sync.Pool, pprof |
| 第9章 | 标准库 | fmt, os, json, http, time, slog |
| 第10章 | 工程化 | 测试, 泛型, reflect, CGO |

下一步建议：
- 阅读 Go 官方文档：[go.dev/doc](https://go.dev/doc)
- 学习一个 Web 框架（如 Gin、Echo）
- 参与开源项目
- 深入学习 Go 高级特性（GC 调优、内存管理等）

祝你 Go 开发愉快！ 🚀