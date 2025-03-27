<template>
  <div class="system-status">
    <el-tooltip
      :content="statusMessage"
      placement="bottom"
    >
      <div class="status-indicator">
        <el-icon :color="statusColor" size="18">
          <i-ep-circle-check v-if="isConnected" />
          <i-ep-warning v-else />
        </el-icon>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiService } from '../api/apiService'

// 状态相关
const isConnected = ref(false)
const statusDetails = ref({})
const checkingStatus = ref(false)
const statusMessage = ref('正在检查系统状态...')

// 计算属性
const statusText = computed(() => {
  return isConnected.value ? '系统正常' : '连接断开'
})

const statusColor = computed(() => {
  return isConnected.value ? '#67C23A' : '#F56C6C'
})

// 检查后端服务状态
async function checkServerStatus() {
  if (checkingStatus.value) return

  checkingStatus.value = true
  try {
    // 如果在Electron环境中
    if (window.electronAPI) {
      const status = await window.electronAPI.checkServerStatus()
      
      if (status.running) {
        isConnected.value = true
        statusDetails.value = status.data
        statusMessage.value = `打印服务运行正常
          打印队列: ${status.data.queueSize || 0} 个任务
          打印机: ${status.data.printerReady ? '就绪' : '未就绪'}
          成功率: ${(status.data.successRate * 100).toFixed(1)}%`
      } else {
        isConnected.value = false
        statusMessage.value = `无法连接到打印服务: ${status.error || '未知错误'}`
      }
    } else {
      // 直接API调用
      const status = await apiService.getSystemStatus()
      isConnected.value = true
      statusDetails.value = status
      statusMessage.value = `打印服务运行正常
        打印队列: ${status.queueSize || 0} 个任务
        打印机: ${status.printerReady ? '就绪' : '未就绪'}
        成功率: ${(status.successRate * 100).toFixed(1)}%`
    }
  } catch (error) {
    console.error('检查服务状态失败:', error)
    isConnected.value = false
    statusMessage.value = `无法连接到打印服务: ${error.message}`
  } finally {
    checkingStatus.value = false
  }
}

// 定时检查服务状态
let statusInterval = null

onMounted(() => {
  // 初始检查
  checkServerStatus()
  
  // 设置30秒自动检查
  statusInterval = setInterval(checkServerStatus, 30000)
})

onUnmounted(() => {
  // 清除定时器
  if (statusInterval) {
    clearInterval(statusInterval)
  }
})
</script>

<style scoped>
.system-status {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

.status-text {
  margin-left: 4px;
  font-size: 14px;
  color: white;
}
</style>