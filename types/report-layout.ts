export type CellDef = {
    label?: string
    text?: string
    bind?: string
    compute?: string
    colSpan?: number
    rowSpan?: number
    align?: "left" | "center" | "right"
    bold?: boolean
    backgroundColor?: string
    textColor?: string
  }
  
  export type TableSection = {
    type: "table"
    id: string
    header?: { rows: CellDef[][] }
    columnWidths?: number[]
    rows: { cells: CellDef[] }[]
  }
  
  export type HeadingSection = {
    type: "heading"
    text: string
    level?: 1 | 2 | 3
  }
  
  export type LayoutSchema = {
    title?: string
    sections: (HeadingSection | TableSection)[]
  }
  
  export type ReportLayoutSchema = LayoutSchema
  
  export type TableCell = {
    content?: string
    type?: "static" | "bound" | "formula"
    dataElement?: string
    formula?: string
    bold?: boolean
    alignment?: "left" | "center" | "right"
    bgColor?: string
    textColor?: string
    border?: boolean
    colSpan?: number
    rowSpan?: number
  }
  
  export type TableSectionEnhanced = {
    id: string
    type: "table"
    rows?: number
    cols?: number
    cells?: Record<string, TableCell>
  }
  
  export type HeadingSectionEnhanced = {
    id: string
    type: "heading"
    content?: string
    level?: 1 | 2 | 3
  }
  
  export type TextSection = {
    id: string
    type: "text"
    content?: string
  }
  
  export type Section = TableSectionEnhanced | HeadingSectionEnhanced | TextSection
  
  export type EnhancedLayoutSchema = {
    sections: Section[]
  }
  
  export interface ReportLayout {
    id: number
    name: string
    code: string
    report_type?: number
    report_type_name?: string
    schema: EnhancedLayoutSchema // Updated to use EnhancedLayoutSchema
    status: "draft" | "published" | "archived"
    version: number
    created_by?: number
    created_by_name?: string
    created_at: string
    updated_at: string
    is_active: boolean
    description?: string
    bound_data_elements?: string[]
    validation_status?: {
      valid: boolean
      missing_elements: string[]
      bound_elements: string[]
    }
  }
  
  export interface DataElement {
    id: number
    code: string
    name: string
    description?: string
    value_type?: string
  }
  