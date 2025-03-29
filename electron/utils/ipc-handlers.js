const { ipcMain } = require('electron');
const log = require('electron-log');
const http = require('http');
const https = require('https');
const {checkForUpdates} = require("./updater");

/**
 * 设置所有IPC通信处理
 * @param {number} serverPort Spring Boot服务端口
 */
function setupIpcHandlers(serverPort) {
  log.info('初始化IPC通信处理');
  
  // 获取Spring Boot服务端口
  ipcMain.handle('get-server-port', () => {
    return serverPort;
  });
  
  // 获取应用版本
  ipcMain.handle('get-app-version', (event) => {
    return require('../../package.json').version;
  });

  // 手动检查更新
  ipcMain.handle('check-for-updates', (event) => {
    checkForUpdates();
    return true;
  });

  // API请求代理 - 将前端的请求转发到Spring Boot
  ipcMain.handle('api-request', async (event, { method, endpoint, data, headers }) => {
    try {
      log.info(`API请求: ${method} ${endpoint}`);
      
      const result = await makeRequest({
        method: method || 'GET',
        endpoint,
        data,
        headers,
        port: serverPort
      });
      
      return result;
    } catch (error) {
      log.error(`API请求失败: ${error.message}`);
      throw error;
    }
  });
  
  // 服务状态检查
  ipcMain.handle('check-server-status', async () => {
    try {
      const result = await makeRequest({
        method: 'GET',
        endpoint: '/api/system/status',
        port: serverPort
      });
      
      return {
        running: true,
        data: result
      };
    } catch (error) {
      log.error(`服务状态检查失败: ${error.message}`);
      return {
        running: false,
        error: error.message
      };
    }
  });
}

/**
 * 发送HTTP请求
 * @param {Object} options 请求选项
 * @returns {Promise<any>} 响应数据
 */
function makeRequest({ method, endpoint, data, headers = {}, port }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const requestModule = options.protocol === 'https:' ? https : http;
    
    const req = requestModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // 尝试解析为JSON
          if (responseData && (res.headers['content-type'] || '').includes('application/json')) {
            const jsonData = JSON.parse(responseData);
            resolve(jsonData);
          } else {
            resolve(responseData);
          }
        } catch (error) {
          log.error('解析响应数据失败:', error);
          resolve(responseData); // 返回原始数据
        }
      });
    });
    
    req.on('error', (error) => {
      log.error(`请求失败: ${error.message}`);
      reject(error);
    });
    
    if (data && (method === 'POST' || method === 'PUT')) {
      const postData = typeof data === 'string' ? data : JSON.stringify(data);
      req.write(postData);
    }
    
    req.end();
  });
}

module.exports = {
  setupIpcHandlers
};