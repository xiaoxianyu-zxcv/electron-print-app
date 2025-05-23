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
            <span>{{ appVersion || systemStatus.version || '未知' }}</span>
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
          <!-- 添加更新检查按钮 -->
          <div class="status-item update-check-btn" v-if="isElectron">
            <el-button
                type="primary"
                size="small"
                @click="checkForUpdates"
                :loading="isCheckingUpdate">
              检查更新
            </el-button>
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
          <!-- 更新组件 -->
          <UpdateComponent ref="updateComponent" v-if="isElectron" />

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
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { setupSocketConnection, disconnect as disconnectSocket } from './services/socket'
import { usePrinterStore } from './store/printer'
import { useTaskStore } from './store/tasks'
import { Menu as IconMenu, Document as IconDocument, Setting as IconSetting } from '@element-plus/icons-vue'
import { getUserInfo ,login as apiLogin } from "./services/api.js";
import UpdateComponent from './components/UpdateComponent.vue';

const route = useRoute()
const router = useRouter()
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

// 更新相关
const isElectron = window.electronAPI !== undefined;
const updateComponent = ref(null);
const isCheckingUpdate = ref(false);
const appVersion = ref('');

// 手动检查更新
const checkForUpdates = async () => {
  if (!isElectron || !updateComponent.value) return;

  isCheckingUpdate.value = true;
  try {
    await updateComponent.value.checkForUpdates();
  } finally {
    setTimeout(() => {
      isCheckingUpdate.value = false;
    }, 1000);
  }
};

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
  // 检查是否有用户ID和storeId
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const storeId = localStorage.getItem('storeId');
  const password = localStorage.getItem('password');

  // 如果有用户ID但没有storeId，尝试获取用户信息
  // 如果有用户ID但没有storeId，尝试获取用户信息
  if (userId) {
    try {
      // 检查后端登录状态
      const userStatus = await getUserInfo();

      // 如果后端显示未登录，但前端有登录信息，则自动重新登录
      if (!userStatus.loggedIn && username && password) {
        console.log('检测到后端未登录，正在自动重新登录...');
        await apiLogin(username, password);  // 使用apiLogin而非login
        console.log('自动重新登录成功');

        // 重新加载状态
        await printerStore.refreshSystemStatus();
      } else if (!userStatus.loggedIn) {
        // 如果没有足够信息自动登录，则重定向到登录页面
        console.log('检测到后端未登录，但没有足够的凭据自动登录');
        router.push('/login');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      // ElMessage.warning('无法验证登录状态，请重新登录');
      router.push('/login');
    }
  }

  // 加载系统状态
  try {
    await printerStore.refreshSystemStatus();
  } catch (error) {
    ElMessage.warning('无法获取系统状态，请检查服务是否启动');
  }

  // 获取应用版本
  if (isElectron) {
    try {
      appVersion.value = await window.electronAPI.getAppVersion();
      console.log('应用版本:', appVersion.value);
    } catch (error) {
      console.error('获取应用版本失败:', error);
    }
  }

  // 自动连接WebSocket
  await connect()

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

.update-check-btn {
  justify-content: center;
  margin-top: 10px;
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