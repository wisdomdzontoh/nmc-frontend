"use client"

import * as React from "react"
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { ApiClient } from "@/lib/api"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

export function BulkImportModal({
  open,
  onOpenChange,
  onSuccess
}: Props) {
  const [file, setFile] = React.useState<File | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [result, setResult] = React.useState<ImportResult | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setResult(null)
    } else {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile)
      setResult(null)
    } else {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)")
    }
  }

  const parseExcelFile = async (file: File): Promise<Array<{ code: string; name: string; description?: string }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as (string | number | null | undefined)[][]
          
          // Skip header row and parse data
          const dataElements = jsonData.slice(1)
            .filter(row => row[0] && row[1]) // Must have code and name
            .map((row) => ({
              code: String(row[0] || "").trim(),
              name: String(row[1] || "").trim(),
              description: row[2] ? String(row[2]).trim() : undefined
            }))
            .filter(de => de.code && de.name)
          
          resolve(dataElements)
        } catch {
          reject(new Error("Failed to parse Excel file"))
        }
      }
      
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setResult(null)

      // Parse Excel file
      const dataElements = await parseExcelFile(file)
      
      if (dataElements.length === 0) {
        toast.error("No valid data elements found in the Excel file")
        setUploading(false)
        return
      }

      // Upload data elements
      const results: ImportResult = {
        success: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < dataElements.length; i++) {
        try {
          await ApiClient.createDataElement(dataElements[i])
          results.success++
        } catch (error: unknown) {
          results.failed++
          const errorMessage = error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : error instanceof Error
            ? error.message
            : "Unknown error"
          results.errors.push({
            row: i + 2, // +2 because we skip header and 0-indexed
            error: errorMessage || "Unknown error"
          })
        }
      }

      setResult(results)

      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} data element(s)`)
        if (results.failed > 0) {
          toast.warning(`${results.failed} data element(s) failed to import`)
        }
      } else {
        toast.error("Failed to import any data elements")
      }

      if (results.success > 0) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (error: unknown) {
      console.error("Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to process Excel file"
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Data Elements
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to create multiple data elements at once. The file should have columns: Code, Name, Description (optional).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload Area */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-full">
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Drop your Excel file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports .xlsx and .xls files
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Instructions */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Expected Excel format:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>First row should be headers: <code className="bg-gray-100 px-1 rounded">Code</code>, <code className="bg-gray-100 px-1 rounded">Name</code>, <code className="bg-gray-100 px-1 rounded">Description</code> (optional)</li>
                      <li>Each subsequent row represents one data element</li>
                      <li>Code and Name are required, Description is optional</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Upload Results */}
              {result && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">{result.success} successful</span>
                    </div>
                    {result.failed > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <X className="h-5 w-5" />
                        <span className="font-semibold">{result.failed} failed</span>
                      </div>
                    )}
                  </div>

                  {result.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

