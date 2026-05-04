
export interface SeasonalArc {
  id: string
  name: string
  theme: string
  startDate: string
  endDate: string
  weeks: {
    weekNumber: number
    theme: string
    rituals: string[]
    specialEvent?: string
  }[]
}

export const LIVE_OPS_CALENDAR: SeasonalArc[] = [
  {
    id: 'arc_a_back_to_school',
    name: 'Back-to-School Season',
    theme: 'Progression & Discipline',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    weeks: [
      {
        weekNumber: 1,
        theme: 'Warm Up',
        rituals: ['Quiz Boost', 'Mini-Game Discovery'],
        specialEvent: 'Welcome Bonus'
      },
      {
        weekNumber: 2,
        theme: 'Physical Streak',
        rituals: ['Sport Challenge', 'Passion Day'],
        specialEvent: 'Iron Teen Weekend'
      },
      {
        weekNumber: 3,
        theme: 'Social Glue',
        rituals: ['Crew Goal', 'Buddy Quest'],
        specialEvent: 'Crew Tournament'
      },
      {
        weekNumber: 4,
        theme: 'Mastery',
        rituals: ['School Quiz League', 'Big Boss'],
        specialEvent: 'Monthly Finale'
      }
    ]
  },
  {
    id: 'arc_b_ramadan_flow',
    name: 'Ramadan Flow',
    theme: 'Endurance & Solidarity',
    startDate: '2026-03-10', // Date approx
    endDate: '2026-04-09',
    weeks: [
      { weekNumber: 1, theme: 'Discipline', rituals: ['Fasting Log', 'Culture Quiz'] },
      { weekNumber: 2, theme: 'Kindness', rituals: ['Good Deed Mission', 'Family Quest'] },
      { weekNumber: 3, theme: 'Energy Management', rituals: ['Light Sport', 'Mindfulness'] },
      { weekNumber: 4, theme: 'Celebration', rituals: ['Eid Prep', 'Gift Crafting'], specialEvent: 'Eid Party' }
    ]
  },
  {
    id: 'arc_c_summer_vibes',
    name: 'Summer Vibes',
    theme: 'Creativity & IRL',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    weeks: [
      { weekNumber: 1, theme: 'Get Out', rituals: ['IRL Check-in', 'Photo Quest'] },
      { weekNumber: 2, theme: 'Creator Mode', rituals: ['UGC Challenge', 'Passion Showcase'] },
      // ... pattern repeats
    ]
  }
]

export function getCurrentArc(): SeasonalArc | undefined {
  const now = new Date()
  return LIVE_OPS_CALENDAR.find(arc => 
    now >= new Date(arc.startDate) && now <= new Date(arc.endDate)
  )
}

export function getWeeklyRituals(date = new Date()) {
  const day = date.getDay()
  // 1=Mon, 3=Wed, 5=Fri
  if (day === 1) return { type: 'quiz_boost', bonus: 1.5 }
  if (day === 3) return { type: 'passion_day', bonus: 1.2 }
  if (day === 5) return { type: 'crew_day', bonus: 2.0 } // Social is key
  if (day === 0 || day === 6) return { type: 'event_weekend', bonus: 1.5 }
  return null
}



