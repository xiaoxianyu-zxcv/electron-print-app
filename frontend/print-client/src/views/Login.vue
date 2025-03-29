<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>用户登录</span>
        </div>
      </template>

      <el-form :model="loginForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" placeholder="请输入用户名"></el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="login" :loading="isLoading">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login as apiLogin } from '../services/api'

const router = useRouter()
const isLoading = ref(false)
const loginForm = reactive({
  username: '',
  password: ''
})

const login = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  isLoading.value = true
  try {
    const result = await apiLogin(loginForm.username, loginForm.password)
    if (result && result.userId) {
      localStorage.setItem('userId', result.userId)
      localStorage.setItem('username', result.username)
      localStorage.setItem('merchantId', result.merchantId)
      router.push('/dashboard')
      ElMessage.success('登录成功')
    } else {
      ElMessage.error('登录失败')
    }
  } catch (error) {
    ElMessage.error('登录失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}
</script>