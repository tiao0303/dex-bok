date: 2026-05-10T09:55:00+08:00
---
title: "第4章：数据结构——数组、切片、映射"
slug: "go_04_data_structures"
description: "Go 语言数组、切片、映射的创建、操作与内存模型详解"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第4章：数据结构——数组、切片、映射

## 数组

数组是固定长度的序列，创建时长度固定，类型 `[n]T`：

```go
// 声明并初始化
var arr [5]int = [5]int{1, 2, 3, 4, 5}

// 简短写法
arr := [5]int{1, 2, 3, 4, 5}

// 自动推导长度
arr := [...]int{1, 2, 3} // len=3
```

**数组是值类型** — 赋值和传参会复制整个数组：

```go
a := [3]int{1, 2, 3}
b := a // 复制整个数组
b[0] = 100
fmt.Println(a) // [1 2 3]，a 不受影响
```

## 切片（Slice）

切片是 Go 中最常用的动态数组，长度可变，本质是**三个字段的结构体**（指针、长度、容量）：

```go
// 方式1：基于数组创建
arr := [5]int{1, 2, 3, 4, 5}
s1 := arr[1:4] // 从索引1到3（左闭右开）: [2 3 4]

// 方式2：make 创建
s2 := make([]int, 3)       // len=3, cap=3, 零值: [0 0 0]
s3 := make([]int, 3, 10)   // len=3, cap=10

// 方式3：字面量
s4 := []int{1, 2, 3}
```

### 切片操作

```go
s := []int{1, 2, 3, 4, 5}

// append：追加元素（可能触发扩容）
s = append(s, 6, 7)

// copy
s2 := make([]int, len(s))
copy(s2, s)

// slice expressions 切片表达式
fmt.Println(s[1:3])  // [2 3]
fmt.Println(s[:3])   // [1 2 3]
fmt.Println(s[2:])   // [3 4 5 6 7]

// len 和 cap
fmt.Println(len(s)) // 7
fmt.Println(cap(s)) // 扩容后可能是 10 或更大
```

### 扩容机制

当 `len` 超过 `cap` 时，`append` 会触发扩容，新容量通常是旧容量的 **2 倍**（超过 1024 时增长放缓）。

```go
s := make([]int, 0)
for i := 0; i < 10; i++ {
    s = append(s, i)
    fmt.Printf("len=%d cap=%d\n", len(s), cap(s))
}
```

输出类似：
```
len=1 cap=1
len=2 cap=2
len=3 cap=4
len=4 cap=4
len=5 cap=8
...
```

## 映射（Map）

Go 的 map 是键值对的无序集合，底层是 hash 表：

```go
// 创建
m := make(map[string]int)

// 字面量
m2 := map[string]int{
    "Alice": 25,
    "Bob":   30,
}

// 添加/修改
m["Charlie"] = 28

// 读取
age := m["Alice"] // 不存在则返回零值 0

// 安全读取：ok idiom
age, ok := m["David"]
if !ok {
    fmt.Println("David 不存在")
}

// 删除
delete(m, "Charlie")

// 遍历
for key, value := range m {
    fmt.Printf("%s: %d\n", key, value)
}
```

**map 是引用类型** — 赋值和传参不会复制 map：

```go
m1 := map[string]int{"a": 1}
m2 := m1
m2["a"] = 100
fmt.Println(m1["a"]) // 100，m1 也被修改
```

## range 遍历

```go
// 遍历切片
fruits := []string{"apple", "banana", "cherry"}
for index, fruit := range fruits {
    fmt.Printf("%d: %s\n", index, fruit)
}

// 遍历 map（顺序随机）
ages := map[string]int{"Alice": 25, "Bob": 30}
for name, age := range ages {
    fmt.Printf("%s is %d years old\n", name, age)
}

// 不需要 index/key 时用 _ 忽略
for _, fruit := range fruits {
    fmt.Println(fruit)
}
```

## 练习题

**练习 4-1：实现一个栈（Stack）**

用切片模拟栈，支持 `Push`、`Pop`、`Peek` 操作：

```go
package main

import "fmt"

type Stack struct {
    items []int
}

func (s *Stack) Push(item int) {
    s.items = append(s.items, item)
}

func (s *Stack) Pop() (int, bool) {
    if len(s.items) == 0 {
        return 0, false
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top, true
}

func (s *Stack) Peek() (int, bool) {
    if len(s.items) == 0 {
        return 0, false
    }
    return s.items[len(s.items)-1], true
}

func main() {
    stack := &Stack{}
    stack.Push(1)
    stack.Push(2)
    stack.Push(3)
    fmt.Println("Peek:", stack.Peek())   // 3
    fmt.Println("Pop:", stack.Pop())     // 3
    fmt.Println("Pop:", stack.Pop())     // 2
}
```

**练习 4-2：** 统计一段文字中每个单词出现的次数（用 map 实现）。

---

下一章我们将学习结构体与方法。