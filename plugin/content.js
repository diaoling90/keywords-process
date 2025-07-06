// Google Trends 关键词收集器 - 内容脚本

class TrendsKeywordCollector {
    constructor() {
        this.apiUrl = 'http://localhost:3000';
        this.isRunning = false;
        this.collectedKeywords = new Set();
        this.observer = null;
        this.currentPage = 1;
        this.isProcessingPages = false;
        this.debugMode = true; // 开启调试模式
        
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
                this.collectAllPages();
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
        
        // 移除自动收集功能，只在用户点击时收集
        console.log('⚠️ 自动收集功能已禁用，请手动点击收集按钮');
    }
    
    toggleCollector() {
        this.isRunning = !this.isRunning;
        
        if (this.isRunning) {
            this.showNotification('✅ 关键词收集器已启动', 'success');
            this.collectAllPages();
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
            if (!this.isProcessingPages) {
                this.collectAllPages();
            }
        }, 3000);
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
    
    // 收集当前页面的关键词
    async collectAllPages() {
        if (this.isProcessingPages) {
            console.log('正在处理收集，跳过本次收集');
            return;
        }
        
        this.isProcessingPages = true;
        const allKeywords = [];
        
        try {
            console.log('🔍 开始收集当前页面的关键词...');
            
            // 先检查页面类型和结构
            this.debugPageStructure();
            
            // 收集当前页面的关键词
            const currentPageKeywords = this.extractHighTrendingKeywords();
            allKeywords.push(...currentPageKeywords);
            
            // 发送收集到的关键词
            if (allKeywords.length > 0) {
                console.log(`📊 收集到 ${allKeywords.length} 个关键词`);
                this.sendKeywordsToAPI(allKeywords);
            } else {
                console.log('❌ 没有找到符合条件的关键词');
                this.showNotification('❌ 没有找到符合条件的关键词', 'info');
            }
            
        } catch (error) {
            console.error('收集关键词时出错:', error);
        } finally {
            this.isProcessingPages = false;
        }
    }
    
