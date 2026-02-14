# 图片加载问题分析

## 问题现状

用户反馈：配置了 PUID=1000 和 PGID=1000，但图片还是不能加载，删除照片提示 405 错误。

## 已完成的修复

### 1. 后端路径问题 ✅ 已修复

**文件**: `backend/src/index.js`

```javascript
// 使用统一的 photosPath
const { photosPath } = require('./models/database');
app.use('/photos', express.static(photosPath));
```

### 2. PUID/PGID 权限支持 ✅ 已添加

**文件**: `start.sh`

```bash
# 修改 node 用户的 UID/GID
PUID=${PUID:-1000}
PGID=${PGID:-1000}
groupmod -o -g "$PGID" node
usermod -o -u "$PUID" node
chown -R node:node /app/data /app/photos
su-exec node:node node /app/backend/src/index.js &
```

### 3. nginx 静态文件规则 ✅ 已修复

**文件**: `nginx.conf`

```nginx
# 排除 API 和照片路径，避免 405 错误
location ~* ^/(?!api/|photos/).*\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
```

## 用户需要执行的操作

### 步骤 1：重新构建 Docker 镜像

代码修改后需要重新构建镜像才能生效：

```bash
# 在 NAS 上执行
cd /path/to/family-tree-album
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

### 步骤 2：修复现有目录权限

如果照片目录已经存在且权限不对，需要手动修复：

```bash
# 查看当前权限
ls -la /vol4/1000/photos/family-tree-album/

# 修改权限（假设 PUID=1000）
sudo chown -R 1000:1000 /vol4/1000/photos/family-tree-album/
sudo chown -R 1000:1000 /vol1/1000/docker/family-tree-album/
```

### 步骤 3：验证

```bash
# 检查容器日志
sudo docker logs family-tree-album

# 应该看到类似输出：
# Setting node user to PUID=1000, PGID=1000
# Fixing permissions for data and photos directories...
# Starting backend service...
# Starting nginx...
```

## 问题排查

如果重新构建后仍有问题，请检查：

1. **检查容器内权限**

   ```bash
   sudo docker exec family-tree-album ls -la /app/photos/
   # 应该显示 node:node 而不是 root:root
   ```

2. **检查照片文件是否存在**

   ```bash
   sudo docker exec family-tree-album ls -la /app/photos/1/members/
   ```

3. **测试照片访问**

   ```bash
   curl -I http://localhost:3006/photos/1/members/高文革/高文革_001.jpg
   # 应该返回 200 OK，而不是 404
   ```

## 总结

代码层面的问题已全部修复，但用户需要：

1. **重新构建 Docker 镜像**（关键！）
2. **修复现有目录权限**

