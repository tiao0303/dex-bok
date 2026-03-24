#!/bin/bash
# 本地预览：用站点根 baseURL，否则 CSS/JS 会 404，网格与样式不生效
# 启动后务必访问 http://localhost:1313/ （不要用 /dex-bok/）
cd "$(dirname "$0")"
echo "→ 请在浏览器打开: http://localhost:1313/"
hugo server -D --baseURL "http://localhost:1313/"
