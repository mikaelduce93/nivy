'use client'

import Image from 'next/image'
import { Plus, Zap } from 'lucide-react'

interface TeenSponsorHeaderProps {
  teens: any[]
}

export function TeenSponsorHeader({ teens }: TeenSponsorHeaderProps) {
  return (
    <div className="flex items-center gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Add new teen */}
      <button type="button" className="flex shrink-0 flex-col items-center gap-2">
        <span className="grid size-20 place-items-center rounded-full border-2 border-dashed border-ink transition-colors hover:border-pink">
          <Plus className="size-8 text-mute" aria-hidden="true" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mute">Ajouter</span>
      </button>

      {/* Teen avatars */}
      {teens.map((teen) => (
        <button key={teen.teen_id} type="button" className="group flex shrink-0 flex-col items-center gap-2">
          <div className="relative">
            <span className="block size-20 rounded-full border-2 border-ink p-1 transition-transform group-hover:-translate-y-0.5 motion-reduce:translate-y-0">
              <span className="relative block size-full overflow-hidden rounded-full bg-paper-2">
                <Image
                  src={teen.avatar_url || '/placeholder-user.jpg'}
                  alt={teen.full_name}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </span>
            </span>
            <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-paper bg-teal">
              <Zap className="size-3 fill-current text-ink" aria-hidden="true" />
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-xs font-bold text-ink">{teen.full_name?.split(" ")[0]}</span>
            <span className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-teal">Niv {teen.level || 1}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
