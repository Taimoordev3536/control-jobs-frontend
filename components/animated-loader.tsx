import { RefreshCw } from "lucide-react"

interface AnimatedLoaderProps {
  size?: number
  className?: string
}

export function AnimatedLoader({ size = 32, className = "" }: AnimatedLoaderProps) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <RefreshCw 
        className="animate-spin text-[#6B21A8]" 
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  )
}
