<template>
  <div class="dashboard-container">
    <!-- 状态卡片 -->
    <el-row :gutter="20" class="status-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>新版本待处理任务</span>
            </div>
          </template>
          <div class="card-value">{{ queueStats.pendingTasks }}</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>打印中任务</span>
            </div>
          </template>
          <div class="card-value">{{ queueStats.printingTasks }}</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>已完成任务</span>
            </div>
          </template>
          <div class="card-value">{{ queueStats.completedTasks }}</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>成功率</span>
            </div>
          </template>
          <div class="card-value">{{ queueStats.successRate }}%</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 打印操作 -->
    <el-card class="print-card">
      <template #header>
        <div class="card-header">
          <span>发送打印任务</span>
        </div>
      </template>

      <el-form :model="printForm" label-width="100px">
        <el-form-item label="打印机">
          <el-select
              v-model="printForm.printerName"
              placeholder="选择打印机"
              style="width: 100%">
            <el-option
                v-for="printer in printers"
                :key="printer.name"
                :label="printer.name"
                :value="printer.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="打印内容">
          <el-input
              v-model="printForm.content"
              type="textarea"
              :rows="6"
              placeholder="输入要打印的内容" />
        </el-form-item>

        <el-form-item>
          <el-button
              type="primary"
              :loading="isSubmitting"
              @click="submitPrintTask">
            发送打印
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 最近任务列表 -->
    <el-card class="task-list-card">
      <template #header>
        <div class="card-header-with-action">
          <span>最近任务</span>
          <el-button type="primary" size="small" @click="refreshTasks">
            刷新
          </el-button>
        </div>
      </template>

      <el-table
          v-loading="isLoading"
          :data="recentTasks"
          style="width: 100%"
          :empty-text="tableEmptyText">
        <el-table-column label="任务ID" prop="taskId" width="280" />
        <el-table-column label="打印机" prop="printerName" width="180" />
        <el-table-column label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ isRefundTask(scope.row) ? '退货-' : '' }}{{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="scope">
            <el-tag
                v-if="isRefundTask(scope.row)"
                type="warning"
                effect="dark">
              退货单
            </el-tag>
            <el-tag v-else type="primary">
              销售单
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button
                v-if="scope.row.status === 'PENDING'"
                type="danger"
                size="small"
                @click="cancelTask(scope.row.taskId)">
              取消
            </el-button>
            <el-button
                type="primary"
                size="small"
                @click="viewTaskDetails(scope.row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog
        v-model="taskDetailsVisible"
        title="任务详情"
        width="50%">
      <div v-if="selectedTask">
        <p><strong>任务ID:</strong> {{ selectedTask.taskId }}</p>
        <p><strong>打印机:</strong> {{ selectedTask.printerName }}</p>
        <p><strong>状态:</strong> {{ getStatusText(selectedTask.status) }}</p>
        <p><strong>创建时间:</strong> {{ formatDate(selectedTask.createTime) }}</p>
        <p><strong>重试次数:</strong> {{ selectedTask.retryCount }}</p>
        <el-divider />
        <p><strong>打印内容:</strong></p>
        <el-input
            v-model="selectedTask.content"
            type="textarea"
            :rows="8"
            readonly />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTaskStore } from '../store/tasks'
import { usePrinterStore } from '../store/printer'
import { sendPrintRequest } from '../services/socket'
import { testPrint, cancelTask as apiCancelTask } from '../services/api'

const taskStore = useTaskStore()
const printerStore = usePrinterStore()

// 状态
const isLoading = ref(false)
const isSubmitting = ref(false)
const taskDetailsVisible = ref(false)
const selectedTask = ref(null)
const tableEmptyText = computed(() => isLoading.value ? '加载中...' : '暂无数据')

// 表单数据
const printForm = reactive({
  content: '测试打印内容\n这是一条测试消息\n打印时间: ' + new Date().toLocaleString(),
  printerName: ''
})

// 计算属性
const printers = computed(() => printerStore.printers)
const queueStats = computed(() => taskStore.queueStats)
const recentTasks = computed(() => taskStore.tasks.slice(0, 10)) // 只显示最近10个任务

// 初始化
onMounted(async () => {
  isLoading.value = true
  try {
    // 并行加载数据
    await Promise.all([
      printerStore.loadPrinters(),
      taskStore.loadPendingTasks()
    ])

    // 如果有默认打印机，设置到表单
    if (printerStore.defaultPrinter) {
      printForm.printerName = printerStore.defaultPrinter
    }
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
})

// 提交打印任务
const submitPrintTask = async () => {
  if (!printForm.printerName) {
    return ElMessage.warning('请选择打印机')
  }

  if (!printForm.content.trim()) {
    return ElMessage.warning('打印内容不能为空')
  }

  isSubmitting.value = true

  try {
    // 使用WebSocket发送打印请求
    await sendPrintRequest(printForm.content, printForm.printerName)
    ElMessage.success('打印请求已发送')
    // 不需要重置表单，方便连续打印
  } catch (error) {
    ElMessage.error('发送打印请求失败')
    console.error('发送打印请求失败', error)
  } finally {
    isSubmitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  printForm.content = '测试打印内容\n这是一条测试消息\n打印时间: ' + new Date().toLocaleString()
  // 保留打印机选择
}

// 刷新任务列表
const refreshTasks = async () => {
  isLoading.value = true
  try {
    await taskStore.loadPendingTasks()
    ElMessage.success('任务列表已刷新')
  } catch (error) {
    ElMessage.error('刷新任务列表失败')
  } finally {
    isLoading.value = false
  }
}

// 取消任务
const cancelTask = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要取消该打印任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await apiCancelTask(taskId)
    ElMessage.success('任务已取消')
    refreshTasks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消任务失败')
    }
  }
}

// 查看任务详情
const viewTaskDetails = (task) => {
  selectedTask.value = task
  taskDetailsVisible.value = true
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString()
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'PENDING': '待处理',
    'PRINTING': '打印中',
    'COMPLETED': '已完成',
    'FAILED': '失败'
  }
  return statusMap[status] || status
}

// 获取状态类型（用于ElementUI的Tag组件）
const getStatusType = (status) => {
  const typeMap = {
    'PENDING': 'info',
    'PRINTING': 'warning',
    'COMPLETED': 'success',
    'FAILED': 'danger'
  }
  return typeMap[status] || ''
}

const isRefundTask = (task) => {
  try {
    const content = JSON.parse(task.content);
    return content.type === 'refund';
  }catch {
    return task.content && task.content.include('退货单');
  }


}

</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.status-cards {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: #409EFF;
}

.print-card {
  margin-bottom: 20px;
}

.task-list-card {
  margin-bottom: 20px;
}
</style>