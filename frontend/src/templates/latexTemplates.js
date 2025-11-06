export const LATEX_TEMPLATES = {
  ieee: {
    id: 'ieee',
    name: 'IEEE Conference',
    description: 'IEEE conference paper template',
    preamble: `\\documentclass[conference]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}
\\usepackage{hyperref}

\\def\\BibTeX{{\\rm B\\kern-.05em{\\sc i\\kern-.025em b}\\kern-.08em
    T\\kern-.1667em\\lower.7ex\\hbox{E}\\kern-.125emX}}`
  },
  
  acm: {
    id: 'acm',
    name: 'ACM Article',
    description: 'ACM article template',
    preamble: `\\documentclass[sigconf]{acmart}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\settopmatter{printacmref=false}
\\renewcommand\\footnotetextcopyrightpermission[1]{}
\\pagestyle{plain}`
  },
  
  springer: {
    id: 'springer',
    name: 'Springer LNCS',
    description: 'Springer Lecture Notes in Computer Science',
    preamble: `\\documentclass[runningheads]{llncs}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}`
  },
  
  article: {
    id: 'article',
    name: 'Basic Article',
    description: 'Simple article template',
    preamble: `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}`
  },
  
  report: {
    id: 'report',
    name: 'Technical Report',
    description: 'Technical report template',
    preamble: `\\documentclass[11pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}`
  }
};

export function generateLatexDocument(template, title, author, sections, references = []) {
  const templateConfig = LATEX_TEMPLATES[template] || LATEX_TEMPLATES.article;
  
  let latex = templateConfig.preamble + '\n\n';
  
  latex += `\\title{${escapeLatex(title)}}\n`;
  latex += `\\author{${escapeLatex(author)}}\n`;
  latex += `\\date{\\today}\n\n`;
  
  latex += `\\begin{document}\n\n`;
  latex += `\\maketitle\n\n`;
  
  latex += sections;
  
  if (references && references.length > 0) {
    latex += `\\bibliographystyle{ieeetr}\n`;
    latex += `\\begin{thebibliography}{99}\n\n`;
    
    references.forEach((ref, index) => {
      const authors = ref.authors || 'Unknown';
      const title = ref.title || 'Untitled';
      const year = ref.year || '';
      const journal = ref.journal || ref.booktitle || '';
      
      latex += `\\bibitem{${ref.citation_key}}\n`;
      latex += `${escapeLatex(authors)}, `;
      latex += `"${escapeLatex(title)}", `;
      if (journal) {
        latex += `${escapeLatex(journal)}, `;
      }
      latex += `${year}.\n\n`;
    });
    
    latex += `\\end{thebibliography}\n\n`;
  }
  
  latex += `\\end{document}`;
  
  return latex;
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
