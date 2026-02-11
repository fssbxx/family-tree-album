<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  // 从 sessionStorage 恢复登录状态
  const token = sessionStorage.getItem('token')
  const role = sessionStorage.getItem('role')
  const familyTreeId = sessionStorage.getItem('familyTreeId')
  const familyTreeName = sessionStorage.getItem('familyTreeName')

  if (token) {
    // 同步到 Pinia store
    authStore.token = token
    authStore.role = role
    authStore.familyTreeId = familyTreeId
    authStore.familyTreeName = familyTreeName

    // 设置 axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f7fa;
}
</style>
