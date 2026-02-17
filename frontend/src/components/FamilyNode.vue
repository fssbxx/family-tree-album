<template>
  <div class="family-node-wrapper" v-if="layout">
    <!-- 渲染当前家庭单元 -->
    <div class="family-unit" :style="unitStyle">
      <!-- 向上连接线 -->
      <div v-if="layout.parent" class="line-up"></div>
      
      <!-- 折叠/展开按钮 -->
      <div 
        v-if="layout.family.children && layout.family.children.length > 0" 
        class="collapse-btn"
        :class="{ collapsed: isCollapsed }"
        @click.stop="toggleCollapse"
      >
        <el-icon :size="18">
          <ArrowDown v-if="!isCollapsed" />
          <ArrowRight v-else />
        </el-icon>
      </div>
      
      <!-- 父母卡片 -->
      <div class="parents-container" :style="parentsStyle">
        <!-- 根据创建时间决定显示顺序：创建早的排在左边 -->
        <template v-if="firstParentIsMother">
          <!-- 母亲排在左边 -->
          <template v-if="layout.family.mother">
            <div
              class="person-card female"
              :class="{ selected: selectedMemberId === layout.family.mother.id }"
              @click="selectPerson(layout.family.mother)"
            >
              <div class="photo-area">
                <img v-if="layout.family.mother.avatar" :src="layout.family.mother.avatar" class="avatar-img" />
                <span v-else class="initials">{{ getInitials(layout.family.mother.name) }}</span>
              </div>
              <div class="name-area">
                <span class="name">{{ layout.family.mother.name }}</span>
              </div>
            </div>
          </template>
          <template v-if="layout.family.father">
            <div
              class="person-card male"
              :class="{ selected: selectedMemberId === layout.family.father.id }"
              @click="selectPerson(layout.family.father)"
            >
              <div class="photo-area">
                <img v-if="layout.family.father.avatar" :src="layout.family.father.avatar" class="avatar-img" />
                <span v-else class="initials">{{ getInitials(layout.family.father.name) }}</span>
              </div>
              <div class="name-area">
                <span class="name">{{ layout.family.father.name }}</span>
              </div>
            </div>
          </template>
        </template>
        <template v-else>
          <!-- 默认：父亲排在左边 -->
          <template v-if="layout.family.father">
            <div
              class="person-card male"
              :class="{ selected: selectedMemberId === layout.family.father.id }"
              @click="selectPerson(layout.family.father)"
            >
              <div class="photo-area">
                <img v-if="layout.family.father.avatar" :src="layout.family.father.avatar" class="avatar-img" />
                <span v-else class="initials">{{ getInitials(layout.family.father.name) }}</span>
              </div>
              <div class="name-area">
                <span class="name">{{ layout.family.father.name }}</span>
              </div>
            </div>
          </template>
          <template v-if="layout.family.mother">
            <div
              class="person-card female"
              :class="{ selected: selectedMemberId === layout.family.mother.id }"
              @click="selectPerson(layout.family.mother)"
            >
              <div class="photo-area">
                <img v-if="layout.family.mother.avatar" :src="layout.family.mother.avatar" class="avatar-img" />
                <span v-else class="initials">{{ getInitials(layout.family.mother.name) }}</span>
              </div>
              <div class="name-area">
                <span class="name">{{ layout.family.mother.name }}</span>
              </div>
            </div>
          </template>
        </template>
      </div>
      
      <!-- 向下连接线 -->
      <div v-if="layout.children.length > 0 && !isCollapsed" class="lines-down">
        <!-- 主竖线 -->
        <div class="main-vertical-line"></div>
        <!-- 水平分叉线 -->
        <div class="horizontal-line" :style="horizontalLineStyle"></div>
        <!-- 到各子女的垂线 -->
        <div 
          v-for="child in layout.children" 
          :key="child.family.id"
          class="vertical-line"
          :style="getVerticalLineStyle(child)"
        ></div>
      </div>
    </div>
    
    <!-- 渲染子女 -->
    <div v-if="layout.children.length > 0 && !isCollapsed" class="children-row" :style="childrenRowStyle">
      <div
        v-for="child in layout.children"
        :key="child.family.id"
        class="child-wrapper"
        :style="getChildWrapperStyle(child)"
      >
        <family-node
          :layout="child"
          :selected-member-id="selectedMemberId"
          :collapsed-ids="collapsedIds"
          @select-member="onSelectMember"
          @toggle-collapse="$emit('toggle-collapse', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  layout: {
    type: Object,
    default: null
  },
  selectedMemberId: {
    type: Number,
    default: null
  },
  collapsedIds: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['select-member', 'toggle-collapse'])

