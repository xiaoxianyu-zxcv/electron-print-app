import axios from 'axios'

// 检查是否在Electron环境中
const isElectron = window.electronAPI !== undefined;

// 创建axios配置
const createApiConfig = async () => {
    let baseURL = import.meta.env.VITE_API_URL || 'http://localhost:23333/api';

    // 在Electron环境中，动态获取服务端口
    if (isElectron) {
        try {
            const port = await window.electronAPI.getServerPort();
            if (!port) {
                console.error('获取服务端口失败: 返回值为空');
                // 添加备用方案
                baseURL = 'http://localhost:23333/api';
            } else {
                baseURL = `http://localhost:${port}/api`;
            }
        } catch (error) {
            console.error('获取服务端口失败:', error);
            // 添加备用方案
            baseURL = 'http://localhost:23333/api';
        }
    }

    return {
        baseURL,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};

// 创建axios实例
const createApiInstance = async () => {
    const config = await createApiConfig();
    const instance = axios.create(config);

    // 响应拦截器
    instance.interceptors.response.use(
        response => response.data,
        error => {
            console.error('API请求错误', error);
            return Promise.reject(error);
        }
    );

    return instance;
};

// 懒加载API实例
let apiPromise = null;
const getApi = () => {
    if (!apiPromise) {
        apiPromise = createApiInstance();
    }
    return apiPromise;
};

// API函数
export const fetchPendingTasks = async () => {
    const api = await getApi();
    return api.get('/tasks/pending');
};

export const addPrintTask = async (task) => {
    const api = await getApi();
    return api.post('/tasks', task);
};

export const fetchPrinters = async () => {
    const api = await getApi();
    return api.get('/printers');
};

export const setDefaultPrinter = async (printerName) => {
    const api = await getApi();
    return api.post('/settings/printer', { printerName });
};

export const getSystemStatus = async () => {
    const api = await getApi();
    return api.get('/system/status');
};

export const getQueueStatus = async () => {
    const api = await getApi();
    return api.get('/queue/status');
};

export const testPrint = async (content) => {
    const api = await getApi();
    return api.post('/print/test', { content });
};

export const cancelTask = async (taskId) => {
    const api = await getApi();
    return api.delete(`/tasks/${taskId}`);
};

export default {
    getApi
};