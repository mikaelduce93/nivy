import { Shield, Users, Calendar, Award } from 'lucide-react'

export function TrustBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-950/50 via-cyan-950/50 to-blue-950/50 border-y border-emerald-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">100% Sans Alcool</p>
              <p className="text-xs text-zinc-400">Contrôles stricts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Encadrement Pro</p>
              <p className="text-xs text-zinc-400">1 adulte / 10 ados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">11-17 ans uniquement</p>
              <p className="text-xs text-zinc-400">Contrôle d'âge</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">+10,000 Parents</p>
              <p className="text-xs text-zinc-400">Nous font confiance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
