import { defineStore } from 'pinia'
import { fetchPrinters, setDefaultPrinter, getSystemStatus } from '../services/api'

export const usePrinterStore = defineStore('printer', {
    state: () => ({
        printers: [],
        currentPrinter: null,
        isLoading: false,
        error: null,
        systemStatus: {
            version: '',
            printerReady: false,
            queueSize: 0,
            successRate: 0
        },
        isConnected: false
    }),

    getters: {
        isPrinterReady: (state) => state.systemStatus.printerReady,
        defaultPrinter: (state) => state.currentPrinter
    },

    actions: {
        // 加载所有打印机
        async loadPrinters() {
            this.isLoading = true
            this.error = null

            try {
                const printers = await fetchPrinters()
                this.printers = printers

                // 如果存在本地存储的默认打印机，则选择它
                const savedPrinter = localStorage.getItem('defaultPrinter')
                if (savedPrinter && this.printers.some(p => p.name === savedPrinter)) {
                    this.currentPrinter = savedPrinter
                } else if (this.printers.length > 0) {
                    // 否则选择第一个打印机
                    this.currentPrinter = this.printers[0].name
                }
            } catch (error) {
                this.error = error.message || '加载打印机失败'
                console.error('加载打印机失败', error)
            } finally {
                this.isLoading = false
            }
        },

        // 设置默认打印机
        async setDefaultPrinter(printerName) {
            this.isLoading = true
            this.error = null

            try {
                await setDefaultPrinter(printerName)
                this.currentPrinter = printerName

                // 保存到本地存储
                localStorage.setItem('defaultPrinter', printerName)
            } catch (error) {
                this.error = error.message || '设置默认打印机失败'
                console.error('设置默认打印机失败', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },

        // 获取系统状态
        async refreshSystemStatus() {
            this.isLoading = true

            try {
                const status = await getSystemStatus()
                this.systemStatus = status

                // 如果当前打印机为空，则使用系统返回的当前打印机
                if (!this.currentPrinter && status.currentPrinter) {
                    this.currentPrinter = status.currentPrinter
                }
            } catch (error) {
                console.error('获取系统状态失败', error)
            } finally {
                this.isLoading = false
            }
        },

        // 更新连接状态
        updateConnectionStatus(isConnected) {
            this.isConnected = isConnected
        }
    }
})