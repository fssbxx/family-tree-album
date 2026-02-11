# 构建阶段
FROM node:18-alpine as builder

WORKDIR /app

# 复制 package.json
COPY package.json ./
RUN npm install

# 复制源代码并构建
COPY . ./
RUN npm run build

# 生产阶段 - 使用 nginx
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
