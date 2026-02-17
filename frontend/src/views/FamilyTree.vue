<template>
  <div class="family-tree-page">
    <!-- 全屏图片预览 -->
    <div v-if="fullscreenImage" class="fullscreen-preview">
      <!-- 关闭按钮 -->
      <div class="preview-close" @click="closeFullscreen">
        <el-icon :size="24"><Close /></el-icon>
      </div>
      <!-- 左右切换按钮 -->
      <div v-if="fullscreenImages.length > 1" class="preview-nav preview-prev" @click.stop="prevImage">
        <el-icon :size="32"><ArrowLeft /></el-icon>
      </div>
      <div v-if="fullscreenImages.length > 1" class="preview-nav preview-next" @click.stop="nextImage">
        <el-icon :size="32"><ArrowRight /></el-icon>
      </div>
      <!-- 图片计数 -->
      <div v-if="fullscreenImages.length > 1" class="preview-counter">
        {{ fullscreenIndex + 1 }} / {{ fullscreenImages.length }}
      </div>
      <!-- 图片 -->
      <img :src="fullscreenImage" alt="预览" @click.stop />
    </div>

    <header class="top-bar">
      <h1 class="title">家族相册</h1>
      <div class="top-bar-actions">
        <el-dropdown v-if="isAdmin" @command="switchFamily" class="family-switcher">
          <el-button type="primary" text>
            <el-icon><Switch /></el-icon>切换家族
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="tree in allTrees"
                :key="tree.id"
                :command="tree.id"
                :disabled="treeId && tree.id === parseInt(treeId)"
              >
                {{ tree.name }}
                <el-tag v-if="treeId && tree.id === parseInt(treeId)" size="small" type="success">当前</el-tag>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button v-if="isAdmin" type="primary" text @click="openAdmin">
          <el-icon><Setting /></el-icon>管理
        </el-button>
        <el-button type="primary" text @click="logout">
          <el-icon><SwitchButton /></el-icon>退出
        </el-button>
      </div>
    </header>

    <div class="content-wrapper">
      <!-- 管理员未选择家族时显示提示 -->
      <div v-if="isAdmin && !treeId" class="admin-no-family">
        <el-empty description="请先选择一个家族">
          <template #default>
            <p style="color: #909399; margin: 16px 0;">作为管理员，您需要选择一个家族才能查看族谱</p>
            <el-button type="primary" @click="openAdmin">打开管理面板选择家族</el-button>
          </template>
        </el-empty>
      </div>
      <div v-else class="main-layout">
        <!-- 族谱区域 全屏 -->
        <div class="tree-area card">
          <div class="tree-toolbar">
            <div class="toolbar-left">
              <span class="tree-name">{{ treeName || '默认家族' }}</span>
              <span v-if="treeDescription" class="tree-description">{{ treeDescription }}</span>
            </div>
            <div class="toolbar-right">
              <el-button-group>
                <el-button size="small" @click="zoomIn">
                  <el-icon><Plus /></el-icon>
                </el-button>
                <el-button size="small" @click="zoomOut">
                  <el-icon><Minus /></el-icon>
                </el-button>
                <el-button size="small" @click="resetZoom">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </el-button-group>
              <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
            </div>
          </div>
          <div
            class="tree-canvas"
            ref="treeCanvas"
            @mousedown="startDrag"
            @mousemove="onDrag"
            @mouseup="endDrag"
            @mouseleave="endDrag"
            @wheel.prevent="onWheel"
            @click="onCanvasClick"
          >
            <div
              class="tree-content"
              :style="treeContentStyle"
            >
              <family-tree-chart
                :members="treeData"
                :selected-member-id="selectedMember?.id"
                @select-member="onSelectMember"
              />
            </div>
          </div>
        </div>



        <!-- 右侧详情抽屉 -->
        <div
          class="detail-panel card"
          :class="{ 'drawer-open': isDrawerOpen && selectedMember }"
        >
          <template v-if="selectedMember">
            <div class="detail-header">
              <h3>个人信息</h3>
              <el-icon class="close-btn" @click="closeDrawer(); selectedMember = null"><Close /></el-icon>
            </div>

            <div class="detail-content">
              <!-- 第一栏：基本信息 -->
              <div class="section basic-info-section">
                <div class="basic-info-layout">
                  <!-- 左侧：证件照头像 -->
                  <div class="avatar-section">
                    <div class="id-photo-frame" @click="selectAvatar">
                      <img v-if="selectedMember.avatar" :src="selectedMember.avatar" class="id-photo" />
                      <div v-else class="empty-frame">
                        <el-icon :size="24" color="#c0c4cc"><Plus /></el-icon>
                        <span class="placeholder-text">选择头像</span>
                      </div>
                    </div>
                  </div>
                  <!-- 右侧：信息 -->
                  <div class="info-section">
                    <template v-if="isEditor">
                      <div class="compact-form">
                        <div class="form-row">
                          <label>姓名</label>
                          <el-input v-model="editForm.name" size="small" @blur="autoSaveMember" @keyup.enter="autoSaveMember" />
                        </div>
                        <div class="form-row">
                          <label>性别</label>
                          <el-radio-group v-model="editForm.gender" size="small" @change="autoSaveMember">
                            <el-radio label="male">男</el-radio>
                            <el-radio label="female">女</el-radio>
                          </el-radio-group>
                        </div>
                        <div class="form-row">
                          <label>生日</label>
                          <el-date-picker
                            v-model="editForm.birthDate"
                            type="date"
                            size="small"
                            placeholder="选择日期"
                            format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD"
                            style="flex: 1; --el-date-editor-width: 100%;"
                            class="compact-date-picker"
                            :editable="false"
                            @change="autoSaveMember"
                          />
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="info-list">
                        <div class="info-row">
                          <span class="label">姓名</span>
                          <span class="value">{{ selectedMember.name }}</span>
                        </div>
                        <div class="info-row">
                          <span class="label">性别</span>
                          <span class="value">{{ selectedMember.gender === 'male' ? '男' : '女' }}</span>
                        </div>
                        <div class="info-row">
                          <span class="label">生日</span>
                          <span class="value">{{ selectedMember.birth_date || '-' }}</span>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <el-divider />

              <!-- 第二栏：添加成员 -->
              <div v-if="isEditor" class="section add-member-section">
                <div class="add-buttons">
                  <el-button 
                    size="small" 
                    @click="addParent" 
                    :disabled="hasParent"
                    :title="hasParent ? '该成员已有父母' : ''"
                  >
                    <el-icon><Plus /></el-icon>添加父母
                  </el-button>
                  <el-button size="small" @click="addChild">
                    <el-icon><Plus /></el-icon>添加子女
                  </el-button>
                  <el-button 
                    size="small" 
                    @click="addSpouse"
                    :disabled="hasSpouse"
                    :title="hasSpouse ? '该成员已有配偶' : ''"
                  >
                    <el-icon><Plus /></el-icon>添加配偶
                  </el-button>
                </div>
              </div>

              <el-divider v-if="isEditor" />

              <!-- 第三栏：相册 -->
              <div class="section photos-section-flex">
                <div class="section-header photo-tabs-header">
                  <el-radio-group v-model="activePhotoTab" size="small">
                    <el-radio-button label="personal">个人相册</el-radio-button>
                    <el-radio-button label="family">家庭相册</el-radio-button>
                  </el-radio-group>
                  <el-button v-if="isEditor" type="primary" size="small" text @click="triggerFileInput">
                    <el-icon><Upload /></el-icon>上传
                  </el-button>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    multiple
                    style="display: none"
                    @change="handleFileSelect"
                  />
                </div>
                <div class="photos-scroll-vertical">
                  <!-- 个人相册 -->
                  <template v-if="activePhotoTab === 'personal'">
                    <div v-for="(photo, index) in memberPhotos" :key="photo.filename" class="photo-item-grid">
                      <el-image
                        :src="`/photos/${photo.path}`"
                        fit="cover"
                        :preview-src-list="[]"
                        @click="openFullscreen(memberPhotos.map(p => `/photos/${p.path}`), index)"
                      >
                        <template #error>
                          <div class="image-error">
                            <el-icon><Picture /></el-icon>
                            <span>加载失败</span>
                          </div>
                        </template>
                      </el-image>
                      <el-button
                        v-if="isEditor"
                        class="delete-photo-btn"
                        type="danger"
                        size="small"
                        circle
                        @click.stop="deletePhoto(photo)"
                      >
                        <el-icon><Close /></el-icon>
                      </el-button>
                    </div>
                    <div v-if="memberPhotos.length === 0" class="no-photos-text">
                      暂无照片
                    </div>
                  </template>
                  <!-- 家庭相册 -->
                  <template v-else>
                    <div v-for="(photo, index) in familyPhotos" :key="photo.filename" class="photo-item-grid">
                      <el-image
                        :src="`/photos/${photo.path}`"
                        fit="cover"
                        :preview-src-list="[]"
                        @click="openFullscreen(familyPhotos.map(p => `/photos/${p.path}`), index)"
                      >
                        <template #error>
                          <div class="image-error">
                            <el-icon><Picture /></el-icon>
                            <span>加载失败</span>
                          </div>
                        </template>
                      </el-image>
                      <el-button
                        v-if="isEditor"
                        class="delete-photo-btn"
                        type="danger"
                        size="small"
                        circle
                        @click.stop="deleteFamilyPhoto(photo)"
                      >
                        <el-icon><Close /></el-icon>
                      </el-button>
                    </div>
                    <div v-if="familyPhotos.length === 0" class="no-photos-text">
                      暂无家庭照片
                    </div>
                  </template>
                </div>
              </div>

              <!-- 删除按钮 -->
              <div v-if="isEditor" class="delete-section">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="deleteMember"
                  :disabled="selectedMember?.id === 1"
                  :title="selectedMember?.id === 1 ? '初始成员禁止删除' : ''"
                >
                  删除成员
                </el-button>
              </div>
            </div>
          </template>
          <div v-else class="no-selection">
            <el-icon :size="48" color="#dcdfe6"><User /></el-icon>
            <p>点击族谱成员查看详情</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理面板对话框 -->
    <el-dialog v-model="showAdmin" title="管理面板" width="800px">
      <div class="admin-panel">
        <!-- 新建家族区域 -->
        <div class="create-section">
          <h4 class="section-title">新建家族</h4>
          <div class="create-form-row">
            <div class="form-field">
              <label class="field-label">家族名称</label>
              <el-input v-model="newTreeForm.name" placeholder="请输入家族名称" size="small" />
            </div>
            <div class="form-field">
              <label class="field-label">描述</label>
              <el-input v-model="newTreeForm.description" placeholder="家族描述（可选）" size="small" />
            </div>
            <div class="form-field">
              <label class="field-label">查看密码</label>
              <el-input
                v-model="newTreeForm.viewPassword"
                placeholder="用于查看族谱"
                size="small"
                show-password
              />
            </div>
            <div class="form-field">
              <label class="field-label">编辑密码</label>
              <el-input
                v-model="newTreeForm.editPassword"
                placeholder="用于编辑族谱"
                size="small"
                show-password
              />
            </div>
            <div class="form-actions">
              <el-button type="primary" size="small" @click="createTree">创建</el-button>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 家族列表区域 -->
        <div class="list-section">
          <h4 class="section-title">所有家族</h4>
          <el-table :data="allTrees" size="small" style="width: 100%" max-height="300">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="家族名称" />
            <el-table-column prop="view_password" label="查看密码" width="120" />
            <el-table-column prop="edit_password" label="编辑密码" width="120" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="primary" size="small" text @click="editTree(row)">编辑</el-button>
                <el-button type="danger" size="small" text @click="deleteTree(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑家族对话框 -->
    <el-dialog v-model="showEditTree" title="编辑家族" width="500px">
      <el-form label-width="100px">
        <el-form-item label="家族名称">
          <el-input v-model="editTreeForm.name" />
        </el-form-item>
        <el-form-item label="查看密码">
          <el-input v-model="editTreeForm.viewPassword" placeholder="留空表示不修改" />
        </el-form-item>
        <el-form-item label="编辑密码">
          <el-input v-model="editTreeForm.editPassword" placeholder="留空表示不修改" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editTreeForm.description" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditTree = false">取消</el-button>
        <el-button type="primary" @click="saveTreeEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 选择头像对话框 -->
    <el-dialog v-model="avatarSelectVisible" title="选择头像" width="600px" :close-on-click-modal="false">
      <div v-if="memberPhotos.length === 0" class="no-photos-for-avatar">
        <el-empty description="暂无照片，请先上传照片" />
      </div>
      <div v-else-if="!cropperVisible" class="avatar-select-grid">
        <div 
          v-for="photo in memberPhotos" 
          :key="photo.filename" 
          class="avatar-option"
          :class="{ selected: selectedAvatar === photo.path }"
          @click="openCropper(photo)"
        >
          <el-image :src="`/photos/${photo.path}`" fit="cover" />
        </div>
      </div>
      <div v-else class="cropper-container">
        <div class="cropper-wrapper">
          <vue-cropper
            ref="cropperRef"
            :img="cropperImage"
            :output-size="{ width: 413, height: 579 }"
            :output-type="'jpeg'"
            :info="true"
            :can-scale="true"
            :auto-crop="true"
            :auto-crop-width="206"
            :auto-crop-height="289"
            :fixed="true"
            :fixed-number="[35, 49]"
            :full="true"
            :fixed-box="true"
            :can-move="true"
            :can-move-box="true"
            :original="false"
            :center-box="true"
            :high="true"
            :info-true="'white'"
            :max-img-size="2000"
            :enlarge="1"
            mode="contain"
          />
        </div>
        <div class="cropper-toolbar">
          <el-button-group>
            <el-button @click="rotateLeft">
              <el-icon><RefreshLeft /></el-icon> 左转
            </el-button>
            <el-button @click="rotateRight">
              <el-icon><RefreshRight /></el-icon> 右转
            </el-button>
            <el-button @click="cropperZoomIn">
              <el-icon><ZoomIn /></el-icon> 放大
            </el-button>
            <el-button @click="cropperZoomOut">
              <el-icon><ZoomOut /></el-icon> 缩小
            </el-button>
            <el-button @click="resetCropper">
              <el-icon><Refresh /></el-icon> 重置
            </el-button>
          </el-button-group>
        </div>
      </div>
      <template #footer>
        <template v-if="!cropperVisible">
          <el-button @click="avatarSelectVisible = false">取消</el-button>
        </template>
        <template v-else>
          <el-button @click="cropperVisible = false">返回选择</el-button>
          <el-button type="primary" @click="confirmCropAvatar">确认裁剪</el-button>
        </template>
      </template>
    </el-dialog>


  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import FamilyTreeChart from '../components/FamilyTreeChart.vue'
