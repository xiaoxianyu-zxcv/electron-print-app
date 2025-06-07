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
    console.log('开始登录请求，用户名:', loginForm.username);
    
    const result = await apiLogin(loginForm.username, loginForm.password)
    console.log('登录API返回结果:', result);
    
    if (result && result.userId) {
      // 存储用户信息
      localStorage.setItem('userId', result.userId)
      localStorage.setItem('username', result.username)
      localStorage.setItem('merchantId', result.merchantId)
      localStorage.setItem('storeId', result.storeId)
      console.log('登录成功，storeId:', result); // 添加日志

      // 添加密码
      localStorage.setItem('password', loginForm.password)

      // 重新连接WebSocket
      await setupSocketConnection();

      await router.push('/dashboard')
      ElMessage.success('登录成功')
    } else {
      console.log('登录失败: API返回的结果中没有userId字段');
      console.log('完整返回结果:', result);
      
      // 根据返回结果显示不同的错误信息
      if (result && result.success === false) {
        ElMessage.error('登录失败: ' + (result.message || '认证服务器响应异常'))
      } else {
        ElMessage.error('登录失败: 无法获取用户信息，请检查认证服务器状态')
      }
    }
  } catch (error) {
    console.error('登录请求异常:', error);
    console.error('错误详情:', error.response?.data || error.message);
    
    if (error.response && error.response.data) {
      ElMessage.error('登录失败: ' + (error.response.data.message || '网络请求错误'))
    } else {
      ElMessage.error('登录失败: ' + error.message)
    }
  } finally {
    isLoading.value = false
  }
}
</script>
