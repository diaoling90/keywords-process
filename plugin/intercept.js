(function() {
    // Google Trends 数据处理器 - 拦截和处理数据
    console.log('🎯 Google Trends 数据处理器已加载');

    // 目标API接口
    const TARGET_API = 'trends.google.com/trends/api/widgetdata/relatedsearches';

    // 全局数据存储
    window.trendsData = {
        capturedKeywords: new Map(),
        lastInterception: null
    };

    // Hook fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0];
        console.log('🔥 拦截API:', url);
        // 检查是否是目标API
        if (url && typeof url === 'string' && url.includes(TARGET_API)) {
            console.log('🔥 拦截到目标API:', url);
            
            // 克隆响应来读数据
            const clone = response.clone();
            clone.text().then(body => {
                handleTrendsResponse(body, url);
            });
        }
        
        return response;
    };

    // Hook XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        console.log('🔥 拦截API:', url);
        if (url && url.includes(TARGET_API)) {
            console.log('🔥 XHR拦截到目标API:', url);
            
            this.addEventListener("load", function () {
                handleTrendsResponse(this.responseText, url);
            });
        }
        
        return originalXHROpen.call(this, method, url, ...rest);
    };

    // 处理Google Trends响应数据
    function handleTrendsResponse(responseText, url) {
        console.log('🎉 拦截到API数据');
        
        try {
            let cleanData = responseText;
            if (responseText.startsWith(')]}\'')) {
                cleanData = responseText.replace(/^\)\]\}'\n/, '');
            }
            
            const data = JSON.parse(cleanData);
            
            // 提取关键词
            const keywords = extractKeywordsFromAPI(data);
            
            if (keywords.length > 0) {
                console.log(`✅ 发现 ${keywords.length} 个高价值关键词`);
                
                // 存储到全局对象
                keywords.forEach(kw => {
                    window.trendsData.capturedKeywords.set(kw.keyword, kw);
                });
                
                window.trendsData.lastInterception = {
                    timestamp: new Date().toISOString(),
                    keywordCount: keywords.length,
                    url: url
                };
                
                // 通知content script
                if (window.keywordCollector) {
                    window.keywordCollector.onKeywordsFound(keywords);
                }
                
                showNotification(`发现 ${keywords.length} 个高价值关键词！`);
            }
            
        } catch (parseError) {
            console.error('JSON解析失败:', parseError);
        }
    }

    // 从API数据中提取关键词
    function extractKeywordsFromAPI(data) {
        const keywords = [];
        
        try {
            function searchKeywords(obj, path = '') {
                if (!obj || typeof obj !== 'object') return;
                
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            const keyword = item.query || item.term || item.keyword || item.name;
                            const value = item.value || item.percent || item.score;
                            
                            if (keyword && value !== undefined) {
                                const numValue = parseFloat(value);
                                
                                if (numValue >= 300) {
                                    keywords.push({
                                        keyword: keyword,
                                        value: numValue,
                                        source: 'Google Trends API',
                                        path: `${path}[${index}]`
                                    });
                                }
                            }
                            
                            searchKeywords(item, `${path}[${index}]`);
                        }
                    });
                } else {
                    for (let key in obj) {
                        const currentPath = path ? `${path}.${key}` : key;
                        searchKeywords(obj[key], currentPath);
                    }
                }
            }
            
            searchKeywords(data);
            
        } catch (error) {
            console.error('提取关键词时出错:', error);
        }
        
        return keywords;
    }

    // 显示通知
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 10000;
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

    // 简化的调试接口
    window.trendsDebug = {
        status: () => {
            console.log('📊 拦截状态:', window.trendsData.capturedKeywords.size, '个关键词');
            return window.trendsData.capturedKeywords.size;
        },
        
        keywords: () => {
            const keywords = Array.from(window.trendsData.capturedKeywords.values());
            keywords.forEach((kw, index) => {
                console.log(`${index + 1}. ${kw.keyword} (${kw.value}%)`);
            });
            return keywords;
        }
    };

    console.log('✅ 数据处理器准备就绪');
})();