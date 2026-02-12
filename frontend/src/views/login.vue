<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <el-icon :size="48" color="#409EFF"><Picture /></el-icon>
        <h1>家族相册</h1>
        <p>请输入访问密码</p>
      </div>
      
      <el-form @submit.prevent="handleLogin" class="login-form">
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            进入
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-tips">
        <p>提示：</p>
        <ul>
          <li>查看密码：仅可浏览族谱和照片</li>
          <li>编辑密码：可编辑成员、上传照片</li>
          <li>管理密码：可管理所有族谱</li>
        </ul>
      </div>
    </div>
    <div class="version">v0.9.6-1</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, Picture } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }
  
  loading.value = true
  
  const result = await authStore.login(password.value)
  
  loading.value = false
  
  if (result.success) {
    ElMessage.success('登录成功')
    // admin 用户没有 familyTreeId，跳转到管理页面
    if (result.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(`/tree/${result.familyTreeId}`)
    }
  } else {
    ElMessage.error(result.error || '密码错误')
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 16px 0 8px;
  font-size: 28px;
  color: #303133;
}

.login-header p {
  color: #909399;
  font-size: 14px;
}

.login-form {
  margin-bottom: 24px;
}

.login-tips {
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}

.login-tips ul {
  margin: 8px 0 0 16px;
  line-height: 1.8;
}

.version {
  position: fixed;
  bottom: 16px;
  right: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
}
</style>
