# 家族相册 (Family Tree Album)

一个基于 Vue 3 + Express 的家族族谱管理与照片分享应用。

## 功能特性

- **族谱管理**：创建和管理多个家族族谱
- **成员管理**：添加、编辑、删除家族成员
- **家庭关系**：构建家族树结构，支持多代家庭关系
- **照片管理**：支持个人相册和家庭相册，竖向滚动展示
- **头像裁剪**：支持比例控制和移动裁剪，让人物居中显示
- **权限控制**：三级权限系统（查看者/编辑者/管理员）
- **可视化族谱**：树形结构展示家族关系，支持缩放、拖动、折叠
- **中文界面**：完整的简体中文支持

## 安装与运行

### 环境要求
- Node.js >= 16
- npm 或 yarn
- Docker 和 Docker Compose（推荐）

### Docker 部署（推荐）

```bash
# 构建并启动
docker-compose up -d --build

# 停止服务
docker-compose down
```

#### Docker 配置说明

| 服务 | 宿主机端口 | 容器端口 | 说明 |
|------|-----------|---------|------|
| Web 服务 | 3006 | 3006 | Nginx + Node.js |

数据持久化：
- `./data` → `/app/data` - JSON 数据文件
- `./photos` → `/app/photos` - 照片文件

环境变量（在 docker-compose.yml 中配置）：
- `JWT_SECRET` - JWT 签名密钥（可选，未设置时随机生成）
- `ADMIN_PASSWORD` - 管理员密码（可选，默认 admin123，生产环境建议设置）
- `PUID` - 用户ID（可选，默认 1000，用于解决 NAS 等环境的权限问题）
- `PGID` - 组ID（可选，默认 1000，用于解决 NAS 等环境的权限问题）

#### 权限配置说明

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

---

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
│   │   │   ├── auth.js       # 认证中间件
│   │   │   └── validator.js  # 请求验证中间件
│   │   ├── models/
│   │   │   └── database.js   # 数据模型
│   │   ├── routes/
│   │   │   ├── familyTrees.js # 族谱路由
│   │   │   ├── members.js     # 成员路由
│   │   │   ├── families.js    # 家庭路由
│   │   │   └── photos.js      # 照片路由
│   │   └── utils/
│   │       └── security.js    # 安全工具函数
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
- `GET /health` - 服务健康状态

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


## 数据存储

数据以 JSON 格式存储在文件系统中：

- `data/` - JSON 数据文件（族谱、成员、家庭、关系）
- `photos/` - 上传的照片文件
  - `photos/{treeId}/members/{memberName}/` - 个人照片
  - `photos/{treeId}/families/{familyId}/` - 家庭合照

## 开发说明

### 添加新成员
1. 在族谱页面点击成员
2. 在详情面板点击"添加父母"/"添加配偶"/"添加子女"
3. 填写成员信息并保存

### 上传照片
1. 选择要上传照片的成员
2. 在详情面板切换"个人相册"或"家庭相册"标签
3. 点击"上传"按钮
4. 选择照片文件（支持多选）
5. 确认上传（自动保存到当前选中的相册类型）

### 家庭相册
- 每个成员详情面板支持"个人相册"和"家庭相册"切换
- 家庭相册显示该成员所在家庭的所有合照
- 上传时根据当前选中的标签自动决定保存位置

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
- 照片上传大小限制为 20MB
- 支持的图片格式：JPEG, PNG, GIF, WebP, BMP
- 建议定期备份 `data/` 和 `photos/` 目录
- 登录状态在关闭浏览器标签页后会自动失效

## 更新日志

### v1.0.2 (2026-02-17)

#### Bug 修复
- **修复 413 文件上传错误**：Nginx 添加 `client_max_body_size 20M` 配置
- **统一文件大小限制**：所有上传限制统一为 20MB
- **前端文件大小检查**：上传前检查文件大小，超过 20MB 给出明确提示

#### 优化改进
- **个人卡片头像显示**：改为 `object-fit: cover` 填充满区域
- **个人卡片高度优化**：高度调整为 166px，减少上下间隙

### v1.0.1 (2026-02-17)

#### Bug 修复
- **修复 413 Payload Too Large 错误**：增加 Express body parser 限制为 20mb
- **统一文件大小限制**：所有上传限制统一为 20MB
- **优化错误提示**：文件大小超过限制时提示"最大20MB"

### v1.0.0 (2026-02-17)

#### 重大更新
- **正式发布 1.0 版本**：项目达到生产环境稳定状态

