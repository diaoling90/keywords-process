
# 关键词管理工具

一个用于管理关键词并生成 Google Trends 链接的 Web 应用程序。

## 功能特点

- **主关键词管理**: 输入和保存主关键词到 `defaultkw.json` 文件，支持去重保存
- **时间过滤**: 根据使用时间过滤数据库中的关键词
- **卡片展示**: 将数据库关键词按每4个一组展示，每组加上主关键词形成5个词的卡片
- **Google Trends 集成**: 点击卡片按钮自动打开 Google Trends 页面
- **使用时间追踪**: 每次使用关键词时自动更新数据库中的使用时间
- **URL 关键词处理**: 自动将 URL 格式的关键词转换为可读的关键词
- **批量导入**: 支持从WPS/Excel文件批量导入关键词，自动去重
- **图形化导入工具**: Python GUI工具，支持文件预览、进度显示、数据统计
- **多文件支持**: 可同时选择多个Excel文件进行批量处理
- **智能列识别**: 自动查找关键词列，支持自定义列名
- **紧凑布局**: 响应式设计，适配不同屏幕尺寸

## 安装步骤

### 1. 初始化项目（可选）

如果您想使用Git进行版本控制：

```bash
# 初始化Git仓库
git init

# 添加所有文件
git add .

# 提交初始版本
git commit -m "初始化关键词管理工具项目"
```

### 2. 安装Node.js依赖

```bash
npm install
```

### 3. 安装Python依赖

```bash
pip install pandas pymongo openpyxl xlrd
```

### 4. 确保 MongoDB 运行

确保您的本地 MongoDB 服务正在运行（默认端口 27017）。

### 5. 初始化示例数据（可选）

```bash
npm run init-data
```

这会在数据库中添加一些示例关键词用于测试。

### 6. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

### 7. 访问应用

在浏览器中打开 `http://localhost:3000`

## 使用说明

### 1. 主关键词操作
- 页面加载时会自动从 `defaultkw.json` 读取第一个关键词作为默认值
- 在主关键词输入框中输入新的关键词，点击"保存"按钮保存到文件
- 保存的关键词会自动去重，新关键词会添加到列表开头

### 2. 时间过滤
- 时间输入框默认显示当前时间
- 修改时间后点击"刷新"按钮，只显示使用时间早于设定时间的关键词
- 这有助于找到长时间未使用的关键词

### 3. 关键词卡片
- 每个卡片包含 5 个关键词：1 个主关键词 + 4 个数据库关键词
- 主关键词以蓝色背景显示
- 点击"查看 Google 趋势"按钮会：
  - 更新数据库中相关关键词的使用时间
  - 打开新窗口显示 Google Trends 页面

### 4. 批量导入Excel文件

#### 方法一：通过网页按钮启动

- 在主页面点击"导入Excel文件"按钮
- 系统会尝试自动启动Python导入工具
- 如果自动启动失败，会显示手动启动说明

#### 方法二：手动启动Python工具

**Windows 用户：**
```bash
# 方式1：使用批处理脚本（推荐）
start_import_tool.bat

# 方式2：直接运行Python脚本
python import_keywords.py
```

**Linux/Mac 用户：**
```bash
python import_keywords.py
```

在弹出的图形界面中：
- 选择一个或多个WPS/Excel文件
- 设置关键词列名（默认为 'Keyword'）
- 预览数据确认
- 导入到数据库（自动去重）

#### 方法三：使用 API 接口

```bash
curl -X POST http://localhost:3000/api/keywords \
  -H "Content-Type: application/json" \
  -d '{"keyword": "你的关键词"}'
```

### 5. URL 关键词处理

如果数据库中的关键词是 URL 格式，系统会自动：
- 提取 URL 路径中最后一个 `/` 后的部分
- 将 `-` 替换为空格
- 例如：`https://example.com/path/my-keyword` → `my keyword`

## 文件结构

