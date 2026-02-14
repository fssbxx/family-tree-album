import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = '/api'

// 初始化时设置 axios headers
const storedToken = sessionStorage.getItem('token')
if (storedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: storedToken || null,
    role: sessionStorage.getItem('role') || null,
    familyTreeId: sessionStorage.getItem('familyTreeId') || null,
    familyTreeName: sessionStorage.getItem('familyTreeName') || null,
    familyTreeDescription: sessionStorage.getItem('familyTreeDescription') || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.role === 'admin',
    isEditor: (state) => state.role === 'admin' || state.role === 'editor'
  },

  actions: {
    async login(password) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, { password })
        const { token, role, familyTreeId, familyTreeName, familyTreeDescription } = response.data

        this.token = token
        this.role = role
        this.familyTreeId = familyTreeId
        this.familyTreeName = familyTreeName
        this.familyTreeDescription = familyTreeDescription

        // 使用 sessionStorage，关闭标签页后失效
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('role', role)
        if (familyTreeId) sessionStorage.setItem('familyTreeId', familyTreeId)
        if (familyTreeName) sessionStorage.setItem('familyTreeName', familyTreeName)
        if (familyTreeDescription) sessionStorage.setItem('familyTreeDescription', familyTreeDescription)

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

        return { success: true, role, familyTreeId }
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.error || '登录失败'
        }
      }
    },

    logout() {
      this.token = null
      this.role = null
      this.familyTreeId = null
      this.familyTreeName = null
      this.familyTreeDescription = null

      sessionStorage.removeItem('token')
      sessionStorage.removeItem('role')
      sessionStorage.removeItem('familyTreeId')
      sessionStorage.removeItem('familyTreeName')
      sessionStorage.removeItem('familyTreeDescription')

      delete axios.defaults.headers.common['Authorization']
    }
  }
})
