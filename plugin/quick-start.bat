@echo off
chcp 65001 >nul
title Google Trends 关键词收集器 - 快速启动

echo.
echo ================================================
echo    🚀 Google Trends 关键词收集器 - 快速启动
echo ================================================
echo.

echo 📋 启动步骤：
echo 1. 生成插件图标
echo 2. 启动关键词管理服务器
echo 3. 打开Chrome扩展页面
echo 4. 打开Google Trends页面
echo.

echo 🎨 正在打开图标生成器...
start "" "create-icons.html"
timeout /t 2 /nobreak >nul

echo.
echo ⏳ 请先下载图标文件到 icons/ 目录...
echo    (点击图标生成器中的"下载全部图标"按钮)
echo.
pause

echo.
echo 🔧 正在启动关键词管理服务器...
cd ..
start "关键词管理服务器" cmd /k "echo 🌐 关键词管理服务器 & echo. & node server.js"
timeout /t 3 /nobreak >nul

echo.
echo 🌐 正在打开Chrome扩展页面...
start "" "chrome://extensions/"
timeout /t 2 /nobreak >nul

echo.
echo 📈 正在打开Google Trends页面...
start "" "https://trends.google.com/trends/explore"
timeout /t 2 /nobreak >nul

echo.
echo ✅ 启动完成！接下来的步骤：
echo.
echo 📌 在Chrome扩展页面：
echo    1. 开启"开发者模式"（右上角）
echo    2. 点击"加载已解压的扩展程序"
echo    3. 选择这个 plugin 目录
echo.
echo 📌 在Google Trends页面：
echo    1. 搜索任意关键词
echo    2. 点击插件图标
echo    3. 点击"启动收集"
echo.
echo 🎯 插件会自动收集趋势>300%%的关键词到数据库！
echo.

pause
echo.
echo 🔗 有用的链接：
echo    • 关键词管理界面: http://localhost:3000
echo    • Chrome扩展页面: chrome://extensions/
echo    • Google Trends: https://trends.google.com/trends/explore
echo.
echo 📞 如需帮助，请查看 README.md 文件
echo.
pause 