import { Shield, Users, Calendar, Award } from 'lucide-react'

export function TrustBanner() {
  return (
    <div className="bg-gradient-to-r from-lime/50 via-teal/50 to-teal/50 border-y border-lime/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-lime" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">100% Sans Alcool</p>
              <p className="text-xs text-mute">Contrôles stricts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-teal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Encadrement Pro</p>
              <p className="text-xs text-mute">1 adulte / 10 ados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-teal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">11-17 ans uniquement</p>
              <p className="text-xs text-mute">Contrôle d'âge</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink/10 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-pink" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">+10,000 Parents</p>
              <p className="text-xs text-mute">Nous font confiance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
