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
    </div>
    <div class="version">v{{ version }}</div>
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
const version = __APP_VERSION__

const handleLogin = async () => {
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }
  
  if (loading.value) return
  
  loading.value = true
  
  const result = await authStore.login(password.value)
  
  loading.value = false
  
  if (result.success) {
    ElMessage.success('登录成功')
    if (result.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(`/tree/${result.familyTreeId}`)
    }
  } else {
    let errorMsg = result.error || '密码错误'
    if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
      errorMsg += `（剩余 ${result.remainingAttempts} 次尝试机会）`
    }
    ElMessage.error(errorMsg)
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

.version {
  position: fixed;
  bottom: 16px;
  right: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
}
</style>
