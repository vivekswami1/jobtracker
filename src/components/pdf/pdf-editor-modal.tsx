'use client'

import { useState, useRef, useCallback } from 'react'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X,
  Save,
  Type,
  Highlighter,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Loader2,
  Trash2,
  Move,
} from 'lucide-react'

import '@react-pdf-viewer/core/lib/styles/index.css'

// Annotation types
interface TextAnnotation {
  id: string
  type: 'text'
  page: number
  x: number
  y: number
  text: string
  fontSize: number
  color: string
}

interface HighlightAnnotation {
  id: string
  type: 'highlight'
  page: number
  x: number
  y: number
  width: number
  height: number
  color: string
}

type Annotation = TextAnnotation | HighlightAnnotation

interface PDFEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string | null
  filename: string
  resumeId: string
  onSave?: (annotations: Annotation[]) => Promise<void>
}

type Tool = 'select' | 'text' | 'highlight'

export function PDFEditorModal({
  open,
  onOpenChange,
  pdfUrl,
  filename,
  resumeId,
  onSave,
}: PDFEditorModalProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [scale, setScale] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Text tool state
  const [newTextValue, setNewTextValue] = useState('')
  const [textFontSize, setTextFontSize] = useState(14)
  const [textColor, setTextColor] = useState('#000000')

  // Highlight state
  const [highlightColor, setHighlightColor] = useState('#ffff00')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Save to history
  const saveToHistory = useCallback((newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newAnnotations)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  // Handle canvas click for adding annotations
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'select') {
      setSelectedAnnotation(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    if (selectedTool === 'text') {
      const newAnnotation: TextAnnotation = {
        id: `text-${Date.now()}`,
        type: 'text',
        page: currentPage,
        x,
        y,
        text: newTextValue || 'New Text',
        fontSize: textFontSize,
        color: textColor,
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
      setSelectedAnnotation(newAnnotation.id)
      setSelectedTool('select')
    }
  }, [selectedTool, scale, currentPage, newTextValue, textFontSize, textColor, annotations, saveToHistory])

  // Handle mouse down for highlight drawing
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool !== 'highlight') return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    setIsDrawing(true)
    setDrawStart({ x, y })
  }, [selectedTool, scale])

  // Handle mouse up for highlight
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || selectedTool !== 'highlight') {
      setIsDrawing(false)
      setDrawStart(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const endX = (e.clientX - rect.left) / scale
    const endY = (e.clientY - rect.top) / scale

    const width = Math.abs(endX - drawStart.x)
    const height = Math.abs(endY - drawStart.y)

    if (width > 5 && height > 5) {
      const newAnnotation: HighlightAnnotation = {
        id: `highlight-${Date.now()}`,
        type: 'highlight',
        page: currentPage,
        x: Math.min(drawStart.x, endX),
        y: Math.min(drawStart.y, endY),
        width,
        height,
        color: highlightColor,
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    }

    setIsDrawing(false)
    setDrawStart(null)
  }, [isDrawing, drawStart, selectedTool, scale, currentPage, highlightColor, annotations, saveToHistory])

  // Delete selected annotation
  const handleDeleteSelected = useCallback(() => {
    if (!selectedAnnotation) return
    const newAnnotations = annotations.filter(a => a.id !== selectedAnnotation)
    setAnnotations(newAnnotations)
    saveToHistory(newAnnotations)
    setSelectedAnnotation(null)
  }, [selectedAnnotation, annotations, saveToHistory])

  // Save annotations
  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(annotations)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save annotations')
    } finally {
      setIsSaving(false)
    }
  }

  // Update selected text annotation
  const updateSelectedText = useCallback((text: string) => {
    if (!selectedAnnotation) return
    const newAnnotations = annotations.map(a => {
      if (a.id === selectedAnnotation && a.type === 'text') {
        return { ...a, text }
      }
      return a
    })
    setAnnotations(newAnnotations)
  }, [selectedAnnotation, annotations])

  const selectedAnnotationData = annotations.find(a => a.id === selectedAnnotation)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Full Screen Container */}
      <div className="fixed inset-0 flex flex-col bg-white">
        {/* Main Toolbar */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b bg-gray-50 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate text-xs sm:text-sm max-w-[100px] sm:max-w-[200px]">
              {filename}
            </h2>
          </div>

          {/* Tools - Desktop */}
          <div className="hidden sm:flex items-center gap-1 bg-white rounded-lg border p-1">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('select')}
              title="Select"
              className="h-8 w-8 p-0"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedTool === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('text')}
              title="Add Text"
              className="h-8 w-8 p-0"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('highlight')}
              title="Highlight"
              className="h-8 w-8 p-0"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Undo"
              className="h-8 w-8 p-0"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
              className="h-8 w-8 p-0"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              title="Zoom Out"
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-600 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              title="Zoom In"
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Tools - Mobile */}
          <div className="flex sm:hidden items-center gap-0.5 bg-white rounded-lg border p-0.5">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('select')}
              className="h-7 w-7 p-0"
            >
              <Move className="h-3 w-3" />
            </Button>
            <Button
              variant={selectedTool === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('text')}
              className="h-7 w-7 p-0"
            >
              <Type className="h-3 w-3" />
            </Button>
            <Button
              variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('highlight')}
              className="h-7 w-7 p-0"
            >
              <Highlighter className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="h-7 w-7 p-0"
            >
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="h-7 w-7 p-0"
            >
              <Redo className="h-3 w-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {selectedAnnotation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                className="h-8 px-2 sm:px-3 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Delete</span>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 px-2 sm:px-3"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="hidden sm:inline ml-1">Save</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tool Options Bar */}
        {selectedTool === 'text' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b bg-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Label className="text-xs sm:text-sm whitespace-nowrap">Text:</Label>
              <Input
                value={newTextValue}
                onChange={(e) => setNewTextValue(e.target.value)}
                placeholder="Enter text..."
                className="w-24 sm:w-48 h-7 sm:h-8 text-xs sm:text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs sm:text-sm">Size:</Label>
              <Input
                type="number"
                value={textFontSize}
                onChange={(e) => setTextFontSize(Number(e.target.value))}
                className="w-14 sm:w-16 h-7 sm:h-8 text-xs sm:text-sm"
                min={8}
                max={72}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs sm:text-sm">Color:</Label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded cursor-pointer"
              />
            </div>
            <span className="text-xs text-gray-500 hidden sm:inline">Click on PDF to place</span>
          </div>
        )}

        {selectedTool === 'highlight' && (
          <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b bg-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Label className="text-xs sm:text-sm whitespace-nowrap">Color:</Label>
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded cursor-pointer"
              />
            </div>
            <span className="text-xs text-gray-500">Drag to highlight</span>
          </div>
        )}

        {/* Selected Text Edit */}
        {selectedAnnotationData?.type === 'text' && (
          <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b bg-blue-50 shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-xs sm:text-sm whitespace-nowrap">Edit:</Label>
              <Input
                value={selectedAnnotationData.text}
                onChange={(e) => updateSelectedText(e.target.value)}
                className="flex-1 max-w-xs h-7 sm:h-8 text-xs sm:text-sm"
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-gray-200" ref={containerRef}>
          {pdfUrl ? (
            <div className="relative min-h-full">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <Viewer
                    fileUrl={pdfUrl}
                    defaultScale={1}
                    onPageChange={(e) => setCurrentPage(e.currentPage)}
                  />
                </div>
              </Worker>

              {/* Annotation Overlay */}
              <div
                className="absolute inset-0 pointer-events-auto"
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                style={{
                  cursor: selectedTool === 'text' ? 'text' : selectedTool === 'highlight' ? 'crosshair' : 'default',
                }}
              >
                {/* Render Annotations */}
                {annotations
                  .filter(a => a.page === currentPage)
                  .map(annotation => (
                    <div
                      key={annotation.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAnnotation(annotation.id)
                        setSelectedTool('select')
                      }}
                      style={{
                        position: 'absolute',
                        left: annotation.x * scale,
                        top: annotation.y * scale,
                        ...(annotation.type === 'highlight' && {
                          width: annotation.width * scale,
                          height: annotation.height * scale,
                          backgroundColor: annotation.color,
                          opacity: 0.4,
                        }),
                        ...(annotation.type === 'text' && {
                          fontSize: annotation.fontSize * scale,
                          color: annotation.color,
                          whiteSpace: 'nowrap',
                        }),
                        border: selectedAnnotation === annotation.id ? '2px solid #3b82f6' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {annotation.type === 'text' && annotation.text}
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Mobile Zoom Controls */}
        <div className="sm:hidden flex items-center justify-center gap-4 px-4 py-2 border-t bg-gray-50 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            className="h-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
            className="h-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
