import { cn } from "@/lib/utils"

type ProgressRingProps = {
  label: string
  current: number
  target: number
  className?: string
  size?: number
  strokeClassName?: string
}

export function ProgressRing({
  label,
  current,
  target,
  className,
  size = 92,
  strokeClassName = "stroke-emerald-400",
}: ProgressRingProps) {
  const safeTarget = target > 0 ? target : 1
  const percentage = Math.min(100, Math.round((current / safeTarget) * 100))
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={strokeClassName}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{percentage}%</span>
          <span className="text-[10px] text-zinc-500">
            {current}/{target}
          </span>
        </div>
      </div>
      <span className="text-xs text-zinc-400 text-center">{label}</span>
    </div>
  )
}