```
keyword/
├── package.json          # Node.js 依赖配置
├── requirements.txt      # Python 依赖配置
├── .gitignore            # Git 忽略文件配置
├── server.js             # Node.js 后端服务
├── index.html            # 主页面
├── defaultkw.json        # 默认关键词存储
├── import_keywords.py    # Python 导入工具
├── init-data.js          # 初始化示例数据
├── README.md            # 说明文档
└── 使用示例.md          # 使用示例和教程
```

## API 接口

### 获取默认关键词
```
GET /api/defaultkw
```

### 保存默认关键词
```
POST /api/defaultkw
Body: {"keyword": "关键词"}
```

### 获取数据库关键词
```
GET /api/keywords?before=2024-01-01T00:00:00
```

### 添加关键词到数据库
```
POST /api/keywords
Body: {"keyword": "关键词"}
```

### 更新关键词使用时间
```
PUT /api/keywords/use-batch
Body: {"keywords": ["关键词1", "关键词2"]}
```

## 数据库结构

MongoDB 集合 `keywords` 中的文档结构：

```json
{
  "_id": "ObjectId",
  "keyword": "关键词内容",
  "first_created_time": "2024-01-01T00:00:00.000Z",
  "last_used_time": "2024-01-01T00:00:00.000Z"
}
```

## 版本控制

项目包含了完整的 `.gitignore` 文件，会自动忽略以下文件：

- **依赖文件**: `node_modules/`, `__pycache__/`, 虚拟环境等
- **系统文件**: `.DS_Store`, `Thumbs.db` 等操作系统生成的文件
- **编辑器文件**: `.vscode/`, `.idea/` 等IDE配置文件
- **临时文件**: 日志、缓存、临时文件等
- **测试文件**: 测试用的Excel文件（`test_*.xlsx`, `sample_*.xlsx`）
- **环境配置**: `.env` 等包含敏感信息的文件

如果您需要提交测试文件或其他被忽略的文件，可以修改 `.gitignore` 文件。

## 注意事项

1. 确保 MongoDB 服务正在运行
2. 端口 3000 未被占用
3. 浏览器需要支持现代 JavaScript 功能
4. 点击 Google Trends 按钮需要网络连接
5. Python 导入工具需要 Python 3.6+ 环境
6. 支持的文件格式：.xlsx, .xls, .et, .ett

## 故障排除

### Node.js 相关问题
- 如果无法连接数据库，检查 MongoDB 服务是否运行
- 如果页面无法加载，检查 Node.js 服务是否正常启动
- 如果关键词保存失败，检查文件写入权限

### Python 导入工具问题
- 如果导入工具无法启动，检查是否安装了 Python 3.6+
- 如果出现模块导入错误，运行 `pip install -r requirements.txt`
- 如果无法读取Excel文件，检查文件格式是否支持
- 如果数据库连接失败，确保MongoDB服务正在运行且端口正确

### 常见错误解决
- `ModuleNotFoundError: No module named 'pandas'` → 运行 `pip install pandas`
- `ModuleNotFoundError: No module named 'pymongo'` → 运行 `pip install pymongo`
- `ModuleNotFoundError: No module named 'openpyxl'` → 运行 `pip install openpyxl`
- 文件读取失败 → 检查文件是否被其他程序占用 




