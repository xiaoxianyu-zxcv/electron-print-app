<template>
  <div class="home-view">
    <h1>欢迎使用打印服务桌面版</h1>
    
    <el-row :gutter="20" class="dashboard-cards">
      <el-col :span="8">
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <el-icon><i-ep-monitor /></el-icon>
              <span>系统状态</span>
            </div>
          </template>
          <div v-if="loading" class="loading">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else>
            <div class="status-item">
              <span>服务状态:</span>
              <span :class="{ 'success-text': systemStatus.running, 'error-text': !systemStatus.running }">
                {{ systemStatus.running ? '正常运行' : '服务异常' }}
              </span>
            </div>
            <div class="status-item">
              <span>打印队列:</span>
              <span>{{ systemStatus.data?.queueSize || 0 }} 个任务</span>
            </div>
            <div class="status-item">
              <span>打印机状态:</span>
              <span :class="{ 'success-text': systemStatus.data?.printerReady, 'error-text': !systemStatus.data?.printerReady }">
                {{ systemStatus.data?.printerReady ? '就绪' : '未就绪' }}
              </span>
            </div>
            <div class="status-item">
              <span>打印成功率:</span>
              <span>{{ systemStatus.data?.successRate ? (systemStatus.data.successRate * 100).toFixed(1) + '%' : '无数据' }}</span>
            </div>
            <div class="status-item">
              <span>当前打印机:</span>
              <span>{{ systemStatus.data?.currentPrinter || '未设置' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="task-card">
          <template #header>
            <div class="card-header">
              <el-icon><i-ep-document /></el-icon>
              <span>打印任务</span>
            </div>
          </template>
          <div v-if="loadingTasks" class="loading">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else>
            <div v-if="pendingTasks.length === 0" class="empty-message">
              当前没有等待处理的打印任务
            </div>
            <div v-else>
              <div class="task-summary">
                <div>共有 {{ pendingTasks.length }} 个待处理任务</div>
              </div>
              <el-table :data="pendingTasks.slice(0, 5)" size="small" class="task-table">
                <el-table-column prop="taskId" label="任务ID" width="100">
                  <template #default="scope">
                    {{ scope.row.taskId.substr(0, 8) }}...
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="80">
                  <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)">
                      {{ getStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createTime" label="创建时间">
                  <template #default="scope">
                    {{ formatTime(scope.row.createTime) }}
                  </template>
                </el-table-column>
              </el-table>
              <div class="view-more" v-if="pendingTasks.length > 5">
                <router-link to="/tasks">查看全部任务 &raquo;</router-link>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="action-card">
          <template #header>
            <div class="card-header">
              <el-icon><i-ep-operation /></el-icon>
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="handleTestPrint" :loading="printingTest">
              <el-icon><i-ep-printer /></el-icon>
              测试打印
            </el-button>
            
            <el-button type="success" @click="refreshStatus">
              <el-icon><i-ep-refresh /></el-icon>
              刷新状态
            </el-button>
            
            <el-button type="info" @click="$router.push('/settings')">
              <el-icon><i-ep-setting /></el-icon>
              系统设置
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '../api/apiService'

// 状态数据
const systemStatus = ref({ running: false, data: {} })
const pendingTasks = ref([])
const loading = ref(true)
const loadingTasks = ref(true)
const printingTest = ref(false)

// 加载系统状态
async function loadSystemStatus() {
  loading.value = true
  try {
    // 使用electronAPI或直接API调用
    if (window.electronAPI) {
      systemStatus.value = await window.electronAPI.checkServerStatus()
    } else {
      const data = await apiService.getSystemStatus()
      systemStatus.value = { running: true, data }
    }
  } catch (error) {
    console.error('加载系统状态失败:', error)
    systemStatus.value = { running: false, error: error.message }
  } finally {
    loading.value = false
  }
}

// 加载待处理任务
async function loadPendingTasks() {
  loadingTasks.value = true
  try {
    pendingTasks.value = await apiService.getPendingTasks()
  } catch (error) {
    console.error('加载待处理任务失败:', error)
    pendingTasks.value = []
  } finally {
    loadingTasks.value = false
  }
}

// 状态映射
function getStatusType(status) {
  const map = {
    'PENDING': 'info',
    'PRINTING': 'warning',
    'COMPLETED': 'success',
    'FAILED': 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    'PENDING': '待处理',
    'PRINTING': '打印中',
    'COMPLETED': '已完成',
    'FAILED': '失败'
  }
  return map[status] || status
}

// 格式化时间
function formatTime(timeString) {
  if (!timeString) return ''
  
  try {
    const date = new Date(timeString)
    return date.toLocaleString()
  } catch (error) {
    return timeString
  }
}

// 测试打印
async function handleTestPrint() {
  printingTest.value = true
  try {
    const content = '测试打印内容\n这是一条测试消息\n打印时间: ' + new Date().toLocaleString()
    const result = await apiService.testPrint(content)
    
    if (result.success) {
      ElMessage.success('测试打印已发送')
    } else {
      ElMessage.error('测试打印失败: ' + result.message)
    }
  } catch (error) {
    console.error('测试打印失败:', error)
    ElMessage.error('测试打印失败: ' + error.message)
  } finally {
    printingTest.value = false
  }
}

// 刷新状态
async function refreshStatus() {
  await Promise.all([
    loadSystemStatus(),
    loadPendingTasks()
  ])
  ElMessage.success('状态已刷新')
}

// 组件挂载时加载数据
onMounted(() => {
  refreshStatus()
})
</script>

<style scoped>
.home-view {
  padding: 20px;
}

.dashboard-cards {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
}

.card-header .el-icon {
  margin-right: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}

.success-text {
  color: #67C23A;
}

.error-text {
  color: #F56C6C;
}

.task-summary {
  margin-bottom: 10px;
  color: #606266;
}

.task-table {
  margin-bottom: 10px;
}

.empty-message {
  color: #909399;
  text-align: center;
  padding: 20px 0;
}

.view-more {
  text-align: right;
  margin-top: 8px;
  font-size: 14px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading {
  padding: 10px 0;
}
</style>