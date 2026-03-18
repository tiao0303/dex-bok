# DEX 学习笔记 - Hugo 博客

个人 DEX 知识与实战博客，基于 Hugo 构建。

## 快速启动

### 1. 安装 Hugo

**macOS**:
```bash
brew install hugo
```

**Linux**:
```bash
sudo snap install hugo
```

**Windows**:
```bash
choco install hugo-extended
```

### 2. 克隆主题

```bash
cd hugo-site
git clone https://github.com/budparr/gohugo-theme-ananke.git themes/ananke
```

### 3. 启动开发服务器

```bash
hugo server -D
```

浏览器访问：**http://localhost:1313**

---

## 目录结构

```
hugo-site/
├── config.toml           # 站点配置
├── content/              # 内容文件
│   ├── posts/           # 博客文章
│   ├── guides/          # 教程
│   ├── tools/           # 工具页面
│   └── about/           # 关于页
├── static/               # 静态资源
│   └── css/
│       └── custom.css   # 自定义样式
└── themes/              # 主题
```

---

## 添加新文章

```bash
hugo new posts/my-new-post.md
```

编辑生成的文件，修改 front matter：

```markdown
---
title: "文章标题"
date: 2026-03-18T21:00:00+08:00
tags: ["标签 1", "标签 2"]
categories: ["分类"]
draft: false
---

文章内容...
```

---

## 构建与部署

### 构建静态文件

```bash
hugo
```

输出到 `public/` 目录。

### 部署到 GitHub Pages

```bash
# 构建
hugo

# 进入 public 目录
cd public

# 初始化 git（首次）
git init
git add .
git commit -m "Deploy"

# 推送到 gh-pages 分支
git push git@github.com:yang/dex-blog.git main:gh-pages --force
```

### 自动部署（GitHub Actions）

项目已包含 `.github/workflows/deploy.yml`，push 到 main 分支自动部署。

---

## 自定义

### 修改主题色

编辑 `static/css/custom.css` 中的 `:root` 变量：

```css
:root {
  --primary: #4A7C59;  /* 竹青色 */
  --primary-dark: #3A5C45;
  --primary-light: #6B9C7A;
}
```

### 添加新页面

```bash
hugo new pages/my-page.md
```

---

## 数据统计

- **文章数**：5 篇
- **教程数**：1 篇
- **工具页**：1 个
- **最后更新**：2026-03-18 21:19

---

## License

MIT License - 可自由使用和修改
