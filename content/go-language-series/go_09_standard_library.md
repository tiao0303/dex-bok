---
title: "第9章：Go 标准库精讲"
slug: go_09_standard_library
date: 2026-05-10T09:45:00+08:00
description: "fmt、os、bufio、encoding/json、net/http 标准库实战"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第9章：Go 标准库精讲

Go 的标准库非常完善，几乎不需要第三方库就能完成大部分开发任务。本章重点讲解最常用的几个标准库。

## fmt：格式化 I/O

### Print 系列

```go
fmt.Print("Hello")          // 直接打印，不换行
fmt.Println("Hello")        // 打印 + 换行
fmt.Printf("Hello %s\n", "World")  // 格式化打印
```

### 格式化动词

| 动词 | 说明 | 示例 |
|------|------|------|
| `%v` | 默认格式 | `fmt.Printf("%v", student)` → `{张三 18}` |
| `%+v` | 结构体带字段名 | `fmt.Printf("%+v", student)` → `{Name:张三 Age:18}` |
| `%#v` | 完整 Go 语法 | `fmt.Printf("%#v", student)` |
| `%T` | 类型 | `fmt.Printf("%T", "hello")` → `string` |
| `%d` | 整数 | `fmt.Printf("%d", 42)` |
| `%s` | 字符串 | `fmt.Printf("%s", "hi")` |
| `%f` | 浮点数 | `fmt.Printf("%f", 3.14)` |
| `%.2f` | 保留2位小数 | `fmt.Printf("%.2f", 3.14159)` |
| `%p` | 指针地址 | `fmt.Printf("%p", &x)` |
| `%x` | 十六进制 | `fmt.Printf("%x", 255)` → `ff` |

### 字符串构建

```go
s := fmt.Sprintf("我叫%s，年龄%d岁", "张三", 18)
fmt.Println(s)  // 我叫张三，年龄18岁
```

### 错误格式化

```go
err := errors.New("文件不存在")
fmt.Printf("错误：%v\n", err)  // 错误：文件不存在
```

## os：文件与系统

### 文件操作

```go
import "os"

func fileDemo() {
    // 创建文件
    f, err := os.Create("test.txt")
    if err != nil {
        fmt.Println("创建失败：", err)
        return
    }
    defer f.Close()

    // 写入
    n, _ := f.WriteString("Hello, Go!\n")
    fmt.Println("写入", n, "字节")

    // 读取
    data, _ := os.ReadFile("test.txt")
    fmt.Println(string(data))

    // 删除
    os.Remove("test.txt")
}
```

### 目录操作

```go
import "os"
import "path/filepath"

// 创建目录
os.MkdirAll("tmp/subdir", 0755)

// 列出目录
entries, _ := os.ReadDir(".")
for _, e := range entries {
    fmt.Println(e.Name(), e.IsDir())
}

// 获取当前工作目录
cwd, _ := os.Getwd()
fmt.Println(cwd)

// 拼接路径
path := filepath.Join("dir", "subdir", "file.txt")
fmt.Println(path)  // dir/subdir/file.txt
```

### 命令行参数

```go
import "os"

func main() {
    args := os.Args          // 程序自身路径 + 参数
    fmt.Println("程序：", args[0])
    fmt.Println("参数：", args[1:])

    // 环境变量
    home := os.Getenv("HOME")
    fmt.Println("HOME:", home)

    // 设置环境变量
    os.Setenv("MY_VAR", "hello")
}
```

### 执行命令

```go
import "os/exec"

func execDemo() {
    // 执行 ls 命令
    cmd := exec.Command("ls", "-la")
    output, _ := cmd.Output()
    fmt.Println(string(output))
}
```

## bufio：高效 I/O

```go
import "bufio"
import "os"

func bufioDemo() {
    // 高效写入文件
    f, _ := os.Create("buffered.txt")
    defer f.Close()

    writer := bufio.NewWriter(f)
    for i := 1; i <= 1000; i++ {
        fmt.Fprintf(writer, "行号：%d\n", i)
    }
    writer.Flush()  // 必须 flush，否则数据在缓冲区

    // 高效读取文件
    file, _ := os.Open("buffered.txt")
    defer file.Close()

    scanner := bufio.NewScanner(file)
    lineNum := 0
    for scanner.Scan() {
        lineNum++
        if lineNum <= 5 {
            fmt.Println(scanner.Text())
        }
        if lineNum > 10 {
            break
        }
    }
}
```

### Reader 和 Writer

```go
// 带缓冲的 Reader
reader := bufio.NewReader(os.Stdin)
fmt.Print("请输入：")
input, _ := reader.ReadString('\n')
fmt.Print("你输入了：", input)

// 读取到指定字节数
buf := make([]byte, 10)
n, _ := reader.Read(buf)
fmt.Println("读取了", n, "字节：", string(buf))
```

## encoding/json：JSON 编解码

### 序列化（Go → JSON）

```go
import "encoding/json"

type Student struct {
    Name  string `json:"name"`
    Age   int    `json:"age"`
    Score float64 `json:"score,omitempty"`  // omitempty：零值时省略
}

func jsonDemo() {
    s := Student{Name: "张三", Age: 18}

    // 序列化
    data, err := json.Marshal(s)
    if err != nil {
        fmt.Println("序列化失败：", err)
        return
    }
    fmt.Println(string(data))  // {"name":"张三","age":18}

    // 格式化输出
    data2, _ := json.MarshalIndent(s, "", "  ")
    fmt.Println(string(data2))
    /*
    {
      "name": "张三",
      "age": 18
    }
    */
}
```