import { Plus, Minus, Refresh, User, Switch, Setting, Close, Picture, RefreshLeft, RefreshRight, ZoomIn, ZoomOut, SwitchButton } from '@element-plus/icons-vue'
import { VueCropper } from 'vue-cropper'
import 'vue-cropper/dist/index.css'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const treeId = computed(() => {
  if (route.path === '/admin') return null
  return route.params.treeId
})
const isAdmin = computed(() => authStore.isAdmin)
const isEditor = computed(() => authStore.isEditor)
const treeName = computed(() => authStore.familyTreeName)
const treeDescription = computed(() => authStore.familyTreeDescription)

// 判断当前选中成员是否已有父母
const hasParent = computed(() => {
  if (!selectedMember.value || !treeData.value.length) return false
  
  // 在树结构中查找包含当前成员的家庭
  const findParentFamily = (families) => {
    for (const family of families) {
      // 检查当前成员是否是这个家庭的子女
      if (family.children) {
        for (const childFamily of family.children) {
          if (childFamily.father_id === selectedMember.value.id || 
              childFamily.mother_id === selectedMember.value.id) {
            return true
          }
        }
      }
      // 递归检查子家庭
      if (family.children && findParentFamily(family.children)) {
        return true
      }
    }
    return false
  }
  
  return findParentFamily(treeData.value)
})

