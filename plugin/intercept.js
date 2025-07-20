(function() {
    // Google Trends 数据处理器 - 拦截和处理数据
    console.log('🎯 Google Trends 数据处理器已加载');

    // 目标API接口
    const TARGET_API = '/trends/api/widgetdata/relatedsearches';

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
            let cleanData = cleanTrendsResponse(responseText);
            
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
                
                // 通过postMessage通知content script
                window.postMessage({
                    type: 'TRENDS_KEYWORDS_FOUND',
                    keywords: keywords,
                    source: 'intercept.js'
                }, '*');
                
                console.log('✓ 已通过postMessage发送关键词数据');
                
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
            // 优先处理标准的Google Trends数据结构
            if (data && data.default && data.default.rankedList) {
                data.default.rankedList.forEach(rankedItem => {
                    if (rankedItem.rankedKeyword && Array.isArray(rankedItem.rankedKeyword)) {
                        rankedItem.rankedKeyword.forEach(item => {
                            if (item.query && item.value !== undefined) {
                                const numValue = parseFloat(item.value);
                                
                                if (numValue >= 300) {
                                    keywords.push({
                                        keyword: item.query,
                                        value: numValue
                                    });
                                    console.log(`✓ 发现高价值关键词: "${item.query}" (${numValue})`);
                                }
                            }
                        });
                    }
                });
            }
            
            
        } catch (error) {
            console.error('提取关键词时出错:', error);
        }
        
        return keywords;
    }

    function cleanTrendsResponse(rawText) {
        // 去除所有开头非JSON字符，直到第一个有效 JSON 的大括号为止
        const firstBrace = rawText.indexOf('{');
        if (firstBrace === -1) throw new Error('找不到 JSON 起始点');
        return rawText.slice(firstBrace);
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