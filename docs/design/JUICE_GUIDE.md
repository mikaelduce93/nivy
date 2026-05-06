# NIVY Juice Guide

> "Juice" = the multi-sensory feedback layer that makes the app feel **alive**.
> Sound + haptic + confetti, fired at the right moments, in the right doses.

The goal: every meaningful interaction in NIVY should feel like Snapchat / TikTok / Duolingo — every tap rewards the user, every win is celebrated. This document is the contract for **how** and **when** to use the juice system.

---

## TL;DR

```tsx
import { useJuice } from '@/lib/hooks/use-juice'

function MyComponent() {
  const { play } = useJuice()

  return (
    <button onClick={() => play('quest_complete')}>
      Done
    </button>
  )
}
```

That single call fires (where appropriate):
1. A sound effect (`/public/sounds/quest-complete.mp3`)
2. A vibration pattern (`navigator.vibrate`)
3. A confetti burst (`canvas-confetti`)

All three respect `prefers-reduced-motion` and the user mute setting.

---

## Architecture

```
useJuice (lib/hooks/use-juice.ts)
   ├── soundManager   (lib/sounds/sound-manager.ts)   → Web Audio API
   ├── useHaptic      (lib/hooks/use-haptic.ts)       → navigator.vibrate
   └── canvasConfetti (canvas-confetti package)       → DOM canvas
```

`useJuice().play(event)` resolves an event to a `(sound, haptic, confetti)` triple via the `JUICE_MAP` in `lib/hooks/use-juice.ts`. There is also a non-hook `playJuice(event)` for use inside non-React code (toast wrappers, service callbacks).

---

## Event mapping

| Event                | Sound                | Haptic     | Confetti   | When to fire                                                   |
| -------------------- | -------------------- | ---------- | ---------- | -------------------------------------------------------------- |
| `click`              | `click`              | `light`    | none       | Default button press, low-friction tap                         |
| `tap`                | `click`              | `light`    | none       | Generic tappable surface (cards, list rows)                    |
| `button_press`       | `click`              | `selection`| none       | Important CTAs that aren't celebratory                          |
| `toggle`             | `toggle`             | `selection`| none       | Switch / checkbox / segmented control                           |
| `open`               | `open`               | `light`    | none       | Modal / sheet / drawer opens                                    |
| `close`              | `close`              | `light`    | none       | Modal / sheet / drawer closes                                   |
| `pop`                | `pop`                | `light`    | none       | Dismissable bubble, like reactions                              |
| `success`            | `success`            | `success`  | none       | Toast.success, form save                                        |
| `error`              | `error`              | `error`    | none       | Toast.error, validation failure                                 |
| `warning`            | `warning`            | `warning`  | none       | Toast.warning, destructive confirmation                         |
| `xp_gain`            | `xp_gain`            | `light`    | soft       | User earned XP (fired often, kept subtle)                       |
| `level_up`           | `level_up`           | `success`  | fireworks  | Level threshold crossed (rare, big celebration)                 |
| `achievement_unlock` | `achievement`        | `heavy`    | fanfare    | Epic / legendary badge unlocked                                 |
| `streak_milestone`   | `streak`             | `medium`   | streak     | Streak hits 3, 7, 14, 30, 60, 100 days                          |
| `quest_complete`     | `quest_complete`     | `success`  | burst      | Quest / mission / challenge completed                           |
| `like`               | `pop`                | `light`    | none       | Like / favourite / heart                                        |
| `message_send`       | `message`            | `selection`| none       | Outgoing chat message                                           |
| `notification`       | `notification`       | `medium`   | none       | Incoming notification, alert                                    |

> Confetti presets:
> - **soft**: 30 particles, low velocity — XP gain
> - **burst**: 120 particles, single point — quest complete
> - **fireworks**: 3-stage burst (left + right + center) — level up
> - **fanfare**: 200 particles, gold palette — achievement unlock
> - **streak**: 60 fire-coloured particles — streak milestone

---

## Wiring matrix (current coverage)

| Surface                                    | Event(s) wired                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `components/ui/neon-button.tsx`            | per-variant default (`success` for party/prestige, `tap` for vitality, …)     |
| `components/gamification/gamification-provider.tsx` | `xp_gain`, `level_up`, `achievement_unlock`, `streak_milestone`, `quest_complete`, `warning` (streak broken) |
| `lib/utils/toast.ts`                       | `success`, `error`, `warning`, `notification` (info)                          |
| `app/teen/quests/[id]/quest-detail-client.tsx` | `quest_complete` (optimistic — fired before server response)              |

---

## Optimistic mutations

Optimistic updates pair perfectly with juice: the celebration fires the moment the user acts, before the network round-trip. Use `useOptimisticMutation` (React Query wrapper) or `useOptimisticRunner` (no-RQ variant) from `lib/hooks/use-optimistic-mutation.ts`.

The pattern in `quest-detail-client.tsx`:

