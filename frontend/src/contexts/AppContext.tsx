import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, Document, Node, Reference, WordCount } from '../types';

// 初始状态
const initialState: AppState = {
  document: null,
  nodes: [],
  references: [],
  ui: {
    isSaving: false,
    error: null,
    formattingToolbarEnabled: false,
    zoomLevel: 100,
    isBibTeXModalOpen: false,
    isImagePreviewOpen: false,
  },
  editor: {
    selectedNode: null,
    content: null,
    currentCounts: { display: 0, tooltip: 0 },
    totalCounts: { display: 0, tooltip: 0 },
  },
  previewImage: null,
};

// Reducer 函数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DOCUMENT':
      return {
        ...state,
        document: action.payload,
      };

    case 'SET_NODES':
      return {
        ...state,
        nodes: action.payload,
      };

    case 'SET_SELECTED_NODE':
      return {
        ...state,
        editor: {
          ...state.editor,
          selectedNode: action.payload,
        },
      };

    case 'SET_CONTENT':
      return {
        ...state,
        editor: {
          ...state.editor,
          content: action.payload,
        },
      };

    case 'SET_REFERENCES':
      return {
        ...state,
        references: action.payload,
      };

    case 'SET_SAVING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isSaving: action.payload,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload,
        },
      };

    case 'SET_FORMATTING_TOOLBAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          formattingToolbarEnabled: action.payload,
        },
      };

    case 'SET_ZOOM_LEVEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          zoomLevel: action.payload,
        },
      };

    case 'SET_BIBTEX_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          isBibTeXModalOpen: action.payload,
        },
      };

    case 'SET_IMAGE_PREVIEW_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          isImagePreviewOpen: action.payload,
        },
      };

    case 'SET_PREVIEW_IMAGE':
      return {
        ...state,
        previewImage: action.payload,
      };

    case 'SET_CURRENT_COUNTS':
      return {
        ...state,
        editor: {
          ...state.editor,
          currentCounts: action.payload,
        },
      };

    case 'SET_TOTAL_COUNTS':
      return {
        ...state,
        editor: {
          ...state.editor,
          totalCounts: action.payload,
        },
      };

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(node =>
          node.id === action.payload.id
            ? { ...node, ...action.payload.updates }
            : node
        ),
      };

    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.payload],
      };

    case 'REMOVE_NODE':
      const updatedNodes = state.nodes.filter(node => node.id !== action.payload);
      return {
        ...state,
        nodes: updatedNodes,
        editor: {
          ...state.editor,
          selectedNode: state.editor.selectedNode?.id === action.payload 
            ? null 
            : state.editor.selectedNode,
        },
      };

    default:
      return state;
  }
}

// Context 类型
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// 创建 Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider 组件
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook 来使用 context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// 选择器 hooks 用于方便访问特定状态
export function useDocument() {
  const { state } = useAppContext();
  return state.document;
}

export function useNodes() {
  const { state } = useAppContext();
  return state.nodes;
}

export function useSelectedNode() {
  const { state } = useAppContext();
  return state.editor.selectedNode;
}

export function useContent() {
  const { state } = useAppContext();
  return state.editor.content;
}

export function useReferences() {
  const { state } = useAppContext();
  return state.references;
}

export function useUIState() {
  const { state } = useAppContext();
  return state.ui;
}

export function useEditorState() {
  const { state } = useAppContext();
  return state.editor;
}

export function usePreviewImage() {
  const { state } = useAppContext();
  return state.previewImage;
}

// Action creators
export function useAppActions() {
  const { dispatch } = useAppContext();

  return {
    setDocument: (document: Document) => 
      dispatch({ type: 'SET_DOCUMENT', payload: document }),
    
    setNodes: (nodes: Node[]) => 
      dispatch({ type: 'SET_NODES', payload: nodes }),
    
    setSelectedNode: (node: Node | null) => 
      dispatch({ type: 'SET_SELECTED_NODE', payload: node }),
    
    setContent: (content: string | null) => 
      dispatch({ type: 'SET_CONTENT', payload: content }),
    
    setReferences: (references: Reference[]) => 
      dispatch({ type: 'SET_REFERENCES', payload: references }),
    
    setSaving: (isSaving: boolean) => 
      dispatch({ type: 'SET_SAVING', payload: isSaving }),
    
    setError: (error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }),
    
    setFormattingToolbar: (enabled: boolean) => 
      dispatch({ type: 'SET_FORMATTING_TOOLBAR', payload: enabled }),
    
    setZoomLevel: (level: number) => 
      dispatch({ type: 'SET_ZOOM_LEVEL', payload: level }),
    
    setBibTeXModal: (open: boolean) => 
      dispatch({ type: 'SET_BIBTEX_MODAL', payload: open }),
    
    setImagePreviewModal: (open: boolean) => 
      dispatch({ type: 'SET_IMAGE_PREVIEW_MODAL', payload: open }),
    
    setPreviewImage: (image: Node | null) => 
      dispatch({ type: 'SET_PREVIEW_IMAGE', payload: image }),
    
    setCurrentCounts: (counts: WordCount) => 
      dispatch({ type: 'SET_CURRENT_COUNTS', payload: counts }),
    
    setTotalCounts: (counts: WordCount) => 
      dispatch({ type: 'SET_TOTAL_COUNTS', payload: counts }),
    
    updateNode: (id: number, updates: Partial<Node>) => 
      dispatch({ type: 'UPDATE_NODE', payload: { id, updates } }),
    
    addNode: (node: Node) => 
      dispatch({ type: 'ADD_NODE', payload: node }),
    
    removeNode: (id: number) => 
      dispatch({ type: 'REMOVE_NODE', payload: id }),
  };
}