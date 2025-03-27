import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { apiService } from './api/apiService'

// 创建应用实例
const app = createApp(App)

// 初始化API服务，获取后端端口
async function initApp() {
  try {
    // 如果在Electron环境中，获取Spring Boot端口
    if (window.electronAPI) {
      const port = await window.electronAPI.getServerPort()
      apiService.setServerPort(port)
      console.log(`使用Spring Boot端口: ${port}`)
    }
    
    // 添加Pinia状态管理
    app.use(createPinia())
    
    // 添加路由
    app.use(router)
    
    // 添加Element Plus
    app.use(ElementPlus)
    
    // 挂载应用
    app.mount('#app')
  } catch (error) {
    console.error('初始化应用失败:', error)
    // 显示错误信息
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>应用启动失败</h2>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">重试</button>
      </div>
    `
  }
}

initApp()