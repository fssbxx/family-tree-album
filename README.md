# 家族相册 (Family Tree Album)

一个基于 Vue 3 + Express 的家族族谱管理与照片分享应用。

## 功能特性

- **族谱管理**：创建和管理多个家族族谱
- **成员管理**：添加、编辑、删除家族成员
- **家庭关系**：构建家族树结构，支持多代家庭关系
- **照片管理**：为每个成员上传和管理照片，竖向滚动展示
- **头像裁剪**：支持比例控制和移动裁剪，让人物居中显示
- **权限控制**：三级权限系统（查看者/编辑者/管理员）
- **可视化族谱**：树形结构展示家族关系，支持缩放和拖动
- **中文界面**：完整的简体中文支持

## 技术栈

### 后端
- **Node.js** + **Express** - Web 框架
- **JSON 文件存储** - 数据持久化
- **JWT** - 身份认证
- **Multer** - 文件上传
- **CORS** - 跨域支持

### 前端
- **Vue 3** - 前端框架
- **Vue Router** - 路由管理
- **Pinia** - 状态管理
- **Element Plus** - UI 组件库
- **Vite** - 构建工具
- **Axios** - HTTP 客户端
- **vue-cropper** - 图片裁剪组件

## 项目结构

```
family-tree-album/
├── backend/                  # 后端服务
│   ├── src/
│   │   ├── index.js          # 入口文件
│   │   ├── middleware/
│   │   │   └── auth.js       # 认证中间件
│   │   ├── models/
│   │   │   └── database.js   # 数据模型
│   │   └── routes/
│   │       ├── familyTrees.js # 族谱路由
│   │       ├── members.js     # 成员路由
│   │       ├── families.js    # 家庭路由
│   │       └── photos.js      # 照片路由
│   ├── package.json
│   └── Dockerfile            # Docker 构建文件
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── main.js           # 入口文件
│   │   ├── App.vue           # 根组件
│   │   ├── router/
│   │   │   └── index.js      # 路由配置
│   │   ├── stores/
│   │   │   └── auth.js       # 认证状态
│   │   ├── views/
│   │   │   ├── login.vue     # 登录页面
│   │   │   └── FamilyTree.vue # 族谱页面
│   │   └── components/
│   │       ├── FamilyTreeChart.vue # 族谱图表组件
│   │       └── FamilyNode.vue      # 族谱节点组件
│   ├── package.json
│   ├── vite.config.js        # Vite 配置
│   ├── index.html
│   └── Dockerfile            # Docker 构建文件
├── docker-compose.yml        # Docker Compose 配置
├── Dockerfile                # 根目录 Dockerfile
├── nginx.conf                # Nginx 配置
├── start.sh                  # 启动脚本
└── README.md
```

## 安装与运行

### 环境要求
- Node.js >= 16
- npm 或 yarn

### 方式一：本地开发

#### 后端部署

```bash
cd backend
npm install
```

创建 `.env` 文件：
```env
PORT=3005
ADMIN_PASSWORD=your-admin-password
DATA_PATH=./data
PHOTOS_PATH=./photos
```

启动服务：
```bash
npm start
```

后端服务默认运行在 `http://localhost:3005`

#### 前端部署

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认运行在 `http://localhost:3006`

生产构建：
```bash
npm run build
```

### 方式二：Docker 部署

```bash
# 构建并启动
docker-compose up -d --build

# 访问应用
# 前端：http://localhost:3006
# 后端 API：http://localhost:3005

# 停止服务
docker-compose down
```

#### Docker 配置说明

| 服务 | 宿主机端口 | 容器端口 | 说明 |
|------|-----------|---------|------|
| 前端 | 3006 | 80 | Nginx 服务 |
| 后端 | 3005 | 3005 | Node.js 服务 |

数据持久化：
- `./data` → `/app/data` - JSON 数据文件
- `./photos` → `/app/photos` - 照片文件

环境变量（在 docker-compose.yml 中配置）：
- `ADMIN_PASSWORD` - 管理员密码（默认：admin123）

## API 接口

> **注意**：所有 API 路径均为前端请求路径。Nginx 会将 `/api/` 开头的请求代理到后端服务，后端实际接收的路径不包含 `/api` 前缀。

### 认证
- `POST /api/auth/login` - 用户登录

### 族谱管理
- `GET /api/trees` - 获取所有族谱（管理员）
- `GET /api/trees/:treeId` - 获取族谱详情
- `POST /api/trees` - 创建族谱（管理员）
- `PUT /api/trees/:treeId` - 更新族谱（管理员）
- `DELETE /api/trees/:treeId` - 删除族谱（管理员）