    // 新增：调试页面结构
    debugPageStructure() {
        if (!this.debugMode) return;
        
        console.log('🔍 调试页面结构...');
        console.log('当前URL:', window.location.href);
        
        // 检查页面中的所有表格
        const tables = document.querySelectorAll('table');
        console.log(`发现 ${tables.length} 个表格`);
        
        tables.forEach((table, index) => {
            console.log(`表格 ${index + 1}:`, table);
            const rows = table.querySelectorAll('tr');
            console.log(`  - 包含 ${rows.length} 行`);
            
            // 检查前几行的内容
            rows.forEach((row, rowIndex) => {
                if (rowIndex < 5) { // 只检查前5行
                    const cells = row.querySelectorAll('td, th');
                    const rowText = Array.from(cells).map(cell => cell.textContent?.trim()).join(' | ');
                    console.log(`    行 ${rowIndex + 1}: ${rowText}`);
                }
            });
        });
        
        // 检查可能的相关查询区域
        const possibleSelectors = [
            'div[data-token]',
            '[aria-label*="相关"]',
            '[aria-label*="Related"]',
            '[aria-label*="query"]',
            '[aria-label*="查询"]',
            'div[role="region"]',
            'section',
            'article'
        ];
        
        possibleSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
            }
        });
    }
    
    // 翻页功能已移除，暂时不需要翻页
    
    extractHighTrendingKeywords() {
        const keywords = [];
        
        console.log('🔍 开始提取关键词...');
        
        // 基于真实DOM结构的正确选择器
        const correctSelectors = [
            // 主要选择器：Google Trends相关查询的实际结构
            'a.progress-label',
            'a.progress-label.transition-width',
            '.progress-label',
            
            // 备用选择器：如果结构稍有变化
            'a[class*="progress-label"]',
            'div[ng-include*="item_view"]',
            '.label-text',
            
            // 最后的兜底选择器
            '*[class*="label"]'
        ];
        
        let foundElements = [];
        
        for (const selector of correctSelectors) {
            const elements = document.querySelectorAll(selector);
            
            if (elements.length > 0) {
                console.log(`✅ 选择器 "${selector}" 找到 ${elements.length} 个元素`);
                foundElements = Array.from(elements);
                break; // 找到第一个有效的选择器就使用它
            } else {
                console.log(`❌ 选择器 "${selector}" 没有找到元素`);
            }
        }
        
        if (foundElements.length === 0) {
            console.log('❌ 没有找到任何相关查询元素');
            return keywords;
        }
        
        console.log(`📊 总共找到 ${foundElements.length} 个元素待处理`);
        
        foundElements.forEach((element, index) => {
            try {
                const keyword = this.extractKeywordFromElement(element);
                if (keyword) {
                    keywords.push(keyword);
                    console.log(`✅ 第 ${index + 1} 个元素提取到关键词: "${keyword.text}" (${keyword.trendType})`);
                } else {
                    console.log(`❌ 第 ${index + 1} 个元素没有提取到关键词`);
                }
            } catch (error) {
                console.error(`处理第 ${index + 1} 个元素时出错:`, error);
            }
        });
        
        // 去重并过滤已收集的
        const newKeywords = keywords.filter(kw => !this.collectedKeywords.has(kw.text));
        
        console.log(`📈 提取到 ${keywords.length} 个关键词，其中 ${newKeywords.length} 个是新的`);
        return newKeywords;
    }
    
    extractKeywordFromElement(element) {
        try {
            if (this.debugMode) {
                console.log('🔍 分析元素:', element.outerHTML.substring(0, 200) + '...');
            }
            
            // 基于真实DOM结构提取关键词
            let keywordText = '';
            let trendPercentage = 0;
            let isSurging = false;
            
            // 方法1：查找 .label-text 内的 span 元素（主要方法）
            const labelTextSpan = element.querySelector('.label-text span[ng-bind="bidiText"]') || 
                                element.querySelector('.label-text span');
            
            if (labelTextSpan) {
                keywordText = labelTextSpan.textContent?.trim();
                if (this.debugMode) {
                    console.log(`📝 从 .label-text span 找到关键词: "${keywordText}"`);
                }
            }
            
            // 方法2：如果没找到，尝试直接从 .label-text 获取
            if (!keywordText) {
                const labelText = element.querySelector('.label-text');
                if (labelText) {
                    keywordText = labelText.textContent?.trim();
                    if (this.debugMode) {
                        console.log(`📝 从 .label-text 找到关键词: "${keywordText}"`);
                    }
                }
            }
            
            // 方法3：如果还没找到，从元素的文本内容中提取第一行有效文本
            if (!keywordText) {
                const elementText = element.textContent?.trim();
                if (elementText) {
                    // 按换行符分割，取第一个有效的行
                    const lines = elementText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    if (lines.length > 0) {
                        keywordText = lines[0];
                        if (this.debugMode) {
                            console.log(`📝 从元素文本找到关键词: "${keywordText}"`);
                        }
                    }
                }
            }
            
            if (!keywordText || keywordText.length < 2) {
                if (this.debugMode) {
                    console.log('❌ 没有找到有效的关键词文本');
                }
                return null;
            }
            
            // 清理关键词文本，移除数字和特殊字符
            keywordText = keywordText.replace(/^\d+\s*/, '').trim(); // 移除开头的数字
            keywordText = keywordText.replace(/\s+/g, ' ').trim(); // 标准化空格
            
            // 如果关键词包含"飙升"等词汇，需要分离
            if (keywordText.includes('飙升')) {
                keywordText = keywordText.replace(/飙升/g, '').trim();
            }
            
            if (this.debugMode) {
                console.log(`📝 清理后的关键词: "${keywordText}"`);
            }
            
            // 检查飙升标识
            const risingValueElement = element.querySelector('.rising-value');
            if (risingValueElement) {
                const risingText = risingValueElement.textContent?.trim();
                if (risingText && (risingText.includes('飙升') || risingText.includes('Breakout'))) {
                    isSurging = true;
                    console.log(`🚀 发现飙升关键词: "${keywordText}"`);
                }
            }
            
            // 检查百分比（在整个元素中查找）
            const allText = element.textContent?.trim();
            const percentageRegex = /\+?(\d+(?:,\d+)?(?:\.\d+)?)%/g;
            let match;
            while ((match = percentageRegex.exec(allText)) !== null) {
                const percentage = parseFloat(match[1].replace(',', ''));
                if (percentage > trendPercentage) {
                    trendPercentage = percentage;
                }
            }
            
            if (this.debugMode) {
                console.log(`📊 趋势分析: 百分比=${trendPercentage}%, 飙升=${isSurging}`);
            }
            
            // 收集条件：趋势超过300% 或 显示"飙升"
            if (trendPercentage > 300 || isSurging) {
                const trendType = isSurging ? '飙升' : `${trendPercentage}%`;
                console.log(`✅ 发现符合条件的关键词: "${keywordText}" (${trendType})`);
                
                return {
                    text: keywordText,
                    trend: trendPercentage,
                    isSurging: isSurging,
                    trendType: trendType,
                    source: 'google_trends'
                };
            } else {
                if (this.debugMode) {
                    console.log(`❌ 关键词不符合条件: "${keywordText}" (${trendPercentage}%, 飙升=${isSurging})`);
                }
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
                            is_surging: keyword.isSurging,
                            trend_type: keyword.trendType,
                            source: 'google_trends_extension',
                            collected_time: new Date().toISOString()
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success || response.ok) {
                        this.collectedKeywords.add(keyword.text);
                        console.log(`✅ 成功添加关键词: ${keyword.text} (${keyword.trendType})`);
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

// 将收集器暴露为全局变量，便于调试
window.collector = collector;

// 嵌入调试和测试功能
window.trendsPluginDebug = {
    // 检查插件是否正确加载
    checkPluginLoaded() {
        console.log('🔍 检查插件加载状态...');
        
        if (typeof window.collector !== 'undefined') {
            console.log('✅ 插件已正确加载');
            return true;
        } else {
            console.log('❌ 插件未加载，请检查插件安装状态');
            return false;
        }
    },
    
    // 检查页面结构
    checkPageStructure() {
        console.log('🔍 检查页面结构...');
        
        // 检查URL
        console.log('📍 当前URL:', window.location.href);
        
        // 检查是否在Google Trends页面
        if (!window.location.href.includes('trends.google.com')) {
            console.log('❌ 不在Google Trends页面');
            return false;
        }
        
        // 检查表格
        const tables = document.querySelectorAll('table');
        console.log(`📊 发现 ${tables.length} 个表格`);
        
        if (tables.length === 0) {
            console.log('❌ 页面中没有找到表格');
            return false;
        }
        
        // 检查表格内容
        tables.forEach((table, index) => {
            const rows = table.querySelectorAll('tr');
            console.log(`表格 ${index + 1}: ${rows.length} 行`);
            
            // 显示前3行内容
            for (let i = 0; i < Math.min(3, rows.length); i++) {
                const cells = rows[i].querySelectorAll('td, th');
                const rowText = Array.from(cells).map(cell => cell.textContent?.trim()).join(' | ');
                if (rowText) {
                    console.log(`  行 ${i + 1}: ${rowText}`);
                }
            }
        });
        
        return true;
    },
    
    // 检查高趋势关键词
    checkHighTrendingKeywords() {
        console.log('🔍 检查高趋势关键词...');
        
        // 查找包含百分比的元素
        const percentageElements = Array.from(document.querySelectorAll('*')).filter(el => {
            return el.textContent && el.textContent.includes('%') && el.textContent.match(/\d+%/);
        });
        
        console.log(`📊 找到 ${percentageElements.length} 个包含百分比的元素`);
        
        let highTrendingFound = false;
        
        percentageElements.forEach((el, index) => {
            if (index < 10) { // 只显示前10个
                const text = el.textContent.trim();
                const match = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)%/);
                if (match) {
                    const percentage = parseFloat(match[1].replace(',', ''));
                    console.log(`  元素 ${index + 1}: ${text} (${percentage}%)`);
                    
                    if (percentage > 300) {
                        console.log(`  🚀 发现高趋势关键词: ${percentage}%`);
                        highTrendingFound = true;
                    }
                }
            }
        });
        
        return highTrendingFound;
    },
    
    // 检查飙升关键词
    checkBreakoutKeywords() {
        console.log('🔍 检查飙升关键词...');
        
        const surgingKeywords = ['飙升', 'Breakout', '突出', 'BREAKOUT', 'breakout'];
        let surgingFound = false;
        
        surgingKeywords.forEach(keyword => {
            const elements = Array.from(document.querySelectorAll('*')).filter(el => {
                return el.textContent && el.textContent.includes(keyword);
            });
            
            if (elements.length > 0) {
                console.log(`🚀 找到 ${elements.length} 个包含"${keyword}"的元素`);
                surgingFound = true;
                
                elements.forEach((el, index) => {
                    if (index < 5) { // 只显示前5个
                        const text = el.textContent.trim();
                        console.log(`  元素 ${index + 1}: ${text.substring(0, 100)}...`);
                    }
                });
            }
        });
        
        if (!surgingFound) {
            console.log('❌ 没有找到飙升关键词');
        }
        
        return surgingFound;
    },
    
    // 检查网络连接
    async checkNetworkConnection() {
        console.log('🔍 检查网络连接...');
        
        try {
            const response = await fetch('http://localhost:3000/api/debug', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ 本地服务器连接正常:', data);
                return true;
            } else {
                console.log('❌ 本地服务器响应异常:', response.status);
                return false;
            }
        } catch (error) {
            console.log('❌ 无法连接到本地服务器:', error.message);
            console.log('💡 请确保运行: node server.js');
            return false;
        }
    },
    
    // 手动触发收集
    testCollector() {
        console.log('🧪 测试收集器功能...');
        
        if (typeof window.collector === 'undefined') {
            console.log('❌ 收集器未加载');
            return false;
        }
        
        // 手动触发收集
        console.log('🔄 手动触发收集...');
        window.collector.collectAllPages();
        
        return true;
    },
    
    // 运行完整测试
    async runFullTest() {
        console.log('🚀 开始Google Trends插件完整测试...');
        console.log('==========================================');
        
        const results = {};
        
        // 执行所有测试
        results.pluginLoaded = this.checkPluginLoaded();
        results.pageStructure = this.checkPageStructure();
        results.highTrending = this.checkHighTrendingKeywords();
        results.breakout = this.checkBreakoutKeywords();
        results.networkConnection = await this.checkNetworkConnection();
        
        if (results.pluginLoaded) {
            results.collector = this.testCollector();
        }
        
        // 总结测试结果
        console.log('==========================================');
        console.log('📊 测试结果总结:');
        console.log('==========================================');
        
        Object.keys(results).forEach(key => {
            const status = results[key] ? '✅' : '❌';
            console.log(`${status} ${key}: ${results[key]}`);
        });
        
        // 提供建议
        console.log('==========================================');
        console.log('💡 建议:');
        
        if (!results.pluginLoaded) {
            console.log('- 请检查插件是否正确安装和启用');
        }
        
        if (!results.pageStructure) {
            console.log('- 请确保在Google Trends页面，且页面完全加载');
        }
        
        if (!results.highTrending && !results.breakout) {
            console.log('- 当前页面没有符合条件的关键词（>300%或飙升）');
            console.log('- 这是正常的，请尝试搜索其他热门关键词');
        }
        
        if (!results.networkConnection) {
            console.log('- 请启动本地服务器：node server.js');
        }
        
        console.log('==========================================');
        console.log('🎯 使用说明:');
        console.log('- 运行完整测试: trendsPluginDebug.runFullTest()');
        console.log('- 手动触发收集: collector.collectAllPages()');
        console.log('- 检查单项功能: trendsPluginDebug.checkPluginLoaded()');
        
        return results;
    }
};

// 在控制台显示使用提示
console.log('🎯 Google Trends插件调试工具已就绪！');
console.log('📌 使用方法：');
console.log('   - 运行完整测试: trendsPluginDebug.runFullTest()');
console.log('   - 手动触发收集: collector.collectAllPages()');
console.log('   - 检查高趋势关键词: trendsPluginDebug.checkHighTrendingKeywords()');
console.log('   - 检查飙升关键词: trendsPluginDebug.checkBreakoutKeywords()');
console.log('   - 检查网络连接: trendsPluginDebug.checkNetworkConnection()');
console.log('=========================================='); 