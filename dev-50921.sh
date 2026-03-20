#!/bin/bash
# 本地预览（端口 50921）：强制用根 baseURL，确保 /editor/ 的 CSS/JS 正常加载
#
# 访问：
# - http://localhost:50921/
# - http://localhost:50921/editor/
#
# 注意：不要访问 /dex-bok/（那是线上 GitHub Pages 子路径）

set -e
cd "$(dirname "$0")"

echo "→ 请在浏览器打开: http://localhost:50921/"
echo "→ 编辑器页面:   http://localhost:50921/editor/"

hugo server -D --port 50921 --baseURL "http://localhost:50921/" --appendPort=false

