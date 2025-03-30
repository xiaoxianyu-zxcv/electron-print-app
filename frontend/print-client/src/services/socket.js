import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { usePrinterStore } from '../store/printer'
import { useTaskStore } from '../store/tasks'

let stompClient = null
let isConnected = false
let reconnectTimer = null

// 检查是否在Electron环境中
const isElectron = window.electronAPI !== undefined;

// 获取WebSocket服务地址
const getServerUrl = async () => {
    let serverUrl = import.meta.env.VITE_WS_URL || 'http://localhost:23333/print-ws';


    // 添加store_id参数
    const storeId = localStorage.getItem('storeId');
    if (storeId) {
        serverUrl += (serverUrl.includes('?') ? '&' : '?') + 'storeId=' + storeId;
    }

    // 在Electron环境中，动态获取服务端口
    if (isElectron) {
        try {
            const port = await window.electronAPI.getServerPort();
            serverUrl = `http://localhost:${port}/print-ws`;
        } catch (error) {
            console.error('获取服务端口失败:', error);
        }
    }

    return serverUrl;
};

// 创建和配置STOMP客户端
export const setupSocketConnection = async () => {
    const serverUrl = await getServerUrl();
    const printerStore = usePrinterStore()
    const taskStore = useTaskStore()

    // 如果已经连接，则返回
    if (isConnected && stompClient) {
        return Promise.resolve(stompClient)
    }

    // 清除重连定时器
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
    }

    // 创建STOMP客户端
    stompClient = new Client({
        // 使用SockJS作为WebSocket传输
        webSocketFactory: () => new SockJS(serverUrl),

        // 自动重连配置
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        // 调试信息
        debug: function(str) {
            if (import.meta.env.DEV) {
                console.log('STOMP: ' + str)
            }
        },

        // 连接成功回调
        onConnect: function() {
            console.log('STOMP连接已建立')
            isConnected = true
            printerStore.updateConnectionStatus(true)

            // 订阅打印状态主题
            stompClient.subscribe('/topic/print-status', function(message) {
                try {
                    const statusUpdate = JSON.parse(message.body)
                    console.log('收到状态更新:', statusUpdate)

                    if (statusUpdate.taskId && statusUpdate.status) {
                        taskStore.updateTaskStatus(statusUpdate.taskId, statusUpdate.status)
                    }
                } catch (error) {
                    console.error('处理状态更新失败', error)
                }
            })

            // 订阅打印错误主题
            stompClient.subscribe('/topic/print-errors', function(message) {
                try {
                    const errorData = JSON.parse(message.body)
                    console.error('打印错误:', errorData)

                    // 这里可以添加错误通知UI
                } catch (error) {
                    console.error('处理错误消息失败', error)
                }
            })

            // 订阅心跳主题
            stompClient.subscribe('/topic/heartbeat', function() {
                // 心跳响应不需要特殊处理
            })

            // 发送初始心跳
            sendHeartbeat()
        },

        // 连接错误回调
        onStompError: function(frame) {
            console.error('STOMP错误:', frame.headers['message'])
            isConnected = false
            printerStore.updateConnectionStatus(false)
        },

        // 连接断开回调
        onWebSocketClose: function() {
            console.log('WebSocket连接已关闭')
            isConnected = false
            printerStore.updateConnectionStatus(false)
        }
    })

    // 激活连接
    stompClient.activate()

    return new Promise((resolve) => {
        const checkConnection = () => {
            if (isConnected) {
                resolve(stompClient)
            } else {
                setTimeout(checkConnection, 100)
            }
        }
        checkConnection()
    })
}

// 发送打印请求
export const sendPrintRequest = async (content, printerName) => {
    await ensureConnection()

    const printRequest = {
        content,
        printerName
    }

    stompClient.publish({
        destination: '/app/print',
        body: JSON.stringify(printRequest)
    })
}

// 发送心跳
export const sendHeartbeat = async () => {
    await ensureConnection()

    stompClient.publish({
        destination: '/app/heartbeat',
        body: JSON.stringify({})
    })
}

// 确保连接已建立
export const ensureConnection = async () => {
    if (!isConnected || !stompClient) {
        return setupSocketConnection()
    }
    return Promise.resolve(stompClient)
}

// 断开连接
export const disconnect = () => {
    if (stompClient && isConnected) {
        stompClient.deactivate()
        isConnected = false
        usePrinterStore().updateConnectionStatus(false)
        console.log('STOMP连接已断开')
    }
}

// 定期发送心跳
setInterval(() => {
    if (isConnected) {
        sendHeartbeat()
    }
}, 30000)
