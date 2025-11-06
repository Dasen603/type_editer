import React from 'react';
import { createReactInlineContentSpec } from '@blocknote/react';

const CitationContent = ({ editor, citationKey }) => {
  const spanRef = React.useRef(null);

  // 检查citation key是否对应一个有效的reference
  const references = editor.references || [];
  const isValid = references.some(ref => ref.title === citationKey);

  // 在 citation key 中自动添加空格（在数字和字母之间、大小写变化处）
  const formatCitationKey = (key) => {
    return key
      // 在小写字母后跟大写字母的位置加空格 (camelCase)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // 在字母后跟数字的位置加空格
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      // 在数字后跟字母的位置加空格
      .replace(/(\d)([a-zA-Z])/g, '$1 $2');
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editor.onCitationDelete && spanRef.current) {
      try {
        const tiptapEditor = editor._tiptapEditor;
        const domNode = spanRef.current;
        const pos = tiptapEditor.view.posAtDOM(domNode, 0);
        
        if (pos !== null && pos !== undefined) {
          editor.onCitationDelete(pos);
        }
      } catch (error) {
        console.error('Error finding position for deletion:', error);
      }
    }
  };

  // 根据有效性选择不同的样式
  const validStyles = {
    backgroundColor: '#dbeafe',
    hoverColor: '#bfdbfe',
    textColor: '#1e40af',
  };
  
  const invalidStyles = {
    backgroundColor: '#fee2e2',
    hoverColor: '#fecaca',
    textColor: '#dc2626',
  };
  
  const styles = isValid ? validStyles : invalidStyles;

  return (
    <span
      ref={spanRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 600,
        userSelect: 'none',
        transition: 'background-color 0.2s',
        gap: '4px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = styles.hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = styles.backgroundColor;
      }}
      title={isValid ? undefined : 'Reference not found'}
    >
      <span>
        [{formatCitationKey(citationKey)}]
      </span>
      <button
        onClick={handleDelete}
        style={{
          background: 'none',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '0',
          fontSize: '14px',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '2px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Delete citation"
      >
        ×
      </button>
    </span>
  );
};

export const Citation = createReactInlineContentSpec(
  {
    type: 'citation',
    propSchema: {
      citationKey: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <CitationContent 
        editor={props.editor} 
        citationKey={props.inlineContent.props.citationKey} 
      />
    ),
  }
);
