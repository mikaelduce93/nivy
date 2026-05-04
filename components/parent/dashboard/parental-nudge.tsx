
import { AntiAbuseSystem } from '@/lib/gamification/anti-abuse'

// Composant (mock) à intégrer dans le dashboard parent
export function ParentalNudgeWidget({ teenUsage }: { teenUsage: any }) {
  const nudge = AntiAbuseSystem.getParentalNudge(teenUsage)
  
  if (!nudge) return null
  
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          {/* Icon info */}
        </div>
        <div className="ml-3">
          <p className="text-sm text-blue-700">
            Conseil Bien-être : {nudge}
          </p>
        </div>
      </div>
    </div>
  )
}



