import { useEffect, useRef, forwardRef, useImperativeHandle, useState, DragEvent } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteSchema, defaultInlineContentSpecs, Block, PartialBlock, BlockNoteEditor } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { Citation } from './Citation';

// Types
interface EditorRef {
  undo: () => void;
  redo: () => void;
  setHeading: (level: 1 | 2 | 3) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleBulletList: () => void;
  toggleNumberedList: () => void;
  openLinkEditor: () => { selectedText?: string } | null;
  clearLinkHighlight: () => void;
  insertLink: (url: string) => void;
  getSelectedText: () => string;
  getSelectionCoords: () => { top: number; left: number } | null;
  getActiveStyles: () => { bold: boolean; italic: boolean; underline: boolean };
  getCurrentBlockType: () => { type: string | null; level: number | null };
}

interface Reference {
  id: number;
  type: string;
  title: string;
  author?: string;
  journal?: string;
  year?: number;
  doi?: string;
  url?: string;
  pages?: string;
  volume?: string;
  issue?: string;
  publisher?: string;
  location?: string;
  edition?: string;
  isbn?: string;
}

interface EditorProps {
  content?: string | Block[];
  onChange?: (content: Block[]) => void;
  references?: Reference[];
  formattingToolbarEnabled?: boolean;
  zoomLevel?: number;
}

const Editor = forwardRef<EditorRef, EditorProps>(({ 
  content, 
  onChange, 
  references, 
  formattingToolbarEnabled = true, 
  zoomLevel = 100 
}, ref) => {
  const isUserTyping = useRef(false);
  const [dragIndicatorPosition, setDragIndicatorPosition] = useState<number | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const linkSelectionRange = useRef<{ from: number; to: number } | null>(null);
  
  const getInitialContent = (): PartialBlock[] => {
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
      } as PartialBlock
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
  }) as BlockNoteEditor & { 
    onCitationDelete?: (pos: number) => void; 
    references?: Reference[];
    _tiptapEditor: any;
  };

  // 使用state来触发重新渲染
  const [referencesVersion, setReferencesVersion] = useState(0);

  useEffect(() => {
    if (editor) {
      editor.onCitationDelete = (pos: number) => {
        const tiptapEditor = editor._tiptapEditor;
        const { doc } = tiptapEditor.state;
        
        try {
          // const $pos = doc.resolve(pos);
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
    setHeading: (level: 1 | 2 | 3) => {
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
        const blockText = Array.isArray(currentBlock.content) 
          ? currentBlock.content.map((item: any) => {
              if (item.type === 'text') return item.text || '';
              return '';
            }).join('') 
          : '';
        
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
        const selectedBlocks: Block[] = [];
        
        // 如果没有选中文字，只处理当前块
        if (empty) {
          selectedBlocks.push(editor.getTextCursorPosition().block);
        } else {
          // 遍历文档中的所有块节点，找到与选区重叠的块
          let blockIndex = 0;
          doc.descendants((node: any, pos: number) => {
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
    toggleNumberedList: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        const { from, to, empty } = tiptapEditor.state.selection;
        const { doc } = tiptapEditor.state;
        
        // 获取所有 BlockNote 块
        const blocks = editor.document;
        const selectedBlocks: Block[] = [];
        
        // 如果没有选中文字，只处理当前块
        if (empty) {
          selectedBlocks.push(editor.getTextCursorPosition().block);
        } else {
          // 遍历文档中的所有块节点，找到与选区重叠的块
          let blockIndex = 0;
          doc.descendants((node: any, pos: number) => {
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
    insertLink: (url: string) => {
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
        
        // 获取选区的DOM位置
        const coords = tiptapEditor.view.coordsAtPos(from);
        
        // 转换为相对于视口的坐标
        return {
          top: coords.top,
          left: coords.left
        };
      }
      return null;
    },
    getActiveStyles: () => {
      if (editor) {
        const tiptapEditor = editor._tiptapEditor;
        return {
          bold: tiptapEditor.isActive('bold'),
          italic: tiptapEditor.isActive('italic'),
          underline: tiptapEditor.isActive('underline')
        };
      }
      return { bold: false, italic: false, underline: false };
    },
    getCurrentBlockType: () => {
      if (editor) {
        try {
          const currentBlock = editor.getTextCursorPosition().block;
          return {
            type: currentBlock.type,
            level: currentBlock.type === 'heading' ? (currentBlock.props as any)?.level || null : null
          };
        } catch (error) {
          return { type: null, level: null };
        }
      }
      return { type: null, level: null };
    }
  }), [editor]);

  const handleEditorChange = () => {
    if (editor && onChange && isUserTyping.current) {
      try {
        const blocks = editor.document;
        onChange(blocks);
      } catch (error) {
        console.error('Error in editor onChange:', error);
      }
    }
  };

  // 监听编辑器状态变化
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      isUserTyping.current = true;
      setTimeout(() => {
        isUserTyping.current = false;
      }, 100);
    };

    // 监听编辑器的变化事件
    editor.onEditorContentChange(handleUpdate);
    
    return () => {
      // 清理事件监听器（如果有的话）
    };
  }, [editor]);

  // 拖拽处理函数
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!editorContainerRef.current) return;
    
    // 获取鼠标相对于编辑器容器的Y坐标
    const rect = editorContainerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    setDragIndicatorPosition(y);
  };

  const handleDragLeave = () => {
    setDragIndicatorPosition(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragIndicatorPosition(null);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    // 处理图片上传
    for (const file of imageFiles) {
      await handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      
      if (result.success && result.url) {
        // 获取当前所有块
        const blocks = editor.document;
        
        if (blocks.length === 0) {
          console.error('No blocks found in editor');
          return;
        }
        
        // 插入到最后一个块之后
        const lastBlock = blocks[blocks.length - 1];
        
        const newBlocks: PartialBlock[] = [
          {
            type: "image",
            props: {
              url: result.url,
              caption: ""
            }
          },
          {
            type: "paragraph",
            props: {
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
      console.error('Error uploading image:', error);
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
          editor={editor as any}
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