<template>
  <div class="app-container">
    <el-config-provider>
      <header class="app-header">
        <div class="logo">
          <img src="./assets/logo.png" alt="打印服务" class="logo-image" />
          <h1 class="app-title">打印服务桌面版</h1>
        </div>
        <div class="header-actions">
          <SystemStatus />
        </div>
      </header>
      
      <div class="main-container">
        <el-menu
          :default-active="activeMenu"
          class="app-menu"
          mode="vertical"
          router
        >
          <el-menu-item index="/">
            <el-icon><i-ep-house /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><i-ep-document /></el-icon>
            <span>打印任务</span>
          </el-menu-item>
          <el-menu-item index="/printers">
            <el-icon><i-ep-printer /></el-icon>
            <span>打印机管理</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><i-ep-setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
        
        <main class="app-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>
      
      <footer class="app-footer">
        <p>版本 v{{ appVersion }} | &copy; 2025 指尖赤壁</p>
      </footer>
    </el-config-provider>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import SystemStatus from './components/SystemStatus.vue'

// 应用版本
const appVersion = ref('1.0.0')

// 获取当前路由
const route = useRoute()
const activeMenu = computed(() => route.path)

// 当组件挂载时
onMounted(async () => {
  try {
    // 如果在Electron环境中，获取应用版本
    if (window.electronAPI) {
      appVersion.value = await window.electronAPI.getAppVersion()
    }
  } catch (error) {
    console.error('获取应用版本失败:', error)
  }
})
</script>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', SimSun, sans-serif;
}

#app {
  height: 100vh;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #409eff;
  color: white;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-image {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-menu {
  width: 200px;
  height: 100%;
  border-right: 1px solid #e6e6e6;
}

.app-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.app-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  background-color: #f5f7fa;
  border-top: 1px solid #e6e6e6;
  color: #606266;
  font-size: 12px;
}

/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>