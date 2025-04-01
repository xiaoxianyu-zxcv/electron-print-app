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
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { title: '用户登录', requiresAuth: false }
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
        path: '/updateComponent',
        name: 'UpdateComponent',
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
    const userId = localStorage.getItem('userId')

    if (to.matched.some(record => record.meta.requiresAuth !== false) && !userId) {
        // 需要登录但用户未登录
        next('/login')
    } else {
        // 设置页面标题
        document.title = to.meta.title ? `打印客户端 - ${to.meta.title}` : '打印客户端'
        next()
    }
})

export default router