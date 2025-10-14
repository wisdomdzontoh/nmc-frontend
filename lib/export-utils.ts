/**
 * Export utilities for generating Excel and PDF reports
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface ExportData {
  reportType: string
  orgUnit: string
  period: string
  values: Record<string, number | string | null>
  layout?: unknown
  computedValues?: Record<string, number | string | null>
}

/**
 * Export data to Excel format
 */
export async function exportToExcel(data: ExportData): Promise<void> {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()
    
    // Create worksheet data
    const worksheetData: (string | number)[][] = []
    
    // Add header information
    worksheetData.push(['Report Type:', data.reportType])
    worksheetData.push(['Organization Unit:', data.orgUnit])
    worksheetData.push(['Reporting Period:', data.period])
    worksheetData.push(['Generated:', new Date().toLocaleString()])
    worksheetData.push([]) // Empty row
    
    // Add data section
    worksheetData.push(['Data Elements', 'Values', 'Remarks'])
    
    // Add data rows
    Object.entries(data.values).forEach(([key, value]) => {
      if (key.startsWith('remark.')) {
        // Skip remark keys as they'll be handled with their main values
        return
      }
      
      const remarkKey = `remark.${key}`
      const remark = data.values[remarkKey] || ''
      
      worksheetData.push([
        key,
        typeof value === 'number' ? value : (value || ''),
        remark
      ])
    })
    
    // Add computed values if available
    if (data.computedValues && Object.keys(data.computedValues).length > 0) {
      worksheetData.push([]) // Empty row
      worksheetData.push(['Computed Values', 'Results'])
      
      Object.entries(data.computedValues).forEach(([key, value]) => {
        worksheetData.push([
          key,
          typeof value === 'number' ? value : (value || '')
        ])
      })
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    
    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Data Elements column
      { wch: 15 }, // Values column
      { wch: 30 }  // Remarks column
    ]
    worksheet['!cols'] = columnWidths
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data')
    
    // Generate filename
    const filename = `${data.reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${data.orgUnit.replace(/[^a-zA-Z0-9]/g, '_')}_${data.period.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
    
    // Save file
    XLSX.writeFile(workbook, filename)
    
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    throw new Error('Failed to export to Excel')
  }
}

/**
 * Export data to PDF format
 */
export async function exportToPDF(data: ExportData): Promise<void> {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    // Add header information
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Report Export', 20, 20)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Report Type: ${data.reportType}`, 20, 35)
    pdf.text(`Organization Unit: ${data.orgUnit}`, 20, 45)
    pdf.text(`Reporting Period: ${data.period}`, 20, 55)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 65)
    
    // Add line separator
    pdf.line(20, 75, 190, 75)
    
    let yPosition = 85
    
    // Add data section
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Data Elements', 20, yPosition)
    yPosition += 10
    
    // Add data table
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    // Table headers
    pdf.setFont('helvetica', 'bold')
    pdf.text('Element', 20, yPosition)
    pdf.text('Value', 100, yPosition)
    pdf.text('Remarks', 140, yPosition)
    yPosition += 5
    
    // Add line under headers
    pdf.line(20, yPosition, 190, yPosition)
    yPosition += 8
    
    // Add data rows
    pdf.setFont('helvetica', 'normal')
    Object.entries(data.values).forEach(([key, value]) => {
      if (key.startsWith('remark.')) {
        return // Skip remark keys
      }
      
      const remarkKey = `remark.${key}`
      const remark = data.values[remarkKey] || ''
      
      // Check if we need a new page
      if (yPosition > 270) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.text(key, 20, yPosition)
      pdf.text(String(value || ''), 100, yPosition)
      pdf.text(String(remark), 140, yPosition)
      yPosition += 6
    })
    
    // Add computed values if available
    if (data.computedValues && Object.keys(data.computedValues).length > 0) {
      yPosition += 10
      
      if (yPosition > 270) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Computed Values', 20, yPosition)
      yPosition += 10
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      
      Object.entries(data.computedValues).forEach(([key, value]) => {
        if (yPosition > 270) {
          pdf.addPage()
          yPosition = 20
        }
        
        pdf.text(key, 20, yPosition)
        pdf.text(String(value || ''), 100, yPosition)
        yPosition += 6
      })
    }
    
    // Generate filename
    const filename = `${data.reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${data.orgUnit.replace(/[^a-zA-Z0-9]/g, '_')}_${data.period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    
    // Save file
    pdf.save(filename)
    
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export to PDF')
  }
}

/**
 * Export form layout as PDF (captures the visual layout)
 */
export async function exportLayoutAsPDF(elementId: string, filename: string): Promise<void> {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Element not found for PDF export')
    }
    
    // Create a temporary container to avoid CSS parsing issues
    const tempContainer = document.createElement('div')
    tempContainer.style.position = 'absolute'
    tempContainer.style.left = '-9999px'
    tempContainer.style.top = '0'
    tempContainer.style.width = element.offsetWidth + 'px'
    tempContainer.style.backgroundColor = '#ffffff'
    tempContainer.style.padding = '20px'
    tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    
    // Clone the element and simplify its styles
    const clonedElement = element.cloneNode(true) as HTMLElement
    simplifyElementStyles(clonedElement)
    
    tempContainer.appendChild(clonedElement)
    document.body.appendChild(tempContainer)
    
    try {
      // Capture the simplified element as canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          // Ignore elements that might cause parsing issues
          return element.classList.contains('ignore-export') || 
                 element.tagName === 'SCRIPT' || 
                 element.tagName === 'STYLE'
        },
        onclone: (clonedDoc) => {
          // Further simplify styles in the cloned document
          const clonedElement = clonedDoc.getElementById(elementId)
          if (clonedElement) {
            simplifyElementStyles(clonedElement)
          }
        }
      })
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 190 // Leave some margin
      const pageHeight = 280 // Leave some margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      // Add image to PDF
      pdf.addImage(canvas, 'PNG', 10, 10, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        pdf.addPage()
        pdf.addImage(canvas, 'PNG', 10, 10, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // Save file
      pdf.save(filename)
      
    } finally {
      // Clean up temporary container
      document.body.removeChild(tempContainer)
    }
    
  } catch (error) {
    console.error('Error exporting layout as PDF:', error)
    throw new Error('Failed to export layout as PDF')
  }
}

/**
 * Simplify element styles to avoid CSS parsing issues
 */
function simplifyElementStyles(element: HTMLElement): void {
  // Remove problematic CSS properties and replace with safe alternatives
  const style = element.style
  
  // Remove modern CSS functions that might cause issues
  if (style.color && (style.color.includes('lab(') || style.color.includes('lch(') || style.color.includes('oklch('))) {
    style.color = '#000000'
  }
  
  if (style.backgroundColor && (style.backgroundColor.includes('lab(') || style.backgroundColor.includes('lch(') || style.backgroundColor.includes('oklch('))) {
    style.backgroundColor = '#ffffff'
  }
  
  if (style.borderColor && (style.borderColor.includes('lab(') || style.borderColor.includes('lch(') || style.borderColor.includes('oklch('))) {
    style.borderColor = '#e5e7eb'
  }
  
  // Simplify other potentially problematic properties
  if (style.boxShadow && style.boxShadow !== 'none') {
    style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
  }
  
  if (style.filter && style.filter !== 'none') {
    style.filter = 'none'
  }
  
  if (style.backdropFilter && style.backdropFilter !== 'none') {
    style.backdropFilter = 'none'
  }
  
  // Ensure text is readable
  if (!style.color || style.color === 'inherit') {
    style.color = '#000000'
  }
  
  // Ensure background is visible
  if (!style.backgroundColor || style.backgroundColor === 'transparent') {
    style.backgroundColor = '#ffffff'
  }
  
  // Recursively apply to child elements
  const children = element.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement
    if (child.style) {
      simplifyElementStyles(child)
    }
  }
}

/**
 * Get export filename based on report data
 */
export function getExportFilename(reportType: string, orgUnit: string, period: string, format: 'xlsx' | 'pdf'): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = new Date().toISOString().split('T')[0]
  return `${sanitize(reportType)}_${sanitize(orgUnit)}_${sanitize(period)}_${timestamp}.${format}`
}
