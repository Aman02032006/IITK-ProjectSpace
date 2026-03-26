"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  text: string
  className?: string
  lines?: number
}

export default function OverflowTooltip({
  text,
  className = "",
  lines = 1
}: Props) {

  const ref = useRef<HTMLParagraphElement>(null)
  const [overflow, setOverflow] = useState(false)

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

      {overflow && (
        <span className="absolute hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded shadow-md top-full left-0 mt-1 whitespace-nowrap z-50">
          {text}
        </span>
      )}

    </div>
  )
}