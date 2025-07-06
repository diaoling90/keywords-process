// Google Trends 关键词收集器 - 弹窗脚本

class PopupController {
    constructor() {
        this.apiUrl = 'http://localhost:3000';
        this.isRunning = false;
        this.collectedCount = 0;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateUI();
        this.checkAPIStatus();
        this.getCollectorStatus();
    }
    
    bindEvents() {
        // 切换收集器状态
        document.getElementById('toggleBtn').addEventListener('click', () => {
            this.toggleCollector();
        });
        
        // 立即收集
        document.getElementById('collectNowBtn').addEventListener('click', () => {
            this.collectNow();
        });
    }
    
    async toggleCollector() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            // 检查是否在Google Trends页面
            if (!activeTab.url.includes('trends.google.com/trends/explore')) {
                this.showNotification('请先访问 Google Trends 探索页面', 'error');
                return;
            }
            
            // 发送消息到content script
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'toggleCollector'
            });
            
            if (response) {
                this.isRunning = response.status;
                this.updateUI();
                
                const message = this.isRunning ? '收集器已启动' : '收集器已停止';
                this.showNotification(message, 'success');
            }
        } catch (error) {
            console.error('切换收集器状态失败:', error);
            
            if (error.message.includes('Could not establish connection')) {
                this.showNotification('请刷新 Google Trends 页面后重试', 'error');
            } else {
                this.showNotification('操作失败，请重试', 'error');
            }
        }
    }
    
    async collectNow() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            if (!activeTab.url.includes('trends.google.com/trends/explore')) {
                this.showNotification('请先访问 Google Trends 探索页面', 'error');
                return;
            }
            
            // 暂时禁用按钮
            const collectBtn = document.getElementById('collectNowBtn');
            const originalText = collectBtn.textContent;
            collectBtn.disabled = true;
            collectBtn.innerHTML = '<div class="loading"></div> 收集中...';
            
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'collectNow'
            });
            
            if (response) {
                this.showNotification('开始收集关键词...', 'info');
                // 1秒后恢复按钮
                setTimeout(() => {
                    collectBtn.disabled = false;
                    collectBtn.textContent = originalText;
                }, 1000);
            }
        } catch (error) {
            console.error('立即收集失败:', error);
            this.showNotification('收集失败，请重试', 'error');
            
            // 恢复按钮
            const collectBtn = document.getElementById('collectNowBtn');
            collectBtn.disabled = false;
            collectBtn.textContent = '立即收集';
        }
    }
    
    async getCollectorStatus() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            if (activeTab.url.includes('trends.google.com/trends/explore')) {
                const response = await chrome.tabs.sendMessage(activeTab.id, {
                    action: 'getStatus'
                });
                
                if (response) {
                    this.isRunning = response.status;
                    this.collectedCount = response.collected || 0;
                    this.updateUI();
                }
            }
        } catch (error) {
            console.log('获取收集器状态失败 (可能页面未加载完成):', error);
        }
    }
    
    async checkAPIStatus() {
        const apiDot = document.getElementById('apiDot');
        const apiStatus = document.getElementById('apiStatus');
        
        try {
            apiStatus.textContent = '检查连接...';
            apiDot.className = 'api-dot';
            
            const response = await fetch(`${this.apiUrl}/api/keywords/all`);
            const data = await response.json();
            
            if (response.ok) {
                apiStatus.textContent = `API连接正常 (${data.total || 0} 条数据)`;
                apiDot.className = 'api-dot success';
            } else {
                throw new Error('API响应错误');
            }
        } catch (error) {
            apiStatus.textContent = 'API连接失败';
            apiDot.className = 'api-dot error';
            console.error('API连接检查失败:', error);
        }
    }
    
    updateUI() {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        const toggleBtn = document.getElementById('toggleBtn');
        const collectedCountEl = document.getElementById('collectedCount');
        
        if (this.isRunning) {
            statusText.textContent = '收集器运行中';
            statusDot.className = 'status-dot active';
            toggleBtn.textContent = '停止收集';
            toggleBtn.className = 'btn primary';
        } else {
            statusText.textContent = '收集器已停止';
            statusDot.className = 'status-dot';
            toggleBtn.textContent = '启动收集';
            toggleBtn.className = 'btn primary';
        }
        
        collectedCountEl.textContent = this.collectedCount;
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // 3秒后隐藏
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
}); 