```ts
const completeRunner = useOptimisticRunner(
  async () => fetch('/api/teen/quests/complete', { ... }).then(r => r.json()),
  {
    onMutate: () => {
      const ctx = { previousStatus: currentStatus, previousXpDelta: optimisticXpDelta }
      setCurrentStatus('completed')                              // optimistic
      setOptimisticXpDelta((d) => d + (quest.xp_reward || 50))   // optimistic XP
      playJuice('quest_complete')                                 // celebrate NOW
      return ctx
    },
    onError: (_e, _i, ctx) => {
      if (ctx) { setCurrentStatus(ctx.previousStatus); setOptimisticXpDelta(ctx.previousXpDelta) }
      toast.error('La quête n\'a pas pu être validée.')
    },
    onSuccess: (output) => {
      // Reconcile optimistic delta with the server's authoritative number.
      setOptimisticXpDelta((d) => d - (quest.xp_reward || 50) + output.xpEarned)
      toast.success(`+${output.xpEarned} XP gagnés !`)
    },
  },
)
```

Rule of thumb: **fire the juice in `onMutate`**, not `onSuccess`. The user clicked; we believe them.

---

## Toast wrapper

Drop-in replacement for Sonner that adds sound + haptic to success / error / warning:

```ts
// before
import { toast } from 'sonner'

// after
import { toast } from '@/lib/utils/toast'

toast.success('XP saved')   // → playJuice('success') + sonner.success
toast.error('Network error') // → playJuice('error')   + sonner.error
toast.warning('Are you sure?') // → playJuice('warning') + sonner.warning
```

The original Sonner `toast` is still re-exported as `rawToast` for advanced cases (custom JSX, persisted toasts, etc.).

---

## Adding a new JuiceEvent

1. Add the event name to the `JuiceEvent` union in `lib/hooks/use-juice.ts`.
2. Add an entry to `JUICE_MAP` mapping it to a `(sound, haptic, confetti)` triple.
3. If the event needs a new sound effect, register it in `lib/sounds/sound-manager.ts` (`SoundEffect` union + `SOUND_CONFIGS`) and drop the audio file at `/public/sounds/<name>.mp3`.
4. Document the event in the table above.

```ts
// Example: adding "share_success"
export type JuiceEvent =
  | ...existing...
  | 'share_success'

const JUICE_MAP: Record<JuiceEvent, JuiceMapping> = {
  ...
  share_success: { sound: 'pop', haptic: 'success', confetti: 'soft' },
}
```

---

## How users disable juice

Three independent gates, checked in order:

1. **`prefers-reduced-motion`** — system-level. Skips haptic + confetti entirely. Sound is also gated by sound-manager when this is set, since sound is also a stimulus.
2. **User mute setting** — `localStorage.setItem('nivy.audio', 'muted')`. Silences sound only; haptic/confetti still fire.
3. **Per-call options** — `play('level_up', { silent: true, noConfetti: true })`. Useful for tests / power-user customisation.

Settings UI for #2 should call `setNivyAudioMuted(true|false)` from `lib/hooks/use-juice.ts`.

---

## Anti-patterns

- **Don't play `click` on every hover.** Use `click`/`tap` on actual taps; pointer-enter is too noisy and burns battery on mobile.
- **Don't fire `level_up` outside an actual level transition.** Use `quest_complete` or `success` for "you finished something but didn't level up".
- **Don't fire `achievement_unlock` for common badges.** The provider already tiers it: `common` / `rare` → `quest_complete`-flavoured toast; `epic` / `legendary` → full fanfare.
- **Don't combine multiple juices in the same tick.** If two events fire back-to-back, the second one will mostly be drowned out and the haptic stacks become disorienting. Pick the most specific event.
- **Don't put juice in render.** Always fire from event handlers, `onMutate`, `useEffect` cleanup, etc. — never from a component body.

---

## Risks / known gaps

- **`/public/sounds/*.mp3` files may not exist yet.** The sound-manager catches the fetch error and silently no-ops, so the rest of the juice (haptic + confetti) still fires. To audit which files are missing, check the network tab on a real session, or scan `lib/sounds/sound-manager.ts` `SOUND_CONFIGS` against the `/public/sounds` directory.
- **Mobile Safari haptic API** is restricted — `navigator.vibrate` is a no-op on iOS. We fall back to sound + confetti there; nothing to do.
- **Confetti overlay z-index** is hardcoded to `9999`. If a future modal exceeds that, bump it inside `fireConfetti`.

---

## Files

- `lib/hooks/use-juice.ts` — the hook, the map, `playJuice` non-hook variant, `setNivyAudioMuted`
- `lib/hooks/use-optimistic-mutation.ts` — `useOptimisticMutation` (React Query) + `useOptimisticRunner` (vanilla)
- `lib/sounds/sound-manager.ts` — Web Audio API engine, sound preloading, volume controls
- `lib/hooks/use-haptic.ts` — `navigator.vibrate` wrapper, typed haptic patterns
- `lib/utils/toast.ts` — Sonner wrapper with juice
- `components/ui/neon-button.tsx` — per-variant default juice on click
- `components/gamification/gamification-provider.tsx` — central celebration wiring
- `app/teen/quests/[id]/quest-detail-client.tsx` — reference implementation of optimistic XP
