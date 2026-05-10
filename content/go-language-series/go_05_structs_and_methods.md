---
title: "第5章：结构体与方法"
slug: go_05_structs_and_methods
date: 2026-05-10T10:00:00+08:00
description: "结构体定义、接收者模式与组合代替继承"
tags: ["Go", "编程语言"]
categories: ["Go语言学习"]
draft: false
---

# 第5章：结构体与方法

## 结构体（Struct）

Go 没有类（Class），但可以用 `struct` 定义自定义类型，将不同类型的数据组合在一起。

### 定义结构体

```go
// 定义一个学生结构体
type Student struct {
    Name   string
    Age    int
    Score  float64
}

// 创建结构体实例
s1 := Student{Name: "张三", Age: 18, Score: 92.5}
s2 := Student{"李四", 19, 88.0}  // 按字段顺序初始化（不推荐）
s3 := Student{}                    // 零值：{"", 0, 0.0}

// 部分字段初始化
s4 := Student{Name: "王五", Age: 20}

// 访问字段
fmt.Println(s1.Name, s1.Score)  // 张三 92.5

// 修改字段
s1.Score = 95.0
```

### 结构体嵌套

```go
type Address struct {
    City    string
    District string
}

type Person struct {
    Name    string
    Address Address  // 嵌套结构体
}

p := Person{
    Name: "小明",
    Address: Address{
        City:    "北京",
        District: "朝阳区",
    },
}
fmt.Println(p.Address.City)  // 北京
```

## 方法（Method）

Go 的方法是一种**语法糖**，是绑定到特定类型的函数。语法是在 `func` 和函数名之间加一个**接收者（receiver）**：

### 值接收者 vs 指针接收者

```go
// 定义一个圆形结构体
type Circle struct {
    Radius float64
}

// 值接收者：不会修改原结构体
func (c Circle) areaVal() float64 {
    return 3.14159 * c.Radius * c.Radius
}

// 指针接收者：可以修改原结构体
func (c *Circle) setRadius(r float64) {
    c.Radius = r  // 修改了接收者本身
}

c := Circle{Radius: 5}

// 调用值接收者方法
fmt.Println(c.areaVal())  // 78.53975

// 调用指针接收者方法
c.setRadius(10)
fmt.Println(c.Radius)  // 10
```

**什么时候用指针接收者？**
- 需要修改结构体字段时
- 结构体较大时（避免复制开销）
- 习惯上：只要方法可能修改结构体，就用指针接收者

### 方法的命名规则

Go 方法的命名遵循与函数相同的规则，大写开头的方法是**导出（公开）**的，小写开头是**私有（包内）**的。

```go
type Counter struct {
    Count int
}

// 公开方法
func (c *Counter) Increment() {
    c.Count++
}

// 私有方法（仅包内可用）
func (c *Counter) reset() {
    c.Count = 0
}
```

## 组合代替继承（Embedding）

Go 没有继承，但可以通过**结构体嵌入**实现类似组合的效果：

### 基本嵌入

```go
// 基类：动物
type Animal struct {
    Name string
    Age  int
}

func (a *Animal) Speak() {
    fmt.Println("...")
}

func (a *Animal) GetInfo() {
    fmt.Printf("我是%s，年龄%d岁\n", a.Name, a.Age)
}

// 子类：狗（嵌入 Animal）
type Dog struct {
    Animal       // 匿名嵌入，相当于"继承"了 Animal 的字段和方法
    Breed string  // 狗的特有属性
}

func (d *Dog) Speak() {
    fmt.Println("汪汪汪！")
}

// 使用
dog := Dog{
    Animal: Animal{Name: "旺财", Age: 3},
    Breed: "金毛",
}

dog.Speak()       // "汪汪汪！" —— 方法重写
dog.GetInfo()     // "我是旺财，年龄3岁" —— 继承的方法
fmt.Println(dog.Name)  // "旺财" —— 直接访问嵌入结构体的字段
```