// 添加全局调试工具
        window.trendsDebug = {
            // 一键诊断问题
            diagnose: () => {
                console.log('🏥 开始诊断插件问题...');
                console.log('='.repeat(50));
                
                // 1. 检查页面
                console.log('1️⃣ 检查页面状态:');
                console.log('   URL:', window.location.href);
                console.log('   是否在Google Trends:', window.location.href.includes('trends.google.com/trends/explore'));
                console.log('   页面标题:', document.title);
                
                // 2. 检查插件状态
                console.log('\n2️⃣ 检查插件状态:');
                console.log('   插件已加载:', typeof window.collector !== 'undefined');
                console.log('   监听状态:', window.collector?.isMonitoring);
                console.log('   待采集数量:', window.collector?.pendingKeywords?.size || 0);
                console.log('   已拦截数量:', window.collector?.interceptedKeywords?.size || 0);
                
                // 3. 检查网络请求
                console.log('\n3️⃣ 检查网络请求:');
                const totalRequests = window.interceptedRequests?.length || 0;
                const trendsRequests = window.interceptedRequests?.filter(req => 
                    req.url.includes('relatedsearches')
                ).length || 0;
                console.log('   总请求数:', totalRequests);
                console.log('   相关查询请求数:', trendsRequests);
                
                if (trendsRequests > 0) {
                    console.log('   相关查询请求:');
                    window.interceptedRequests
                        .filter(req => req.url.includes('relatedsearches'))
                        .forEach(req => {
                            console.log(`     ${req.method} ${req.url}`);
                        });
                }
                
                // 4. 检查页面数据
                console.log('\n4️⃣ 检查页面数据:');
                let foundHighValue = 0;
                document.querySelectorAll('*').forEach(el => {
                    const text = el.textContent;
                    if (text && text.includes('%')) {
                        const matches = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)%/g);
                        if (matches) {
                            matches.forEach(match => {
                                const value = parseFloat(match.replace(',', ''));
                                if (value >= 300) foundHighValue++;
                            });
                        }
                    }
                });
                console.log('   页面中>=300%的元素:', foundHighValue);
                
                // 5. 建议
                console.log('\n5️⃣ 诊断建议:');
                if (!window.location.href.includes('trends.google.com/trends/explore')) {
                    console.log('   ❌ 请访问 Google Trends 探索页面');
                }
                if (totalRequests === 0) {
                    console.log('   ❌ 没有拦截到任何请求，请刷新页面');
                }
                if (trendsRequests === 0 && totalRequests > 0) {
                    console.log('   ⚠️ 有请求但没有相关查询请求，请在页面中搜索关键词');
                }
                if (foundHighValue === 0) {
                    console.log('   ⚠️ 页面没有高价值关键词，尝试搜索热门话题');
                }
                if (foundHighValue > 0 && (window.collector?.pendingKeywords?.size || 0) === 0) {
                    console.log('   🔧 页面有数据但未采集到，可能需要向下滚动查看"相关查询"');
                }
                
                console.log('='.repeat(50));
            },
            
            // 显示所有拦截的URL
            showRequests: () => {
                console.log('📋 已拦截的请求列表:');
                if (window.interceptedRequests && window.interceptedRequests.length > 0) {
                    window.interceptedRequests.forEach((req, index) => {
                        console.log(`${index + 1}. ${req.method} ${req.url}`);
                    });
                    
                    // 过滤相关查询请求
                    const trendsRequests = window.interceptedRequests.filter(req => 
                        req.url.includes('relatedsearches')
                    );
                    console.log(`其中 ${trendsRequests.length} 个是相关查询请求`);
                } else {
                    console.log('暂无拦截的请求');
                }
            },
            
            // 手动测试
            test: () => {
                console.log('🧪 手动测试采集功能...');
                if (window.collector) {
                    console.log('待采集数量:', window.collector.pendingKeywords.size);
                    console.log('已拦截数量:', window.collector.interceptedKeywords.size);
                } else {
                    console.log('❌ 收集器未加载');
                }
            }
        };
        
        // 添加即时检查功能到 trendsDebug
        window.trendsDebug.check = () => {
            console.log('🔍 即时状态检查:');
            console.log('   当前时间:', new Date().toLocaleTimeString());
            console.log('   window.collector 存在:', !!window.collector);
            console.log('   window.collector 类型:', typeof window.collector);
            console.log('   window.trendsDebug 存在:', !!window.trendsDebug);
            console.log('   window.interceptedRequests 长度:', window.interceptedRequests?.length || 0);
            
            if (window.collector) {
                console.log('   ✅ 插件已正确加载');
                console.log('   插件监听状态:', window.collector.isMonitoring);
                console.log('   待采集数量:', window.collector.pendingKeywords?.size || 0);
                console.log('   已拦截数量:', window.collector.interceptedKeywords?.size || 0);
            } else {
                console.log('   ❌ 插件未加载');
            }
            
            return {
                collectorExists: !!window.collector,
                trendsDebugExists: !!window.trendsDebug,
                requestCount: window.interceptedRequests?.length || 0
            };
        };