### 反序列化（JSON → Go）

```go
func unmarshalDemo() {
    jsonStr := `{"name":"李四","age":20,"score":95.5}`

    var s Student
    err := json.Unmarshal([]byte(jsonStr), &s)
    if err != nil {
        fmt.Println("反序列化失败：", err)
        return
    }
    fmt.Printf("%+v\n", s)  // {Name:李四 Age:20 Score:95.5}
}
```

### Map 与 JSON

```go
// JSON → map
jsonMap := `{"a":1,"b":2}`
var m map[string]interface{}
json.Unmarshal([]byte(jsonMap), &m)
fmt.Println(m["a"])  // 1

// map → JSON
m2 := map[string]int{"x": 10, "y": 20}
data, _ := json.Marshal(m2)
fmt.Println(string(data))  // {"x":10,"y":20}
```

## net/http：HTTP 服务与客户端

### 创建 HTTP 服务器

```go
import "net/http"
import "log"

func httpServerDemo() {
    // 简单路由
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, 访问路径：%s", r.URL.Path)
    })

    // JSON API
    http.HandleFunc("/api/student", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        student := Student{Name: "张三", Age: 18}
        json.NewEncoder(w).Encode(student)
    })

    // 启动服务器
    fmt.Println("服务器启动在 :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### HTTP 客户端

```go
import "net/http"

func httpClientDemo() {
    // GET 请求
    resp, err := http.Get("https://httpbin.org/get")
    if err != nil {
        fmt.Println("请求失败：", err)
        return
    }
    defer resp.Body.Close()

    // 读取响应
    body, _ := io.ReadAll(resp.Body)
    fmt.Println("状态码：", resp.StatusCode)
    fmt.Println("响应内容：", string(body))

    // POST 请求
    resp2, _ := http.Post(
        "https://httpbin.org/post",
        "application/json",
        strings.NewReader(`{"name":"测试"}`),
    )
    defer resp2.Body.Close()
    body2, _ := io.ReadAll(resp2.Body)
    fmt.Println(string(body2))
}
```

### 自定义 HTTP 客户端

```go
import "net/http"

client := &http.Client{
    Timeout: 10 * time.Second,
}

// 设置请求头
req, _ := http.NewRequest("GET", "https://httpbin.org/headers", nil)
req.Header.Set("User-Agent", "My Go Client/1.0")

resp, _ := client.Do(req)
defer resp.Body.Close()
fmt.Println(resp.Status)
```

## 其他常用标准库

| 包 | 用途 |
|----|------|
| `time` | 时间、日期、定时器 |
| `strings` | 字符串操作（查找、替换、分割） |
| `bytes` | 字节切片操作 |
| `math` | 数学函数（三角、对数、随机数） |
| `sort` | 切片排序 |
| `log` | 日志记录 |
| `context` | 上下文传递、取消信号、超时控制 |
| `io` | I/O 基础接口 |
| `crypto` | 加密（MD5、SHA、aes） |

## 练习题

**1. 文件操作练习：**
创建文件 `log.txt`，写入当前时间戳，然后读取并打印文件内容。

**2. JSON 练习：**
定义一个 `Product` 结构体，序列化为 JSON，存入文件，然后从文件读取并反序列化。

**3. HTTP 服务练习：**
写一个 HTTP 服务器，根路径 `/` 返回 "Welcome to my Go server!"，`/time` 路径返回当前时间。

**4. bufio 练习：**
用 `bufio.Scanner` 读取一个文本文件，逐行打印并统计行数。

---

**答案：**

1.
```go
func fileDemo() {
    now := time.Now().Format("2006-01-02 15:04:05")
    os.WriteFile("log.txt", []byte(now), 0644)

    data, _ := os.ReadFile("log.txt")
    fmt.Println("文件内容：", string(data))
}
```

2.
```go
type Product struct {
    ID    int     `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
}

func jsonFileDemo() {
    p := Product{ID: 1, Name: "iPhone", Price: 8999}

    // 序列化并写入文件
    data, _ := json.MarshalIndent(p, "", "  ")
    os.WriteFile("product.json", data, 0644)

    // 从文件读取并反序列化
    raw, _ := os.ReadFile("product.json")
    var p2 Product
    json.Unmarshal(raw, &p2)
    fmt.Printf("%+v\n", p2)
}
```

3.
```go
func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "Welcome to my Go server!")
    })

    http.HandleFunc("/time", func(w http.ResponseWriter, r *http.Request) {
        now := time.Now().Format("2006-01-02 15:04:05")
        fmt.Fprint(w, "当前时间：", now)
    })

    fmt.Println("服务器启动在 :8080")
    http.ListenAndServe(":8080", nil)
}
```

4.
```go
func lineCounter(filename string) {
    file, _ := os.Open(filename)
    defer file.Close()

    scanner := bufio.NewScanner(file)
    count := 0
    for scanner.Scan() {
        count++
        fmt.Println(count, ":", scanner.Text())
    }
    fmt.Printf("共 %d 行\n", count)
}
```