<template>
  <div class="tree-chart">
    <div v-if="!rootLayout" class="empty-tree">
      <el-empty description="暂无成员，请先添加" />
    </div>
    <div v-else class="tree-container" :style="containerStyle">
      <family-node
        :layout="rootLayout"
        :selected-member-id="selectedMemberId"
        :collapsed-ids="collapsedFamilyIds"
        @select-member="onSelectMember"
        @toggle-collapse="onToggleCollapse"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FamilyNode, { calculateLayout, assignCoordinates } from './FamilyNode.vue'

const props = defineProps({
  members: {
    type: Array,
    default: () => []
  },
  selectedMemberId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['select-member'])

// 折叠状态管理 - 存储被折叠的家庭ID
const collapsedFamilyIds = ref(new Set())

// 处理折叠/展开事件
const onToggleCollapse = (familyId) => {
  const newSet = new Set(collapsedFamilyIds.value)
  if (newSet.has(familyId)) {
    newSet.delete(familyId)
  } else {
    newSet.add(familyId)
  }
  collapsedFamilyIds.value = newSet
}

// 计算布局
const rootLayout = computed(() => {
  if (!props.members || props.members.length === 0) return null
  
  // 找到根节点（没有父母的节点，或 hasParent 为 false）
  let rootFamily = props.members.find(f => !f.hasParent)
  if (!rootFamily && props.members.length > 0) {
    // 如果没有 hasParent 标记，取第一个
    rootFamily = props.members[0]
  }
  
  if (!rootFamily) return null
  
  // 确保根节点有 children 数组
  if (!rootFamily.children) {
    rootFamily.children = []
  }
  
  // 阶段1：后序遍历计算布局（传入折叠状态）
  const layout = calculateLayout(rootFamily, null, 0, collapsedFamilyIds.value)
  
  // 阶段2：先序遍历分配坐标（Walker算法第二阶段）
  assignCoordinates(layout, 0, 0)
  
  return layout
})

// 容器样式
const containerStyle = computed(() => {
  if (!rootLayout.value) return {}
  
  return {
    width: `${rootLayout.value.width}px`,
    minWidth: `${rootLayout.value.width}px`
  }
})

const onSelectMember = (member) => {
  emit('select-member', member)
}
</script>

<script>
export default {
  name: 'FamilyTreeChart'
}
</script>

<style scoped>
.tree-chart {
  padding: 20px;
  min-width: 100%;
}

.tree-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
}

.empty-tree {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
</style>