// 判断当前选中成员是否已有配偶（所在家庭是否已有两个人）
const hasSpouse = computed(() => {
  if (!selectedMember.value || !treeData.value.length) return false
  
  // 在树结构中查找包含当前成员的家庭
  const findCurrentFamily = (families) => {
    for (const family of families) {
      // 检查当前成员是否是这个家庭的父亲或母亲
      if (family.father_id === selectedMember.value.id || 
          family.mother_id === selectedMember.value.id) {
        // 检查这个家庭是否已有两个人（父亲和母亲都存在）
        return family.father_id && family.mother_id
      }
      // 递归检查子家庭
      if (family.children && findCurrentFamily(family.children)) {
        return true
      }
    }
    return false
  }
  
  return findCurrentFamily(treeData.value)
})

const treeData = ref([])
const allMembers = ref([])
const allFamilies = ref([]) // 所有家庭列表
const selectedMember = ref(null)
const memberPhotos = ref([])

// 相册标签状态
const activePhotoTab = ref('personal') // 'personal' | 'family'
const familyPhotos = ref([])
const memberFamily = ref(null) // 当前成员所在的家庭

// 抽屉状态
const isDrawerOpen = ref(false)

// 关闭抽屉
const closeDrawer = () => {
  isDrawerOpen.value = false
}

