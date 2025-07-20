// Google Trends 关键词收集器 - 弹窗脚本

class PopupController {
    constructor() {
        this.apiUrl = 'http://localhost:3000';
        this.pendingCount = 0;
        this.interceptedCount = 0;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateUI();
        this.checkAPIStatus();
        this.getCollectorStatus();
        
        // 定期更新状态
        setInterval(() => {
            this.getCollectorStatus();
        }, 2000);
    }
    
    bindEvents() {
        // 采集到数据库
        document.getElementById('collectBtn').addEventListener('click', () => {
            this.collectPending();
        });
        
        // 清空待采集
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearPending();
        });
    }
    
    async collectPending() {
        const collectBtn = document.getElementById('collectBtn');
        const originalText = collectBtn.textContent;
        
        try {
            collectBtn.disabled = true;
            collectBtn.textContent = '采集中...';
            
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            if (!activeTab.url.includes('trends.google.com/trends/explore')) {
                this.showNotification('请先访问 Google Trends 探索页面', 'error');
                return;
            }
            
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'collectPending'
            });
            
            if (response) {
                this.showNotification('关键词已保存到数据库', 'success');
            } else {
                this.showNotification('没有待保存的关键词', 'info');
            }
            
        } catch (error) {
            this.showNotification('采集失败，请重试', 'error');
        } finally {
            collectBtn.disabled = false;
            collectBtn.textContent = originalText;
            setTimeout(() => this.getCollectorStatus(), 1000);
        }
    }
    
    async clearPending() {
        const clearBtn = document.getElementById('clearBtn');
        const originalText = clearBtn.textContent;
        
        try {
            clearBtn.disabled = true;
            clearBtn.textContent = '清空中...';
            
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            if (!activeTab.url.includes('trends.google.com/trends/explore')) {
                this.showNotification('请先访问 Google Trends 探索页面', 'error');
                return;
            }
            
            await chrome.tabs.sendMessage(activeTab.id, {
                action: 'clearPending'
            });
            
            this.showNotification('已清空待采集列表', 'success');
            
        } catch (error) {
            this.showNotification('清空失败，请重试', 'error');
        } finally {
            clearBtn.disabled = false;
            clearBtn.textContent = originalText;
            setTimeout(() => this.getCollectorStatus(), 500);
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
                    this.pendingCount = response.pendingCount || 0;
                    this.interceptedCount = response.interceptedCount || 0;
                    this.updateUI();
                }
            }
        } catch (error) {
            // 忽略错误，可能页面未加载完成
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
        const pendingCountEl = document.getElementById('pendingCount');
        const interceptedCountEl = document.getElementById('interceptedCount');
        const collectBtn = document.getElementById('collectBtn');
        
        // 始终显示监听状态
        statusText.textContent = 'API监听中';
        statusDot.className = 'status-dot active';
        
        // 更新计数
        pendingCountEl.textContent = this.pendingCount;
        interceptedCountEl.textContent = this.interceptedCount;
        
        // 根据待采集数量调整按钮样式
        if (this.pendingCount > 0) {
            collectBtn.classList.remove('disabled');
        } else {
            collectBtn.classList.add('disabled');
        }
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