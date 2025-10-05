import { create } from "zustand"

type SelectedCell = {
  sectionIndex: number
  rowIndex: number
  colIndex: number
}

type HistoryState = {
  schema: any
  timestamp: number
}

type DesignerStore = {
  selectedCell: SelectedCell | null
  setSelectedCell: (cell: SelectedCell | null) => void

  copiedCell: any | null
  setCopiedCell: (cell: any | null) => void

  history: HistoryState[]
  historyIndex: number
  pushHistory: (schema: any) => void
  undo: () => any | null
  redo: () => any | null
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useDesignerStore = create<DesignerStore>((set, get) => ({
  selectedCell: null,
  setSelectedCell: (cell) => set({ selectedCell: cell }),

  copiedCell: null,
  setCopiedCell: (cell) => set({ copiedCell: cell }),

  history: [],
  historyIndex: -1,

  pushHistory: (schema) => {
    const { history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ schema: JSON.parse(JSON.stringify(schema)), timestamp: Date.now() })
    // Keep only last 50 states
    if (newHistory.length > 50) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1 })
      return history[historyIndex - 1].schema
    }
    return null
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1 })
      return history[historyIndex + 1].schema
    }
    return null
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}))
