#!/bin/sh

# 启动后端服务
node /app/backend/src/index.js &

# 等待后端启动
sleep 2

# 启动 nginx
nginx -g 'daemon off;'
