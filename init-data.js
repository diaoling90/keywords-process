const { MongoClient } = require('mongodb');

// MongoDB 连接配置
const MONGODB_URL = 'mongodb://localhost:27017';
const DB_NAME = 'keyword_manager';
const COLLECTION_NAME = 'keywords';

// 示例关键词数据
const sampleKeywords = [
    'games',
    'unblocked games',
    'car unblocked games'
];

async function initializeData() {
    let client;
    
    try {
        // 连接数据库
        client = new MongoClient(MONGODB_URL);
        await client.connect();
        console.log('✅ MongoDB 连接成功');
        
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // 检查是否已有数据
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
            console.log(`📊 数据库中已有 ${existingCount} 条关键词记录`);
            const answer = await askQuestion('是否清空现有数据并重新初始化？(y/N): ');
            if (answer.toLowerCase() !== 'y') {
                console.log('❌ 操作已取消');
                return;
            }
            
            // 清空现有数据
            await collection.deleteMany({});
            console.log('🗑️ 已清空现有数据');
        }
        
        // 插入示例数据
        const documents = sampleKeywords.map(keyword => ({
            keyword,
            first_created_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 随机过去30天内的时间
            last_used_time: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null // 50% 概率有使用时间
        }));
        
        const result = await collection.insertMany(documents);
        console.log(`✅ 成功插入 ${result.insertedCount} 条关键词记录`);
        
        // 显示统计信息
        const totalCount = await collection.countDocuments();
        const usedCount = await collection.countDocuments({ last_used_time: { $ne: null } });
        const unusedCount = totalCount - usedCount;
        
        console.log('\n📊 数据统计:');
        console.log(`   总关键词数: ${totalCount}`);
        console.log(`   已使用: ${usedCount}`);
        console.log(`   未使用: ${unusedCount}`);
        console.log(`   URL 关键词数: ${sampleKeywords.filter(k => k.startsWith('http')).length}`);
        
        console.log('\n🎉 数据初始化完成！');
        console.log('💡 现在可以启动服务器：npm start');
        
    } catch (error) {
        console.error('❌ 初始化数据失败:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// 简单的命令行输入函数
function askQuestion(question) {
    return new Promise((resolve) => {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question(question, (answer) => {
            readline.close();
            resolve(answer);
        });
    });
}

// 运行初始化
if (require.main === module) {
    initializeData().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('❌ 脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = { initializeData }; 