### 成员管理
- `GET /api/members/tree/:treeId` - 获取成员列表
- `GET /api/members/:memberId` - 获取成员详情
- `POST /api/members/tree/:treeId` - 创建成员
- `PUT /api/members/:memberId` - 更新成员
- `DELETE /api/members/:memberId` - 删除成员

### 家庭关系
- `GET /api/families/tree/:treeId` - 获取家庭列表
- `GET /api/families/tree/:treeId/structure` - 获取家族树结构
- `POST /api/families/tree/:treeId` - 创建家庭
- `PUT /api/families/:familyId` - 更新家庭
- `DELETE /api/families/:familyId` - 删除家庭
- `POST /api/families/relations` - 创建家庭关系
- `DELETE /api/families/relations/:relationId` - 删除家庭关系

### 照片管理
- `GET /api/photos/member/:memberId` - 获取成员照片
- `POST /api/photos/upload` - 上传照片
- `POST /api/photos/avatar-crop` - 上传裁剪后的头像
- `DELETE /api/photos/:filename` - 删除照片
- `GET /api/photos/file/:filename` - 获取照片文件

### 健康检查
- `GET /api/health` - 服务健康状态

## 权限系统

系统支持三级权限：

1. **查看者 (viewer)**
   - 使用查看密码登录
   - 只能浏览族谱和照片
   - 无法编辑任何内容

2. **编辑者 (editor)**
   - 使用编辑密码登录
   - 可以添加/编辑/删除成员
   - 可以上传和管理照片
   - 可以管理家庭关系

3. **管理员 (admin)**
   - 使用管理员密码登录
   - 拥有所有权限
   - 可以创建/删除族谱
   - 可以管理所有族谱的设置

## 界面说明

### 族谱页面布局
- **左侧 70%**：族谱树形展示区域，支持缩放和拖动
- **右侧 30%**：成员详情面板，固定高度不超出屏幕

### 成员详情面板
- **基本信息**：姓名、性别、生日（日历选择器）
- **证件照头像**：点击可设置头像，支持裁剪
- **关系操作**：添加父母、添加子女、添加配偶
- **照片区域**：竖向滚动展示，占满中间空间
- **删除按钮**：固定在面板最底端靠右

### 交互功能
- **缩放**：默认 80% 大小，支持放大/缩小/重置
- **拖动**：可拖动族谱树查看不同区域
- **点击成员**：在右侧面板显示详情

## 数据存储

数据以 JSON 格式存储在文件系统中：

- `data/` - JSON 数据文件（族谱、成员、家庭、关系）
- `photos/` - 上传的照片文件
  - `photos/{treeId}/{memberFolder}/` - 按族谱和成员组织的照片

## 开发说明

### 添加新成员
1. 在族谱页面点击成员
2. 在详情面板点击"添加父母"/"添加配偶"/"添加子女"
3. 填写成员信息并保存

### 上传照片
1. 选择要上传照片的成员
2. 点击"上传"按钮
3. 选择照片文件（支持多选）
4. 确认上传

### 修改族谱设置
1. 点击顶部"管理"按钮（仅管理员可见）
2. 修改族谱名称或密码
3. 保存更改

### 族谱布局算法
1. **Walker 算法**，树形布局
2. 以家庭为一个节点，父节点根据子节点计算居中
3. 子节点均匀分布在父节点的水平线上
4. 子树不重叠

### 密码规则
- 查看密码和编辑密码不能相同
- 所有家族的密码不能重复（全局唯一）
- 创建和编辑时都会验证密码唯一性

## 注意事项

- 首次使用需要设置管理员密码（通过环境变量 `ADMIN_PASSWORD`）
- 照片上传大小限制为 50MB
- 支持的图片格式：JPEG, PNG, GIF, WebP, BMP
- 建议定期备份 `data/` 和 `photos/` 目录
- 登录状态在关闭浏览器标签页后会自动失效

## 更新日志

### v0.9.6 (2025-02-12)

#### 新增功能
- **节点折叠功能**：族谱树节点支持折叠/展开子树，方便查看大型族谱
- **Docker 自动构建**：GitHub Actions 工作流自动构建并推送 Docker 镜像

#### 优化改进
- **界面布局优化**：
  - 减小顶栏高度（64px → 48px），增加族谱显示区域
  - 族谱工具栏改为透明悬浮样式
  - 族谱区域与详情面板底部对齐
- **抽屉交互优化**：点击成员卡片即可展开详情抽屉，无需点击箭头
- **Docker 配置修复**：修复 nginx 代理路径，确保 API 路由正确转发

#### 技术改进
- 统一 API 路由前缀为 `/api`
- 完善 Docker 多阶段构建配置
- 优化 GitHub Actions 镜像标签策略
