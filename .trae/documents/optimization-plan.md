# 家族相册项目优化执行计划（最终版）

## 概述

本计划为最终确认版本，包含所有已确定的优化任务。

**已确定事项**:
- 文件命名规则: 个人照片 `{成员名}_{序号}.jpg`, 家庭照片 `{父亲名}_{母亲名}_{序号}.jpg`
- 每个成员/家庭独立计数 (001, 002...)
- **缩略图生成暂缓**
- **头像懒加载不实施**
- **数据缓存暂缓**

---

## 最终实施清单

### 必选任务

| 任务 | 说明 | 预计时间 |
|------|------|----------|
| **Task 8** | 文件上传安全（新命名规则 + 路径安全） | 1-2小时 |
| **Task 9** | 输入验证增强 | 1小时 |

### 暂缓任务

| 任务 | 原因 |
|------|------|
| Task 1 (缩略图) | 照片不多时作用有限 |
| Task 2 (图片懒加载) | 用户选择不实施 |
| Task 3 (数据缓存) | 当前数据量小 |
| Task 4 (渲染优化) | 头像懒加载不实施，其他优化价值有限 |

---

## Task 8: 增强文件上传安全

### 目标
防止路径遍历攻击，使用规范的文件命名规则。

### 实施步骤

#### 步骤 1: 创建安全工具模块
**文件**: `backend/src/utils/security.js`

**功能**:
- `sanitizeMemberName()`: 清理成员名，移除危险字符
- `isPathSafe()`: 验证文件路径是否在允许的目录内
- `isAllowedImageType()`: 验证文件类型
- `getNextPhotoNumber()`: 获取下一个照片序号

#### 步骤 2: 更新 photos.js 路由
**文件**: `backend/src/routes/photos.js`

**新的命名逻辑**:
```javascript
// 个人照片: 张三_001.jpg
const filename = `${memberName}_${nextNumber.toString().padStart(3, '0')}.jpg`;

// 家庭照片: 张三_李四_001.jpg
const filename = `${fatherName}_${motherName}_${nextNumber.toString().padStart(3, '0')}.jpg`;
```

---

## Task 9: 输入验证增强

### 目标
统一后端 API 的输入验证。

### 验证规则
- 成员名称: 1-50字符，不含 `\ / : * ? " < > |`
- 日期: YYYY-MM-DD 格式
- 密码: 4-50字符
- ID: 正整数

### 实施步骤

#### 步骤 1: 创建验证中间件
**文件**: `backend/src/middleware/validator.js`

#### 步骤 2: 更新路由文件
**文件**: 
- `backend/src/routes/members.js`
- `backend/src/routes/familyTrees.js`
- `backend/src/routes/families.js`

---

## 实施顺序

```
Task 8 → Task 9
```

**总预计时间**: 2-3小时

---

## 确认

以上计划已最终确认，将开始实施。
