import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const CHAPTERS_DIR = ROOT_DIR;
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs', 'chapters');

// 章节顺序
const chapterOrder = [
  '第1章 HTML5与Web标准核心',
  '第2章 CSS核心原理与布局系统',
  '第3章 JavaScript语言核心深度解析',
  '第4章 浏览器原理与网络协议',
  '第5章 TypeScript类型系统精要（类型篇）',
  '第6章 React技术栈深度原理（框架篇-React）',
  '第7章 Vue技术栈深度原理（框架篇-Vue）',
  '第8章 前端工程化与构建工具（工程篇）',
  '第9章 性能优化与安全（优化篇）',
  '第10章 高频手写代码实现（手写篇）',
  '第11章 数据结构与算法（算法篇）',
  '第12章 2026 面试题（面试篇）'
];

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 获取所有文件夹并排序
function getChapterFolders() {
  const items = fs.readdirSync(CHAPTERS_DIR);
  const folders = items.filter(item => {
    const itemPath = path.join(CHAPTERS_DIR, item);
    return fs.statSync(itemPath).isDirectory() && item.startsWith('第') && item.includes('章');
  });
  
  // 按照预定义顺序排序
  folders.sort((a, b) => {
    const indexA = chapterOrder.indexOf(a);
    const indexB = chapterOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  return folders;
}

// 获取子文件夹（排除非章节文件夹）
function getSubFolders(chapterPath) {
  const items = fs.readdirSync(chapterPath);
  return items.filter(item => {
    const itemPath = path.join(chapterPath, item);
    return fs.statSync(itemPath).isDirectory();
  }).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// 获取 md 文件并排序
function getMdFiles(subFolderPath) {
  const files = fs.readdirSync(subFolderPath)
    .filter(file => file.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files;
}

// 移除文件开头的版权声明
function removeCopyright(content) {
  // 移除 "本资料由...提供，禁止盗版、转售。" 及其后面的 --- 分隔符
  return content.replace(/^本资料由[\s\S]*?---\n*/, '');
}

// 转义所有 HTML 标签和 Vue 插值语法，防止 VitePress 解析错误
function escapeHtmlTags(content) {
  // 先提取并暂时替换代码块
  const codeBlocks = [];
  const inlineCodes = [];
  
  let result = content;
  
  // 提取并暂时替换代码块
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${idx}__`;
  });
  
  // 提取并暂时替换行内代码
  result = result.replace(/`[^`]*`/g, (match) => {
    const idx = inlineCodes.length;
    // 对行内代码中的 {{ 和 }} 进行转义，防止被 Vue 解析
    const escaped = match.replace(/\{\{/g, '&lbrace;&lbrace;').replace(/\}\}/g, '&rbrace;&rbrace;');
    inlineCodes.push(escaped);
    return `__INLINE_CODE_${idx}__`;
  });
  
  // 转义 HTML 标签
  result = result
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/<template/gi, '&lt;template')
    .replace(/<\/template>/gi, '&lt;/template&gt;')
    .replace(/<style/gi, '&lt;style')
    .replace(/<\/style>/gi, '&lt;/style&gt;')
    .replace(/<(\w+)/g, '&lt;$1')
    .replace(/<\/(\w+)>/g, '&lt;/$1&gt;')
    // 转义 Vue 插值语法
    .replace(/\{\{/g, '&lbrace;&lbrace;')
    .replace(/\}\}/g, '&rbrace;&rbrace;');
  
  // 恢复行内代码（使用索引方式）
  for (let i = 0; i < inlineCodes.length; i++) {
    result = result.split(`__INLINE_CODE_${i}__`).join(inlineCodes[i]);
  }
  
  // 恢复代码块（使用索引方式）
  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.split(`__CODE_BLOCK_${i}__`).join(codeBlocks[i]);
  }
  
  return result;
}

// 处理标题层级，使子文件夹的内容标题降一级
function adjustHeadingLevel(content, level = 2) {
  const lines = content.split('\n');
  const result = [];
  
  for (const line of lines) {
    const match = line.match(/^(#+)\s/);
    if (match) {
      const currentLevel = match[1].length;
      const newLevel = '#'.repeat(currentLevel + level - 1);
      result.push(line.replace(/^#+\s/, newLevel + ' '));
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

// 合并章节
function mergeChapter(chapterName) {
  const chapterPath = path.join(CHAPTERS_DIR, chapterName);
  const subFolders = getSubFolders(chapterPath);
  
  let chapterContent = '';
  
  for (const subFolder of subFolders) {
    const subFolderPath = path.join(chapterPath, subFolder);
    const mdFiles = getMdFiles(subFolderPath);
    
    // 添加子章节标题
    chapterContent += `\n## ${subFolder}\n\n`;
    
    for (const mdFile of mdFiles) {
      const filePath = path.join(subFolderPath, mdFile);
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // 移除版权声明
      content = removeCopyright(content);
      
      // 调整标题层级 (h1 -> h2, h2 -> h3, etc.)
      content = adjustHeadingLevel(content, 2);
      
      // 转义 HTML 标签
      content = escapeHtmlTags(content);
      
      chapterContent += content + '\n\n';
    }
  }
  
  return chapterContent;
}

// 创建章节文件
function createChapterFile(chapterName, content) {
  // 生成文件名
  const fileName = `${chapterName}.md`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  // 构建完整文件内容
  // 移除章节号（如"第5章"），保留标题
  const title = chapterName.replace(/^第\d+章\s*/, '');
  const fullContent = `---\ntitle: ${chapterName}\n---\n\n# ${title}\n\n${content}`;
  
  fs.writeFileSync(filePath, fullContent, 'utf-8');
  console.log(`Created: ${fileName}`);
}

// 主函数
function main() {
  console.log('开始合并章节...\n');
  
  const chapters = getChapterFolders();
  
  for (const chapter of chapters) {
    console.log(`处理章节: ${chapter}`);
    const content = mergeChapter(chapter);
    createChapterFile(chapter, content);
  }
  
  console.log('\n合并完成!');
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

main();
