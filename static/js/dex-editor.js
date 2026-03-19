// DEX Blog Monaco Editor - 核心逻辑

// ========== 常量定义 ==========
const DRAFT_KEYS = {
  CONTENT: 'dex-blog-draft-content',
  TITLE: 'dex-blog-draft-title',
  TAGS: 'dex-blog-draft-tags',
  DATE: 'dex-blog-draft-date',
  CATEGORY: 'dex-blog-draft-category'
};

const DEFAULT_CONTENT = '# 新文章\n\n在此撰写...\n\n## 简介\n\n写下你的内容...';

// ========== 独立函数 ==========
/**
 * 生成 Hugo 格式文件
 * @returns {Object} { filename, category, content }
 */
function generateHugoFile() {
  const title = document.getElementById('fm-title').value || '未命名文章';
  const date = document.getElementById('fm-date').value || new Date().toISOString().split('T')[0];
  const tags = document.getElementById('fm-tags').value || '';
  const category = document.getElementById('fm-category').value || 'posts';
  const editor = document.getElementById('monaco-editor');
  const content = editor && editor.monaco ? editor.monaco.getValue() : '';
  
  // 生成 slug
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 处理标签
  const tagsArray = tags.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  let tagsYaml = '';
  if (tagsArray.length > 0) {
    tagsYaml = '\ntags: [' + tagsArray.map(t => `"${t}"`).join(', ') + ']';
  }
  
  const frontMatter = `---
title: "${title}"
date: ${date}
draft: true
categories: ["${category}"]${tagsYaml}
---

`;
  
  return {
    filename: slug ? `${slug}.md` : `article-${Date.now()}.md`,
    category: category,
    content: frontMatter + content
  };
}

/**
 * 安全复制文本到剪贴板 (支持降级)
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>}
 */
async function safeCopyToClipboard(text) {
  // 优先使用 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, using fallback:', err);
    }
  }
  
  // 降级方案: 使用 execCommand
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    
    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        resolve(true);
      } else {
        reject(new Error('execCommand copy failed'));
      }
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}

/**
 * HTML 净化 (XSS防护)
 * @param {string} html - 未净化的HTML
 * @returns {string} 净化后的HTML
 */
function sanitizeHtml(html) {
  // 如果 DOMPurify 可用则使用
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target'] // 允许 target 属性
    });
  }
  
  // 否则使用 marked 的安全配置作为后备
  return html;
}

