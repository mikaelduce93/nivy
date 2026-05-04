
/**
 * ANTI-ABUSE & ETHICS SYSTEM
 * ==========================
 * 
 * Gestion des limites, de la fatigue, et de l'équité.
 * "Shadow Nerf" doux pour éviter le farming excessif sans frustrer.
 */

export interface UsageMetrics {
  dailyXP: number
  dailyQuests: number
  sessionTimeMinutes: number
  rapidActionsCount: number // Actions < 10s d'intervalle
}

export const LIMITS = {
  DAILY_XP_SOFT_CAP: 2000, // Au-delà, gain réduit de 50%
  DAILY_XP_HARD_CAP: 5000, // Au-delà, gain = 0 (sauf events spéciaux)
  RAPID_ACTION_THRESHOLD: 5, // 5 actions rapides = suspicion bot/spam
}

export class AntiAbuseSystem {
  
  /**
   * Vérifie si une action doit être "nerfée" ou bloquée
   */
  static checkAction(metrics: UsageMetrics, actionXP: number): { 
    allowed: boolean
    adjustedXP: number
    warning?: string 
  } {
    // 1. Hard Cap (Sécurité absolue)
    if (metrics.dailyXP >= LIMITS.DAILY_XP_HARD_CAP) {
      return { 
        allowed: true, 
        adjustedXP: 0, 
        warning: 'daily_cap_reached' 
      }
    }
    
    // 2. Soft Cap (Shadow Nerf - Anti-addiction)
    if (metrics.dailyXP >= LIMITS.DAILY_XP_SOFT_CAP) {
      return { 
        allowed: true, 
        adjustedXP: Math.floor(actionXP * 0.5), 
        warning: 'soft_cap_active' 
      }
    }
    
    // 3. Anti-Spam (Bot protection)
    if (metrics.rapidActionsCount > LIMITS.RAPID_ACTION_THRESHOLD) {
      return { 
        allowed: false, 
        adjustedXP: 0, 
        warning: 'spam_detected' 
      }
    }
    
    return { allowed: true, adjustedXP: actionXP }
  }
  
  /**
   * Génère un nudge parental si nécessaire
   */
  static getParentalNudge(metrics: UsageMetrics): string | null {
    if (metrics.sessionTimeMinutes > 120) { // 2h
      return "Votre ado a passé plus de 2h sur l'appli aujourd'hui. Une pause serait bénéfique ?"
    }
    if (metrics.dailyQuests > 15) {
      return "Activité intense détectée ! Vérifiez que les devoirs sont faits ;)"
    }
    return null
  }
}