#### 新增功能
- **文件头检测验证**：不依赖浏览器 MIME 类型，直接读取文件头检测真实图片格式
  - 解决微信等应用传输图片导致的格式不一致问题
  - 支持 JPEG、PNG、GIF、WebP、BMP 格式检测
- **2寸照片比例头像**：头像裁剪和显示采用标准2寸照片比例（35:49）
  - 裁剪框比例调整为 35:49
  - 输出尺寸：413 × 579 像素
  - 个人卡片和族谱节点统一使用2寸比例显示

#### 优化改进
- **相册照片显示优化**：`object-fit: cover` 改为 `object-fit: contain`
  - 照片保持原始比例完整显示
  - 不被裁剪，显示完整内容
- **错误提示增强**：上传失败时显示具体的错误信息和检测到的文件类型

### v0.9.10 (2026-02-14)

#### Bug 修复
- **修复删除照片返回 405 错误**：新增 POST 方法的删除路由，兼容不支持 DELETE 方法的环境
- **修复 Docker 照片加载失败**：静态文件服务路径已正确配置

### v0.9.9 (2026-02-14)

#### 新增功能
- **家族描述显示**：家族名称后显示管理员设置的家族描述（小字浅灰色）
- **PUID/PGID 支持**：支持通过环境变量配置容器运行权限，解决 NAS 等环境的权限问题

#### Bug 修复
- **修复 Docker 照片显示失败**：统一照片存储路径与静态文件服务路径

#### 优化改进
- **移除未使用依赖**：清理 backend 中未使用的 sharp、uuid 依赖
- **版本号自动读取**：前端版本号从 package.json 自动读取
- **缓存策略优化**：静态资源缓存时间从 1 年改为 7 天
- **文档修正**：修复 README 中的端口说明和 API 路径错误

### v0.9.8 (2025-02-13)

#### 安全增强
- **文件上传安全**：防止路径遍历攻击，规范文件命名
  - 个人照片命名格式：`成员名_001.jpg`
  - 家庭照片命名格式：`父亲名_母亲名_001.jpg`
  - 自动清理文件名中的危险字符
  - 验证文件路径安全性
- **输入验证增强**：统一后端 API 参数验证
  - 成员名称：1-50字符，不含特殊字符
  - 日期格式：YYYY-MM-DD 验证
  - 密码长度：4-50字符
  - ID 参数：正整数验证

#### 交互优化
- **折叠子树布局优化**：折叠子树后自动重新计算布局
  - 折叠的子树宽度不再计入整体宽度
  - 其他内容自动紧凑排布
  - 展开后恢复原状

#### Bug 修复
- **修复修改姓名报错**：`sanitizeFilename is not a function`
- **修复管理员上传照片失败**：管理员现在可以通过请求参数传递 treeId 上传照片
- **修复删除家庭照片功能**：支持删除家庭相册中的照片

#### 配置优化
- **环境变量可选**：JWT_SECRET 和 ADMIN_PASSWORD 改为可选，未设置时使用默认值
  - JWT_SECRET 未设置时随机生成（重启后 Token 失效）
  - ADMIN_PASSWORD 未设置时默认使用 admin123（生产环境建议设置）

#### 新增文件
- `backend/src/middleware/validator.js` - 请求验证中间件
- `backend/src/utils/security.js` - 安全工具函数
- `backend/src/routes/photos.js` - 照片路由（新增）
- `backend/.env.example` - 环境变量示例文件

#### 体验优化
- **全屏图片预览**：点击相册照片全屏显示
  - 半透明背景（75%透明度）
  - 支持左右切换浏览
  - 显示图片计数（如 1/5）
  - 铺满整个页面显示

### v0.9.7 (2025-02-13)

#### 新增功能
- **家庭相册**：支持家庭合照管理
  - 详情面板新增"个人相册"和"家庭相册"标签切换
  - 上传时自动根据当前标签保存到对应相册
  - 家庭相册显示该成员所在家庭的所有合照
- **照片存储结构优化**：个人照片和家庭照片分别存储在 `members/` 和 `families/` 目录下

#### 优化改进
- **配偶显示顺序**：改用成员创建时间排序，移除 `first_parent_id` 字段
- **界面细节优化**：相册标题改为"相册"，移除文字选择限制

#### 代码优化
- **Bug 修复**：修复头像 URL 路径错误（添加缺失的 `members/` 目录）
- **死代码清理**：注释掉未使用的上传对话框、`toggleDrawer` 函数等代码
- **代码简化**：使用 `fs.rmSync` 简化目录删除逻辑
- **管理员功能修复**：修复管理员跨家族查找成员/家庭的相关接口

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
