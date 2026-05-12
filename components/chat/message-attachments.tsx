"use client"

import { Download, FileText } from "lucide-react"
import type { AttachmentDto } from "@/lib/api/chat"

interface MessageAttachmentsProps {
  attachments: AttachmentDto[]
  isMine: boolean
  onOpenLightbox: (images: AttachmentDto[], index: number) => void
}

function humanSize(bytes: number | null): string {
  if (!bytes) return ""
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

async function downloadAttachment(url: string, filename: string) {
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
    console.error("Download failed, opening in new tab", err)
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

export function MessageAttachments({ attachments, isMine, onOpenLightbox }: MessageAttachmentsProps) {
  const images = attachments.filter((a) => a.kind === "IMAGE")
  const pdfs = attachments.filter((a) => a.kind === "PDF")

  return (
    <div className="space-y-1">
      {images.length > 0 && (
        <ImageGrid images={images} onOpen={(i) => onOpenLightbox(images, i)} />
      )}
      {pdfs.map((pdf) => (
        <button
          key={pdf.publicId}
          onClick={() => downloadAttachment(pdf.url, pdf.originalName || "documento.pdf")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
            isMine ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"
          }`}
        >
          <FileText className={`h-7 w-7 flex-shrink-0 ${isMine ? "text-white/80" : "text-[#662D91]"}`} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{pdf.originalName || "documento.pdf"}</div>
            <div className={`text-[10px] ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
              PDF{pdf.sizeBytes ? ` · ${humanSize(pdf.sizeBytes)}` : ""}
            </div>
          </div>
          <Download className={`h-3.5 w-3.5 flex-shrink-0 ${isMine ? "text-white/80" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  )
}

interface ImageGridProps {
  images: AttachmentDto[]
  onOpen: (i: number) => void
}

function ImageGrid({ images, onOpen }: ImageGridProps) {
  if (images.length === 1) {
    const a = images[0]
    return (
      <button onClick={() => onOpen(0)} className="block overflow-hidden rounded-lg">
        <img src={a.url} alt="" className="max-h-72 w-full object-cover" loading="lazy" />
      </button>
    )
  }
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
        {images.map((a, i) => (
          <button key={a.publicId} onClick={() => onOpen(i)} className="block">
            <img src={a.url} alt="" className="h-36 w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    )
  }
  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
        <button onClick={() => onOpen(0)} className="row-span-2 block">
          <img src={images[0].url} alt="" className="h-[150px] w-full object-cover" loading="lazy" />
        </button>
        <button onClick={() => onOpen(1)} className="block">
          <img src={images[1].url} alt="" className="h-[74px] w-full object-cover" loading="lazy" />
        </button>
        <button onClick={() => onOpen(2)} className="block">
          <img src={images[2].url} alt="" className="h-[74px] w-full object-cover" loading="lazy" />
        </button>
      </div>
    )
  }
  const showMore = images.length > 4
  const display = images.slice(0, 4)
  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
      {display.map((a, i) => (
        <button key={a.publicId} onClick={() => onOpen(i)} className="relative block">
          <img src={a.url} alt="" className="h-32 w-full object-cover" loading="lazy" />
          {showMore && i === 3 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
              +{images.length - 4}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
