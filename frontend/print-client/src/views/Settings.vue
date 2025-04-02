<template>
  <div class="settings-container">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>打印机设置</span>
        </div>
      </template>

      <el-form label-width="120px">
        <el-form-item label="默认打印机">
          <el-select
              v-model="selectedPrinter"
              placeholder="选择打印机"
              style="width: 100%">
            <el-option
                v-for="printer in printers"
                :key="printer.name"
                :label="printer.name"
                :value="printer.name" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
              type="primary"
              :loading="isSubmitting"
              @click="saveDefaultPrinter">
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>



    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>服务器设置</span>
        </div>
      </template>

      <el-form label-width="120px">
        <el-form-item label="服务器地址">
          <el-input v-model="serverUrl" placeholder="http://119.91.239" />
        </el-form-item>
        <el-button type="primary" @click="saveServerSettings">保存服务器设置</el-button>
      </el-form>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>打印测试</span>
        </div>
      </template>

      <el-form label-width="120px">
        <el-form-item label="测试内容">
          <el-input
              v-model="testContent"
              type="textarea"
              :rows="6"
              placeholder="输入测试打印内容" />
        </el-form-item>

        <el-form-item>
          <el-button
              type="primary"
              :loading="isTestingPrint"
              @click="sendTestPrint">
            发送测试打印
          </el-button>
          <el-button @click="resetTestContent">重置内容</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>系统信息</span>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="系统版本">
          {{ systemInfo.version || '未知' }}
        </el-descriptions-item>
        <el-descriptions-item label="当前打印机">
          {{ systemInfo.currentPrinter || '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="打印机状态">
          <el-tag :type="systemInfo.printerReady ? 'success' : 'danger'">
            {{ systemInfo.printerReady ? '就绪' : '未就绪' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务队列大小">
          {{ systemInfo.queueSize || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="成功率">
          {{ systemInfo.successRate ? (systemInfo.successRate * 100).toFixed(1) + '%' : '0%' }}
        </el-descriptions-item>
        <el-descriptions-item label="WebSocket连接">
          <el-tag :type="isConnected ? 'success' : 'danger'">
            {{ isConnected ? '已连接' : '未连接' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div class="action-buttons">
        <el-button type="primary" @click="refreshSystemInfo">
          刷新信息
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usePrinterStore } from '../store/printer'
import { testPrint } from '../services/api'
import { setupSocketConnection } from '../services/socket'

const printerStore = usePrinterStore()

// 状态
const isSubmitting = ref(false)
const isTestingPrint = ref(false)
const selectedPrinter = ref('')
const testContent = ref('测试打印内容\n这是一条测试消息\n打印时间: ' + new Date().toLocaleString())
const serverUrl = ref('')

// 计算属性
const printers = computed(() => printerStore.printers)
const systemInfo = computed(() => printerStore.systemStatus)
const isConnected = computed(() => printerStore.isConnected)

// 初始化
onMounted(async () => {
  try {
    // 加载打印机列表
    await printerStore.loadPrinters()

    // 初始化选中的默认打印机
    if (printerStore.defaultPrinter) {
      selectedPrinter.value = printerStore.defaultPrinter
    }

    // 刷新系统信息
    await refreshSystemInfo()

    // 确保WebSocket连接
    if (!isConnected.value) {
      await setupSocketConnection()
    }
  } catch (error) {
    ElMessage.error('初始化设置页面失败')
  }
})

// 保存默认打印机
const saveDefaultPrinter = async () => {
  if (!selectedPrinter.value) {
    return ElMessage.warning('请选择打印机')
  }

  isSubmitting.value = true

  try {
    await printerStore.setDefaultPrinter(selectedPrinter.value)
    ElMessage.success('默认打印机设置成功')
  } catch (error) {
    ElMessage.error('设置默认打印机失败')
  } finally {
    isSubmitting.value = false
  }
}

// 发送测试打印
const sendTestPrint = async () => {
  if (!testContent.value.trim()) {
    return ElMessage.warning('测试内容不能为空')
  }

  isTestingPrint.value = true

  try {
    await testPrint(testContent.value)
    ElMessage.success('测试打印请求已发送')
  } catch (error) {
    ElMessage.error('发送测试打印失败')
  } finally {
    isTestingPrint.value = false
  }
}

// 重置测试内容
const resetTestContent = () => {
  testContent.value = '测试打印内容\n这是一条测试消息\n打印时间: ' + new Date().toLocaleString()
}

// 刷新系统信息
const refreshSystemInfo = async () => {
  try {
    await printerStore.refreshSystemStatus()
    ElMessage.success('系统信息已刷新')
  } catch (error) {
    ElMessage.error('刷新系统信息失败')
  }
}

const saveServerSettings = async () => {
  try {
    await testPrint({ serverUrl: serverUrl.value });
    ElMessage.success('服务器设置已保存');
  } catch (error) {
    ElMessage.error('服务器连接失败');
  }
};
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>