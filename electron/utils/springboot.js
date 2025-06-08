const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const findFreePort = require('find-free-port');
const log = require('electron-log');
const { app } = require('electron');

/**
 * 启动Spring Boot服务
 * @returns {Promise<{port: number, process: ChildProcess}>} 包含端口和进程的对象
 */
async function startSpringBootServer() {
  try {
    // 找到一个可用端口
    const [freePort] = await findFreePort(23333);
    log.info(`将使用端口: ${freePort}启动Spring Boot服务`);

    // 确定JAR文件路径
    let jarPath;
    // 确定Java可执行文件路径
    let javaExecutablePath;

    if (app.isPackaged) {
      // 生产环境 - 动态查找JAR文件
      const backendDir = path.join(process.resourcesPath, 'backend');
      const files = fs.readdirSync(backendDir);
      const jarFile = files.find(file => file.endsWith('.jar') && !file.endsWith('.original.jar'));

      if (!jarFile) {
        throw new Error(`在 ${backendDir} 中找不到可执行的JAR文件`);
      }
      jarPath = path.join(backendDir, jarFile);

      // 构建内置JRE的Java路径（根据不同平台）
      if (process.platform === 'win32') {
        javaExecutablePath = path.join(process.resourcesPath, 'jre', 'bin', 'java.exe');
      } else {
        javaExecutablePath = path.join(process.resourcesPath, 'jre', 'bin', 'java');
      }
    } else {
      // 开发环境 - 同样动态查找以提高稳健性
      const backendDir = path.join(__dirname, '../../backend/target');
      const files = fs.readdirSync(backendDir);
      const jarFile = files.find(file => file.endsWith('.jar') && !file.endsWith('.original.jar'));
      if (!jarFile) {
        throw new Error(`在 ${backendDir} 中找不到可执行的JAR文件`);
      }
      jarPath = path.join(backendDir, jarFile);
      
      // 开发环境可以使用项目中的JRE或系统Java
      if (fs.existsSync(path.join(__dirname, '../../jre'))) {
        if (process.platform === 'win32') {
          javaExecutablePath = path.join(__dirname, '../../jre', 'bin', 'java.exe');
        } else {
          javaExecutablePath = path.join(__dirname, '../../jre', 'bin', 'java');
        }
      } else {
        javaExecutablePath = 'java'; // 回退到系统Java
      }
    }

    // 验证文件存在
    if (!fs.existsSync(jarPath)) {
      throw new Error(`找不到Spring Boot JAR文件: ${jarPath}`);
    }

    if (javaExecutablePath !== 'java' && !fs.existsSync(javaExecutablePath)) {
      log.warn(`找不到内置Java: ${javaExecutablePath}，将使用系统Java`);
      javaExecutablePath = 'java';
    }

    log.info(`使用Java: ${javaExecutablePath}`);
    log.info(`使用JAR: ${jarPath}`);

    // 为可执行文件添加执行权限（仅在非Windows系统上）
    if (process.platform !== 'win32' && javaExecutablePath !== 'java') {
      try {
        fs.chmodSync(javaExecutablePath, '755');
        log.info('已为Java添加执行权限');
      } catch (err) {
        log.error('为Java添加执行权限失败:', err);
      }
    }

    // 获取应用数据路径
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');
    const logsDir = path.join(userDataPath, 'logs');

// 确保目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    log.info(`应用数据目录: ${dataDir}`);
    log.info(`应用日志目录: ${logsDir}`);

    // 启动Java进程
    const javaProcess = spawn(javaExecutablePath, [
      '-Xmx256m',                          // 限制内存使用
      `-Dserver.port=${freePort}`,         // 指定端口
      `-Dlogging.path=${app.getPath('userData')}/logs`, // 指定日志路径
      '-Dlogging.level.root=info',         // 设置日志级别
      // 设置数据存储路径
      `-Dapp.data.dir=${app.getPath('userData')}/data`,
      '-jar', jarPath                      // JAR文件路径
    ]);

    // 输出Java进程日志
    javaProcess.stdout.on('data', (data) => {
      log.info(`[Spring Boot] ${data.toString().trim()}`);
    });

    javaProcess.stderr.on('data', (data) => {
      log.error(`[Spring Boot Error] ${data.toString().trim()}`);
    });

    javaProcess.on('error', (error) => {
      log.error('启动Spring Boot进程失败:', error);
      throw error;
    });

    javaProcess.on('close', (code) => {
      log.info(`Spring Boot进程已退出，代码: ${code}`);
    });

    // 等待服务启动
    await waitForServerReady(freePort);

    return {
      port: freePort,
      process: javaProcess
    };
  } catch (error) {
    log.error('启动Spring Boot服务失败:', error);
    throw error;
  }
}

/**
 * 等待Spring Boot服务准备就绪
 * @param {number} port 服务端口
 * @returns {Promise<void>}
 */
function waitForServerReady(port) {
  return new Promise((resolve, reject) => {
    log.info(`等待Spring Boot服务准备就绪，端口: ${port}`);
    
    let attempts = 0;
    const maxAttempts = 30; // 30次尝试，每次等待1秒
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error(`等待Spring Boot服务超时，端口: ${port}`));
        return;
      }
      
      log.info(`尝试第${attempts}次连接Spring Boot服务...`);
      
      http.get(`http://localhost:${port}/api/system/status`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkInterval);
          log.info(`Spring Boot服务已准备就绪，端口: ${port}`);
          resolve();
        } else {
          log.warn(`服务返回状态码: ${res.statusCode}，继续等待...`);
        }
      }).on('error', (err) => {
        log.warn(`连接错误: ${err.message}，继续等待...`);
      });
    }, 1000);
  });
}

/**
 * 停止Spring Boot服务
 * @param {ChildProcess} process Spring Boot进程
 * @returns {Promise<void>}
 */
function stopSpringBootServer(process) {
  return new Promise((resolve, reject) => {
    if (!process) {
      resolve();
      return;
    }
    
    // 设置超时以防止挂起
    const timeout = setTimeout(() => {
      log.warn('关闭Spring Boot服务超时，强制终止');
      try {
        process.kill('SIGKILL');
      } catch (error) {
        log.error('强制终止Spring Boot进程失败:', error);
      }
      resolve();
    }, 5000);
    
    // 监听进程关闭事件
    process.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
    
    // 尝试优雅关闭
    try {
      process.kill('SIGTERM');
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

module.exports = {
  startSpringBootServer,
  stopSpringBootServer
};