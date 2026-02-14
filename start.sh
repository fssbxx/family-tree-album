#!/bin/sh

# PUID/PGID 支持
# 默认使用 1000 (node 用户的默认 UID)
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# 修改 node 用户的 UID/GID
if [ "$(id -u node)" != "$PUID" ] || [ "$(id -g node)" != "$PGID" ]; then
    echo "Setting node user to PUID=$PUID, PGID=$PGID"
    groupmod -o -g "$PGID" node
    usermod -o -u "$PUID" node
fi

# 修复数据目录权限
echo "Fixing permissions for data and photos directories..."
chown -R node:node /app/data /app/photos

# 启动后端服务（以 node 用户运行）
echo "Starting backend service..."
su-exec node:node node /app/backend/src/index.js &

# 等待后端启动
sleep 2

# 启动 nginx
echo "Starting nginx..."
nginx -g 'daemon off;'
