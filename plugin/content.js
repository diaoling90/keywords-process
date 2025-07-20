// 关键词采集器 - 数据通信
class KeywordCollector {
    constructor() {
        this.pendingKeywords = new Map();
        
        // 注册到全局，让 intercept.js 可以调用
        window.keywordCollector = this;
        
        this.init();
    }
    
    init() {
        // 检查是否在Google Trends页面
        if (window.location.href.includes('trends.google.com/trends/explore')) {
            console.log('关键词采集器已启动');
        }
        
        // 监听来自intercept.js的postMessage
        window.addEventListener('message', (event) => {
            if (event.data.type === 'TRENDS_KEYWORDS_FOUND' && event.data.source === 'intercept.js') {
                this.onKeywordsFound(event.data.keywords);
            }
        });
    }
    
    // 当拦截器发现关键词时被调用
    onKeywordsFound(keywords) {
        // 缓存关键词
        keywords.forEach(kw => {
            this.pendingKeywords.set(kw.keyword, kw);
        });
        
        console.log(`发现 ${keywords.length} 个关键词，总缓存: ${this.pendingKeywords.size} 个`);
    }
    
    // 获取待保存关键词（供popup调用）
    getPendingKeywords() {
        return Array.from(this.pendingKeywords.values());
    }
    
    // 清空缓存（供popup调用）
    clearCache() {
        this.pendingKeywords.clear();
        
        // 同时清空拦截器数据
        if (window.trendsData) {
            window.trendsData.capturedKeywords.clear();
        }
    }
    
    // 保存关键词到数据库
    async saveKeywords() {
        const keywords = this.getPendingKeywords();
        if (keywords.length === 0) return false;
        
        try {
            for (const keywordData of keywords) {
                await fetch('http://localhost:3000/api/keywords', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        keyword: keywordData.keyword,
                        source: 'Google Trends API',
                        trend_percentage: keywordData.value
                    })
                });
            }
            
            this.clearCache();
            return true;
        } catch (error) {
            console.error('保存关键词失败:', error);
            return false;
        }
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (window.keywordCollector) {
        switch (message.action) {
            case 'getStatus':
                sendResponse({
                    isMonitoring: true,
                    pendingCount: window.keywordCollector.pendingKeywords.size,
                    interceptedCount: window.trendsData ? window.trendsData.capturedKeywords.size : 0
                });
                break;
                
            case 'collectPending':
                window.keywordCollector.saveKeywords().then(success => {
                    sendResponse(success);
                });
                return true; // 保持消息通道开放
                
            case 'clearPending':
                window.keywordCollector.clearCache();
                sendResponse(true);
                break;
        }
    }
    return false;
});

function injectMainScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('intercept.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// 初始化
// 立即初始化KeywordCollector
new KeywordCollector();

// 注入数据处理脚本
if (document.readyState === 'complete') {
    injectMainScript();
} else {
    window.addEventListener('load', injectMainScript);
} 