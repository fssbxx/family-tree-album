# Docker 部署照片问题修复计划 - 一劳永逸方案

## 问题描述

1. **删除照片失败**：返回 405 Method Not Allowed
2. **图片加载失败**：虽然能上传但无法加载显示
3. PUID PGID 都配置了 1000，用户可以上传照片但还是不能加载

## 问题根因分析

### 问题1：图片无法加载
**根因**：后端静态文件服务路径错误

- `database.js` 中 `photosPath = '/app/photos'`（照片实际存储位置）
- `index.js` 中静态文件服务使用 `path.join(__dirname, '../photos')` 
- Docker 环境中：`__dirname` = `/app/backend/src`，所以实际查找路径是 `/app/backend/photos`
- **结果**：照片存在 `/app/photos`，但 Express 在 `/app/backend/photos` 查找 → 找不到

### 问题2：删除照片返回 405
**根因**：Nginx 代理默认可能不支持 DELETE 方法，或被安全策略拦截

- 前端发送 DELETE 请求到 `/api/photos/:filename`
- Nginx 代理到后端时可能丢失 DELETE 方法
- 后端实际收到的是 GET/POST，导致返回 405

## 解决方案

### 方案：同时修复后端路径 + 删除 API（推荐）

#### 1. 修复后端静态文件路径（backend/src/index.js）

```javascript
// 修改前
const path = require('path');
app.use('/photos', express.static(path.join(__dirname, '../photos')));

// 修改后
const { photosPath } = require('./models/database');
app.use('/photos', express.static(photosPath));
```

#### 2. 修改删除 API 为 POST 方法（临时方案）

将删除照片的 DELETE 路由改为 POST，使用 `_method=DELETE` 参数或单独的处理方式：

修改 `backend/src/routes/photos.js`：
```javascript
// 删除照片 - 改为 POST 方法，使用 _method=DELETE 兼容
router.post('/delete/:filename', verifyToken, requireEditor, async (req, res) => {
  // 复制原来 DELETE 路由的所有逻辑
  // ...
});
```

修改 `frontend/src/views/FamilyTree.vue`：
```javascript
// 将 DELETE 请求改为 POST
// deletePhoto 函数中：
await axios.post(`/api/photos/delete/${encodeURIComponent(filename)}?memberId=${selectedMember.value.id}`)

// deleteFamilyPhoto 函数中：
await axios.post(`/api/photos/delete/${encodeURIComponent(filename)}`, { params })
```

#### 3. 修复 nginx.conf（备用）

如果方案2不生效，添加 DELETE 支持：
```nginx
location /api/ {
    proxy_pass http://localhost:3005/api/;
    proxy_method GET POST DELETE;
    # ...其他配置
}
```

## 一劳永逸的部署方案

为确保所有用户部署后直接可用，需要：

1. **修复后端代码**：静态文件路径 + 删除 API
2. **重新构建镜像**：用户拉取新镜像即可
3. **无需用户修改任何配置**：镜像内已解决所有问题

## 实施步骤

1. 修改 `backend/src/index.js` - 修复静态文件路径
2. 修改 `backend/src/routes/photos.js` - 添加 POST 删除路由
3. 修改 `frontend/src/views/FamilyTree.vue` - 使用 POST 删除
4. 构建测试
5. 用户重新部署

## 临时替代方案（不修改代码）

如果用户不想等待新镜像，可以：

1. **在飞牛上挂载自定义 nginx 配置**：
   创建自定义 nginx 配置覆盖默认行为，允许 DELETE 方法

2. **使用宿主机 nginx 反向代理**：
   在宿主机上用 nginx 代理到容器，配置更灵活
