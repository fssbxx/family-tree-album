# 家族描述显示功能计划

## 需求
把管理员设置的家族描述显示在页面上家族名称后面，小字浅灰色。

## 当前状态

### 后端
- API 已返回 `description` 字段（familyTrees.js）
- 登录接口返回 `familyTreeName`，但不返回 `description`

### 前端
- `auth.js` store 存储了 `familyTreeName`，没有存储 `description`
- `FamilyTree.vue` 第69行显示家族名称：`{{ treeName || '默认家族' }}`

## 修改方案

### 1. 修改后端登录接口返回 description

**文件**: `backend/src/middleware/auth.js`

在登录成功返回时，增加 `familyTreeDescription` 字段。

### 2. 修改前端 auth store

**文件**: `frontend/src/stores/auth.js`

- 添加 `familyTreeDescription` 状态
- 登录时存储描述
- 退出时清除描述

### 3. 修改前端 FamilyTree.vue

**文件**: `frontend/src/views/FamilyTree.vue`

- 添加 `treeDescription` computed 属性
- 在家族名称后面显示描述（小字浅灰色）
- 切换家族时更新描述

## 详细修改

### 修改 1: backend/src/middleware/auth.js

```javascript
// 登录成功返回时添加 description
res.json({ 
  token, 
  role,
  familyTreeId: tree.id,
  familyTreeName: tree.name,
  familyTreeDescription: tree.description  // 新增
});
```

### 修改 2: frontend/src/stores/auth.js

```javascript
// state 添加
familyTreeDescription: sessionStorage.getItem('familyTreeDescription') || null

// login action 添加
this.familyTreeDescription = familyTreeDescription
if (familyTreeDescription) sessionStorage.setItem('familyTreeDescription', familyTreeDescription)

// logout action 添加
this.familyTreeDescription = null
sessionStorage.removeItem('familyTreeDescription')
```

### 修改 3: frontend/src/views/FamilyTree.vue

```html
<!-- 修改第69行 -->
<div class="toolbar-left">
  <span class="tree-name">{{ treeName || '默认家族' }}</span>
  <span v-if="treeDescription" class="tree-description">{{ treeDescription }}</span>
</div>
```

```javascript
// 添加 computed
const treeDescription = computed(() => authStore.familyTreeDescription)

// 切换家族时更新描述 (约1286行)
authStore.familyTreeDescription = currentTree.description
sessionStorage.setItem('familyTreeDescription', currentTree.description || '')
```

```css
/* 添加样式 */
.tree-description {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
```