### 方法重写（覆盖）

嵌入结构体的方法可以被当前结构体的方法**覆盖**。如上例中 `Dog.Speak()` 覆盖了 `Animal.Speak()`。

### 多层嵌入

```go
type Base struct {
    X int
}

type Middle struct {
    Base
    Y int
}

type Top struct {
    Middle
    Z int
}

t := Top{Middle{Base: Base{X: 1}, Y: 2}, Z: 3}
fmt.Println(t.X, t.Y, t.Z)  // 1 2 3
```

### 组合 vs 继承

Go 的设计哲学是**优先组合而非继承**。用"有一个"（has-a）代替"是一个"（is-a）：

```go
// 组合：Engine 是一个独立结构体
type Engine struct {
    Type string
}

type Car struct {
    Brand  string
    Engine Engine  // 显式嵌入，而非继承
}

car := Car{
    Brand:  "特斯拉",
    Engine: Engine{Type: "电动"},
}
fmt.Println(car.Engine.Type)  // 电动
```

## 结构体标签（Tag）

结构体字段可以有标签（tag），用于元数据，常用于 JSON 序列化：

```go
import "encoding/json"

type Student struct {
    Name  string `json:"name"`       // JSON 序列化为 "name"
    Age   int    `json:"age"`
    Score float64 `json:"-"`          // 忽略此字段
}

s := Student{Name: "小明", Age: 18, Score: 95.5}
data, _ := json.Marshal(s)
fmt.Println(string(data))
// 输出：{"name":"小明","age":18}
```

## 练习题

**1. 创建结构体：**
定义一个 `Rectangle` 结构体，有 `Width` 和 `Height` 两个 float64 字段。实现一个方法 `Area()` 计算面积。

**2. 指针接收者：**
定义一个 `Stack` 结构体（用切片存储数据），实现 `Push(item int)` 和 `Pop() int` 方法。

**3. 嵌入结构体：**
定义一个 `Author` 结构体，包含 `Name` 和 `BornYear` 字段。然后定义一个 `Book` 结构体，嵌入 `Author` 并添加 `Title` 和 `Year` 字段。创建一个 Book 实例并打印。

**4. JSON 序列化：**
定义一个 `Product` 结构体，带有字段 `ID`、`Name`、`Price`，使用 `json.Marshal` 将实例序列化为 JSON 字符串并打印。

---

**答案：**

1.
```go
type Rectangle struct {
    Width  float64
    Height float64
}

func (r *Rectangle) Area() float64 {
    return r.Width * r.Height
}

r := Rectangle{Width: 10, Height: 5}
fmt.Println("面积：", r.Area())  // 50
```

2.
```go
type Stack struct {
    items []int
}

func (s *Stack) Push(item int) {
    s.items = append(s.items, item)
}

func (s *Stack) Pop() int {
    if len(s.items) == 0 {
        return -1
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top
}

stack := Stack{}
stack.Push(1)
stack.Push(2)
fmt.Println(stack.Pop())  // 2
fmt.Println(stack.Pop())  // 1
```

3.
```go
type Author struct {
    Name     string
    BornYear int
}

type Book struct {
    Author
    Title string
    Year  int
}

book := Book{
    Author:  Author{Name: "鲁迅", BornYear: 1881},
    Title:   "呐喊",
    Year:    1921,
}
fmt.Printf("《%s》是%s（%d年生）所著，出版于%d年\n",
    book.Title, book.Name, book.BornYear, book.Year)
// 《呐喊》是鲁迅（1881年生）所著，出版于1921年
```

4.
```go
import "encoding/json"

type Product struct {
    ID    int     `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
}

p := Product{ID: 1, Name: "iPhone", Price: 8999.0}
data, _ := json.Marshal(p)
fmt.Println(string(data))
// {"id":1,"name":"iPhone","price":8999}
```