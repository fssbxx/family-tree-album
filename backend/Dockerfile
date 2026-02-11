FROM node:18-alpine

WORKDIR /app

# 复制 package.json
COPY package.json ./
RUN npm install

# 复制源代码
COPY src/ ./src/

# 创建数据目录
RUN mkdir -p /app/data /app/photos

# 暴露端口
EXPOSE 3007

# 启动命令
CMD ["node", "src/index.js"]
