// Google Trends 关键词收集器 - 弹窗脚本

class PopupController {
    constructor() {
        this.apiUrl = 'http://localhost:3000';
        this.isMonitoring = true;
        this.pendingCount = 0;
        this.interceptedCount = 0;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateUI();
        this.checkAPIStatus();
        this.getCollectorStatus();
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
        try {
            const collectBtn = document.getElementById('collectBtn');
            const originalText = collectBtn.textContent;
            
            // 更新按钮状态
            collectBtn.disabled = true;
            collectBtn.textContent = '采集中...';
            
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            // 检查是否在Google Trends页面
            if (!activeTab.url.includes('trends.google.com/trends/explore')) {
                this.showNotification('请先访问 Google Trends 探索页面', 'error');
                collectBtn.disabled = false;
                collectBtn.textContent = originalText;
                return;
            }
            
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'collectPending'
            });
            
            if (response) {
                this.showNotification('开始采集关键词到数据库...', 'info');
                // 2秒后恢复按钮并刷新状态
                setTimeout(() => {
                    collectBtn.disabled = false;
                    collectBtn.textContent = originalText;
                    this.getCollectorStatus(); // 刷新状态
                }, 2000);
            }
        } catch (error) {
            console.error('采集关键词失败:', error);
            this.showNotification('采集失败，请重试', 'error');
            
            // 恢复按钮
            const collectBtn = document.getElementById('collectBtn');
            collectBtn.disabled = false;
            collectBtn.textContent = '采集到数据库';
        }
    }
    
    async clearPending() {
        try {
            const clearBtn = document.getElementById('clearBtn');
            const originalText = clearBtn.textContent;
            
            // 更新按钮状态
            clearBtn.disabled = true;
            clearBtn.textContent = '清空中...';
            
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            // 检查是否在Google Trends页面
            if (!activeTab.url.includes('trends.google.com/trends/explore')) {
                this.showNotification('请先访问 Google Trends 探索页面', 'error');
                clearBtn.disabled = false;
                clearBtn.textContent = originalText;
                return;
            }
            
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'clearPending'
            });
            
            if (response) {
                this.showNotification('已清空待采集列表', 'success');
                // 1秒后恢复按钮并刷新状态
                setTimeout(() => {
                    clearBtn.disabled = false;
                    clearBtn.textContent = originalText;
                    this.getCollectorStatus(); // 刷新状态
                }, 1000);
            }
        } catch (error) {
            console.error('清空待采集列表失败:', error);
            this.showNotification('清空失败，请重试', 'error');
            
            // 恢复按钮
            const clearBtn = document.getElementById('clearBtn');
            clearBtn.disabled = false;
            clearBtn.textContent = '清空待采集';
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
                    this.isMonitoring = response.isMonitoring;
                    this.pendingCount = response.pendingCount || 0;
                    this.interceptedCount = response.interceptedCount || 0;
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
        const pendingCountEl = document.getElementById('pendingCount');
        const interceptedCountEl = document.getElementById('interceptedCount');
        
        if (this.isMonitoring) {
            statusText.textContent = 'API监听中';
            statusDot.className = 'status-dot active';
        } else {
            statusText.textContent = '监听已停止';
            statusDot.className = 'status-dot';
        }
        
        pendingCountEl.textContent = this.pendingCount;
        interceptedCountEl.textContent = this.interceptedCount;
        
        // 根据待采集数量启用/禁用采集按钮
        const collectBtn = document.getElementById('collectBtn');
        if (this.pendingCount > 0) {
            collectBtn.classList.remove('disabled');
            collectBtn.disabled = false;
        } else {
            collectBtn.classList.add('disabled');
            collectBtn.disabled = false; // 仍然可以点击，但会显示"没有待采集"消息
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