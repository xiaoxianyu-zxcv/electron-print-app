<template>
  <div class="app-container">
    <!-- 侧边栏导航 -->
    <el-container class="layout-container">
      <el-aside width="200px" class="aside">
        <div class="logo">
          <h2>打印客户端</h2>
        </div>
        <el-menu
            :router="true"
            :default-active="activeRoute"
            class="el-menu-vertical"
            background-color="#304156"
            text-color="#bfcbd9"
            active-text-color="#409EFF">
          <el-menu-item index="/dashboard" route="/dashboard">
            <el-icon><icon-menu /></el-icon>
            <span>控制面板</span>
          </el-menu-item>
          <el-menu-item index="/history" route="/history">
            <el-icon><icon-document /></el-icon>
            <span>打印历史</span>
          </el-menu-item>
          <el-menu-item index="/settings" route="/settings">
            <el-icon><icon-setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>

        <!-- 系统状态 -->
        <div class="system-status">
          <div class="status-item">
            <span>系统版本:</span>
            <span>{{ systemStatus.version || '未知' }}</span>
          </div>
          <div class="status-item">
            <span>打印机状态:</span>
            <el-tag :type="systemStatus.printerReady ? 'success' : 'danger'" size="small">
              {{ systemStatus.printerReady ? '就绪' : '未就绪' }}
            </el-tag>
          </div>
          <div class="status-item">
            <span>服务器连接:</span>
            <el-tag :type="isConnected ? 'success' : 'danger'" size="small">
              {{ isConnected ? '已连接' : '未连接' }}
            </el-tag>
          </div>
        </div>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header height="60px" class="header">
          <div class="header-title">
            {{ currentRouteName }}
          </div>
          <div class="header-actions">
            <el-button v-if="!isConnected" type="primary" size="small" @click="connect">
              连接服务器
            </el-button>
            <el-button v-else type="danger" size="small" @click="disconnect">
              断开连接
            </el-button>
          </div>
        </el-header>

        <el-main>
          <!-- 路由视图 -->
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>

        <el-footer height="30px" class="footer">
          <div class="footer-text">
            打印客户端 &copy; {{ currentYear }}
          </div>
        </el-footer>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setupSocketConnection, disconnect as disconnectSocket } from './services/socket'
import { usePrinterStore } from './store/printer'
import { useTaskStore } from './store/tasks'
import { Menu as IconMenu, Document as IconDocument, Setting as IconSetting } from '@element-plus/icons-vue'

const route = useRoute()
const printerStore = usePrinterStore()
const taskStore = useTaskStore()

// 获取当前年份
const currentYear = new Date().getFullYear()

// 系统状态
const systemStatus = computed(() => printerStore.systemStatus)
const isConnected = computed(() => printerStore.isConnected)

// 当前路由信息
const activeRoute = computed(() => route.path)
const currentRouteName = computed(() => route.meta.title || '打印客户端')

// 连接/断开WebSocket
const connect = async () => {
  try {
    await setupSocketConnection()
    ElMessage.success('连接服务器成功')
  } catch (error) {
    ElMessage.error('连接服务器失败')
  }
}

const disconnect = () => {
  disconnectSocket()
  ElMessage.info('已断开连接')
}

// 组件挂载时
onMounted(async () => {
  // 加载系统状态
  try {
    await printerStore.refreshSystemStatus()
  } catch (error) {
    ElMessage.warning('无法获取系统状态，请检查服务是否启动')
  }

  // 自动连接WebSocket
  connect()

  // 设置定期刷新状态
  const statusTimer = setInterval(() => {
    printerStore.refreshSystemStatus()
  }, 30000) // 每30秒刷新一次

  // 清理函数
  onBeforeUnmount(() => {
    clearInterval(statusTimer)
    disconnectSocket()
  })
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-container {
  height: 100%;
}

.aside {
  background-color: #304156;
  color: #bfcbd9;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-color: #263445;
}

.el-menu-vertical {
  border-right: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.footer {
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
}

/* 系统状态样式 */
.system-status {
  margin-top: auto;
  padding: 10px;
  background-color: #263445;
  font-size: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>