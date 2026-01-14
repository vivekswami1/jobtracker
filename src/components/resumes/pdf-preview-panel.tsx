'use client'

import { useState, useRef, useEffect } from 'react'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import { Loader2 } from 'lucide-react'

import '@react-pdf-viewer/core/lib/styles/index.css'

interface PDFPreviewPanelProps {
  url: string
}

export function PDFPreviewPanel({ url }: PDFPreviewPanelProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [scale, setScale] = useState(0.8)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasCalculatedScale = useRef(false)

  // Calculate scale once on mount based on container width
  useEffect(() => {
    if (containerRef.current && !hasCalculatedScale.current) {
      const containerWidth = containerRef.current.clientWidth
      // Assume standard PDF width of ~612px (US Letter)
      // Calculate scale to fit container with some padding
      const calculatedScale = Math.min((containerWidth - 32) / 612, 1.0)
      setScale(calculatedScale > 0.5 ? calculatedScale : 0.8)
      hasCalculatedScale.current = true
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full bg-white rounded-lg shadow-sm overflow-hidden relative">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <div className="h-full w-full overflow-auto">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
          <Viewer
            fileUrl={url}
            defaultScale={scale}
            onDocumentLoad={() => setIsLoading(false)}
          />
        </div>
      </Worker>
    </div>
  )
}
