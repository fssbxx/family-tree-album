# 产品发布前检查报告 - 执行计划

## 执行任务清单

根据用户指示，执行以下修复：

### 1. 移除未使用的依赖包

**文件**: `backend/package.json`

移除 `sharp` 和 `uuid`，这两个包在代码中未被使用。

### 2. 前端版本号改为自动读取

**文件**: `frontend/src/views/login.vue`

将硬编码的版本号改为从 Vite 环境变量读取。

### 3. 缩短静态资源缓存时间

**文件**: `nginx.conf`

将缓存时间从 `1y`（1年）改为 `7d`（7天），平衡性能和更新便利性。

### 4. 修复 README.md 文档错误

- 删除重复的 Docker 部署命令
- 修正端口说明（容器内 nginx 监听 3006，不是 80）
- 修正 API 文档路径（`/health` 不是 `/api/health`）

---

## 详细修改内容

### 修改 1: backend/package.json

```json
// 移除这两行
"sharp": "^0.34.5",
"uuid": "^9.0.1"
```

### 修改 2: frontend/src/views/login.vue

```html
<!-- 修改前 -->
<div class="version">v0.9.8</div>

<!-- 修改后 -->
<div class="version">v{{ version }}</div>
```

```javascript
// script setup 中添加
const version = __APP_VERSION__  // Vite 定义的全局变量
```

### 修改 3: frontend/vite.config.js

```javascript
// 添加版本号定义
export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  // ... 其他配置
})
```

### 修改 4: nginx.conf

```nginx
# 修改前
expires 1y;

# 修改后
expires 7d;
```

### 修改 5: README.md

1. 删除重复的 Docker 部署命令（第33-39行）
2. 修正端口说明表格
3. 修正 API 路径 `/api/health` → `/health`
