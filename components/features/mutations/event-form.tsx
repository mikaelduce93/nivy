'use client'

/**
 * TEENS PARTY MOROCCO - Event Form with Auto-Invalidation
 * ========================================================
 * 
 * Exemple de formulaire utilisant les mutations avec invalidation automatique
 */

import { useForm } from 'react-hook-form'
import { useCreateEvent, useUpdateEvent } from '@/lib/queries'
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface EventFormData {
  title: string
  description: string
  event_date: string
  event_time: string
  city: string
  venue_name: string
  price: number
}

interface EventFormProps {
  eventId?: string // Si fourni, c'est une mise à jour
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * Formulaire d'événement avec invalidation automatique
 * 
 * @example
 * ```tsx
 * <EventForm onSuccess={() => router.push('/evenements')} />
 * ```
 */
export function EventForm({ eventId, onSuccess, onCancel }: EventFormProps) {
  const isEditing = !!eventId
  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()
  
  const mutation = isEditing ? updateMutation : createMutation
  
  const { register, handleSubmit, formState: { errors } } = useForm<EventFormData>({
    defaultValues: {
      title: '',
      description: '',
      event_date: '',
      event_time: '',
      city: '',
      venue_name: '',
      price: 0,
    },
  })

  const onSubmit = async (data: EventFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ eventId, eventData: data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess?.()
    } catch (error) {
      // L'erreur est gérée par React Query
      console.error('Error saving event:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Titre */}
      <div>
        <Label htmlFor="title">Titre de l'événement</Label>
        <Input
          id="title"
          {...register('title', { required: 'Le titre est requis' })}
          disabled={mutation.isPending}
        />
        {errors.title && (
          <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register('description')}
          disabled={mutation.isPending}
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2"
        />
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="event_date">Date</Label>
        <Input
          id="event_date"
          type="date"
          {...register('event_date', { required: 'La date est requise' })}
          disabled={mutation.isPending}
        />
        {errors.event_date && (
          <p className="text-sm text-red-500 mt-1">{errors.event_date.message}</p>
        )}
      </div>

      {/* Heure */}
      <div>
        <Label htmlFor="event_time">Heure</Label>
        <Input
          id="event_time"
          type="time"
          {...register('event_time')}
          disabled={mutation.isPending}
        />
      </div>

      {/* Ville */}
      <div>
        <Label htmlFor="city">Ville</Label>
        <Input
          id="city"
          {...register('city', { required: 'La ville est requise' })}
          disabled={mutation.isPending}
        />
        {errors.city && (
          <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
        )}
      </div>

      {/* Lieu */}
      <div>
        <Label htmlFor="venue_name">Lieu</Label>
        <Input
          id="venue_name"
          {...register('venue_name')}
          disabled={mutation.isPending}
        />
      </div>

      {/* Prix */}
      <div>
        <Label htmlFor="price">Prix (DH)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true, min: 0 })}
          disabled={mutation.isPending}
        />
      </div>

      {/* Erreur */}
      {mutation.isError && (
        <QueryErrorFallback
          error={mutation.error}
          onRetry={() => mutation.reset()}
        />
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Mise à jour...' : 'Création...'}
            </>
          ) : (
            isEditing ? 'Mettre à jour' : 'Créer l\'événement'
          )}
        </Button>
        
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}