const editForm = ref({ name: '', gender: 'male', birthDate: '' })

// 头像选择
const avatarSelectVisible = ref(false)
const selectedAvatar = ref('')
const cropperVisible = ref(false)
const cropperRef = ref(null)
const cropperImage = ref('')
const currentPhotoPath = ref('')

// 管理面板
const showAdmin = ref(false)
const allTrees = ref([])

// 全屏图片预览
const fullscreenImages = ref([])
const fullscreenIndex = ref(0)
const fullscreenImage = computed(() => {
  if (fullscreenImages.value.length === 0) return ''
  return fullscreenImages.value[fullscreenIndex.value] || ''
})

// 打开全屏预览
const openFullscreen = (images, index = 0) => {
  fullscreenImages.value = images
  fullscreenIndex.value = index
}

// 关闭全屏预览
const closeFullscreen = () => {
  fullscreenImages.value = []
  fullscreenIndex.value = 0
}

// 上一张
const prevImage = () => {
  if (fullscreenIndex.value > 0) {
    fullscreenIndex.value--
  } else {
    fullscreenIndex.value = fullscreenImages.value.length - 1
  }
}

// 下一张
const nextImage = () => {
  if (fullscreenIndex.value < fullscreenImages.value.length - 1) {
    fullscreenIndex.value++
  } else {
    fullscreenIndex.value = 0
  }
}

// 新建家族表单
const newTreeForm = ref({
  name: '',
  viewPassword: '',
  editPassword: '',
  description: ''
})

// 编辑家族
const showEditTree = ref(false)
const editTreeForm = ref({
  id: null,
  name: '',
  viewPassword: '',
  editPassword: '',
  description: ''
})

const uploading = ref(false)

// 缩放和拖动相关
const scale = ref(0.8)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const treeCanvas = ref(null)

