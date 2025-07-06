#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import pymongo
from pymongo import MongoClient
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from tkinter import *
import os
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB 连接配置
MONGODB_URL = 'mongodb://localhost:27017'
DB_NAME = 'keyword_manager'
COLLECTION_NAME = 'keywords'

class KeywordImporter:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("关键词导入工具")
        self.root.geometry("600x500")
        self.root.resizable(True, True)
        
        # 数据库连接
        self.client = None
        self.db = None
        self.collection = None
        
        # 界面变量
        self.selected_files = []
        self.column_var = tk.StringVar(value="kw")
        self.status_var = tk.StringVar(value="就绪")
        self.progress_var = tk.DoubleVar()
        
        self.setup_ui()
        self.connect_database()
        
    def setup_ui(self):
        """设置用户界面"""
        # 标题
        title_label = tk.Label(self.root, text="关键词导入工具", 
                              font=("Microsoft YaHei", 16, "bold"))
        title_label.pack(pady=10)
        
        # 文件选择区域
        file_frame = tk.LabelFrame(self.root, text="文件选择", padx=10, pady=10)
        file_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Button(file_frame, text="选择 WPS/Excel 文件", 
                 command=self.select_files,
                 bg="#007bff", fg="white", font=("Microsoft YaHei", 10)).pack(pady=5)
        
        # 文件列表
        self.file_listbox = tk.Listbox(file_frame, height=6)
        self.file_listbox.pack(fill="both", expand=True, pady=5)
        
        tk.Button(file_frame, text="清空文件列表", 
                 command=self.clear_files,
                 bg="#dc3545", fg="white", font=("Microsoft YaHei", 9)).pack(pady=5)
        
        # 列名设置区域
        column_frame = tk.LabelFrame(self.root, text="列名设置", padx=10, pady=10)
        column_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(column_frame, text="关键词列名:", font=("Microsoft YaHei", 10)).pack(side="left")
        column_entry = tk.Entry(column_frame, textvariable=self.column_var, width=15)
        column_entry.pack(side="left", padx=10)
        
        tk.Label(column_frame, text="(默认查找 'kw' 列)", 
                font=("Microsoft YaHei", 9), fg="gray").pack(side="left")
        
        # 操作按钮区域
        action_frame = tk.Frame(self.root)
        action_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Button(action_frame, text="预览数据", 
                 command=self.preview_data,
                 bg="#28a745", fg="white", font=("Microsoft YaHei", 11)).pack(side="left", padx=5)
        
        tk.Button(action_frame, text="导入数据库", 
                 command=self.import_data,
                 bg="#ffc107", fg="black", font=("Microsoft YaHei", 11, "bold")).pack(side="left", padx=5)
        
        tk.Button(action_frame, text="查看数据库", 
                 command=self.view_database,
                 bg="#17a2b8", fg="white", font=("Microsoft YaHei", 11)).pack(side="left", padx=5)
        
        # 进度条
        progress_frame = tk.Frame(self.root)
        progress_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(progress_frame, text="进度:", font=("Microsoft YaHei", 10)).pack(side="left")
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, 
                                          maximum=100, length=300)
        self.progress_bar.pack(side="left", padx=10, fill="x", expand=True)
        
        # 状态显示
        status_frame = tk.Frame(self.root)
        status_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(status_frame, text="状态:", font=("Microsoft YaHei", 10)).pack(side="left")
        status_label = tk.Label(status_frame, textvariable=self.status_var, 
                               font=("Microsoft YaHei", 10), fg="blue")
        status_label.pack(side="left", padx=10)
        
        # 日志显示区域
        log_frame = tk.LabelFrame(self.root, text="操作日志", padx=10, pady=10)
        log_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.log_text = tk.Text(log_frame, height=8, wrap=tk.WORD)
        scrollbar = tk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        
        self.log_text.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
    def connect_database(self):
        """连接数据库"""
        try:
            self.client = MongoClient(MONGODB_URL)
            self.db = self.client[DB_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.log_message("✅ 数据库连接成功")
            self.status_var.set("数据库已连接")
        except Exception as e:
            self.log_message(f"❌ 数据库连接失败: {str(e)}")
            self.status_var.set("数据库连接失败")
            
    def log_message(self, message):
        """添加日志信息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)
        self.root.update_idletasks()
        
    def select_files(self):
        """选择文件"""
        file_types = [
            ('Excel 文件', '*.xlsx *.xls'),
            ('WPS 表格', '*.et *.ett'),
            ('所有文件', '*.*')
        ]
        
        files = filedialog.askopenfilenames(
            title="选择 WPS/Excel 文件",
            filetypes=file_types
        )
        
        if files:
            for file in files:
                if file not in self.selected_files:
                    self.selected_files.append(file)
                    filename = os.path.basename(file)
                    self.file_listbox.insert(tk.END, filename)
                    
            self.log_message(f"📁 已选择 {len(files)} 个文件")
            self.status_var.set(f"已选择 {len(self.selected_files)} 个文件")
            
    def clear_files(self):
        """清空文件列表"""
        self.selected_files = []
        self.file_listbox.delete(0, tk.END)
        self.log_message("🗑️ 已清空文件列表")
        self.status_var.set("就绪")
        
    def read_excel_file(self, file_path):
        """读取Excel文件"""
        try:
            # 尝试读取Excel文件
            if file_path.endswith('.xlsx'):
                df = pd.read_excel(file_path, engine='openpyxl')
            elif file_path.endswith('.xls'):
                df = pd.read_excel(file_path, engine='xlrd')
            else:
                # 尝试自动检测
                df = pd.read_excel(file_path)
                
            return df
        except Exception as e:
            self.log_message(f"❌ 读取文件失败 {os.path.basename(file_path)}: {str(e)}")
            return None
            
    def find_keyword_column(self, df):
        """查找关键词列"""
        target_column = self.column_var.get().strip()
        
        # 查找完全匹配的列
        if target_column in df.columns:
            return target_column
            
        # 查找包含目标字符的列（不区分大小写）
        for col in df.columns:
            if target_column.lower() in str(col).lower():
                return col
                
        # 如果没找到，返回第一列
        if len(df.columns) > 0:
            self.log_message(f"⚠️ 未找到 '{target_column}' 列，使用第一列: {df.columns[0]}")
            return df.columns[0]
            
        return None
        
    def preview_data(self):
        """预览数据"""
        if not self.selected_files:
            messagebox.showwarning("警告", "请先选择文件")
            return
            
        self.log_message("👁️ 开始预览数据...")
        
        all_keywords = []
        for i, file_path in enumerate(self.selected_files):
            filename = os.path.basename(file_path)
            self.log_message(f"📖 预览文件: {filename}")
            
            df = self.read_excel_file(file_path)
            if df is None:
                continue
                
            # 查找关键词列
            kw_column = self.find_keyword_column(df)
            if kw_column is None:
                self.log_message(f"❌ 文件 {filename} 中未找到关键词列")
                continue
                
            # 提取关键词
            keywords = df[kw_column].dropna().astype(str).tolist()
            keywords = [kw.strip() for kw in keywords if kw.strip()]
            
            all_keywords.extend(keywords)
            self.log_message(f"📊 {filename}: 找到 {len(keywords)} 个关键词")
            
        # 去重
        unique_keywords = list(set(all_keywords))
        
        # 显示预览结果
        preview_window = tk.Toplevel(self.root)
        preview_window.title("数据预览")
        preview_window.geometry("500x400")
        
        tk.Label(preview_window, text=f"预览结果 - 共 {len(unique_keywords)} 个唯一关键词", 
                font=("Microsoft YaHei", 12, "bold")).pack(pady=10)
        
        # 关键词列表
        listbox_frame = tk.Frame(preview_window)
        listbox_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        preview_listbox = tk.Listbox(listbox_frame)
        preview_scrollbar = tk.Scrollbar(listbox_frame, orient="vertical", command=preview_listbox.yview)
        preview_listbox.configure(yscrollcommand=preview_scrollbar.set)
        
        # 只显示前100个关键词
        display_keywords = unique_keywords[:100]
        for kw in display_keywords:
            preview_listbox.insert(tk.END, kw)
            
        if len(unique_keywords) > 100:
            preview_listbox.insert(tk.END, f"... 还有 {len(unique_keywords) - 100} 个关键词")
            
        preview_listbox.pack(side="left", fill="both", expand=True)
        preview_scrollbar.pack(side="right", fill="y")
        
        tk.Button(preview_window, text="关闭", command=preview_window.destroy).pack(pady=10)
        
        self.log_message(f"✅ 预览完成: {len(all_keywords)} 个关键词，去重后 {len(unique_keywords)} 个")
        
    def import_data(self):
        """导入数据到数据库"""
        if not self.selected_files:
            messagebox.showwarning("警告", "请先选择文件")
            return
            
        if not self.collection:
            messagebox.showerror("错误", "数据库未连接")
            return
            
        # 确认导入
        result = messagebox.askyesno("确认", "确定要导入数据到数据库吗？")
        if not result:
            return
            
        self.log_message("🚀 开始导入数据...")
        self.status_var.set("正在导入...")
        
        all_keywords = []
        total_files = len(self.selected_files)
        
        for i, file_path in enumerate(self.selected_files):
            filename = os.path.basename(file_path)
            self.log_message(f"📁 处理文件: {filename}")
            
            # 更新进度
            progress = (i / total_files) * 80  # 80% 用于读取文件
            self.progress_var.set(progress)
            self.root.update_idletasks()
            
            df = self.read_excel_file(file_path)
            if df is None:
                continue
                
            # 查找关键词列
            kw_column = self.find_keyword_column(df)
            if kw_column is None:
                continue
                
            # 提取关键词
            keywords = df[kw_column].dropna().astype(str).tolist()
            keywords = [kw.strip() for kw in keywords if kw.strip()]
            
            all_keywords.extend(keywords)
            self.log_message(f"📊 {filename}: 提取 {len(keywords)} 个关键词")
            
        # 去重
        unique_keywords = list(set(all_keywords))
        self.log_message(f"🔄 去重处理: {len(all_keywords)} -> {len(unique_keywords)}")
        
        # 检查数据库中已存在的关键词
        existing_keywords = set()
        existing_docs = self.collection.find({}, {"keyword": 1})
        for doc in existing_docs:
            existing_keywords.add(doc["keyword"])
            
        # 过滤出新关键词
        new_keywords = [kw for kw in unique_keywords if kw not in existing_keywords]
        
        self.log_message(f"📋 数据库中已有 {len(existing_keywords)} 个关键词")
        self.log_message(f"✨ 新增 {len(new_keywords)} 个关键词")
        
        if new_keywords:
            # 准备插入数据
            documents = []
            for kw in new_keywords:
                documents.append({
                    "keyword": kw,
                    "first_created_time": datetime.now(),
                    "last_used_time": None
                })
                
            # 批量插入
            self.progress_var.set(90)
            self.root.update_idletasks()
            
            try:
                result = self.collection.insert_many(documents)
                self.progress_var.set(100)
                self.log_message(f"✅ 成功导入 {len(result.inserted_ids)} 个关键词")
                self.status_var.set(f"导入完成: {len(result.inserted_ids)} 个关键词")
                
                messagebox.showinfo("成功", f"成功导入 {len(result.inserted_ids)} 个关键词到数据库")
                
            except Exception as e:
                self.log_message(f"❌ 导入失败: {str(e)}")
                self.status_var.set("导入失败")
                messagebox.showerror("错误", f"导入失败: {str(e)}")
        else:
            self.progress_var.set(100)
            self.log_message("ℹ️ 没有新的关键词需要导入")
            self.status_var.set("没有新关键词")
            messagebox.showinfo("提示", "没有新的关键词需要导入")
            
    def view_database(self):
        """查看数据库内容"""
        if not self.collection:
            messagebox.showerror("错误", "数据库未连接")
            return
            
        try:
            total_count = self.collection.count_documents({})
            used_count = self.collection.count_documents({"last_used_time": {"$ne": None}})
            unused_count = total_count - used_count
            
            # 创建查看窗口
            view_window = tk.Toplevel(self.root)
            view_window.title("数据库内容")
            view_window.geometry("600x500")
            
            # 统计信息
            stats_frame = tk.Frame(view_window)
            stats_frame.pack(fill="x", padx=20, pady=10)
            
            tk.Label(stats_frame, text=f"总关键词数: {total_count}", 
                    font=("Microsoft YaHei", 12)).pack(side="left", padx=10)
            tk.Label(stats_frame, text=f"已使用: {used_count}", 
                    font=("Microsoft YaHei", 12)).pack(side="left", padx=10)
            tk.Label(stats_frame, text=f"未使用: {unused_count}", 
                    font=("Microsoft YaHei", 12)).pack(side="left", padx=10)
            
            # 关键词列表
            listbox_frame = tk.Frame(view_window)
            listbox_frame.pack(fill="both", expand=True, padx=20, pady=10)
            
            db_listbox = tk.Listbox(listbox_frame, font=("Microsoft YaHei", 10))
            db_scrollbar = tk.Scrollbar(listbox_frame, orient="vertical", command=db_listbox.yview)
            db_listbox.configure(yscrollcommand=db_scrollbar.set)
            
            # 获取最近的关键词
            recent_keywords = self.collection.find().sort("first_created_time", -1).limit(200)
            for doc in recent_keywords:
                status = "✅" if doc.get("last_used_time") else "⭕"
                db_listbox.insert(tk.END, f"{status} {doc['keyword']}")
                
            db_listbox.pack(side="left", fill="both", expand=True)
            db_scrollbar.pack(side="right", fill="y")
            
            tk.Button(view_window, text="关闭", command=view_window.destroy).pack(pady=10)
            
            self.log_message(f"📊 数据库统计: 总数 {total_count}, 已使用 {used_count}, 未使用 {unused_count}")
            
        except Exception as e:
            self.log_message(f"❌ 查看数据库失败: {str(e)}")
            messagebox.showerror("错误", f"查看数据库失败: {str(e)}")
            
    def run(self):
        """运行应用"""
        self.root.mainloop()
        
        # 关闭数据库连接
        if self.client:
            self.client.close()

if __name__ == "__main__":
    app = KeywordImporter()
    app.run() 