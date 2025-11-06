export function convertBlockNoteToLatex(blocks, references = []) {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }

  let latex = '';

  blocks.forEach(block => {
    if (block.type === 'heading') {
      const level = block.props?.level || 1;
      const content = extractTextContent(block.content);
      
      if (level === 1) {
        latex += `\\section{${escapeLatex(content)}}\n\n`;
      } else if (level === 2) {
        latex += `\\subsection{${escapeLatex(content)}}\n\n`;
      } else if (level === 3) {
        latex += `\\subsubsection{${escapeLatex(content)}}\n\n`;
      }
    } else if (block.type === 'paragraph') {
      const content = convertInlineContent(block.content, references);
      if (content.trim()) {
        latex += `${content}\n\n`;
      }
    } else if (block.type === 'bulletListItem') {
      const content = convertInlineContent(block.content, references);
      latex += `\\item ${content}\n`;
    } else if (block.type === 'numberedListItem') {
      const content = convertInlineContent(block.content, references);
      latex += `\\item ${content}\n`;
    } else if (block.type === 'image') {
      const url = block.props?.url || '';
      const caption = block.props?.caption || '';
      latex += `\\begin{figure}[h]\n`;
      latex += `\\centering\n`;
      latex += `\\includegraphics[width=0.8\\textwidth]{${url}}\n`;
      if (caption) {
        latex += `\\caption{${escapeLatex(caption)}}\n`;
      }
      latex += `\\end{figure}\n\n`;
    }

    if (block.children && block.children.length > 0) {
      const childBlocks = block.children;
      const firstChild = childBlocks[0];
      
      if (firstChild?.type === 'bulletListItem') {
        latex += `\\begin{itemize}\n`;
        latex += convertBlockNoteToLatex(childBlocks, references);
        latex += `\\end{itemize}\n\n`;
      } else if (firstChild?.type === 'numberedListItem') {
        latex += `\\begin{enumerate}\n`;
        latex += convertBlockNoteToLatex(childBlocks, references);
        latex += `\\end{enumerate}\n\n`;
      } else {
        latex += convertBlockNoteToLatex(childBlocks, references);
      }
    }
  });

  return latex;
}

function convertInlineContent(content, references = []) {
  if (!content || !Array.isArray(content)) {
    return '';
  }

  let result = '';

  content.forEach(item => {
    if (item.type === 'text') {
      let text = item.text || '';
      
      if (item.styles) {
        if (item.styles.bold) {
          text = `\\textbf{${text}}`;
        }
        if (item.styles.italic) {
          text = `\\textit{${text}}`;
        }
        if (item.styles.underline) {
          text = `\\underline{${text}}`;
        }
      }
      
      result += escapeLatex(text);
    } else if (item.type === 'link') {
      const text = extractTextContent(item.content);
      const url = item.href || '';
      result += `\\href{${url}}{${escapeLatex(text)}}`;
    } else if (item.type === 'citation') {
      const citationKey = item.props?.citationKey || '';
      result += `\\cite{${citationKey}}`;
    }
  });

  return result;
}

function extractTextContent(content) {
  if (!content || !Array.isArray(content)) {
    return '';
  }

  return content.map(item => {
    if (item.type === 'text') {
      return item.text || '';
    } else if (item.content) {
      return extractTextContent(item.content);
    }
    return '';
  }).join('');
}

function escapeLatex(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export function generateBibliography(references = []) {
  if (!references || references.length === 0) {
    return '';
  }

  let bibtex = '';
  
  references.forEach(ref => {
    if (!ref.bibtex_entry) return;
    
    bibtex += ref.bibtex_entry + '\n\n';
  });

  return bibtex;
}
