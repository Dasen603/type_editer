/**
 * BlockNote content types
 */
interface BlockNoteTextNode {
  type: 'text';
  text: string;
}

interface BlockNoteNode {
  type?: string;
  content?: BlockNoteNode[] | BlockNoteTextNode[];
  children?: BlockNoteNode[];
}

type BlockNoteContent = BlockNoteNode[] | BlockNoteNode | string;

interface WordCountResult {
  display: number;
  tooltip: number;
  chinese: number;
  english: number;
}

/**
 * 从 BlockNote JSON 结构中提取纯文本
 * @param content - BlockNote content
 * @returns 提取的纯文本
 */
export function extractTextFromBlockNote(content: BlockNoteContent): string {
  if (!content) return '';
  
  // 如果content是字符串，先解析它
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing content JSON:', error);
      return '';
    }
  }
  
  const textSegments: string[] = [];
  
  const traverse = (node: any): void => {
    if (!node) return;
    
    // 处理数组
    if (Array.isArray(node)) {
      node.forEach(item => traverse(item));
      return;
    }
    
    // 处理对象
    if (typeof node === 'object') {
      // 如果是文本节点，提取text字段
      if (node.type === 'text' && node.text) {
        textSegments.push(node.text);
      }
      
      // 递归处理content数组
      if (Array.isArray(node.content)) {
        traverse(node.content);
      }
      
      // 递归处理children数组
      if (Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  };
  
  traverse(parsedContent);
  return textSegments.join('');
}

/**
 * 统计中文字符数
 * @param text - 文本
 * @returns 中文字符数
 */
function countChineseCharacters(text: string): number {
  // 匹配中文字符（CJK统一表意文字）
  const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;
  const matches = text.match(chineseRegex);
  return matches ? matches.length : 0;
}

/**
 * 统计英文单词数（包括数字）
 * @param text - 文本
 * @returns 英文单词数
 */
function countEnglishWords(text: string): number {
  // 先移除中文字符
  const textWithoutChinese = text.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, ' ');
  // 匹配英文单词（包括连字符和撇号）和数字
  const wordRegex = /[a-zA-Z]+(?:[-'][a-zA-Z]+)*|\d+(?:[.,]\d+)*/g;
  const matches = textWithoutChinese.match(wordRegex);
  return matches ? matches.length : 0;
}

/**
 * 统计包含标点的总字符数
 * @param text - 文本
 * @returns 总字符数（不包括空白字符）
 */
function countTotalCharacters(text: string): number {
  // 移除所有空白字符后计数
  const nonWhitespace = text.replace(/\s+/g, '');
  return nonWhitespace.length;
}

/**
 * 计算文本的字数统计
 * @param content - BlockNote content
 * @returns { display: 显示的计数, tooltip: 包含标点的总数, chinese: 中文字数, english: 英文词数 }
 */
export function computeWordCount(content: BlockNoteContent): WordCountResult {
  const text = extractTextFromBlockNote(content);
  
  const chineseChars = countChineseCharacters(text);
  const englishWords = countEnglishWords(text);
  const totalChars = countTotalCharacters(text);
  
  // 显示计数 = 中文字数 + 英文词数
  const displayCount = chineseChars + englishWords;
  
  return {
    display: displayCount,
    tooltip: totalChars,
    chinese: chineseChars,
    english: englishWords
  };
}