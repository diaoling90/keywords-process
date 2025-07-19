// 关键词采集器 - UI和数据保存
class KeywordCollector {
    constructor() {
        this.isActive = false;
        this.pendingKeywords = new Map();
        
        // 注册到全局，让 intercept.js 可以调用
        window.keywordCollector = this;
        
        this.init();
    }
    
    init() {
        // 检查是否在Google Trends页面
        if (window.location.href.includes('trends.google.com/trends/explore')) {
            this.isActive = true;
            this.setupUI();
        }
    }
    
    // 当拦截器发现关键词时被调用
    onKeywordsFound(keywords) {
        // 缓存关键词
        keywords.forEach(kw => {
            this.pendingKeywords.set(kw.keyword, kw);
        });
        
        // 更新UI状态
        this.updateUI();
    }
    
    // 设置UI
    setupUI() {
        // 创建悬浮控制面板
        this.createFloatingPanel();
    }
    
    // 创建悬浮控制面板
    createFloatingPanel() {
        // 移除已存在的面板
        const existingPanel = document.getElementById('keyword-collector-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const panel = document.createElement('div');
        panel.id = 'keyword-collector-panel';
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 280px;
            background: #fff;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
        `;
        
        panel.innerHTML = `
            <div style="background: #4CAF50; color: white; padding: 12px; border-radius: 6px 6px 0 0; font-weight: bold; text-align: center;">
                🎯 关键词采集器
            </div>
            <div style="padding: 15px;">
                <div style="margin-bottom: 15px; text-align: center;">
                    <span id="pending-count" style="font-size: 24px; font-weight: bold; color: #4CAF50;">0</span>
                    <div style="font-size: 12px; color: #666;">待保存关键词</div>
                </div>
                
                <button id="save-keywords-btn" style="
                    width: 100%;
                    padding: 12px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 8px;
                " disabled>保存到数据库</button>
                
                <button id="clear-keywords-btn" style="
                    width: 100%;
                    padding: 8px;
                    background: #ff9800;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">清空缓存</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 绑定事件
        this.bindUIEvents();
        
        // 定期更新状态
        setInterval(() => {
            this.updateUI();
        }, 2000);
    }
    
    // 绑定UI事件
    bindUIEvents() {
        // 保存关键词按钮
        document.getElementById('save-keywords-btn').addEventListener('click', () => {
            this.saveKeywords();
        });
        
        // 清空缓存按钮
        document.getElementById('clear-keywords-btn').addEventListener('click', () => {
            this.clearCache();
        });
    }
    
    // 更新UI状态
    updateUI() {
        const pendingEl = document.getElementById('pending-count');
        const saveBtn = document.getElementById('save-keywords-btn');
        
        if (pendingEl && saveBtn) {
            // 更新计数
            pendingEl.textContent = this.pendingKeywords.size;
            
            // 更新保存按钮状态
            if (this.pendingKeywords.size > 0) {
                saveBtn.disabled = false;
                saveBtn.style.background = '#4CAF50';
                saveBtn.textContent = `保存 ${this.pendingKeywords.size} 个关键词`;
            } else {
                saveBtn.disabled = true;
                saveBtn.style.background = '#ccc';
                saveBtn.textContent = '保存到数据库';
            }
        }
    }
    
    // 保存关键词到数据库
    async saveKeywords() {
        if (this.pendingKeywords.size === 0) {
            this.showNotification('没有待保存的关键词', 'warning');
            return;
        }
        
        const keywords = Array.from(this.pendingKeywords.values());
        
        try {
            for (const keywordData of keywords) {
                const response = await fetch('http://localhost:3000/api/keywords', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        keyword: keywordData.keyword,
                        source: keywordData.source || 'Google Trends API',
                        trend_percentage: keywordData.value
                    })
                });
            }
            
            this.showNotification(`成功保存 ${keywords.length} 个关键词！`, 'success');
            this.clearCache();
            
        } catch (error) {
            this.showNotification('保存失败: ' + error.message, 'error');
        }
    }
    
    // 清空缓存
    clearCache() {
        this.pendingKeywords.clear();
        
        // 同时清空拦截器数据
        if (window.trendsData) {
            window.trendsData.capturedKeywords.clear();
        }
        
        this.updateUI();
        this.showNotification('缓存已清空', 'info');
    }
    

    
    // 显示通知
    showNotification(message, type = 'info') {
        const colors = {
            success: '#4CAF50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2196F3'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

function injectMainScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('intercept.js');
    script.onload = function() {
      this.remove(); // 脚本加载后移除元素
    };
    (document.head || document.documentElement).appendChild(script);
  }

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new KeywordCollector();
    });
} else {
    new KeywordCollector();
}

// 注入数据处理脚本
if (document.readyState === 'complete') {
    injectMainScript();
} else {
    window.addEventListener('load', injectMainScript);
} 