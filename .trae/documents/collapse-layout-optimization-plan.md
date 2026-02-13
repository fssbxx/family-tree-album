# 折叠子树布局优化计划

## 问题描述

当前折叠子树后，整体占用空间没有变化。需要改成：
- 折叠的子树宽度不计算
- 重新排布布局，让其他内容显示更紧凑

## 当前实现分析

**FamilyNode.vue**:
- 使用 `isCollapsed` ref 控制折叠状态（组件内部状态）
- 折叠时通过 `v-if="!isCollapsed"` 隐藏子节点
- 但布局计算 `calculateLayout()` 在折叠前已完成，包含了所有子树宽度

**布局计算流程**:
1. `FamilyTreeChart.vue` 调用 `calculateLayout()` 计算整个树
2. `calculateLayout()` 递归计算所有子节点，不管是否折叠
3. 子节点宽度累加到父节点

## 解决方案

### 方案：动态布局重计算

当节点折叠/展开时，触发重新计算整个树的布局。

#### 修改点 1: FamilyNode.vue - 传递折叠状态

```javascript
// 将折叠状态提升到布局对象中
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  // 更新布局对象的折叠状态
  if (props.layout) {
    props.layout.isCollapsed = isCollapsed.value
  }
  // 通知父组件重新计算布局
  emit('layout-changed')
}
```

#### 修改点 2: calculateLayout 函数 - 考虑折叠状态

```javascript
export function calculateLayout(family, parent = null, depth = 0, collapsedIds = new Set()) {
  // ... 原有代码 ...
  
  // 检查当前节点是否被折叠
  const isCollapsed = collapsedIds.has(family.id)
  
  // 1. 递归计算所有子节点的布局（后序遍历）
  // 如果当前节点折叠，不计算子节点
  const children = isCollapsed ? [] : (family.children?.map(child => 
    calculateLayout(child, null, depth + 1, collapsedIds)
  ) || [])
  
  // ... 后续逻辑不变 ...
}
```

#### 修改点 3: FamilyTreeChart.vue - 响应布局变化

```javascript
// 添加折叠状态管理
const collapsedFamilyIds = ref(new Set())

const rootLayout = computed(() => {
  if (!props.members || props.members.length === 0) return null
  
  // ... 找到根节点 ...
  
  // 阶段1：后序遍历计算布局（传入折叠状态）
  const layout = calculateLayout(rootFamily, null, 0, collapsedFamilyIds.value)
  
  // 阶段2：先序遍历分配坐标
  assignCoordinates(layout, 0, 0)
  
  return layout
})

// 处理布局变化
const onLayoutChanged = () => {
  // 强制重新计算布局
  // Vue 的 computed 会自动处理
}
```

#### 修改点 4: 组件间通信

```vue
<!-- FamilyTreeChart.vue -->
<family-node
  :layout="rootLayout"
  :selected-member-id="selectedMemberId"
  :collapsed-ids="collapsedFamilyIds"
  @select-member="onSelectMember"
  @toggle-collapse="onToggleCollapse"
/>

<!-- FamilyNode.vue -->
<family-node
  v-for="child in visibleChildren"
  :layout="child"
  :selected-member-id="selectedMemberId"
  :collapsed-ids="collapsedIds"
  @toggle-collapse="$emit('toggle-collapse', $event)"
/>
```

## 实施步骤

1. **修改 FamilyTreeChart.vue**
   - 添加 `collapsedFamilyIds` 响应式状态
   - 传递给子组件
   - 处理折叠事件

2. **修改 FamilyNode.vue**
   - 接收 `collapsedIds` prop
   - 折叠时通知父组件
   - 移除内部 `isCollapsed` ref，改用 prop

3. **修改 calculateLayout 函数**
   - 添加 `collapsedIds` 参数
   - 折叠时不计算子节点

4. **测试验证**
   - 折叠子树后宽度减小
   - 展开后恢复原状
   - 多层折叠正常工作

## 风险分析

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| 布局抖动 | 中 | 添加过渡动画 |
| 性能问题 | 低 | 只有折叠时重计算，不是持续操作 |
| 状态同步 | 低 | 使用 Vue 的响应式系统 |

## 预计时间

1-2小时
