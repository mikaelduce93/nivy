import { describe, expect, it } from 'vitest'

import {
  selectChallengeTemplate,
  cryptoRandomInt,
  type SelectableTemplate,
} from '../../../features/gamification/smart-challenge-assignment'
import {
  pickDifficulty,
} from '../../../features/gamification/adaptive-difficulty'

const tplA: SelectableTemplate = {
  id: 'a',
  tags: ['football'],
  interests: ['Football'],
  difficulty: 'easy',
}
const tplB: SelectableTemplate = {
  id: 'b',
  tags: ['kpop'],
  interests: ['K-Pop'],
  difficulty: 'medium',
}
const tplC: SelectableTemplate = {
  id: 'c',
  tags: ['study'],
  interests: ['School'],
  difficulty: 'hard',
}

describe('selectChallengeTemplate', () => {
  it('exclut les templates listes dans recentTemplateIds', () => {
    const out = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const res = selectChallengeTemplate([tplA, tplB, tplC], {
        recentTemplateIds: ['a', 'b'],
      })
      expect(res.template).not.toBeNull()
      out.add(res.template!.id)
    }
    expect(out.size).toBe(1)
    expect(out.has('c')).toBe(true)
  })

  it('autorise la repetition si tous les templates sont filtres', () => {
    const res = selectChallengeTemplate([tplA, tplB], {
      recentTemplateIds: ['a', 'b'],
    })
    expect(res.template).not.toBeNull()
    expect(res.fallbackRepetition).toBe(true)
    expect(['a', 'b']).toContain(res.template!.id)
  })

  it('retourne null si la liste de templates est vide', () => {
    const res = selectChallengeTemplate<SelectableTemplate>([], {})
    expect(res.template).toBeNull()
    expect(res.personalized).toBe(false)
  })

  it('priorise les templates dont les tags/interets recoupent userInterests', () => {
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    for (let i = 0; i < 200; i++) {
      const res = selectChallengeTemplate([tplA, tplB, tplC], {
        userInterests: ['Football'],
        topK: 1,
      })
      expect(res.template).not.toBeNull()
      counts[res.template!.id]++
    }
    expect(counts.a).toBe(200)
    expect(counts.b).toBe(0)
    expect(counts.c).toBe(0)
  })

  it('marque personalized=false si aucun userInterest ne matche', () => {
    const res = selectChallengeTemplate([tplA, tplB, tplC], {
      userInterests: ['Cuisine'],
    })
    expect(res.template).not.toBeNull()
    expect(res.personalized).toBe(false)
  })

  it('respecte targetDifficulty quand au moins un template correspond', () => {
    const res = selectChallengeTemplate([tplA, tplB, tplC], {
      targetDifficulty: 'hard',
    })
    expect(res.template?.id).toBe('c')
    expect(res.fallbackDifficulty).toBe(false)
  })
})

describe('cryptoRandomInt', () => {
  it('retourne une valeur dans [0, max)', () => {
    for (let i = 0; i < 50; i++) {
      const v = cryptoRandomInt(7)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
    }
  })

  it('rejette les max invalides', () => {
    expect(() => cryptoRandomInt(0)).toThrow()
    expect(() => cryptoRandomInt(-1)).toThrow()
    expect(() => cryptoRandomInt(1.5)).toThrow()
  })
})

describe('pickDifficulty', () => {
  it('retourne hard quand completionRate > 0.8', () => {
    const d = pickDifficulty({ total: 10, completed: 9 })
    expect(d.difficulty).toBe('hard')
    expect(d.xpMultiplier).toBe(1.5)
    expect(d.fallback).toBe(false)
  })

  it('retourne medium quand completionRate est dans [0.4, 0.8]', () => {
    const d = pickDifficulty({ total: 10, completed: 6 })
    expect(d.difficulty).toBe('medium')
    expect(d.xpMultiplier).toBe(1)
  })

  it('retourne easy quand completionRate < 0.4', () => {
    const d = pickDifficulty({ total: 10, completed: 2 })
    expect(d.difficulty).toBe('easy')
    expect(d.xpMultiplier).toBe(0.8)
  })

  it('retourne medium en mode fallback si total = 0', () => {
    const d = pickDifficulty({ total: 0, completed: 0 })
    expect(d.difficulty).toBe('medium')
    expect(d.fallback).toBe(true)
  })
})
