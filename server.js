const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB 连接
const MONGODB_URL = 'mongodb://localhost:27017';
const DB_NAME = 'keyword_manager';
const COLLECTION_NAME = 'keywords';

let db;

// 连接 MongoDB
async function connectToMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URL);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('MongoDB 连接成功');
    } catch (error) {
        console.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
}

// 处理 URL 关键词转换
function processKeyword(keyword) {
    if (keyword.startsWith('http://') || keyword.startsWith('https://')) {
        try {
            const url = new URL(keyword);
            const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
            if (pathSegments.length > 0) {
                const lastSegment = pathSegments[pathSegments.length - 1];
                return lastSegment.replace(/-/g, ' ');
            }
        } catch (error) {
            console.error('URL 处理错误:', error);
        }
    }
    return keyword;
}

// 获取默认关键词
app.get('/api/defaultkw', (req, res) => {
    try {
        const defaultKeywords = JSON.parse(fs.readFileSync('defaultkw.json', 'utf8'));
        res.json(defaultKeywords);
    } catch (error) {
        res.status(500).json({ error: '读取默认关键词失败' });
    }
});

// 保存关键词到 defaultkw.json
app.post('/api/defaultkw', (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.status(400).json({ error: '关键词不能为空' });
        }

        let defaultKeywords = [];
        try {
            defaultKeywords = JSON.parse(fs.readFileSync('defaultkw.json', 'utf8'));
        } catch (error) {
            // 文件不存在时创建空数组
        }

        // 去重添加
        if (!defaultKeywords.includes(keyword)) {
            defaultKeywords.unshift(keyword); // 添加到开头
        }

        fs.writeFileSync('defaultkw.json', JSON.stringify(defaultKeywords, null, 2));
        res.json({ success: true, keywords: defaultKeywords });
    } catch (error) {
        res.status(500).json({ error: '保存关键词失败' });
    }
});

// 获取数据库中的关键词
app.get('/api/keywords', async (req, res) => {
    try {
        const { before } = req.query;
        let query = {};
        
        if (before) {
            const beforeDate = new Date(before);
            query = {
                $or: [
                    { last_used_time: { $exists: false } },
                    { last_used_time: { $lt: beforeDate } }
                ]
            };
        }

        const keywords = await db.collection(COLLECTION_NAME).find(query).toArray();
        res.json(keywords);
    } catch (error) {
        res.status(500).json({ error: '获取关键词失败' });
    }
});

// 添加关键词到数据库
app.post('/api/keywords', async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.status(400).json({ error: '关键词不能为空' });
        }

        const existingKeyword = await db.collection(COLLECTION_NAME).findOne({ keyword });
        if (existingKeyword) {
            return res.json({ success: true, message: '关键词已存在' });
        }

        const result = await db.collection(COLLECTION_NAME).insertOne({
            keyword,
            first_created_time: new Date(),
            last_used_time: null
        });

        res.json({ success: true, id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: '添加关键词失败' });
    }
});

// 更新关键词使用时间
app.put('/api/keywords/:id/use', async (req, res) => {
    try {
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        
        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: { last_used_time: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: '关键词不存在' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新使用时间失败' });
    }
});

// 更新多个关键词使用时间
app.put('/api/keywords/use-batch', async (req, res) => {
    try {
        const { keywords } = req.body;
        if (!Array.isArray(keywords)) {
            return res.status(400).json({ error: '关键词列表格式错误' });
        }

        const updatePromises = keywords.map(async (keyword) => {
            return db.collection(COLLECTION_NAME).updateOne(
                { keyword },
                { $set: { last_used_time: new Date() } }
            );
        });

        await Promise.all(updatePromises);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '批量更新使用时间失败' });
    }
});

// 启动Python导入工具
app.post('/api/start-import-tool', (req, res) => {
    try {
        // 检查Python脚本是否存在
        const scriptPath = path.join(__dirname, 'import_keywords.py');
        if (!fs.existsSync(scriptPath)) {
            return res.status(404).json({ error: 'Python导入脚本不存在' });
        }

        // 启动Python脚本
        const pythonProcess = spawn('python', [scriptPath], {
            detached: true,
            stdio: 'ignore'
        });

        // 分离子进程，让它独立运行
        pythonProcess.unref();

        res.json({ success: true, message: 'Python导入工具已启动' });
    } catch (error) {
        res.status(500).json({ error: '启动Python脚本失败: ' + error.message });
    }
});

// 启动服务器
app.listen(PORT, async () => {
    await connectToMongoDB();
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 