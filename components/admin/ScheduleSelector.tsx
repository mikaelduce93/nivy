'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react'

export interface Schedule {
  date: string // Format: YYYY-MM-DD
  start_time: string
  end_time: string
}

interface ScheduleSelectorProps {
  schedules: Schedule[]
  onChange: (schedules: Schedule[]) => void
}

// Fonction pour formater une date en français
function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr)
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const dayName = dayNames[date.getDay()]
  const day = date.getDate()
  const monthName = monthNames[date.getMonth()]
  const year = date.getFullYear()

  return `${dayName} ${day} ${monthName} ${year}`
}

export default function ScheduleSelector({ schedules, onChange }: ScheduleSelectorProps) {
  const addSchedule = () => {
    // Date par défaut : demain
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    onChange([
      ...schedules,
      {
        date: tomorrowStr,
        start_time: '14:00',
        end_time: '16:00',
      },
    ])
  }

  const removeSchedule = (index: number) => {
    onChange(schedules.filter((_, i) => i !== index))
  }

  const updateSchedule = (index: number, field: keyof Schedule, value: string) => {
    const updated = [...schedules]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  // Trier les horaires par date
  const sortedSchedules = [...schedules].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="space-y-4">
      {schedules.length === 0 && (
        <div className="text-center py-8 bg-background rounded-lg border border-ink border-dashed">
          <CalendarIcon className="w-12 h-12 text-mute mx-auto mb-3" />
          <p className="text-mute mb-4">Aucune séance planifiée</p>
          <Button
            type="button"
            onClick={addSchedule}
            variant="outline"
            className="bg-transparent border-ink text-ink-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une séance
          </Button>
        </div>
      )}

      {sortedSchedules.map((schedule, index) => {
        // Trouver l'index original pour la modification
        const originalIndex = schedules.findIndex(s =>
          s.date === schedule.date &&
          s.start_time === schedule.start_time &&
          s.end_time === schedule.end_time
        )

        return (
          <Card key={index} className="bg-background border-ink">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-ink-2">
                      Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={schedule.date}
                      onChange={(e) => updateSchedule(originalIndex, 'date', e.target.value)}
                      className="bg-card border-ink text-ink"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-ink-2">
                      Heure de début <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => updateSchedule(originalIndex, 'start_time', e.target.value)}
                      className="bg-card border-ink text-ink"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-ink-2">
                      Heure de fin <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="time"
                      value={schedule.end_time}
                      onChange={(e) => updateSchedule(originalIndex, 'end_time', e.target.value)}
                      className="bg-card border-ink text-ink"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => removeSchedule(originalIndex)}
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-8"
                  aria-label="Supprimer ce créneau"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Afficher un résumé de la séance */}
              <div className="mt-3 pt-3 border-t border-ink">
                <p className="text-sm text-mute">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {formatDateFr(schedule.date)} de {schedule.start_time} à {schedule.end_time}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {schedules.length > 0 && (
        <Button
          type="button"
          onClick={addSchedule}
          variant="outline"
          className="w-full bg-transparent border-ink text-ink-2 border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une autre séance
        </Button>
      )}

      {/* Résumé complet */}
      {schedules.length > 0 && (
        <div className="bg-teal/10 border border-teal/30 rounded-lg p-4">
          <p className="text-sm font-semibold text-teal mb-2">
            Résumé : {schedules.length} séance{schedules.length > 1 ? 's' : ''} planifiée{schedules.length > 1 ? 's' : ''}
          </p>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {sortedSchedules.map((schedule, index) => (
              <li key={index} className="text-sm text-teal/80">
                • {formatDateFr(schedule.date)} : {schedule.start_time} - {schedule.end_time}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