// 从 props 计算当前是否折叠
const isCollapsed = computed(() => {
  return props.collapsedIds.has(props.layout?.family?.id)
})

// 切换折叠状态
const toggleCollapse = () => {
  if (props.layout?.family?.id) {
    emit('toggle-collapse', props.layout.family.id)
  }
}

const getInitials = (name) => name?.charAt(0) || '?'
const selectPerson = (member) => emit('select-member', member)
const onSelectMember = (member) => emit('select-member', member)

// 判断显示顺序：创建时间早的成员排在左边
const firstParentIsMother = computed(() => {
  const family = props.layout?.family
  if (!family?.father || !family?.mother) return false
  return new Date(family.mother.created_at) < new Date(family.father.created_at)
})

// 单元整体样式
const unitStyle = computed(() => {
  if (!props.layout) return {}
  return {
    width: `${props.layout.width}px`
  }
})

// 父母容器样式 - 居中于单元
const parentsStyle = computed(() => {
  if (!props.layout) return {}
  const hasBoth = props.layout.family.father && props.layout.family.mother
  const parentsWidth = hasBoth ? 208 : 100
  const left = (props.layout.width - parentsWidth) / 2
  
  return {
    left: `${left}px`
  }
})

// 子女行样式
const childrenRowStyle = computed(() => {
  if (!props.layout || props.layout.children.length === 0) return {}
  
  return {
    width: '100%'
  }
})

// 水平分叉线样式
const horizontalLineStyle = computed(() => {
  if (!props.layout || props.layout.children.length === 0) return {}
  
  const firstChild = props.layout.children[0]
  const lastChild = props.layout.children[props.layout.children.length - 1]
  
  // 从第一个子女中心到最后一个子女中心
  const left = firstChild.x - props.layout.x + firstChild.width / 2
  const right = props.layout.width - (lastChild.x - props.layout.x + lastChild.width / 2)
  
  return {
    left: `${left}px`,
    right: `${right}px`
  }
})

// 垂线样式
const getVerticalLineStyle = (child) => {
  const left = child.x - props.layout.x + child.width / 2
  return {
    left: `${left}px`
  }
}

// 子节点包装器样式
const getChildWrapperStyle = (child) => {
  const left = child.x - props.layout.x
  return {
    position: 'absolute',
    left: `${left}px`,
    width: `${child.width}px`
  }
}
</script>

<script>
// ============================================
// Walker 算法 - 树形布局实现
// ============================================

const NODE_WIDTH = 100
const COUPLE_GAP = 8
const LEVEL_HEIGHT = 180
const SIBLING_GAP = 40

/**
 * 计算家庭单元的自身宽度
 */
function getUnitWidth(family) {
  const hasBoth = family.father && family.mother
  return hasBoth ? NODE_WIDTH * 2 + COUPLE_GAP : NODE_WIDTH
}

/**
 * Walker 算法 - 第一阶段：后序遍历计算布局
 * 
 * 核心思想：
 * 1. 自底向上递归计算每个子树的布局
 * 2. 每个子树计算其实际宽度（考虑所有子孙）
 * 3. 从左到右放置子节点，确保子树不重叠
 * 4. 父节点居中于最左和最右子节点之间
 * 
 * @param {Object} family - 家庭数据
 * @param {Object} parent - 父节点布局对象
 * @param {number} depth - 当前深度
 * @param {Set} collapsedIds - 被折叠的家庭ID集合
 * @returns {Object} 布局节点
 */
