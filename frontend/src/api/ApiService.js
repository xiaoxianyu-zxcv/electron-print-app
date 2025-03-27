import axios from 'axios'

/**
 * API服务 - 处理前端与后端的通信
 */
class ApiService {
  constructor() {
    this.port = 8080 // 默认端口
    this.baseURL = `http://localhost:${this.port}`
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // 请求拦截器
    this.axios.interceptors.request.use(
      config => {
        // 可以在这里添加认证令牌等
        return config
      },
      error => {
        return Promise.reject(error)
      }
    )
    
    // 响应拦截器
    this.axios.interceptors.response.use(
      response => {
        return response.data
      },
      error => {
        // 统一错误处理
        console.error('API请求失败', error)
        return Promise.reject(error)
      }
    )
  }
  
  /**
   * 设置服务器端口
   * @param {number} port 服务器端口
   */
  setServerPort(port) {
    this.port = port
    this.baseURL = `http://localhost:${port}`
    this.axios.defaults.baseURL = this.baseURL
  }
  
  /**
   * 发送API请求
   * 优先使用electronAPI进行请求（如果可用）
   * 如果不在Electron环境中，则使用Axios直接请求
   * @param {string} method 请求方法
   * @param {string} endpoint 请求端点
   * @param {Object} data 请求数据
   * @param {Object} headers 自定义头信息
   * @returns {Promise} 响应数据
   */
  async request(method, endpoint, data = null, headers = {}) {
    try {
      // 如果在Electron环境中，使用IPC通信
      if (window.electronAPI) {
        return await window.electronAPI.apiRequest({
          method,
          endpoint,
          data,
          headers
        })
      } else {
        // 直接使用Axios
        const config = {
          method,
          url: endpoint,
          headers
        }
        
        if (method.toUpperCase() === 'GET') {
          config.params = data
        } else {
          config.data = data
        }
        
        return await this.axios(config)
      }
    } catch (error) {
      console.error(`${method} ${endpoint} 请求失败:`, error)
      throw error
    }
  }
  
  // 便捷方法
  async get(endpoint, params = null, headers = {}) {
    return this.request('GET', endpoint, params, headers)
  }
  
  async post(endpoint, data = null, headers = {}) {
    return this.request('POST', endpoint, data, headers)
  }
  
  async put(endpoint, data = null, headers = {}) {
    return this.request('PUT', endpoint, data, headers)
  }
  
  async delete(endpoint, params = null, headers = {}) {
    return this.request('DELETE', endpoint, params, headers)
  }
  
  // 打印相关API封装
  
  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    return this.get('/api/system/status')
  }
  
  /**
   * 获取可用打印机列表
   */
  async getPrinters() {
    return this.get('/api/printers')
  }
  
  /**
   * 获取待处理打印任务
   */
  async getPendingTasks() {
    return this.get('/api/tasks/pending')
  }
  
  /**
   * 提交打印任务
   * @param {Object} task 打印任务对象
   */
  async addPrintTask(task) {
    return this.post('/api/tasks', task)
  }
  
  /**
   * 测试打印
   * @param {string} content 测试打印内容
   */
  async testPrint(content) {
    return this.post('/api/print/test', { content })
  }
  
  /**
   * 设置默认打印机
   * @param {string} printerName 打印机名称
   */
  async setDefaultPrinter(printerName) {
    return this.post('/api/settings/printer', { printerName })
  }
}

// 导出单例
export const apiService = new ApiService()