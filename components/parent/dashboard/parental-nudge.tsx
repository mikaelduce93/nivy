
import { AntiAbuseSystem } from '@/lib/gamification/anti-abuse'

// Composant (mock) à intégrer dans le dashboard parent
export function ParentalNudgeWidget({ teenUsage }: { teenUsage: any }) {
  const nudge = AntiAbuseSystem.getParentalNudge(teenUsage)
  
  if (!nudge) return null
  
  return (
    <div className="bg-teal border-l-4 border-teal p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          {/* Icon info */}
        </div>
        <div className="ml-3">
          <p className="text-sm text-teal">
            Conseil Bien-être : {nudge}
          </p>
        </div>
      </div>
    </div>
  )
}



