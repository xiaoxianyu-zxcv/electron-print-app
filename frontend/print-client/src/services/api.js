import axios from 'axios'

// 创建axios实例
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 响应拦截器
api.interceptors.response.use(
    response => response.data,
    error => {
        console.error('API请求错误', error)
        return Promise.reject(error)
    }
)

// API函数
export const fetchPendingTasks = () => {
    return api.get('/tasks/pending')
}

export const addPrintTask = (task) => {
    return api.post('/tasks', task)
}

export const fetchPrinters = () => {
    return api.get('/printers')
}

export const setDefaultPrinter = (printerName) => {
    return api.post('/settings/printer', { printerName })
}

export const getSystemStatus = () => {
    return api.get('/system/status')
}

export const getQueueStatus = () => {
    return api.get('/queue/status')
}

export const testPrint = (content) => {
    return api.post('/print/test', { content })
}

export const cancelTask = (taskId) => {
    return api.delete(`/tasks/${taskId}`)
}

export default api