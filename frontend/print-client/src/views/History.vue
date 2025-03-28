<template>
  <div class="history-container">
    <!-- 过滤器 -->
    <el-card class="filter-card">
      <template #header>
        <div class="card-header">
          <span>过滤条件</span>
        </div>
      </template>

      <el-form :inline="true" :model="filterForm">
        <el-form-item label="打印机">
          <el-select
              v-model="filterForm.printer"
              placeholder="全部打印机"
              clearable>
            <el-option
                v-for="printer in printers"
                :key="printer.name"
                :label="printer.name"
                :value="printer.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select
              v-model="filterForm.status"
              placeholder="全部状态"
              clearable>
            <el-option label="待处理" value="PENDING" />
            <el-option label="打印中" value="PRINTING" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="失败" value="FAILED" />
          </el-select>
        </el-form-item>

        <el-form-item label="日期范围">
          <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="applyFilter">
            应用过滤
          </el-button>
          <el-button @click="resetFilter">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 任务列表 -->
    <el-card class="task-list-card">
      <template #header>
        <div class="card-header-with-action">
          <span>打印历史记录</span>
          <div>
            <el-button type="primary" size="small" @click="refreshTasks">
              刷新
            </el-button>
            <el-button type="success" size="small" @click="exportTasks">
              导出
            </el-button>
          </div>
        </div>
      </template>

      <el-table
          v-loading="isLoading"
          :data="filteredTasks"
          style="width: 100%"
          :empty-text="tableEmptyText"
          @sort-change="handleSortChange">
        <el-table-column label="任务ID" prop="taskId" width="280" sortable="custom" />
        <el-table-column label="打印机" prop="printerName" width="180" sortable="custom" />
        <el-table-column label="创建时间" width="180" sortable="custom" prop="createTime">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="重试次数" width="100" prop="retryCount" sortable="custom" />
        <el-table-column label="状态" width="120" prop="status" sortable="custom">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button
                type="primary"
                size="small"
                @click="viewTaskDetails(scope.row)">
              详情
            </el-button>
            <el-button
                v-if="scope.row.status === 'COMPLETED' || scope.row.status === 'FAILED'"
                type="success"
                size="small"
                @click="reprintTask(scope.row)">
              重新打印
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="totalTasksCount"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
      </div>
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

const taskStore = useTaskStore()
const printerStore = usePrinterStore()

// 状态
const isLoading = ref(false)
const taskDetailsVisible = ref(false)
const selectedTask = ref(null)
const tableEmptyText = computed(() => isLoading.value ? '加载中...' : '暂无数据')

// 过滤条件
const filterForm = reactive({
  printer: '',
  status: '',
  dateRange: null
})

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalTasksCount = computed(() => filteredTasks.value.length)

// 排序
const sortConfig = reactive({
  prop: 'createTime',
  order: 'descending'
})

// 计算属性
const printers = computed(() => printerStore.printers)

// 过滤后的任务列表
const filteredTasks = computed(() => {
  let result = [...taskStore.tasks]

  // 应用过滤器
  if (filterForm.printer) {
    result = result.filter(task => task.printerName === filterForm.printer)
  }

  if (filterForm.status) {
    result = result.filter(task => task.status === filterForm.status)
  }

  if (filterForm.dateRange && filterForm.dateRange.length === 2) {
    const startDate = new Date(filterForm.dateRange[0])
    const endDate = new Date(filterForm.dateRange[1])
    endDate.setHours(23, 59, 59)

    result = result.filter(task => {
      const taskDate = new Date(task.createTime)
      return taskDate >= startDate && taskDate <= endDate
    })
  }

  // 应用排序
  result.sort((a, b) => {
    const prop = sortConfig.prop
    let valueA = a[prop]
    let valueB = b[prop]

    // 处理日期类型
    if (prop === 'createTime') {
      valueA = new Date(valueA).getTime()
      valueB = new Date(valueB).getTime()
    }

    if (sortConfig.order === 'ascending') {
      return valueA > valueB ? 1 : -1
    } else {
      return valueA < valueB ? 1 : -1
    }
  })

  return result
})

// 当前页面上显示的任务
const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTasks.value.slice(start, end)
})

// 初始化
onMounted(async () => {
  isLoading.value = true
  try {
    // 并行加载数据
    await Promise.all([
      printerStore.loadPrinters(),
      taskStore.loadPendingTasks()
    ])
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
})

// 应用过滤器
const applyFilter = () => {
  currentPage.value = 1 // 重置为第一页
}

// 重置过滤器
const resetFilter = () => {
  filterForm.printer = ''
  filterForm.status = ''
  filterForm.dateRange = null
  currentPage.value = 1
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

// 导出任务
const exportTasks = () => {
  try {
    // 创建CSV内容
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += '任务ID,打印机,创建时间,状态,重试次数\n'

    filteredTasks.value.forEach(task => {
      csvContent += `${task.taskId},${task.printerName},"${formatDate(task.createTime)}",${getStatusText(task.status)},${task.retryCount}\n`
    })

    // 创建下载链接
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `打印历史_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)

    // 触发下载
    link.click()
    document.body.removeChild(link)

    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error('导出失败', error)
  }
}

// 查看任务详情
const viewTaskDetails = (task) => {
  selectedTask.value = task
  taskDetailsVisible.value = true
}

// 重新打印任务
const reprintTask = async (task) => {
  try {
    await ElMessageBox.confirm('确定要重新打印该任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    // 使用原始打印机和内容
    await sendPrintRequest(task.content, task.printerName)
    ElMessage.success('重新打印请求已发送')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发送重新打印请求失败')
    }
  }
}

// 排序变化
const handleSortChange = ({ prop, order }) => {
  if (prop) {
    sortConfig.prop = prop
    sortConfig.order = order
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
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
</script>

<style scoped>
.history-container {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.task-list-card {
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

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>