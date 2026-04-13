"use client"

import { useEffect, useRef, useState } from "react"

// Props for overflow tooltip component
interface Props {
  text: string
  className?: string
  lines?: number
}

// Shows tooltip when text overflows container
export default function OverflowTooltip({
  text,
  className = "",
  lines = 1
}: Props) {

  // Reference to paragraph element
  const ref = useRef<HTMLParagraphElement>(null)
  // Tracks whether text is overflowing
  const [overflow, setOverflow] = useState(false)

  // Checks overflow on mount and resize
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const checkOverflow = () => {
      const isOverflowing =
        el.scrollWidth > el.clientWidth ||
        el.scrollHeight > el.clientHeight

      setOverflow(isOverflowing)
    }

    checkOverflow()
    window.addEventListener("resize", checkOverflow)

    return () => window.removeEventListener("resize", checkOverflow)

  }, [text])

  // Applies line clamp or truncate
  const clamp =
    lines === 1 ? "truncate" : `line-clamp-${lines}`

  return (
    <div className="relative group w-full">

      <p
        ref={ref}
        className={`${clamp} ${className}`}
      >
        {text}
      </p>

      {/* Tooltip shown only when text overflows */}
      {overflow && (
        <span className="absolute hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded shadow-md top-full left-0 mt-1 whitespace-nowrap z-50">
          {text}
        </span>
      )}

    </div>
  )
}