import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'


// 应用启动时清除登录信息
// localStorage.removeItem('userId')
// localStorage.removeItem('username')
// localStorage.removeItem('merchantId')
// localStorage.removeItem('storeId')


// 创建Vue应用
const app = createApp(App)

// 使用插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 挂载应用
app.mount('#app')