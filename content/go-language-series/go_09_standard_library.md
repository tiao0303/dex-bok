date: 2026-05-10T10:20:00+08:00
---
title: "第9章：Go 标准库精讲"
slug: "go_09_standard_library"
description: "Go 语言 fmt、os、io、encoding/json、net/http、time、log/slog 等标准库详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第9章：Go 标准库精讲

Go 的标准库非常丰富，本章挑选最常用的模块讲解。

## fmt — 格式化 I/O

```go
import "fmt"

// 打印
fmt.Print("hello")                    // 不换行
fmt.Println("hello")                  // 换行
fmt.Printf("name=%s, age=%d\n", "Alice", 25)

// 占位符
fmt.Printf("%v\n", person)           // 默认格式
fmt.Printf("%+v\n", person)           // 结构体带字段名
fmt.Printf("%#v\n", person)           // Go 语法格式
fmt.Printf("%T\n", person)            // 类型
fmt.Printf("%q\n", "hello")           // 带引号字符串
fmt.Printf("%x\n", 255)               // 十六进制

// 格式化输出到字符串
s := fmt.Sprintf("Hello, %s!", "World")
```

## os / filepath — 文件操作

```go
import (
    "os"
    "fmt"
)

// 读取文件（Go 1.16+ 推荐用 os.ReadFile）
data, err := os.ReadFile("test.txt")
if err != nil {
    fmt.Println("读取失败:", err)
}
fmt.Println(string(data))

// 写入文件
err = os.WriteFile("output.txt", []byte("Hello"), 0644)

// 路径操作
import "path/filepath"
filepath.Join("dir", "subdir", "file.txt") // dir/subdir/file.txt
filepath.Dir("dir/file.txt")              // dir
filepath.Base("dir/file.txt")             // file.txt
filepath.Ext("file.txt")                  // .txt
```

## io / bufio — 缓冲读写

```go
import (
    "bufio"
    "os"
)

// 读取大文件（逐行）
file, _ := os.Open("largefile.txt")
defer file.Close()

scanner := bufio.NewScanner(file)
for scanner.Scan() {
    fmt.Println(scanner.Text())
}

// 写入
file, _ = os.Create("output.txt")
defer file.Close()

writer := bufio.NewWriter(file)
for i := 0; i < 10; i++ {
    fmt.Fprintf(writer, "line %d\n", i)
}
writer.Flush() // 必须 flush
```

## encoding/json — JSON 编解码

```go
import "encoding/json"

// 结构体与 JSON 互转
type Person struct {
    Name  string `json:"name"`
    Age   int    `json:"age,omitempty"`
    Email string `json:"-"`
}

// 序列化
p := Person{Name: "张三", Age: 25}
data, _ := json.Marshal(p)
fmt.Println(string(data))
// {"name":"张三","age":25}

// 反序列化
var p2 Person
json.Unmarshal(data, &p2)

// 读取未知 JSON（map[string]any）
var unknown map[string]any
json.Unmarshal([]byte(`{"name":"Alice","score":95.5}`), &unknown)
fmt.Println(unknown["name"], unknown["score"])
```

**struct tag 说明：**
- `json:"name"` — JSON 字段名
- `json:",omitempty"` — 为空则不序列化
- `json:"-"` — 跳过该字段

## net/http — HTTP 服务器与客户端

```go
import (
    "net/http"
    "fmt"
)

// HTTP 服务器
http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    if name == "" {
        name = "World"
    }
    fmt.Fprintf(w, "Hello, %s!", name)
})

http.ListenAndServe(":8080", nil)

// HTTP 客户端
resp, err := http.Get("https://go.dev")
if err != nil {
    fmt.Println("请求失败:", err)
    return
}
defer resp.Body.Close()

body, _ := io.ReadAll(resp.Body)
fmt.Printf("状态码: %d, 内容长度: %d\n", resp.StatusCode, len(body))
```

### 中间件模式

```go
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        fmt.Printf("请求 %s 耗时 %v\n", r.URL.Path, time.Since(start))
    })
}

func main() {
    handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "Hello!")
    }))
    http.ListenAndServe(":8080", handler)
}
```

## time — 时间处理

```go
import "time"

// 格式化：Go 固定参考时间 "2006-01-02 15:04:05"
now := time.Now()
fmt.Println(now.Format("2006-01-02 15:04:05"))
fmt.Println(now.Format("2006-01-02"))

// 解析
t, _ := time.Parse("2006-01-02", "2024-05-10")
fmt.Println(t)

// 定时器
ticker := time.NewTicker(time.Second)
defer ticker.Stop()

go func() {
    for range ticker.C {
        fmt.Println("tick")
    }
}()

// 单次定时
time.Sleep(2 * time.Second)

// 时间计算
later := now.Add(24 * time.Hour)
diff := later.Sub(now)
fmt.Printf("差值: %v\n", diff)
```

## log 与 slog（结构化日志）

### log（简单日志）

```go
import "log"

log.Println("普通日志")
log.Fatalf("错误：%v", err) // 打印后程序退出
```

### slog（结构化日志，Go 1.21+）

```go
import "log/slog"

logger := slog.Default()

// 级别日志
logger.Info("请求完成", "method", "GET", "status", 200)
logger.Warn("内存使用率高", "usage_mb", 1024)
logger.Error("连接失败", "err", err)

// JSON 格式
jsonLogger := slog.NewJSONHandler(os.Stdout)
slog.SetDefault(slog.New(jsonLogger))
```

输出示例：
```
level=INFO msg="请求完成" method=GET status=200
```

## 练习题

**练习 9-1：** 写一个 HTTP 中间件，统计每个请求的处理时间，并在响应头中添加 `X-Response-Time`。

```go
package main

import (
    "fmt"
    "net/http"
    "time"
)

func responseTimeMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        elapsed := time.Since(start)
        w.Header().Set("X-Response-Time", elapsed.String())
        fmt.Printf("%s %s: %v\n", r.Method, r.URL.Path, elapsed)
    })
}

func main() {
    handler := responseTimeMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "Hello, World!")
    }))
    http.ListenAndServe(":8080", handler)
}
```

**练习 9-2：** 读取一个 JSON 文件（包含用户数组），反序列化后输出所有用户名。

---

下一章我们将学习 Go 的工程化实践、测试与高级主题。