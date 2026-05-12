"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react"
import type { AttachmentDto } from "@/lib/api/chat"

interface ImageLightboxProps {
  images: AttachmentDto[]
  initialIndex: number
  onClose: () => void
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch (err) {
    console.error("Download failed", err)
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1))
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1))
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [images.length, onClose])

  const current = images[index]
  if (!current) return null

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2 text-foreground">
        <button
          onClick={onClose}
          className="flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-sm hover:bg-accent"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
          <span>Volver</span>
        </button>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {images.length}
        </span>
        <button
          onClick={() => downloadFile(current.url, current.originalName || "image.jpg")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-accent"
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6 md:p-10">
        {index > 0 && (
          <button
            onClick={() => setIndex(index - 1)}
            className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow hover:bg-accent"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img
          src={current.url}
          alt={current.originalName || ""}
          className="max-h-[80%] max-w-[70%] select-none rounded-lg object-contain shadow-2xl"
        />
        {index < images.length - 1 && (
          <button
            onClick={() => setIndex(index + 1)}
            className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow hover:bg-accent"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}