export function calculateLayout(family, parent = null, depth = 0, collapsedIds = new Set()) {
  // 检查当前节点是否被折叠
  const isCollapsed = collapsedIds.has(family.id)
  
  // 1. 递归计算所有子节点的布局（后序遍历）
  // 如果当前节点折叠，不计算子节点
  const children = isCollapsed ? [] : (family.children?.map(child => 
    calculateLayout(child, null, depth + 1, collapsedIds)
  ) || [])
  
  // 2. 计算当前节点的自身宽度
  const selfWidth = getUnitWidth(family)
  
  // 3. 计算子树的实际宽度和位置
  let totalWidth = selfWidth
  
  if (children.length > 0) {
    // 3.1 计算每个子树的实际宽度（已经包含在 child.width 中）
    // 3.2 从左到右放置子节点，确保不重叠
    
    // 第一个子节点从 0 开始
    let currentX = 0
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      
      if (i === 0) {
        // 第一个子节点
        child.relativeX = 0
        currentX = child.width
      } else {
        // 后续子节点：需要确保与前面的子树不重叠
        const prevChild = children[i - 1]
        
        // 计算最小间距（前一个子树的右边界到当前子树的左边界）
        const minGap = SIBLING_GAP
        
        // 前一个子树的右边界位置（相对于父节点）
        const prevRightEdge = prevChild.relativeX + prevChild.width
        
        // 当前子节点应该放置的位置
        child.relativeX = prevRightEdge + minGap
        
        currentX = child.relativeX + child.width
      }
    }
    
    // 3.3 计算所有子节点的总宽度
    const childrenTotalWidth = currentX
    
    // 3.4 让子节点整体居中于父节点
    // 如果子节点总宽度大于父节点自身宽度，需要扩展父节点宽度
    totalWidth = Math.max(selfWidth, childrenTotalWidth)
    
    // 计算偏移量，使子节点居中
    const offset = (totalWidth - childrenTotalWidth) / 2
    
    // 应用偏移量到所有子节点
    for (const child of children) {
      child.relativeX += offset
    }
  }
  
  // 4. 创建布局节点
  const layoutNode = {
    family,
    parent,
    children,
    depth,
    width: totalWidth,
    selfWidth,
    relativeX: 0,   // 相对于父节点的X偏移
    x: 0,           // 绝对X坐标（第二阶段计算）
    y: depth * LEVEL_HEIGHT,
    mod: 0,         // Walker算法的mod值（用于延迟偏移）
    isCollapsed    // 标记是否折叠
  }
  
  // 5. 设置子节点的父节点引用
  for (const child of children) {
    child.parent = layoutNode
  }
  
  return layoutNode
}

/**
 * Walker 算法 - 第二阶段：先序遍历分配绝对坐标
 * 
 * 从根节点开始，根据相对偏移计算绝对坐标
 * 
 * @param {Object} node - 布局节点
 * @param {number} parentX - 父节点的绝对X坐标
 * @param {number} modSum - 累积的mod偏移量
 */
export function assignCoordinates(node, parentX = 0, modSum = 0) {
  // 计算当前节点的绝对X坐标
  // x = 父节点x + 相对偏移 + 累积mod偏移
  node.x = parentX + node.relativeX + modSum + node.mod
  
  // 累积mod偏移传递给子节点
  const newModSum = modSum + node.mod
  
  // 递归为子节点分配坐标
  for (const child of node.children) {
    assignCoordinates(child, node.x, newModSum)
  }
}

export default {
  name: 'FamilyNode'
}
</script>

<style scoped>
.family-node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 0;
}

.family-node-wrapper:first-child {
  margin-top: 0;
}

.family-unit {
  position: relative;
  height: 140px;
}

.parents-container {
  position: absolute;
  top: 0;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.person-card {
  width: 100px;
  height: 166px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.person-card.male { border: 1px solid #409eff; }
.person-card.female { border: 1px solid #ff69b4; }
.person-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15); }
.person-card.selected { box-shadow: 0 0 0 4px #ffd700, 0 8px 20px rgba(0, 0, 0, 0.15); }

.photo-area {
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  flex-shrink: 0;
}

.person-card.male .photo-area { background: linear-gradient(135deg, #e6f2ff 0%, #c2e0ff 100%); }
.person-card.female .photo-area { background: linear-gradient(135deg, #ffe6f0 0%, #ffc2e0 100%); }

.initials {
  font-size: 36px;
  font-weight: bold;
  color: #606266;
}

.person-card.male .initials { color: #409eff; }
.person-card.female .initials { color: #ff69b4; }

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.name-area {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-top: 1px solid #ebeef5;
  padding: 0 8px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-align: center;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 折叠/展开按钮 */
.collapse-btn {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  color: #999;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  color: #409eff;
  transform: translateX(-50%) scale(1.2);
}

.collapse-btn.collapsed {
  color: #409eff;
}

/* 向上连接线 */
.line-up {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 40px;
  background: #999;
}

/* 向下连接线容器 */
.lines-down {
  position: absolute;
  bottom: -80px;
  left: 0;
  right: 0;
  height: 80px;
  pointer-events: none;
}

/* 主竖线 */
.main-vertical-line {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 40px;
  background: #999;
}

/* 水平分叉线 */
.horizontal-line {
  position: absolute;
  top: 40px;
  height: 3px;
  background: #999;
}

/* 垂线 */
.vertical-line {
  position: absolute;
  top: 40px;
  width: 3px;
  height: 40px;
  background: #999;
  transform: translateX(-50%);
}

/* 子女行 */
.children-row {
  position: relative;
  height: 0;
  margin-top: 80px;
}

/* 子节点包装器 */
.child-wrapper {
  position: absolute;
  top: 0;
}
</style>
