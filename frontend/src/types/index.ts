// API 响应类型
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// 基础实体类型
export interface Document {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Node {
  id: number;
  document_id: number;
  parent_id?: number;
  node_type: NodeType;
  title: string;
  order_index: number;
  indent_level: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export type NodeType = 'section' | 'reference' | 'figure' | 'equation';

export interface Content {
  id: number;
  node_id: number;
  content_json: string;
  updated_at: string;
}

export interface Reference {
  id: number;
  title: string;
  content: string;
  usageCount: number;
}

// BibTeX 相关类型
export interface BibTeXData {
  citationKey: string;
  bibtex: string;
}

// 文件上传类型
export interface UploadResponse {
  url: string;
  filename: string;
}

// 字数统计类型
export interface WordCount {
  display: number;
  tooltip: number;
}

// UI 状态类型
export interface UIState {
  isSaving: boolean;
  error: string | null;
  formattingToolbarEnabled: boolean;
  zoomLevel: number;
  isBibTeXModalOpen: boolean;
  isImagePreviewOpen: boolean;
}

// 编辑器状态类型
export interface EditorState {
  selectedNode: Node | null;
  content: string | null;
  currentCounts: WordCount;
  totalCounts: WordCount;
}

// 应用状态类型
export interface AppState {
  document: Document | null;
  nodes: Node[];
  references: Reference[];
  ui: UIState;
  editor: EditorState;
  previewImage: Node | null;
}

// 操作类型
export type AppAction = 
  | { type: 'SET_DOCUMENT'; payload: Document }
  | { type: 'SET_NODES'; payload: Node[] }
  | { type: 'SET_SELECTED_NODE'; payload: Node | null }
  | { type: 'SET_CONTENT'; payload: string | null }
  | { type: 'SET_REFERENCES'; payload: Reference[] }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FORMATTING_TOOLBAR'; payload: boolean }
  | { type: 'SET_ZOOM_LEVEL'; payload: number }
  | { type: 'SET_BIBTEX_MODAL'; payload: boolean }
  | { type: 'SET_IMAGE_PREVIEW_MODAL'; payload: boolean }
  | { type: 'SET_PREVIEW_IMAGE'; payload: Node | null }
  | { type: 'SET_CURRENT_COUNTS'; payload: WordCount }
  | { type: 'SET_TOTAL_COUNTS'; payload: WordCount }
  | { type: 'UPDATE_NODE'; payload: { id: number; updates: Partial<Node> } }
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'REMOVE_NODE'; payload: number };

// 事件处理器类型
export interface EditorHandlers {
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onNodeSelect: (node: Node) => void;
  onNodeAdd: (nodeType: NodeType) => void;
  onNodeDelete: (nodeId: number) => void;
  onNodeReorder: (nodes: Node[]) => void;
  onSaveBibTeX: (data: BibTeXData) => void;
  onUploadImage: (file: File) => void;
}

// API 客户端接口
export interface APIClient {
  documents: {
    list(): Promise<Document[]>;
    create(title: string): Promise<Document>;
    get(id: number): Promise<Document>;
    update(id: number, title: string): Promise<Document>;
    delete(id: number): Promise<void>;
  };
  nodes: {
    list(docId: number): Promise<Node[]>;
    create(data: Omit<Node, 'id' | 'created_at' | 'updated_at'>): Promise<Node>;
    get(id: number): Promise<Node>;
    update(id: number, data: Partial<Node>): Promise<Node>;
    delete(id: number): Promise<void>;
  };
  content: {
    get(nodeId: number): Promise<Content>;
    save(nodeId: number, contentJson: string): Promise<Content>;
  };
  upload: {
    uploadFile(file: File): Promise<UploadResponse>;
  };
}

// Hook 返回类型
export interface UseDocumentReturn {
  document: Document | null;
  loading: boolean;
  error: string | null;
  updateTitle: (title: string) => Promise<void>;
  exportDocument: () => void;
}

export interface UseNodesReturn {
  nodes: Node[];
  selectedNode: Node | null;
  loading: boolean;
  error: string | null;
  selectNode: (node: Node | null) => void;
  addNode: (nodeType: NodeType) => Promise<void>;
  updateNode: (id: number, updates: Partial<Node>) => Promise<void>;
  deleteNode: (id: number) => Promise<void>;
  reorderNodes: (reorderedNodes: Node[]) => Promise<void>;
}

export interface UseContentReturn {
  content: string | null;
  currentCounts: WordCount;
  totalCounts: WordCount;
  loading: boolean;
  error: string | null;
  updateContent: (content: string) => void;
}

export interface UseReferencesReturn {
  references: Reference[];
  loading: boolean;
  error: string | null;
  addReference: (data: BibTeXData) => Promise<void>;
  updateReference: (id: number, data: BibTeXData) => Promise<void>;
  deleteReference: (id: number) => Promise<void>;
  insertCitation: (citationKey: string) => void;
  navigateToCitation: (citationKey: string) => void;
}