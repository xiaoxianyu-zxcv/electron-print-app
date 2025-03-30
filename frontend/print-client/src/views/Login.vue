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
import {setupSocketConnection} from "../services/socket.js";

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
      // 存储用户信息
      localStorage.setItem('userId', result.userId)
      localStorage.setItem('username', result.username)
      localStorage.setItem('merchantId', result.merchantId)

      // 记录storeId并确保它被正确存储
      const storeId = result.storeId;
      localStorage.setItem('storeId', storeId)
      console.log('登录成功，storeId:', storeId); // 添加日志

      // 重新连接WebSocket
      await setupSocketConnection();

      await router.push('/dashboard')
      ElMessage.success('登录成功')
    }
  } catch (error) {
    ElMessage.error('登录失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}
</script>
