#!/bin/bash
# 本地开发服务器启动脚本
rm -rf public resources
hugo server --config hugo.local.toml
