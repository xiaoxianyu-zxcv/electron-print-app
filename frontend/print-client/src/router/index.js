import { createRouter, createWebHashHistory } from 'vue-router'

// 路由组件懒加载
const Dashboard = () => import('../views/Dashboard.vue')
const Settings = () => import('../views/Settings.vue')
const History = () => import('../views/History.vue')

// 路由配置
const routes = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '控制面板' }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: Settings,
        meta: { title: '系统设置' }
    },
    {
        path: '/history',
        name: 'History',
        component: History,
        meta: { title: '打印历史' }
    }
]

// 创建路由
const router = createRouter({
    history: createWebHashHistory(), // 使用hash模式适合Electron
    routes
})

// 全局前置守卫，设置页面标题
router.beforeEach((to, from, next) => {
    document.title = to.meta.title ? `打印客户端 - ${to.meta.title}` : '打印客户端'
    next()
})

export default router