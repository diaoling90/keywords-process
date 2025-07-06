// Google Trends 关键词收集器 - 内容脚本

class TrendsKeywordCollector {
    constructor() {
        this.apiUrl = 'http://localhost:3000';
        this.isRunning = false;
        this.collectedKeywords = new Set();
        this.observer = null;
        
        this.init();
    }
    
    init() {
        console.log('🚀 Google Trends 关键词收集器已启动');
        
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
        } else {
            this.startMonitoring();
        }
        
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleCollector') {
                this.toggleCollector();
                sendResponse({ status: this.isRunning });
            } else if (request.action === 'getStatus') {
                sendResponse({ 
                    status: this.isRunning,
                    collected: this.collectedKeywords.size
                });
            } else if (request.action === 'collectNow') {
                this.collectKeywords();
                sendResponse({ status: 'collecting' });
            }
        });
    }
    
    startMonitoring() {
        // 创建观察者，监控DOM变化
        this.observer = new MutationObserver((mutations) => {
            if (this.isRunning) {
                this.checkForNewQueries();
            }
        });
        
        // 开始观察整个文档的变化
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 初始收集
        setTimeout(() => {
            if (this.isRunning) {
                this.collectKeywords();
            }
        }, 3000); // 等待页面完全加载
        
        // 定期收集
        setInterval(() => {
            if (this.isRunning) {
                this.collectKeywords();
            }
        }, 10000); // 每10秒检查一次
    }
    
    toggleCollector() {
        this.isRunning = !this.isRunning;
        
        if (this.isRunning) {
            this.showNotification('✅ 关键词收集器已启动', 'success');
            this.collectKeywords();
        } else {
            this.showNotification('⏸️ 关键词收集器已暂停', 'info');
        }
        
        // 更新插件图标状态
        chrome.runtime.sendMessage({
            action: 'updateIcon',
            isRunning: this.isRunning
        });
    }
    
    checkForNewQueries() {
        // 简单的防抖处理
        clearTimeout(this.checkTimeout);
        this.checkTimeout = setTimeout(() => {
            this.collectKeywords();
        }, 2000);
    }
    
    collectKeywords() {
        try {
            const keywords = this.extractHighTrendingKeywords();
            if (keywords.length > 0) {
                this.sendKeywordsToAPI(keywords);
            }
        } catch (error) {
            console.error('收集关键词时出错:', error);
        }
    }
    
    extractHighTrendingKeywords() {
        const keywords = [];
        
        // 查找相关查询区域的多种可能选择器
        const selectors = [
            // 相关查询区域
            '[data-token*="related"] [data-token*="query"]',
            '[aria-label*="相关查询"] tbody tr',
            '[aria-label*="Related queries"] tbody tr',
            '.related-queries tbody tr',
            'div[data-token] tbody tr',
            // 通用的表格行选择器
            'table tbody tr',
            // 其他可能的结构
            '.query-table tbody tr',
            '[data-section="RELATED_QUERIES"] tbody tr'
        ];
        
        for (const selector of selectors) {
            const rows = document.querySelectorAll(selector);
            
            if (rows.length > 0) {
                console.log(`找到 ${rows.length} 个查询行，选择器: ${selector}`);
                
                rows.forEach((row, index) => {
                    try {
                        const keyword = this.extractKeywordFromRow(row);
                        if (keyword) {
                            keywords.push(keyword);
                        }
                    } catch (error) {
                        console.error(`处理第 ${index} 行时出错:`, error);
                    }
                });
                
                // 如果找到了数据，就不再尝试其他选择器
                if (keywords.length > 0) {
                    break;
                }
            }
        }
        
        // 去重并过滤已收集的
        const newKeywords = keywords.filter(kw => !this.collectedKeywords.has(kw.text));
        
        console.log(`提取到 ${keywords.length} 个关键词，其中 ${newKeywords.length} 个是新的`);
        return newKeywords;
    }
    
    extractKeywordFromRow(row) {
        try {
            // 查找关键词文本
            const keywordElement = row.querySelector('td:first-child') || 
                                 row.querySelector('[data-token*="query"]') ||
                                 row.querySelector('span') ||
                                 row.querySelector('div');
            
            if (!keywordElement) return null;
            
            const keywordText = keywordElement.textContent?.trim();
            if (!keywordText || keywordText.length < 2) return null;
            
            // 查找趋势百分比
            const trendElements = row.querySelectorAll('td, span, div');
            let trendPercentage = 0;
            
            for (const element of trendElements) {
                const text = element.textContent?.trim();
                if (text && text.includes('%')) {
                    // 提取百分比数字
                    const match = text.match(/\+?(\d+(?:,\d+)?(?:\.\d+)?)%/);
                    if (match) {
                        trendPercentage = parseFloat(match[1].replace(',', ''));
                        break;
                    }
                }
            }
            
            // 只收集趋势超过300%的关键词
            if (trendPercentage > 300) {
                console.log(`发现高趋势关键词: "${keywordText}" (${trendPercentage}%)`);
                return {
                    text: keywordText,
                    trend: trendPercentage,
                    source: 'google_trends'
                };
            }
            
            return null;
        } catch (error) {
            console.error('提取关键词时出错:', error);
            return null;
        }
    }
    
    async sendKeywordsToAPI(keywords) {
        if (keywords.length === 0) return;
        
        try {
            console.log(`准备发送 ${keywords.length} 个关键词到API`);
            
            for (const keyword of keywords) {
                try {
                    const response = await fetch(`${this.apiUrl}/api/keywords`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            keyword: keyword.text,
                            trend_percentage: keyword.trend,
                            source: 'google_trends_extension',
                            collected_time: new Date().toISOString()
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success || response.ok) {
                        this.collectedKeywords.add(keyword.text);
                        console.log(`✅ 成功添加关键词: ${keyword.text}`);
                    } else {
                        console.error(`❌ 添加关键词失败: ${keyword.text}`, result);
                        this.showNotification(`添加关键词失败: ${keyword.text}`, 'error');
                    }
                } catch (error) {
                    console.error(`网络请求失败:`, error);
                    this.showNotification(`网络连接失败，请检查本地服务器`, 'error');
                }
            }
            
            if (keywords.length > 0) {
                this.showNotification(`✅ 成功收集 ${keywords.length} 个高趋势关键词`, 'success');
            }
            
        } catch (error) {
            console.error('发送关键词到API时出错:', error);
            this.showNotification('发送关键词失败', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // 创建页面内通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'info':
                notification.style.backgroundColor = '#007bff';
                break;
            default:
                notification.style.backgroundColor = '#6c757d';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 3000);
        
        // 发送消息到background script以显示浏览器通知
        chrome.runtime.sendMessage({
            action: 'showNotification',
            message: message,
            type: type
        });
    }
}

// 启动收集器
const collector = new TrendsKeywordCollector(); 