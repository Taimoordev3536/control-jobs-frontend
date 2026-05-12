"use client"

import {
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import ReactCrop, { Crop, PercentCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import {
  ArrowLeft,
  Check,
  PenLine,
  RotateCw,
  Square,
  Trash2,
  Type as TypeIcon,
  Undo2,
  Redo2,
} from "lucide-react"

interface PhotoEditorProps {
  files: File[]
  onCancel: () => void
  onDone: (edited: File[]) => void
}

interface Stroke {
  color: string
  size: number
  points: { x: number; y: number }[]
}

interface TextLabel {
  id: string
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

interface EditState {
  imageSrc: string
  rotation: number
  crop: Crop | null
  aspect: number | undefined
  strokes: Stroke[]
  redoStack: Stroke[]
  texts: TextLabel[]
}

const COLORS = ["#FFFFFF", "#000000", "#E53935", "#FBC02D"]
const SIZES = [3, 6, 12]
const TEXT_SIZES = [22, 32, 48]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function rotateImageSrc(src: string, deg: number): Promise<string> {
  if (deg % 360 === 0) return src
  const img = await loadImage(src)
  const rad = (deg * Math.PI) / 180
  const w = Math.abs(img.naturalWidth * Math.cos(rad)) + Math.abs(img.naturalHeight * Math.sin(rad))
  const h = Math.abs(img.naturalWidth * Math.sin(rad)) + Math.abs(img.naturalHeight * Math.cos(rad))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(w)
  canvas.height = Math.round(h)
  const ctx = canvas.getContext("2d")!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return canvas.toDataURL("image/png")
}

async function flattenEdit(state: EditState, originalName: string): Promise<File> {
  const rotatedSrc = await rotateImageSrc(state.imageSrc, state.rotation)
  const img = await loadImage(rotatedSrc)

  const crop = state.crop
  let sx = 0
  let sy = 0
  let sw = img.naturalWidth
  let sh = img.naturalHeight
  if (crop && crop.width > 0 && crop.height > 0) {
    if (crop.unit === "%") {
      sx = (crop.x / 100) * img.naturalWidth
      sy = (crop.y / 100) * img.naturalHeight
      sw = (crop.width / 100) * img.naturalWidth
      sh = (crop.height / 100) * img.naturalHeight
    } else {
      sx = crop.x
      sy = crop.y
      sw = crop.width
      sh = crop.height
    }
  }

  const out = document.createElement("canvas")
  out.width = Math.max(1, Math.round(sw))
  out.height = Math.max(1, Math.round(sh))
  const ctx = out.getContext("2d")!
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height)

  for (const stroke of state.strokes || []) {
    if (!stroke.points || stroke.points.length < 2) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = (stroke.size * out.width) / 800
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    stroke.points.forEach((p, i) => {
      const x = p.x * out.width
      const y = p.y * out.height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  for (const label of state.texts || []) {
    if (!label.text) continue
    const fontPx = (label.fontSize * out.width) / 800
    ctx.font = `bold ${fontPx}px sans-serif`
    ctx.fillStyle = label.color
    ctx.textBaseline = "top"
    ctx.shadowColor = "rgba(0,0,0,0.6)"
    ctx.shadowBlur = Math.max(2, fontPx / 4)
    ctx.fillText(label.text, label.x * out.width, label.y * out.height)
    ctx.shadowBlur = 0
  }

  const blob: Blob = await new Promise((resolve) =>
    out.toBlob((b) => resolve(b!), "image/jpeg", 0.86),
  )
  const base = originalName.replace(/\.[^.]+$/, "")
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" })
}

type Tool = "crop" | "draw" | "text"

export function PhotoEditor({ files, onCancel, onDone }: PhotoEditorProps) {
  const [states, setStates] = useState<EditState[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [tool, setTool] = useState<Tool>("crop")
  const [color, setColor] = useState(COLORS[2])
  const [brushSize, setBrushSize] = useState(SIZES[1])
  const [textFontSize, setTextFontSize] = useState(TEXT_SIZES[1])
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [displaySrc, setDisplaySrc] = useState<string>("")
  const drawingRef = useRef<{ stroke: Stroke | null; rect: DOMRect | null }>({ stroke: null, rect: null })
  const draggingRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
    rect: DOMRect
    startClientX: number
    startClientY: number
    moved: boolean
  } | null>(null)
  const drawAreaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(files.map(fileToDataUrl)).then((urls) => {
      if (cancelled) return
      setStates(
        urls.map((src) => ({
          imageSrc: src,
          rotation: 0,
          crop: null,
          aspect: undefined,
          strokes: [],
          redoStack: [],
          texts: [],
        })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [files])

  const active = states[activeIndex]

  useEffect(() => {
    if (!active) {
      setDisplaySrc("")
      return
    }
    let cancelled = false
    if (active.rotation === 0) {
      setDisplaySrc(active.imageSrc)
      return
    }
    rotateImageSrc(active.imageSrc, active.rotation).then((url) => {
      if (!cancelled) setDisplaySrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [active])

  const updateActive = useCallback(
    (patch: Partial<EditState>) => {
      setStates((prev) => {
        const next = [...prev]
        next[activeIndex] = { ...next[activeIndex], ...patch }
        return next
      })
    },
    [activeIndex],
  )

  const updateTexts = useCallback(
    (mutator: (prev: TextLabel[]) => TextLabel[]) => {
      setStates((prev) => {
        const next = [...prev]
        const s = next[activeIndex]
        next[activeIndex] = { ...s, texts: mutator(s.texts || []) }
        return next
      })
    },
    [activeIndex],
  )

  const handleAddText = (e: PointerEvent<HTMLDivElement>) => {
    if (tool !== "text") return
    const target = e.target as HTMLElement
    if (target.closest("[data-text-label='true']") || target.closest("input")) return
    if (!drawAreaRef.current) return
    const rect = drawAreaRef.current.getBoundingClientRect()
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    updateTexts((prev) => [
      ...prev,
      {
        id,
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        text: "",
        color,
        fontSize: textFontSize,
      },
    ])
    setEditingTextId(id)
  }

  const handleTextDragStart = (e: PointerEvent<HTMLDivElement>, label: TextLabel) => {
    if (editingTextId === label.id) return
    e.stopPropagation()
    if (!drawAreaRef.current) return
    const rect = drawAreaRef.current.getBoundingClientRect()
    draggingRef.current = {
      id: label.id,
      offsetX: e.clientX - (rect.left + label.x * rect.width),
      offsetY: e.clientY - (rect.top + label.y * rect.height),
      rect,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const handleTextDragMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current
    if (!drag) return
    e.stopPropagation()
    const dx = e.clientX - drag.startClientX
    const dy = e.clientY - drag.startClientY
    if (!drag.moved && dx * dx + dy * dy < 25) return
    drag.moved = true
    const x = Math.min(0.98, Math.max(0, (e.clientX - drag.offsetX - drag.rect.left) / drag.rect.width))
    const y = Math.min(0.98, Math.max(0, (e.clientY - drag.offsetY - drag.rect.top) / drag.rect.height))
    updateTexts((prev) => prev.map((t) => (t.id === drag.id ? { ...t, x, y } : t)))
  }

  const handleTextDragEnd = () => {
    const drag = draggingRef.current
    if (drag && !drag.moved) setEditingTextId(drag.id)
    draggingRef.current = null
  }

  const handleTextChange = (id: string, text: string) => {
    updateTexts((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
  }

  const handleTextBlur = (id: string) => {
    updateTexts((prev) => {
      const target = prev.find((t) => t.id === id)
      if (!target || target.text.trim() === "") return prev.filter((t) => t.id !== id)
      return prev
    })
    setEditingTextId(null)
  }

  const handleTextDelete = (id: string) => {
    updateTexts((prev) => prev.filter((t) => t.id !== id))
    if (editingTextId === id) setEditingTextId(null)
  }

  const handleRotate = () => {
    if (!active) return
    updateActive({ rotation: (active.rotation + 90) % 360, crop: null })
  }

  const handleAspect = (a: number | undefined) => {
    updateActive({ aspect: a, crop: null })
  }

  const handleUndo = () => {
    if (!active || active.strokes.length === 0) return
    const last = active.strokes[active.strokes.length - 1]
    updateActive({ strokes: active.strokes.slice(0, -1), redoStack: [...active.redoStack, last] })
  }

  const handleRedo = () => {
    if (!active || active.redoStack.length === 0) return
    const last = active.redoStack[active.redoStack.length - 1]
    updateActive({ strokes: [...active.strokes, last], redoStack: active.redoStack.slice(0, -1) })
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (tool !== "draw" || !active || !drawAreaRef.current) return
    const rect = drawAreaRef.current.getBoundingClientRect()
    drawingRef.current.rect = rect
    drawingRef.current.stroke = {
      color,
      size: brushSize,
      points: [{ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }],
    }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const stroke = drawingRef.current.stroke
    const rect = drawingRef.current.rect
    if (!stroke || !rect) return
    stroke.points.push({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
    const snapshot: Stroke = { color: stroke.color, size: stroke.size, points: [...stroke.points] }
    setStates((prev) => {
      const next = [...prev]
      const s = next[activeIndex]
      next[activeIndex] = { ...s, strokes: [...s.strokes.slice(0, -1), snapshot] }
      return next
    })
  }

  const handlePointerUp = () => {
    drawingRef.current.stroke = null
    drawingRef.current.rect = null
  }

  const startStroke = (e: PointerEvent<HTMLDivElement>) => {
    if (tool !== "draw") return
    setStates((prev) => {
      const next = [...prev]
      const s = next[activeIndex]
      next[activeIndex] = {
        ...s,
        strokes: [...s.strokes, { color, size: brushSize, points: [] }],
        redoStack: [],
      }
      return next
    })
    handlePointerDown(e)
  }

  const overlayPath = useMemo(() => {
    if (!active || !active.strokes) return []
    return active.strokes.map((stroke) => ({
      stroke,
      d: (stroke.points || [])
        .map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`)
        .join(" "),
    }))
  }, [active])

  const handleNext = async () => {
    if (activeIndex < states.length - 1) {
      setActiveIndex((i) => i + 1)
      setTool("crop")
      return
    }
    setWorking(true)
    try {
      const out: File[] = []
      for (let i = 0; i < states.length; i++) {
        out.push(await flattenEdit(states[i], files[i].name))
      }
      onDone(out)
    } finally {
      setWorking(false)
    }
  }

  if (!active || !displaySrc) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background text-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <button
          onClick={onCancel}
          className="flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-sm hover:bg-accent"
          aria-label="Cancel"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
        <span className="text-xs text-muted-foreground">
          {activeIndex + 1} / {states.length}
        </span>
        <button
          onClick={handleNext}
          disabled={working}
          className="flex h-9 items-center gap-1 rounded-full bg-[#662D91] px-4 text-sm font-medium text-white hover:bg-[#7a3aaa] disabled:opacity-60"
        >
          {activeIndex < states.length - 1 ? "Next" : "Done"}
          <Check className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={drawAreaRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
        onPointerDown={(e) => {
          if (tool === "draw") startStroke(e)
          if (tool === "text") handleAddText(e)
        }}
        onPointerMove={(e) => {
          if (tool === "draw") handlePointerMove(e)
          if (draggingRef.current) handleTextDragMove(e)
        }}
        onPointerUp={() => {
          if (tool === "draw") handlePointerUp()
          if (draggingRef.current) handleTextDragEnd()
        }}
        onPointerCancel={() => {
          if (tool === "draw") handlePointerUp()
          if (draggingRef.current) handleTextDragEnd()
        }}
        style={{ touchAction: tool === "draw" || tool === "text" ? "none" : "auto" }}
      >
        {tool === "crop" ? (
          <ReactCrop
            crop={active.crop || undefined}
            onChange={(_pixel, percent) => updateActive({ crop: percent })}
            aspect={active.aspect}
            keepSelection
            ruleOfThirds
          >
            <img
              src={displaySrc}
              alt=""
              style={{
                maxHeight: "calc(100dvh - 240px)",
                maxWidth: "100%",
                display: "block",
                objectFit: "contain",
              }}
            />
          </ReactCrop>
        ) : (
          <div className="relative inline-block max-w-full">
            <img
              src={displaySrc}
              alt=""
              className="block select-none"
              style={{
                maxHeight: "calc(100dvh - 240px)",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {overlayPath.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill="none"
                  stroke={p.stroke.color}
                  strokeWidth={p.stroke.size / 10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
            {(active.texts || []).map((label) => {
              const isEditing = editingTextId === label.id
              const maxWidthPct = Math.max(20, (1 - label.x) * 100 - 1)
              const style: React.CSSProperties = {
                left: `${label.x * 100}%`,
                top: `${label.y * 100}%`,
                color: label.color,
                fontSize: `${label.fontSize}px`,
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                maxWidth: `${maxWidthPct}%`,
              }
              return (
                <div
                  key={label.id}
                  data-text-label="true"
                  className="absolute select-none"
                  style={style}
                  onPointerDown={(e) => handleTextDragStart(e, label)}
                >
                  {isEditing ? (
                    <div className="flex max-w-full items-center gap-1 rounded-md bg-black/60 px-1 py-0.5 backdrop-blur-sm">
                      <input
                        autoFocus
                        value={label.text}
                        onChange={(e) => handleTextChange(label.id, e.target.value)}
                        onBlur={() => handleTextBlur(label.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            ;(e.target as HTMLInputElement).blur()
                          }
                        }}
                        style={{ color: label.color, fontSize: `${label.fontSize}px` }}
                        className="w-32 min-w-0 max-w-full bg-transparent outline-none placeholder:text-white/60"
                        placeholder="Texto"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTextDelete(label.id)
                        }}
                        className="flex-shrink-0 rounded-full bg-white/15 p-1 text-white hover:bg-white/30"
                        aria-label="delete text"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="block cursor-move break-words font-bold">
                      {label.text || " "}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-card px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setTool("crop")}
            className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs ${
              tool === "crop" ? "bg-accent text-accent-foreground" : "hover:bg-accent"
            }`}
          >
            <Square className="h-4 w-4" />
            Crop
          </button>
          <button
            onClick={handleRotate}
            className="flex h-9 items-center gap-1 rounded-full px-3 text-xs hover:bg-accent"
          >
            <RotateCw className="h-4 w-4" />
            Rotate
          </button>
          <button
            onClick={() => setTool("draw")}
            className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs ${
              tool === "draw" ? "bg-accent text-accent-foreground" : "hover:bg-accent"
            }`}
          >
            <PenLine className="h-4 w-4" />
            Pen
          </button>
          <button
            onClick={() => setTool("text")}
            className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs ${
              tool === "text" ? "bg-accent text-accent-foreground" : "hover:bg-accent"
            }`}
          >
            <TypeIcon className="h-4 w-4" />
            Text
          </button>
          <div className="mx-1 h-6 w-px bg-border" />
          <button
            onClick={handleUndo}
            disabled={active.strokes.length === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={active.redoStack.length === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        {tool === "crop" && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <button
              onClick={() => handleAspect(undefined)}
              className={`rounded-full px-3 py-1 ${active.aspect === undefined ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
            >
              Free
            </button>
            <button
              onClick={() => handleAspect(1)}
              className={`rounded-full px-3 py-1 ${active.aspect === 1 ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
            >
              Square
            </button>
            <button
              onClick={() => handleAspect(4 / 3)}
              className={`rounded-full px-3 py-1 ${active.aspect === 4 / 3 ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
            >
              4:3
            </button>
            <button
              onClick={() => handleAspect(16 / 9)}
              className={`rounded-full px-3 py-1 ${active.aspect === 16 / 9 ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
            >
              16:9
            </button>
          </div>
        )}

        {tool === "draw" && (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-border"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
            <div className="mx-1 h-6 w-px bg-border" />
            <div className="flex items-center gap-1">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrushSize(s)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    brushSize === s ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                  }`}
                  aria-label={`size ${s}`}
                >
                  <span className="block rounded-full bg-foreground" style={{ width: s, height: s }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {tool === "text" && (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-border"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
            <div className="mx-1 h-6 w-px bg-border" />
            <div className="flex items-center gap-1">
              {TEXT_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setTextFontSize(s)}
                  className={`flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-bold ${
                    textFontSize === s ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                  }`}
                  aria-label={`text size ${s}`}
                >
                  A
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
