# Docker 部署照片显示失败问题分析与修复计划

## 问题描述

Docker 部署后，照片可以正确上传，但相册中显示加载失败。

## 问题分析

### 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker 容器 (端口 3006)                    │
│                                                             │
│  ┌─────────────┐         ┌─────────────────────────────┐   │
│  │   Nginx     │ ──────► │    Express (端口 3005)       │   │
│  │  (端口 3006) │         │    /photos/* 静态文件服务     │   │
│  └─────────────┘         └─────────────────────────────┘   │
│                                     │                       │
│                                     ▼                       │
│                          /app/photos (挂载卷)               │
└─────────────────────────────────────────────────────────────┘
```

### 根本原因

**路径不一致问题**：照片上传路径与静态文件服务路径不同！

| 组件 | 路径配置 | Docker 环境实际路径 |
|------|----------|-------------------|
| `database.js` photosPath | `isDocker ? '/app/photos' : ...` | `/app/photos` ✓ |
| `index.js` 静态文件服务 | `path.join(__dirname, '../photos')` | `/app/backend/photos` ✗ |

**关键代码对比**：

1. [database.js:7](file:///e:/code/family-tree-album/backend/src/models/database.js#L7) - 照片存储路径：
```javascript
const photosPath = isDocker ? '/app/photos' : path.join(__dirname, '../../photos');
```

2. [index.js:21](file:///e:/code/family-tree-album/backend/src/index.js#L21) - 静态文件服务路径：
```javascript
app.use('/photos', express.static(path.join(__dirname, '../photos')));
```

### 问题流程

1. **上传照片**：照片被正确保存到 `/app/photos` 目录（通过 `database.js` 的 `photosPath`）
2. **请求照片**：Nginx 代理 `/photos/*` 请求到后端
3. **服务照片**：Express 在 `/app/backend/photos` 目录查找文件 → **找不到文件！**

### 为什么本地调试正常？

本地开发环境：
- `__dirname` = `e:\code\family-tree-album\backend\src\models` (database.js)
- `__dirname` = `e:\code\family-tree-album\backend\src` (index.js)
- `path.join(__dirname, '../../photos')` = `e:\code\family-tree-album\photos`
- `path.join(__dirname, '../photos')` = `e:\code\family-tree-album\photos`

本地两个路径计算结果相同，所以没有问题。

## 修复方案

### 方案：统一使用 `photosPath`

修改 [backend/src/index.js](file:///e:/code/family-tree-album/backend/src/index.js)，从 `database.js` 导入 `photosPath` 并使用：

```javascript
// 修改前
const path = require('path');
// ...
app.use('/photos', express.static(path.join(__dirname, '../photos')));

// 修改后
const { photosPath } = require('./models/database');
// ...
app.use('/photos', express.static(photosPath));
```

## 修复步骤

1. 修改 `backend/src/index.js`
   - 导入 `photosPath` 从 `./models/database`
   - 将静态文件服务路径改为使用 `photosPath`

## 验证方法

1. 重新构建 Docker 镜像
2. 启动容器
3. 上传照片
4. 检查相册是否正常显示照片
