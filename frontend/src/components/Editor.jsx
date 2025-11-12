import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { Citation } from './Citation';

const Editor = forwardRef(({ content, onChange, references, formattingToolbarEnabled = true, zoomLevel = 100 }, ref) => {
  const isUserTyping = useRef(false);
  const [dragIndicatorPosition, setDragIndicatorPosition] = useState(null);
  const editorContainerRef = useRef(null);
  const linkSelectionRange = useRef(null);
  
  const getInitialContent = () => {
    if (content) {
      return typeof content === 'string' ? JSON.parse(content) : content;
    }
    return [
      {
        type: "heading",
        props: {
          level: 1
        },
        content: []
      }
    ];
  };

  const schema = BlockNoteSchema.create({
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      citation: Citation,
    },
  });

  const editor = useCreateBlockNote({
    schema,
    initialContent: getInitialContent(),
    _tiptapOptions: {
      extensions: [], // 使用默认的扩展，包括Link
    }
  });

  // 使用state来触发重新渲染
  const [referencesVersion, setReferencesVersion] = useState(0);

  useEffect(() => {
    if (editor) {
      editor.onCitationDelete = (pos) => {
        const tiptapEditor = editor._tiptapEditor;
        const { doc } = tiptapEditor.state;
        
        try {
          const $pos = doc.resolve(pos);
          const node = doc.nodeAt(pos);
          
          if (node && node.type.name === 'citation') {
            let endPos = pos + node.nodeSize;
            const nextNode = doc.nodeAt(endPos);
            
            if (nextNode && nextNode.isText && nextNode.text.startsWith(' ')) {
              endPos += 1;
            }
            
            tiptapEditor.commands.deleteRange({ from: pos, to: endPos });
          }
        } catch (error) {
          console.error('Error deleting citation:', error);
        }
      };
      
      // 将references列表存储在editor对象中，供Citation组件使用
      editor.references = references || [];
      
      // 强制所有citation重新渲染
      setReferencesVersion(prev => prev + 1);
    }
  }, [editor, references]);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (editor) {
        editor.undo();
      }
    },
    redo: () => {
      if (editor) {
        editor.redo();
      }
    },
    setHeading: (level) => {
      if (editor) {
        const currentBlock = editor.getTextCursorPosition().block;
        
        // 检查是否有文字被选中
        const tiptapEditor = editor._tiptapEditor;
        const { empty } = tiptapEditor.state.selection;
        const hasSelection = !empty;
        
        // 如果有选中文字，强制转换为标题格式
        if (hasSelection) {
          editor.updateBlock(currentBlock, {
            type: "heading",
            props: { level }
          });
          return;
        }
        
        // 获取当前块的文本内容
        const blockText = currentBlock.content?.map(item => {
          if (item.type === 'text') return item.text || '';
          return '';
        }).join('') || '';
        
        // 判断阈值：如果文本长度超过20个字符，认为是长段落
        const isLongParagraph = blockText.length > 20;
        
        if (isLongParagraph) {
          // 长段落：在当前块后插入新的标题块
          editor.insertBlocks(
            [{
              type: "heading",
              props: { level },
              content: []
            }],
            currentBlock.id,
            "after"
          );
          
          // 将光标移到新插入的标题块
          setTimeout(() => {
            const blocks = editor.document;
            const currentIndex = blocks.findIndex(b => b.id === currentBlock.id);
            if (currentIndex >= 0 && currentIndex + 1 < blocks.length) {
              editor.setTextCursorPosition(blocks[currentIndex + 1], "end");
            }
          }, 0);
        } else {
          // 短段落：直接转换为标题
          editor.updateBlock(currentBlock, {
            type: "heading",
            props: { level }
          });
        }
      }
    },
    toggleBold: () => {
      if (editor) {
        const currentBlock = editor.getTextCursorPosition().block;
        // 只允许在正文（paragraph）中使用格式
        if (currentBlock.type !== 'paragraph') return;
        
        const tiptapEditor = editor._tiptapEditor;
        const { empty } = tiptapEditor.state.selection;
        if (!empty) {
          // 使用TipTap的原生命令，不触发BlockNote的重新渲染
          tiptapEditor.chain().focus().toggleBold().run();
        }
      }
    },
    toggleItalic: () => {
      if (editor) {
        const currentBlock = editor.getTextCursorPosition().block;
        // 只允许在正文（paragraph）中使用格式
        if (currentBlock.type !== 'paragraph') return;
        
        const tiptapEditor = editor._tiptapEditor;
        const { empty } = tiptapEditor.state.selection;
        if (!empty) {
          // 使用TipTap的原生命令，不触发BlockNote的重新渲染
          tiptapEditor.chain().focus().toggleItalic().run();
        }
      }
    },
    toggleUnderline: () => {
      if (editor) {
        const currentBlock = editor.getTextCursorPosition().block;
        // 只允许在正文（paragraph）中使用格式
        if (currentBlock.type !== 'paragraph') return;
        
        const tiptapEditor = editor._tiptapEditor;
        const { empty } = tiptapEditor.state.selection;
        if (!empty) {
          // 使用TipTap的原生命令，不触发BlockNote的重新渲染
          tiptapEditor.chain().focus().toggleUnderline().run();
        }
      }
    },
    toggleBulletList: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { from, to, empty } = tiptapEditor.state.selection;
        const { doc } = tiptapEditor.state;
        
        // 获取所有 BlockNote 块
        const blocks = editor.document;
        const selectedBlocks = [];
        
        // 如果没有选中文字，只处理当前块
        if (empty) {
          selectedBlocks.push(editor.getTextCursorPosition().block);
        } else {
          // 遍历文档中的所有块节点，找到与选区重叠的块
          let blockIndex = 0;
          doc.descendants((node, pos) => {
            // 只处理块级容器节点
            if (node.type.name === 'blockContainer') {
              const blockEnd = pos + node.nodeSize;
              // 检查这个块是否与选区有重叠
              if (pos < to && blockEnd > from) {
                if (blockIndex < blocks.length) {
                  selectedBlocks.push(blocks[blockIndex]);
                }
              }
              blockIndex++;
            }
          });
        }
        
        // 如果没有找到选中的块，使用当前块
        if (selectedBlocks.length === 0) {
          selectedBlocks.push(editor.getTextCursorPosition().block);
        }
        
        // 检查是否所有选中的块都是无序列表
        const allBulletList = selectedBlocks.every(block => block.type === 'bulletListItem');
        
        // 批量更新所有选中的块
        selectedBlocks.forEach(block => {
          if (allBulletList) {
            // 如果全是无序列表，转换为段落
            editor.updateBlock(block, { type: "paragraph" });
          } else {
            // 否则转换为无序列表
            editor.updateBlock(block, { type: "bulletListItem" });
          }
        });
      }
    },
    openLinkEditor: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { empty, from, to } = tiptapEditor.state.selection;
        
        // 只有选中文字时才能添加链接
        if (!empty) {
          const selectedText = tiptapEditor.state.doc.textBetween(from, to, ' ');
          // 保存选区范围，以便后续恢复
          linkSelectionRange.current = { from, to };
          
          return { selectedText }; // 返回包含选中文字的对象
        }
        return null;
      }
      return null;
    },
    clearLinkHighlight: () => {
      if (linkSelectionRange.current) {
        // 清除保存的选区范围
        linkSelectionRange.current = null;
      }
    },
    insertLink: (url) => {
      if (editor && linkSelectionRange.current) {
        const tiptapEditor = editor._tiptapEditor;
        const { from, to } = linkSelectionRange.current;
        
        // 如果URL为空，移除链接
        if (!url) {
          tiptapEditor.chain()
            .focus()
            .setTextSelection({ from, to })
            .unsetLink()
            .run();
        } else {
          // 恢复选区并添加链接
          tiptapEditor.chain()
            .focus()
            .setTextSelection({ from, to })
            .setLink({ href: url })
            .run();
        }
        
        // 清除保存的选区范围
        linkSelectionRange.current = null;
      }
    },
    getSelectedText: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { from, to } = tiptapEditor.state.selection;
        return tiptapEditor.state.doc.textBetween(from, to, ' ');
      }
      return '';
    },
    getSelectionCoords: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { from } = tiptapEditor.state.selection;
        const coords = tiptapEditor.view.coordsAtPos(from);
        return coords;
      }
      return null;
    },
    toggleNumberedList: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { from, to, empty } = tiptapEditor.state.selection;
        const { doc } = tiptapEditor.state;
        
        // 获取所有 BlockNote 块
        const blocks = editor.document;
        const selectedBlocks = [];
        
        // 如果没有选中文字，只处理当前块
        if (empty) {
          selectedBlocks.push(editor.getTextCursorPosition().block);
        } else {
          // 遍历文档中的所有块节点，找到与选区重叠的块
          let blockIndex = 0;
          doc.descendants((node, pos) => {
            // 只处理块级容器节点
            if (node.type.name === 'blockContainer') {
              const blockEnd = pos + node.nodeSize;
              // 检查这个块是否与选区有重叠
              if (pos < to && blockEnd > from) {
                if (blockIndex < blocks.length) {
                  selectedBlocks.push(blocks[blockIndex]);
                }
              }
              blockIndex++;
            }
          });
        }
        
        // 如果没有找到选中的块，使用当前块
        if (selectedBlocks.length === 0) {
          selectedBlocks.push(editor.getTextCursorPosition().block);
        }
        
        // 检查是否所有选中的块都是有序列表
        const allNumberedList = selectedBlocks.every(block => block.type === 'numberedListItem');
        
        // 批量更新所有选中的块
        selectedBlocks.forEach(block => {
          if (allNumberedList) {
            // 如果全是有序列表，转换为段落
            editor.updateBlock(block, { type: "paragraph" });
          } else {
            // 否则转换为有序列表
            editor.updateBlock(block, { type: "numberedListItem" });
          }
        });
      }
    },
    getActiveStyles: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { empty, from, to } = tiptapEditor.state.selection;
        
        // 没有选中时，检测光标位置的格式
        if (empty) {
          return {
            bold: tiptapEditor.isActive('bold'),
            italic: tiptapEditor.isActive('italic'),
            underline: tiptapEditor.isActive('underline')
          };
        }
        
        // 有选中时，检测选中区域是否包含该格式
        const { doc } = tiptapEditor.state;
        let hasBold = false;
        let hasItalic = false;
        let hasUnderline = false;
        
        doc.nodesBetween(from, to, (node) => {
          if (node.isText) {
            node.marks.forEach(mark => {
              if (mark.type.name === 'bold') hasBold = true;
              if (mark.type.name === 'italic') hasItalic = true;
              if (mark.type.name === 'underline') hasUnderline = true;
            });
          }
        });
        
        return {
          bold: hasBold,
          italic: hasItalic,
          underline: hasUnderline
        };
      }
      return { bold: false, italic: false, underline: false };
    },
    getCurrentBlockType: () => {
      if (editor) {
        const currentBlock = editor.getTextCursorPosition().block;
        return {
          type: currentBlock.type,
          level: currentBlock.props?.level || null
        };
      }
      return { type: null, level: null };
    },
    insertCitation: (citationKey) => {
      if (editor) {
        // 使用 TipTap 的底层 API 来检测选中状态和位置
        const tiptapEditor = editor._tiptapEditor;
        const { state } = tiptapEditor;
        const { empty, from, to } = state.selection;
        
        let insertPos;
        
        // 如果有选中的文字（非折叠选中），将插入位置设为选中文字的末尾
        if (!empty) {
          insertPos = to;
        } else {
          // 计算应该插入的位置（单词末尾）
          insertPos = getWordEndPosition(tiptapEditor, from);
        }
        
        // 将光标移动到插入位置
        tiptapEditor.commands.setTextSelection(insertPos);
        
        // 在光标位置插入引用（使用自定义 Citation 类型）
        editor.insertInlineContent([
          {
            type: "citation",
            props: {
              citationKey: citationKey
            }
          },
          " "
        ]);
      }
    },
    navigateToCitation: (citationKey, index = 0) => {
      if (!editor) {
        console.log('No editor');
        return 0;
      }
      
      const tiptapEditor = editor._tiptapEditor;
      const { doc } = tiptapEditor.state;
      const positions = [];
      
      // 查找所有匹配的citation位置
      doc.descendants((node, pos) => {
        if (node.type.name === 'citation' && node.attrs.citationKey === citationKey) {
          positions.push(pos);
        }
      });
      
      console.log(`Found ${positions.length} citations for "${citationKey}", navigating to index ${index}`);
      
      if (positions.length === 0) return 0;
      
      // 循环索引
      const targetIndex = index % positions.length;
      const targetPos = positions[targetIndex];
      
      console.log(`Scrolling to citation ${targetIndex + 1}/${positions.length} at position ${targetPos}`);
      
      try {
        // 获取该位置对应的段落元素
        const resolvedPos = doc.resolve(targetPos);
        let blockPos = targetPos;
        
        // 向上查找段落或标题块
        for (let d = resolvedPos.depth; d > 0; d--) {
          const node = resolvedPos.node(d);
          if (node.type.name === 'paragraph' || node.type.name === 'heading') {
            blockPos = resolvedPos.before(d);
            break;
          }
        }
        
        // 找到段落的 DOM 元素
        const domAtPos = tiptapEditor.view.domAtPos(blockPos);
        if (domAtPos && domAtPos.node) {
          let element = domAtPos.node.nodeType === 1 
            ? domAtPos.node 
            : domAtPos.node.parentElement;
          
          // 向上查找BlockNote的block容器（带有data-node-type的div）
          while (element && !element.hasAttribute('data-node-type')) {
            element = element.parentElement;
            if (!element || element.classList.contains('bn-editor')) break;
          }
          
          if (element && element.hasAttribute('data-node-type')) {
            console.log('Scrolling to BlockNote block');
            // 只做平滑滚动，不选中文本
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          } else {
            console.log('Could not find block element');
          }
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
      
      return positions.length;
    }
  }));

  const handleEditorChange = () => {
    if (editor && onChange) {
      isUserTyping.current = true;
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    }
  };

  useEffect(() => {
    // 使用 setTimeout 延迟更新，避免在渲染过程中调用 flushSync
    const timeoutId = setTimeout(() => {
      if (!isUserTyping.current && content && editor) {
        try {
          const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          if (parsedContent && Array.isArray(parsedContent)) {
            const currentContent = JSON.stringify(editor.document);
            const newContent = JSON.stringify(parsedContent);
            
            if (currentContent !== newContent) {
              // 检查用户是否有选中文字
              const tiptapEditor = editor._tiptapEditor;
              const hasSelection = tiptapEditor && !tiptapEditor.state.selection.empty;
              
              // 如果用户正在选中文字，不要替换内容，避免破坏选区
              if (!hasSelection) {
                editor.replaceBlocks(editor.document, parsedContent);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing content:', e);
        }
      } else if (!isUserTyping.current && !content && editor) {
        const defaultContent = [
          {
            type: "heading",
            props: {
              level: 1
            },
            content: []
          }
        ];
        editor.replaceBlocks(editor.document, defaultContent);
      }
      
      isUserTyping.current = false;
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [content, editor]);

  // 计算应该插入引用的位置（单词末尾）
  const getWordEndPosition = (tiptapEditor, initialPos) => {
    const { state } = tiptapEditor;
    const { doc } = state;
    
    try {
      const $pos = doc.resolve(initialPos);
      
      // 获取光标后面的文本
      const textAfter = $pos.parent.textBetween(
        initialPos - $pos.start(),
        $pos.parent.content.size,
        '\n',
        '\n'
      );
      
      // 使用 Unicode 感知的正则表达式匹配所有语言的字母和数字
      // \p{L} 匹配所有 Unicode 字母（包括中文、日文、韩文、带重音符号的拉丁字符等）
      // \p{N} 匹配所有 Unicode 数字  
      // \p{M} 匹配所有 Unicode 组合标记（用于印地语、越南语等语言的变音符号）
      // \p{Cf} 匹配格式字符（如零宽连接符 ZWJ/ZWNJ，用于印度语系等）
      // 还包括常用的词内标点：
      //   - ASCII: 连字符(-), 撇号(')
      //   - 智能标点: U+2018('), U+2019('), U+2013(–), U+2014(—)
      const wordMatchAfter = textAfter.match(/^[\p{L}\p{N}\p{M}\p{Cf}\-'\u2018\u2019\u2013\u2014]+/u);
      
      if (wordMatchAfter) {
        const endPos = initialPos + wordMatchAfter[0].length;
        return endPos;
      }
      return initialPos;
    } catch (error) {
      console.error('Error calculating word end position:', error);
      return initialPos;
    }
  };

  const handleDragOver = (e) => {
    // 检查是否是引用拖拽或图片拖拽（不区分大小写）
    const hasCitationKey = e.dataTransfer.types.some(type => 
      type.toLowerCase() === 'citationkey'
    );
    const hasImageUrl = e.dataTransfer.types.some(type => 
      type.toLowerCase() === 'imageurl'
    );
    
    if (hasCitationKey || hasImageUrl) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      
      // 只为图片拖拽显示插入位置指示器
      if (hasImageUrl && editor && editorContainerRef.current) {
        const tiptapEditor = editor._tiptapEditor;
        const pos = tiptapEditor.view.posAtCoords({
          left: e.clientX,
          top: e.clientY
        });
        
        if (pos) {
          try {
            // 使用 TipTap 的 coordsAtPos 来获取准确的插入位置
            const coords = tiptapEditor.view.coordsAtPos(pos.pos);
            const containerRect = editorContainerRef.current.getBoundingClientRect();
            
            // 临时设置光标位置以获取目标块
            const currentSelection = tiptapEditor.state.selection;
            tiptapEditor.commands.setTextSelection(pos.pos);
            const targetBlock = editor.getTextCursorPosition().block;
            
            // 直接使用 TipTap 的 DOM 坐标来定位指示线
            // 获取块的结束位置
            const { state } = tiptapEditor;
            const { doc } = state;
            const $pos = doc.resolve(pos.pos);
            
            // 找到当前块的结束位置
            let blockEnd = $pos.end($pos.depth);
            
            // 获取块结束位置的屏幕坐标
            const endCoords = tiptapEditor.view.coordsAtPos(blockEnd);
            
            // 计算指示线位置（块的底部）
            const top = endCoords.bottom - containerRect.top;
            setDragIndicatorPosition(top);
            console.log('Drag indicator at:', top, 'for block:', targetBlock.id, 'blockEnd:', blockEnd);
          } catch (error) {
            console.error('Error calculating drag position:', error);
          }
        }
      }
    }
  };
  
  const handleDragLeave = (e) => {
    // 清除插入位置指示器
    if (e.currentTarget === e.target) {
      setDragIndicatorPosition(null);
    }
  };

  const handleDrop = (e) => {
    const citationKey = e.dataTransfer.getData('citationKey');
    const imageUrl = e.dataTransfer.getData('imageUrl');
    const imageTitle = e.dataTransfer.getData('imageTitle');
    
    console.log('Drop event:', { citationKey, imageUrl, imageTitle });
    
    if (citationKey) {
      e.preventDefault();
      e.stopPropagation();
      
      if (editor) {
        // 使用 TipTap 的底层 API
        const tiptapEditor = editor._tiptapEditor;
        
        // 根据鼠标位置获取文档中的坐标
        const pos = tiptapEditor.view.posAtCoords({
          left: e.clientX,
          top: e.clientY
        });
        
        let insertPos;
        if (pos) {
          // 计算应该插入的位置（单词末尾）
          insertPos = getWordEndPosition(tiptapEditor, pos.pos);
        } else {
          // 如果拖放位置无效（如空白区域），插入到文档末尾
          const docSize = tiptapEditor.state.doc.content.size;
          insertPos = docSize;
        }
        
        // 将光标移动到计算出的位置
        tiptapEditor.commands.setTextSelection(insertPos);
        
        // 在设定的位置插入引用（使用自定义 Citation 类型）
        editor.insertInlineContent([
          {
            type: "citation",
            props: {
              citationKey: citationKey
            }
          },
          " "
        ]);
      }
    } else if (imageUrl) {
      e.preventDefault();
      e.stopPropagation();
      
      // 清除插入位置指示器
      setDragIndicatorPosition(null);
      
      console.log('Inserting image:', imageUrl);
      
      if (editor) {
        try {
          // 使用 TipTap 的底层 API
          const tiptapEditor = editor._tiptapEditor;
          
          // 根据鼠标位置获取文档中的坐标
          const pos = tiptapEditor.view.posAtCoords({
            left: e.clientX,
            top: e.clientY
          });
          
          console.log('Mouse drop position:', pos);
          
          if (pos) {
            // 将光标移动到拖放位置
            tiptapEditor.commands.setTextSelection(pos.pos);
            
            // 获取拖放位置所在的块
            const targetBlock = editor.getTextCursorPosition().block;
            
            console.log('Target block at drop position:', targetBlock);
            
            // 在目标块之后插入图片和图注段落
            const newBlocks = [
              {
                type: "image",
                props: {
                  url: imageUrl,
                  caption: "",
                }
              },
              {
                type: "paragraph",
                props: {
                  textAlignment: "center",
                  textColor: "gray"
                },
                content: []
              }
            ];
            
            editor.insertBlocks(newBlocks, targetBlock, "after");
            
            console.log('Image and caption paragraph inserted');
            
            // 将光标移动到图注段落（图片后的第一个段落）
            setTimeout(() => {
              try {
                // 查找目标块在文档中的位置
                const allBlocks = editor.document;
                const targetIndex = allBlocks.findIndex(b => b.id === targetBlock.id);
                console.log('Target block index:', targetIndex);
                
                if (targetIndex !== -1 && targetIndex + 2 < allBlocks.length) {
                  // targetIndex + 1 是图片块, targetIndex + 2 是图注段落
                  const captionBlock = allBlocks[targetIndex + 2];
                  console.log('Caption block found:', captionBlock);
                  
                  if (captionBlock && captionBlock.type === 'paragraph') {
                    // 使用 BlockNote 的 setTextCursorPosition 移动光标
                    editor.setTextCursorPosition(captionBlock, "start");
                    console.log('Caption paragraph focused');
                  }
                }
              } catch (error) {
                console.error('Error focusing caption paragraph:', error);
              }
            }, 150);
          } else {
            // 如果无法确定位置，插入到文档末尾
            const lastBlock = editor.document[editor.document.length - 1];
            const newBlocks = [
              {
                type: "image",
                props: {
                  url: imageUrl,
                  caption: "",
                }
              },
              {
                type: "paragraph",
                props: {
                  textAlignment: "center",
                  textColor: "gray"
                },
                content: []
              }
            ];
            
            editor.insertBlocks(newBlocks, lastBlock, "after");
            console.log('Image and caption paragraph inserted at end');
            
            // 将光标移动到图注段落
            setTimeout(() => {
              try {
                // 获取最新的文档状态
                const allBlocks = editor.document;
                // 图注段落应该是倒数第一个（最后插入的）
                const captionBlock = allBlocks[allBlocks.length - 1];
                console.log('Caption block at end:', captionBlock);
                
                if (captionBlock && captionBlock.type === 'paragraph') {
                  // 使用 BlockNote 的 setTextCursorPosition 移动光标
                  editor.setTextCursorPosition(captionBlock, "start");
                  console.log('Caption paragraph focused at end');
                }
              } catch (error) {
                console.error('Error focusing caption paragraph:', error);
              }
            }, 150);
          }
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
    }
  };

  return (
    <div className="flex-1 min-h-96">
      <div
        ref={editorContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ 
          height: '100%', 
          position: 'relative',
          zoom: `${zoomLevel}%`,
          transition: 'zoom 0.2s'
        }}
      >
        {/* 拖动插入位置指示器 */}
        {dragIndicatorPosition !== null && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: dragIndicatorPosition + 'px',
              height: '3px',
              backgroundColor: '#3b82f6',
              pointerEvents: 'none',
              zIndex: 1500,
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
            }}
          />
        )}
        <BlockNoteView
          key={`editor-${referencesVersion}`}
          editor={editor}
          onChange={handleEditorChange}
          theme="light"
          editable={true}
          formattingToolbar={formattingToolbarEnabled}
          slashMenu={false}
        />
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
