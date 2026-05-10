---
title: "第4章：数据结构——数组、切片、映射"
slug: go_04_data_structures
date: 2026-05-10T09:55:00+08:00
description: "数组、切片与 Map 的原理、使用场景与内存模型"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第4章：数据结构——数组、切片、映射

## 数组（Array）

数组是**固定长度**的同类型元素序列，在 Go 中数组是值类型（复制而非引用）：

```go
// 声明方式
var arr1 [5]int              // 默认零值初始化：[0, 0, 0, 0, 0]
arr2 := [5]int{1, 2, 3, 4, 5}  // 字面量初始化
arr3 := [...]int{1, 2, 3}    // 自动推断长度：[1, 2, 3]

// 多维数组
var matrix [3][4]int         // 3行4列的二维数组
matrix[0][1] = 10

// 遍历数组
for i := 0; i < len(arr2); i++ {
    fmt.Print(arr2[i], " ")
}
fmt.Println()

for i, v := range arr2 {
    fmt.Printf("arr2[%d] = %d\n", i, v)
}
```

**数组特点：**
- 长度固定，不可动态增长
- 作为函数参数时会**完整复制**一份（值类型）
- 长度是类型的一部分：`[5]int` 和 `[6]int` 是不同的类型

```go
a := [3]int{1, 2, 3}
b := a              // 复制整个数组，a 和 b 独立
b[0] = 100
fmt.Println(a[0])   // 仍为 1，a 不受影响
```

## 切片（Slice）

切片是 Go 中最常用的动态数组，它是**引用类型**——对切片的修改会影响底层数组：

### 创建切片

```go
// 方式一：make 创建（推荐方式）
s1 := make([]int, 5)         // 长度5，容量5，元素为零值
s2 := make([]int, 3, 10)     // 长度3，容量10

// 方式二：字面量
s3 := []int{1, 2, 3, 4, 5}

// 方式三：从数组或切片切片（slice）
arr := [5]int{1, 2, 3, 4, 5}
s4 := arr[1:4]              // s4 = [2, 3, 4]，左闭右开区间

// 方式四：空切片
var s5 []int                // nil 切片
s6 := []int{}              // 空切片（非 nil）
```

### 切片结构

切片包含三个部分：**指针（指向底层数组）**、**长度（当前元素数）**、**容量（底层数组最大长度）**：

```
Slice: {ptr: 指向 arr[1], len: 3, cap: 4}
Underlying Array: [?, 2, 3, 4, ?]
                    ↑ptr      len=3 cap=4
```

### 追加元素（append）

```go
s := make([]int, 0)
s = append(s, 1)       // 追加一个元素
s = append(s, 2, 3, 4)  // 追加多个元素

// 动态增长：底层数组容量翻倍扩展
fmt.Println(len(s), cap(s))  // 4 4
```

### 切片操作

```go
s := []int{10, 20, 30, 40, 50}

// 切片截取
s1 := s[1:3]      // [20, 30]
s2 := s[:2]       // [10, 20]
s3 := s[2:]       // [30, 40, 50]

// 删除元素（删除索引 i 的元素）
i := 2
s = append(s[:i], s[i+1:]...)  // 删除 s[2]
fmt.Println(s)  // [10, 20, 40, 50]
```

### 内存模型示例

```go
arr := [5]int{1, 2, 3, 4, 5}
s := arr[0:3]   // s = [1, 2, 3]，指向 arr[0]

s[1] = 20       // 修改切片，底层数组也被修改
fmt.Println(arr[1])  // 20，arr 被影响
```

### 切片作为函数参数

切片是引用类型，传入函数后修改会影响原切片（但**长度不可变**，除非重新分配）：

```go
func modifySlice(s []int) {
    s[0] = 100  // 会影响原切片
    s = append(s, 4)  // 这里是新切片，不影响原切片
}

orig := []int{1, 2, 3}
modifySlice(orig)
fmt.Println(orig)  // [100, 2, 3]
```

## 映射（Map）

Map 是 Go 的键值对数据结构，内部使用**哈希表**实现：

### 创建 Map

```go
// 方式一：make
m1 := make(map[string]int)

// 方式二：字面量
m2 := map[string]int{
    "Alice":   90,
    "Bob":     85,
    "Charlie": 78,
}
```

### 基本操作

```go
// 添加/修改
m["David"] = 92

// 读取
score, ok := m["Alice"]  // ok 为 false 表示键不存在
if ok {
    fmt.Println("Alice 的分数：", score)
}

// 删除
delete(m, "Bob")

// 遍历
for name, score := range m {
    fmt.Printf("%s: %d\n", name, score)
}
```

### Map 的重要特性

```go
m := map[string]int{"a": 1}

// 读取不存在的键，返回零值（不会报错）
fmt.Println(m["none"])  // 0

// 使用 ok 检查键是否存在
if v, ok := m["a"]; ok {
    fmt.Println("存在：", v)
}
```

### Map 是引用类型

```go
m1 := map[string]int{"x": 1}
m2 := m1              // m2 和 m1 共享同一个底层哈希表
m2["x"] = 100
fmt.Println(m1["x"])  // 100
```

## 常见数据结构对比

| 特性 | 数组 | 切片 | Map |
|------|------|------|-----|
| 长度 | 固定 | 可动态增长 | 可动态增长 |
| 类型 | 值类型 | 引用类型 | 引用类型 |
| 访问 | 索引访问 O(1) | 索引访问 O(1) | 键访问 O(1) |
| 有序 | 有序（索引） | 有序（索引） | 无序（迭代） |

## 练习题

**1. 数组练习：**
创建一个 `[5]int` 类型数组，元素为 `{1, 2, 3, 4, 5}`，计算所有元素的和。

**2. 切片练习：**
使用切片存储 5 个整数 `{10, 20, 30, 40, 50}`，将第 3 个元素（索引2）修改为 99，然后打印切片内容。

**3. Map 练习：**
创建一个 `map[string]int`，存储3个学生的成绩，遍历并打印所有学生信息。

**4. 综合练习：**
写一个函数 `filterPositive(numbers []int) []int`，返回一个只包含正数的新切片（原切片不变）。

---

**答案：**

1.
```go
arr := [5]int{1, 2, 3, 4, 5}
sum := 0
for _, v := range arr {
    sum += v
}
fmt.Println("数组元素和：", sum)  // 15
```

2.
```go
s := []int{10, 20, 30, 40, 50}
s[2] = 99
fmt.Println(s)  // [10 20 99 40 50]
```

3.
```go
grades := map[string]int{
    "小明": 92,
    "小红": 88,
    "小刚": 95,
}
for name, grade := range grades {
    fmt.Printf("%s：%d分\n", name, grade)
}
```

4.
```go
func filterPositive(numbers []int) []int {
    result := make([]int, 0)
    for _, n := range numbers {
        if n > 0 {
            result = append(result, n)
        }
    }
    return result
}

original := []int{-3, -1, 0, 2, 5, -6, 8}
filtered := filterPositive(original)
fmt.Println("原切片：", original)  // [-3 -1 0 2 5 -6 8]
fmt.Println("正数切片：", filtered) // [2 5 8]
```