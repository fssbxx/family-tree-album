# 构建阶段 - 前端
FROM node:20-alpine as frontend-builder

WORKDIR /app/frontend

# 复制前端 package.json
COPY frontend/package.json ./
RUN npm install

# 复制前端源代码并构建
COPY frontend/ ./
RUN npm run build

# 构建阶段 - 后端
FROM node:20-alpine as backend-builder

WORKDIR /app/backend

# 复制后端 package.json
COPY backend/package.json ./
RUN npm install

# 复制后端源代码
COPY backend/ ./

# 生产阶段
FROM node:20-alpine

# 安装 nginx
RUN apk add --no-cache nginx

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
