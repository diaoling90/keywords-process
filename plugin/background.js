// Google Trends 关键词收集器 - 后台脚本

class BackgroundService {
    constructor() {
        this.isRunning = false;
        this.init();
    }
    
    init() {
        console.log('🔧 后台服务已启动');
        
        // 监听来自content script的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放以支持异步响应
        });
        
        // 监听插件安装事件
        chrome.runtime.onInstalled.addListener(() => {
            this.setDefaultIcon();
            this.showWelcomeNotification();
        });
    }
    
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'updateIcon':
                    this.updateIcon(request.isRunning);
                    break;
                    
                case 'showNotification':
                    this.showNotification(request.message, request.type);
                    break;
                    
                case 'getBackgroundStatus':
                    sendResponse({ 
                        isRunning: this.isRunning,
                        timestamp: Date.now()
                    });
                    break;
                    
                default:
                    console.log('未知的消息类型:', request.action);
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
        }
    }
    
    updateIcon(isRunning) {
        this.isRunning = isRunning;
        
        // 根据运行状态设置不同的图标
        const iconPath = isRunning ? {
            "16": "icons/icon16-active.png",
            "32": "icons/icon32-active.png",
            "48": "icons/icon48-active.png",
            "128": "icons/icon128-active.png"
        } : {
            "16": "icons/icon16.png",
            "32": "icons/icon32.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png"
        };
        
        chrome.action.setIcon({ path: iconPath });
        
        // 设置徽章文本
        chrome.action.setBadgeText({
            text: isRunning ? 'ON' : ''
        });
        
        // 设置徽章颜色
        chrome.action.setBadgeBackgroundColor({
            color: isRunning ? '#28a745' : '#6c757d'
        });
        
        // 更新标题
        chrome.action.setTitle({
            title: isRunning ? 
                'Google Trends 关键词收集器 - 运行中' : 
                'Google Trends 关键词收集器 - 已停止'
        });
    }
    
    setDefaultIcon() {
        chrome.action.setIcon({
            path: {
                "16": "icons/icon16.png",
                "32": "icons/icon32.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png"
            }
        });
        
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: 'Google Trends 关键词收集器' });
    }
    
    showNotification(message, type = 'info') {
        const iconUrl = this.getNotificationIcon(type);
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: iconUrl,
            title: 'Google Trends 关键词收集器',
            message: message,
            priority: type === 'error' ? 2 : 1
        });
    }
    
    getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return 'icons/icon48-success.png';
            case 'error':
                return 'icons/icon48-error.png';
            case 'info':
                return 'icons/icon48-info.png';
            default:
                return 'icons/icon48.png';
        }
    }
    
    showWelcomeNotification() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Google Trends 关键词收集器',
            message: '插件已安装！请访问 Google Trends 页面开始收集关键词。',
            priority: 1
        });
    }
}

// 启动后台服务
const backgroundService = new BackgroundService(); 