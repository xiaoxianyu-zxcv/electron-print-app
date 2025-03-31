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

    //  请求拦截器
    instance.interceptors.request.use(
        config => {
            console.log('发送请求:', {
                url: config.url,
                method: config.method,
                data: config.data,
                headers: config.headers
            });
            return config;
        },
        error => {
            console.error('请求错误:', error);
            return Promise.reject(error);
        }
    );


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
    // 获取storeId
    const storeId = localStorage.getItem('storeId');

    if (storeId) {
        return api.get(`/tasks/pending?storeId=${storeId}`);
    } else {
        // 没有storeId时返回空数组
        console.warn('没有storeId，无法获取待处理任务');
        return [];
    }
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

export const login = async (username, password) => {
    const api = await getApi();
    return api.post('/user/login', { username, password });
};

// 添加登出函数
export const logout = async () => {
    const api = await getApi();
    return api.post('/auth/logout');
};

export const getUserInfo = async () => {
    const api = await getApi();
    return api.get('/user/status');
};

// 添加获取登录状态的函数
export const getAuthStatus = async () => {
    const api = await getApi();
    return api.get('/auth/status');
};


export default {
    getApi
};