const treeContentStyle = computed(() => ({
  transform: `translateX(-50%) translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: 'center center',
  transition: isDragging.value ? 'none' : 'transform 0.2s ease'
}))

const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.1, 3)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.1, 0.3)
}

const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const onWheel = (e) => {
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

const startDrag = (e) => {
  isDragging.value = true
  dragStartX.value = e.clientX - translateX.value
  dragStartY.value = e.clientY - translateY.value
  if (treeCanvas.value) {
    treeCanvas.value.style.cursor = 'grabbing'
  }
}

const onDrag = (e) => {
  if (!isDragging.value) return
  translateX.value = e.clientX - dragStartX.value
  translateY.value = e.clientY - dragStartY.value
}

const endDrag = () => {
  isDragging.value = false
  if (treeCanvas.value) {
    treeCanvas.value.style.cursor = 'grab'
  }
}

const loadTreeData = async (id = treeId.value) => {
  if (!id) return
  try {
    const res = await axios.get(`/api/families/tree/${id}/structure`)
    // 如果没有家庭结构数据，将所有成员作为独立节点显示
    if (res.data.length === 0) {
      const membersRes = await axios.get(`/api/members/tree/${id}`)
      // 将成员转换为家庭结构格式
      treeData.value = membersRes.data.map(member => ({
        id: `member-${member.id}`,
        father_id: member.gender === 'male' ? member.id : null,
        mother_id: member.gender === 'female' ? member.id : null,
        father: member.gender === 'male' ? member : null,
        mother: member.gender === 'female' ? member : null,
        father_name: member.gender === 'male' ? member.name : null,
        mother_name: member.gender === 'female' ? member.name : null,
        children: []
      }))
    } else {
      treeData.value = res.data
    }
  } catch (error) {
    console.error('加载族谱失败:', error)
    ElMessage.error('加载族谱失败: ' + (error.response?.data?.error || error.message))
  }
}

const loadMembers = async (id = treeId.value) => {
  if (!id) return
  try {
    const res = await axios.get(`/api/members/tree/${id}`)
    allMembers.value = res.data
  } catch (error) {
    console.error(error)
  }
}

const loadFamilies = async (id = treeId.value) => {
  if (!id) return
  try {
    const res = await axios.get(`/api/families/tree/${id}`)
    allFamilies.value = res.data
  } catch (error) {
    console.error('加载家庭列表失败', error)
  }
}

const loadAllTrees = async () => {
  try {
    const res = await axios.get('/api/trees')
    allTrees.value = res.data
  } catch (error) {
    console.error('加载家族列表失败', error)
  }
}

const switchFamily = (treeId) => {
  router.push(`/tree/${treeId}`)
}

const loadMemberPhotos = async (memberId) => {
  try {
    const res = await axios.get(`/api/photos/member/${memberId}`)
    memberPhotos.value = res.data
  } catch (error) {
    memberPhotos.value = []
  }
}

const loadFamilyPhotos = async (familyId) => {
  if (!familyId) {
    familyPhotos.value = []
    return
  }
  try {
    const res = await axios.get(`/api/photos/family/${familyId}`)
    familyPhotos.value = res.data
  } catch (error) {
    familyPhotos.value = []
  }
}

const onSelectMember = (member) => {
  selectedMember.value = member
  editForm.value = {
    name: member.name,
    gender: member.gender,
    birthDate: member.birth_date || ''
  }
  // 查找成员所在的家庭
  findMemberFamily(member.id)
  loadMemberPhotos(member.id)
  // 自动打开抽屉
  isDrawerOpen.value = true
}

// 查找成员所在的家庭
const findMemberFamily = (memberId) => {
  // 在 allFamilies 中查找包含该成员的家庭
  const family = allFamilies.value.find(f => {
    return f.father_id === memberId || f.mother_id === memberId
  })
  if (family) {
    memberFamily.value = family
    loadFamilyPhotos(family.id)
  } else {
    memberFamily.value = null
    familyPhotos.value = []
  }
}

// 点击画布空白区域关闭抽屉
const onCanvasClick = (event) => {
  // 如果点击的是画布本身（而不是成员卡片），则关闭抽屉
  if (event.target === treeCanvas.value || event.target.classList.contains('tree-canvas')) {
    closeDrawer()
    selectedMember.value = null
  }
}

const saveMember = async () => {
  try {
    await axios.put(`/api/members/${selectedMember.value.id}`, editForm.value)
    ElMessage.success('保存成功')
    // 更新 selectedMember 的性别，确保添加配偶等操作使用最新数据
    if (selectedMember.value) {
      selectedMember.value.gender = editForm.value.gender
    }
    // 立即刷新 treeData，确保 hasSpouse 等计算属性使用最新数据
    await loadTreeData()
    loadMembers()
    loadFamilies()
  } catch (error) {
    const errorMsg = error.response?.data?.error || '保存失败'
    ElMessage.error(errorMsg)
  }
}

// 自动保存成员信息（防抖）
let saveTimeout = null
const autoSaveMember = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveMember()
  }, 500)
}

const deleteMember = async () => {
  try {
    const photoCount = memberPhotos.value.length
    const message = photoCount > 0 
      ? `<div style="color: #f56c6c; font-weight: bold; margin-bottom: 10px;">⚠️ 警告：此操作不可恢复！</div>
         <div>确定要删除成员 <strong>${selectedMember.value.name}</strong> 吗？</div>
         <div style="color: #e6a23c; margin-top: 8px;">该成员有 ${photoCount} 张照片，删除成员将同时删除所有照片！</div>`
      : `<div style="color: #f56c6c; font-weight: bold; margin-bottom: 10px;">⚠️ 警告：此操作不可恢复！</div>
         <div>确定要删除成员 <strong>${selectedMember.value.name}</strong> 吗？</div>`
    
    await ElMessageBox.confirm(
      message,
      '删除成员确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    await axios.delete(`/api/members/${selectedMember.value.id}`)
    ElMessage.success('删除成功')
    selectedMember.value = null
    memberPhotos.value = []
    loadTreeData()
    loadMembers()
    loadFamilies()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

const addParent = async () => {
  try {
    // 获取当前成员数量来生成ID
    const membersRes = await axios.get(`/api/members/tree/${treeId.value}`)
    const nextId = membersRes.data.length + 1
    const newMember = await axios.post(`/api/members/tree/${treeId.value}`, {
      name: `成员${nextId}`,
      gender: 'male',
      birthDate: '',
      relationType: 'parent',
      relatedMemberId: selectedMember.value?.id
    })
    ElMessage.success('父母添加成功')
    loadMembers()
    loadTreeData()
    loadFamilies()
    // 保持在原位置，不自动跳转到新成员
  } catch (error) {
    ElMessage.error('添加父母失败')
  }
}

const addChild = async () => {
  try {
    // 获取当前成员数量来生成ID
    const membersRes = await axios.get(`/api/members/tree/${treeId.value}`)
    const nextId = membersRes.data.length + 1
    const newMember = await axios.post(`/api/members/tree/${treeId.value}`, {
      name: `成员${nextId}`,
      gender: 'male',
      birthDate: '',
      relationType: 'child',
      relatedMemberId: selectedMember.value?.id
    })
    ElMessage.success('子女添加成功')
    loadMembers()
    loadTreeData()
    loadFamilies()
    // 保持在原位置，不自动跳转到新成员
  } catch (error) {
    ElMessage.error('添加子女失败')
  }
}

const addSpouse = async () => {
  try {
    // 获取当前成员数量来生成ID
    const membersRes = await axios.get(`/api/members/tree/${treeId.value}`)
    const nextId = membersRes.data.length + 1
    const newMember = await axios.post(`/api/members/tree/${treeId.value}`, {
      name: `成员${nextId}`,
      gender: selectedMember.value?.gender === 'male' ? 'female' : 'male',
      birthDate: '',
      relationType: 'spouse',
      relatedMemberId: selectedMember.value?.id
    })
    ElMessage.success('配偶添加成功')
    loadMembers()
    loadTreeData()
    loadFamilies()
    // 保持在原位置，不自动跳转到新成员
  } catch (error) {
    ElMessage.error('添加配偶失败')
  }
}

// 触发文件选择
const fileInput = ref(null)
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 检查文件大小（最大 20MB）
  const MAX_FILE_SIZE = 20 * 1024 * 1024
  const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE)
  if (oversizedFiles.length > 0) {
    ElMessage.error(`文件大小超过限制（最大20MB）：${oversizedFiles.map(f => f.name).join(', ')}`)
    event.target.value = ''
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    files.forEach(f => formData.append('photos', f))

    // 根据当前标签决定上传路径
    if (activePhotoTab.value === 'family' && memberFamily.value) {
      // 上传到家庭相册
      formData.append('type', 'family')
      formData.append('familyId', memberFamily.value.id)
    } else {
      // 上传到个人相册
      formData.append('type', 'personal')
      formData.append('memberIds', JSON.stringify([selectedMember.value.id]))
    }

    // 管理员需要传递 treeId
    if (isAdmin.value && treeId.value) {
      formData.append('treeId', treeId.value)
    }

    await axios.post('/api/photos/upload', formData)
    ElMessage.success('上传成功')

    // 刷新对应相册
    if (activePhotoTab.value === 'family' && memberFamily.value) {
      loadFamilyPhotos(memberFamily.value.id)
    } else {
      loadMemberPhotos(selectedMember.value.id)
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || '上传失败'
    ElMessage.error('上传失败: ' + errorMsg)
    console.error('上传错误详情:', error)
  } finally {
    uploading.value = false
    // 清空 input 以便可以再次选择相同文件
    event.target.value = ''
  }
}

// 选择头像 - 打开头像选择对话框
const selectAvatar = () => {
  if (!isEditor.value) return
  // 如果没有照片，提示上传
  if (memberPhotos.value.length === 0) {
    ElMessage.info('请先上传照片')
    return
  }
  // 打开头像选择对话框
  selectedAvatar.value = selectedMember.value?.avatar || ''
  avatarSelectVisible.value = true
}

// 打开裁剪器
const openCropper = (photo) => {
  currentPhotoPath.value = photo.path
  cropperImage.value = `/photos/${photo.path}`
  cropperVisible.value = true
}

// 裁剪器操作
const rotateLeft = () => {
  cropperRef.value?.rotateLeft()
}

const rotateRight = () => {
  cropperRef.value?.rotateRight()
}

const cropperZoomIn = () => {
  cropperRef.value?.changeScale(1)
}

const cropperZoomOut = () => {
  cropperRef.value?.changeScale(-1)
}

const resetCropper = () => {
  cropperRef.value?.refresh()
}

// 确认裁剪并设置头像
const confirmCropAvatar = async () => {
  if (!cropperRef.value || !selectedMember.value) return
  
  cropperRef.value.getCropData(async (data) => {
    try {
      const response = await fetch(data)
      const blob = await response.blob()
      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.jpg')
      formData.append('memberId', selectedMember.value.id)
      
      if (isAdmin.value && treeId.value) {
        formData.append('treeId', treeId.value)
      }
      
      const res = await axios.post('/api/photos/avatar-crop', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const newAvatarUrl = res.data.avatarUrl + '?t=' + Date.now()
      
      selectedMember.value.avatar = newAvatarUrl
      
      const updateAvatarInTree = (families, memberId, avatarUrl) => {
        for (const family of families) {
          if (family.father && family.father.id === memberId) {
            family.father.avatar = avatarUrl
            return true
          }
          if (family.mother && family.mother.id === memberId) {
            family.mother.avatar = avatarUrl
            return true
          }
          if (family.children) {
            for (const child of family.children) {
              if (updateAvatarInTree([child], memberId, avatarUrl)) {
                return true
              }
            }
          }
        }
        return false
      }
      updateAvatarInTree(treeData.value, selectedMember.value.id, newAvatarUrl)
      
      ElMessage.success('头像设置成功')
      cropperVisible.value = false
      avatarSelectVisible.value = false
    } catch (error) {
      console.error('上传裁剪头像失败:', error)
      ElMessage.error('设置头像失败')
    }
  })
}

// 删除照片
const deletePhoto = async (photo) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这张照片吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 从路径中提取文件名
    const filename = photo.path.replace(/\\/g, '/').split('/').pop()

    await axios.post(`/api/photos/delete/${encodeURIComponent(filename)}?memberId=${selectedMember.value.id}`)

    ElMessage.success('照片删除成功')

    // 刷新照片列表
    await loadMemberPhotos(selectedMember.value.id)

    // 如果删除的是当前头像，刷新树数据
    if (selectedMember.value.avatar && selectedMember.value.avatar.includes(filename)) {
      selectedMember.value.avatar = null
      loadTreeData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除照片失败:', error)
      ElMessage.error('删除照片失败: ' + (error.response?.data?.error || error.message))
    }
  }
}

// 删除家庭照片
const deleteFamilyPhoto = async (photo) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这张家庭照片吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const filename = photo.path.replace(/\\/g, '/').split('/').pop()

    const params = new URLSearchParams({
      type: 'family',
      familyId: memberFamily.value?.id
    })
    if (isAdmin.value && treeId.value) {
      params.append('treeId', treeId.value)
    }

    await axios.post(`/api/photos/delete/${encodeURIComponent(filename)}?${params.toString()}`)

    ElMessage.success('家庭照片删除成功')

    if (memberFamily.value) {
      await loadFamilyPhotos(memberFamily.value.id)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除家庭照片失败:', error)
      ElMessage.error('删除家庭照片失败: ' + (error.response?.data?.error || error.message))
    }
  }
}

// 管理面板方法
const openAdmin = async () => {
  showAdmin.value = true
  await loadAllTrees()
}

const createTree = async () => {
  if (!newTreeForm.value.name || !newTreeForm.value.viewPassword || !newTreeForm.value.editPassword) {
    ElMessage.warning('请填写家族名称、查看密码和编辑密码')
    return
  }
  try {
    await axios.post('/api/trees', {
      name: newTreeForm.value.name,
      viewPassword: newTreeForm.value.viewPassword,
      editPassword: newTreeForm.value.editPassword,
      description: newTreeForm.value.description
    })
    ElMessage.success('家族创建成功')
    resetNewTreeForm()
    await loadAllTrees()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '创建失败')
  }
}

const resetNewTreeForm = () => {
  newTreeForm.value = {
    name: '',
    viewPassword: '',
    editPassword: '',
    description: ''
  }
}

const editTree = (tree) => {
  editTreeForm.value = {
    id: tree.id,
    name: tree.name,
    viewPassword: '',
    editPassword: '',
    description: tree.description || ''
  }
  showEditTree.value = true
}

const saveTreeEdit = async () => {
  try {
    const payload = {
      name: editTreeForm.value.name,
      description: editTreeForm.value.description
    }
    if (editTreeForm.value.viewPassword) {
      payload.viewPassword = editTreeForm.value.viewPassword
    }
    if (editTreeForm.value.editPassword) {
      payload.editPassword = editTreeForm.value.editPassword
    }
    await axios.put(`/api/trees/${editTreeForm.value.id}`, payload)
    ElMessage.success('保存成功')
    showEditTree.value = false
    await loadAllTrees()
  } catch (error) {
    ElMessage.error(error.response?.data?.error || '保存失败')
  }
}

const deleteTree = async (tree) => {
  try {
    await ElMessageBox.confirm(`确定删除家族 "${tree.name}"？此操作将删除该家族的所有数据和照片！`, '警告', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
    await axios.delete(`/api/trees/${tree.id}`)
    ElMessage.success('删除成功')
    await loadAllTrees()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  }
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  // 管理员没有 treeId 时不加载族谱数据
  if (treeId.value) {
    loadTreeData()
    loadMembers()
    loadFamilies()
  }
  if (isAdmin.value) {
    loadAllTrees()
  }
  // 初始化位置到上方 1/3 处
  setTimeout(() => {
    resetZoom()
  }, 100)
})

// 监听路由参数变化，切换家族时自动刷新
watch(() => route.params.treeId, (newTreeId, oldTreeId) => {
  if (newTreeId && newTreeId !== oldTreeId) {
    selectedMember.value = null
    // 使用新的 treeId 加载数据
    loadTreeData(newTreeId)
    loadMembers(newTreeId)
    loadFamilies(newTreeId)
    // 更新 store 中的当前家族信息
    const currentTree = allTrees.value.find(t => t.id === parseInt(newTreeId))
    if (currentTree) {
      authStore.familyTreeId = currentTree.id
      authStore.familyTreeName = currentTree.name
      authStore.familyTreeDescription = currentTree.description
      sessionStorage.setItem('familyTreeId', currentTree.id)
      sessionStorage.setItem('familyTreeName', currentTree.name)
      sessionStorage.setItem('familyTreeDescription', currentTree.description || '')
    }
  }
})
</script>

<style scoped>
.family-tree-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #e0e7ff 0%, #d1e0ff 100%);
}

.family-tree-page :deep(input),
.family-tree-page :deep(textarea),
.family-tree-page :deep(.el-input__inner) {
  user-select: text;
}

.top-bar {
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
  z-index: 100;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.top-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.top-bar-actions .el-button {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.top-bar-actions .el-button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.family-switcher {
  margin-right: 4px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 内容包装器 - 添加边距和最大宽度 */
.content-wrapper {
  flex: 1;
  padding: 8px;
  overflow: auto;
}

.main-layout {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 64px);
}

/* 卡片样式 */
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* 族谱区域 全屏 */
.tree-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
}

.tree-toolbar {
  height: 40px;
  background: transparent;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.tree-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.tree-description {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.zoom-level {
  font-size: 14px;
  color: #666;
  min-width: 50px;
  text-align: right;
}

.tree-canvas {
  flex: 1;
  overflow: auto;
  position: relative;
  cursor: grab;
  background: #fafafa;
  min-height: 400px;
  padding-top: 40px;
}

.tree-canvas:active {
  cursor: grabbing;
}

.tree-content {
  position: absolute;
  top: 20px;
  left: 50%;
  transform-origin: top center;
  will-change: transform;
  padding: 0 40px 40px 40px;
}

/* 右侧详情抽屉 */
.detail-panel {
  position: fixed;
  top: 56px;
  right: 0;
  width: 420px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  z-index: 101;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  border-radius: 12px 0 0 0;
  margin: 0;
}

.detail-panel.drawer-open {
  transform: translateX(0);
}

.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 16px;
}

.no-selection p {
  font-size: 14px;
}

.detail-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  cursor: pointer;
  font-size: 18px;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  font-size: 15px;
}

/* 照片区域 - 横向长方形 */
.photos-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

/* 照片区域 - 竖向滚动 */
.photos-section-flex {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.photos-scroll-vertical {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
}

.photo-item-grid {
  flex-shrink: 0;
  width: calc(33.33% - 6px);
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  background-color: #f5f5f5;
  position: relative;
}

.photo-item-grid .el-image {
  width: 100%;
  height: 100%;
}

.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  gap: 8px;
}

.image-error .el-icon {
  font-size: 32px;
}

/* 裁剪器样式 */
.cropper-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cropper-wrapper {
  width: 100%;
  height: 400px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.cropper-wrapper .vue-cropper {
  width: 100%;
  height: 100%;
}

.cropper-toolbar {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

/* 照片删除按钮样式 */
.photo-item-grid {
  position: relative;
}

.delete-photo-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.photo-item-grid:hover .delete-photo-btn {
  opacity: 1;
}

/* 头像选择对话框样式 */
.avatar-select-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.avatar-option {
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s ease;
}

.avatar-option:hover {
  border-color: #409eff;
  transform: scale(1.02);
}

.avatar-option.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
}

.avatar-option .el-image {
  width: 100%;
  height: 100%;
}

.no-photos-for-avatar {
  padding: 40px 0;
}

/* 管理面板样式 */
.admin-panel {
  padding: 8px 0;
}

.admin-panel .section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 4px solid #409eff;
}

.admin-panel .create-section {
  margin-bottom: 8px;
}

/* 一行布局 */
.create-form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 140px;
}

.form-field .field-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 8px;
  padding-bottom: 1px;
}

.admin-panel .list-section {
  margin-top: 8px;
}

/* 管理员未选择家族提示 */
.admin-no-family {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 100px);
}

.photo-placeholder {
  flex-shrink: 0;
}

.avatar-large {
  width: 160px;
  height: 120px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.avatar-large .initials {
  color: white;
  font-size: 48px;
  font-weight: bold;
}

/* 三栏布局 - 无框体 */
.section {
  padding: 8px 0;
}

.basic-info-section {
  padding-top: 4px;
  padding-bottom: 8px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* 相册标签头部样式 */
.photo-tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.photo-tabs-header .el-radio-group {
  flex: 1;
}

/* 基本信息左右布局 */
.basic-info-layout {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.avatar-section {
  flex-shrink: 0;
}

.id-photo-frame {
  width: 105px;
  height: 147px;
  border: 2px dashed #d9d9d9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s;
}

.id-photo-frame:hover {
  border-color: #409eff;
}

.id-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.placeholder-text {
  font-size: 12px;
  color: #c0c4cc;
}

.info-section {
  flex: 1;
  min-width: 0;
}

/* 查看模式 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-row .label {
  font-size: 12px;
  color: #909399;
  min-width: 60px;
}

.info-row .value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 编辑模式 */
.compact-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 0px;
}

.form-row label {
  font-size: 12px;
  color: #606266;
  min-width: 40px;
  flex-shrink: 0;
}

.form-row .el-input {
  flex: 1;
}

.form-row .el-radio-group {
  flex: 1;
  display: flex;
  gap: 0;
}

.form-row .el-radio-group :deep(.el-radio) {
  margin-right: 8px;
}

.form-row .el-radio-group :deep(.el-radio__label) {
  padding-left: 4px;
}

/* 紧凑的日期选择器 */
.compact-date-picker {
  width: 100% !important;
}

.compact-date-picker :deep(.el-input__wrapper) {
  padding: 0 8px;
}



/* 删除按钮区域 */
.delete-section {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 减小分割线间距 */
:deep(.el-divider) {
  margin: 8px 0;
}

/* 添加成员按钮 */
.add-member-section {
  padding: 8px 0;
}

.add-buttons {
  display: flex;
  gap: 8px;
}

.add-buttons .el-button {
  flex: 1;
}



/* 响应式设计 - 平板 */
@media (max-width: 1024px) {
  .content-wrapper {
    padding: 16px;
  }

  .tree-area {
    width: 100%;
    min-height: 400px;
  }

  .detail-panel {
    width: 350px;
  }
}

/* 响应式设计 - 平板 */
@media (max-width: 1024px) {
  .detail-panel {
    width: 350px;
    top: 56px;
    height: calc(100vh - 64px);
    max-height: calc(100vh - 64px);
  }
}

/* 响应式设计 - 手机 */
@media (max-width: 768px) {
  .top-bar {
    height: 48px;
    padding: 0 12px;
  }

  .title {
    font-size: 16px;
  }

  .content-wrapper {
    padding: 4px;
  }

  .main-layout {
    min-height: calc(100vh - 56px);
  }

  .tree-area {
    height: calc(100vh - 56px);
    max-height: calc(100vh - 56px);
  }

  .tree-toolbar {
    height: 36px;
    padding: 0 8px;
  }

  .tree-canvas {
    padding-top: 36px;
  }

  .tree-content {
    padding: 12px;
  }

  .detail-panel {
    width: 100%;
    top: auto;
    bottom: 0;
    height: 70vh;
    max-height: 70vh;
    border-radius: 12px 12px 0 0;
    transform: translateY(100%);
  }

  .detail-panel.drawer-open {
    transform: translateY(0);
  }

  .detail-content {
    padding: 12px;
  }
}

/* 全屏图片预览 */
.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.fullscreen-preview img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* 关闭按钮 */
.preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  cursor: pointer;
  padding: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.3s;
  z-index: 10000;
}

.preview-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* 左右切换按钮 */
.preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  cursor: pointer;
  padding: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.3s;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.preview-prev {
  left: 20px;
}

.preview-next {
  right: 20px;
}

/* 图片计数 */
.preview-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
}

</style>