// ========== DexEditor 对象 ==========
const DexEditor = {
  editor: null,
  autoSaveTimer: null,
  isMonacoLoaded: false,
  fallbackTextarea: null,
  
  init() {
    this.initPreview();
    this.initMonaco();  // 带错误处理
    this.initAutoSave();
    this.initButtons();
    this.loadDraft();
    
    // 检查是否新建文章
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      this.clearDraft();
    }
  },
  
  // 初始化 Monaco Editor (带错误处理和降级)
  initMonaco() {
    const self = this;
    
    // 配置 require.js
    require.config({ 
      paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
    });
    
    // 设置错误处理
    require.onError = function(err) {
      console.error('Monaco加载失败:', err);
      self.initFallbackEditor();
    };
    
    // 尝试加载 Monaco
    require(['vs/editor/editor.main'], function() {
      self.isMonacoLoaded = true;
      self.initMonacoEditor();
    });
  },
  
  // 初始化 Monaco 编辑器
  initMonacoEditor() {
    const self = this;
    const savedContent = localStorage.getItem(DRAFT_KEYS.CONTENT) || DEFAULT_CONTENT;
    
    this.editor = monaco.editor.create(document.getElementById('monaco-editor'), {
      value: savedContent,
      language: 'markdown',
      theme: 'vs-dark',
      minimap: { enabled: false },
      wordWrap: 'on',
      lineNumbers: 'on',
      fontSize: 14,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      smoothScrolling: true
    });
    
    // 绑定到 DOM 元素以便 generateHugoFile 访问
    document.getElementById('monaco-editor').monaco = this.editor;
    
    // 内容变化时触发预览更新和自动保存
    this.editor.onDidChangeModelContent(() => {
      self.updatePreview();
      self.scheduleAutoSave();
    });
    
    // 初始预览
    self.updatePreview();
  },
  
  // 降级到普通 textarea 编辑器
  initFallbackEditor() {
    const self = this;
    const container = document.getElementById('monaco-editor');
    const savedContent = localStorage.getItem(DRAFT_KEYS.CONTENT) || DEFAULT_CONTENT;
    
    // 创建 textarea 降级编辑器
    this.fallbackTextarea = document.createElement('textarea');
    this.fallbackTextarea.id = 'fallback-editor';
    this.fallbackTextarea.className = 'fallback-editor';
    this.fallbackTextarea.value = savedContent;
    this.fallbackTextarea.placeholder = '在此撰写文章...';
    this.fallbackTextarea.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 500px;
      padding: 16px;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      background: #1e1e1e;
      color: #d4d4d4;
      border: none;
      resize: none;
      outline: none;
    `;
    
    container.innerHTML = '';
    container.appendChild(this.fallbackTextarea);
    
    // 显示降级提示
    this.updateStatus('⚠️ Monaco加载失败，已使用文本编辑器', 8000);
    
    // 绑定事件
    this.fallbackTextarea.addEventListener('input', () => {
      self.updatePreview();
      self.scheduleAutoSave();
    });
    
    // 初始预览
    self.updatePreview();
  },
  
  // 获取编辑器内容
  getEditorContent() {
    if (this.editor) {
      return this.editor.getValue();
    } else if (this.fallbackTextarea) {
      return this.fallbackTextarea.value;
    }
    return '';
  },
  
  // 设置编辑器内容
  setEditorContent(content) {
    if (this.editor) {
      this.editor.setValue(content);
    } else if (this.fallbackTextarea) {
      this.fallbackTextarea.value = content;
    }
  },
  
  // 初始化预览
  initPreview() {
    this.updatePreview();
  },
  
  // 更新预览 (带 XSS 防护)
  updatePreview() {
    const content = this.getEditorContent();
    
    // 使用 marked 解析 Markdown
    let html = '';
    try {
      html = marked.parse(content, {
        breaks: true,
        gfm: true
      });
    } catch (err) {
      console.error('Markdown解析错误:', err);
      html = '<p>Markdown 解析出错</p>';
    }
    
    // 净化 HTML (XSS防护)
    const safeHtml = sanitizeHtml(html);
    
    // 渲染到预览区
    const previewContent = document.getElementById('preview-pane').querySelector('.preview-content');
    previewContent.innerHTML = safeHtml;
  },
  
  // 初始化自动保存
  initAutoSave() {
    this.autoSaveTimer = null;
  },
  
  // 调度自动保存 (1秒防抖)
  scheduleAutoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.saveToLocalStorage();
    }, 1000);
  },
  
  // 保存到 localStorage
  saveToLocalStorage() {
    const content = this.getEditorContent();
    if (!content) return;
    
    localStorage.setItem(DRAFT_KEYS.CONTENT, content);
    localStorage.setItem(DRAFT_KEYS.TITLE, document.getElementById('fm-title').value);
    localStorage.setItem(DRAFT_KEYS.TAGS, document.getElementById('fm-tags').value);
    localStorage.setItem(DRAFT_KEYS.DATE, document.getElementById('fm-date').value);
    localStorage.setItem(DRAFT_KEYS.CATEGORY, document.getElementById('fm-category').value);
    
    this.updateStatus('✅ 已自动保存 ' + new Date().toLocaleTimeString());
  },
  
  // 加载草稿
  loadDraft() {
    const savedTitle = localStorage.getItem(DRAFT_KEYS.TITLE);
    const savedTags = localStorage.getItem(DRAFT_KEYS.TAGS);
    const savedDate = localStorage.getItem(DRAFT_KEYS.DATE);
    const savedCategory = localStorage.getItem(DRAFT_KEYS.CATEGORY);
    
    document.getElementById('fm-title').value = savedTitle || '';
    document.getElementById('fm-tags').value = savedTags || '';
    document.getElementById('fm-date').value = savedDate || new Date().toISOString().split('T')[0];
    
    if (savedCategory) {
      document.getElementById('fm-category').value = savedCategory;
    }
  },
  
  // 初始化按钮事件
  initButtons() {
    const self = this;
    
    // 保存草稿按钮
    document.getElementById('btn-save-draft').addEventListener('click', () => {
      self.saveToLocalStorage();
      self.updateStatus('💾 草稿已保存!', 3000);
    });
    
    // 清空按钮
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('确定要清空所有内容吗？此操作不可恢复！')) {
        self.clearDraft();
      }
    });
    
    // 复制到 Content 按钮
    document.getElementById('btn-copy').addEventListener('click', () => {
      self.copyToClipboard();
    });
    
    // Front Matter 输入变化时自动保存
    ['fm-title', 'fm-tags', 'fm-date', 'fm-category'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        self.scheduleAutoSave();
      });
    });
  },
  
  // 清空草稿
  clearDraft() {
    this.setEditorContent(DEFAULT_CONTENT);
    
    document.getElementById('fm-title').value = '';
    document.getElementById('fm-tags').value = '';
    document.getElementById('fm-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('fm-category').value = 'posts';
    
    // 清除 localStorage
    Object.values(DRAFT_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    this.updateStatus('🗑️ 已清空', 3000);
    this.updatePreview();
  },
  
  // 复制到剪贴板 (带降级方案)
  copyToClipboard() {
    const file = generateHugoFile();
    const fullContent = file.content;
    
    if (!document.getElementById('fm-title').value.trim()) {
      this.updateStatus('⚠️ 请先填写文章标题!', 3000);
      return;
    }
    
    // 使用安全的复制方法
    safeCopyToClipboard(fullContent)
      .then(() => {
        this.updateStatus(`✅ 已复制! 文件名: ${file.filename}`, 5000);
        this.showCopyResult(file);
      })
      .catch(err => {
        this.updateStatus('❌ 复制失败: ' + err.message, 5000);
      });
  },
  
  // 显示复制结果
  showCopyResult(file) {
    // 移除已存在的弹窗
    const existing = document.querySelector('.copy-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'copy-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>📋 文件已准备好</h3>
        <p><strong>文件名:</strong> ${file.filename}</p>
        <p><strong>保存位置:</strong> content/${file.category}/</p>
        <textarea readonly>${file.content}</textarea>
        <div class="modal-actions">
          <button id="modal-copy-again" class="btn">📋 再次复制</button>
          <button id="modal-close" class="btn btn-outline">关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // 绑定按钮事件
    document.getElementById('modal-close').addEventListener('click', () => {
      modal.remove();
    });
    
    document.getElementById('modal-copy-again').addEventListener('click', () => {
      safeCopyToClipboard(file.content)
        .then(() => {
          this.updateStatus('✅ 已再次复制!', 2000);
        })
        .catch(err => {
          this.updateStatus('❌ 复制失败: ' + err.message, 2000);
        });
    });
  },
  
  // 更新状态显示
  updateStatus(msg, duration = 3000) {
    const el = document.getElementById('save-status');
    el.textContent = msg;
    el.style.opacity = 1;
    
    setTimeout(() => {
      el.style.opacity = 0.5;
    }, duration);
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  DexEditor.init();
});
