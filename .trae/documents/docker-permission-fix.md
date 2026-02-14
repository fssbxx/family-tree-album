# PUID/PGID 环境变量支持方案

## 需求

增加 PUID/PGID 环境变量支持，让用户可以配置容器运行的权限，解决 NAS 等环境下的权限问题。

## 实现方案

### 1. 修改 Dockerfile

需要安装 `shadow` 包（提供 usermod/groupmod 命令）和 `su-exec`（以指定用户运行程序）：

```dockerfile
# 生产阶段
FROM node:20-alpine

# 安装 nginx 和 shadow（用于修改用户UID/GID）、su-exec（以指定用户运行）
RUN apk add --no-cache nginx shadow su-exec

WORKDIR /app

# 复制后端依赖和代码
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/http.d/default.conf

# 创建数据目录
RUN mkdir -p /app/data /app/photos

# 暴露端口
EXPOSE 3006

# 启动脚本
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
```

### 2. 修改 start.sh

```bash
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
```

### 3. 修改 docker-compose.yml

添加 PUID/PGID 环境变量说明：

```yaml
version: '3.8'

services:
  family-tree-album:
    build: .
    image: your-docker-username/family-tree-album:latest
    container_name: family-tree-album
    restart: unless-stopped
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:-your-jwt-secret-change-this}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
      - PUID=${PUID:-1000}    # 用户ID，默认1000
      - PGID=${PGID:-1000}    # 组ID，默认1000
    volumes:
      - ./data:/app/data
      - ./photos:/app/photos
```

### 4. 更新 README.md

添加 PUID/PGID 配置说明：

```markdown
#### 权限配置（可选）

如果遇到权限问题（如照片无法上传或显示），可以通过 PUID/PGID 环境变量配置：

```yaml
environment:
  - PUID=1000    # 用户ID，通常与宿主机用户ID一致
  - PGID=1000    # 组ID
```

**如何确定正确的 PUID/PGID：**

```bash
# Linux/Mac
id -u  # 显示当前用户 UID
id -g  # 显示当前用户 GID

# 或查看目录所有者
ls -ln /path/to/photos
```

**常见配置：**
- Synology NAS: `PUID=1026`, `PGID=100` (根据实际情况调整)
- 飞牛 fnOS: `PUID=1000`, `PGID=1000` (根据实际情况调整)
- 普通Linux: `PUID=1000`, `PGID=1000`
```

## 执行步骤

1. 修改 `Dockerfile` - 安装 shadow 和 su-exec
2. 修改 `start.sh` - 添加 PUID/PGID 处理逻辑
3. 修改 `docker-compose.yml` - 添加 PUID/PGID 环境变量
4. 更新 `README.md` - 添加权限配置说明

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| Dockerfile | 安装 shadow、su-exec |
| start.sh | PUID/PGID 处理逻辑 |
| docker-compose.yml | 添加 PUID/PGID 环境变量 |
| README.md | 添加权限配置说明 |
