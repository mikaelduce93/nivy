-- #209 — seed de défis physiques (sport) pour étoffer le pilier Jouer › Corps.
-- Idempotent : insertion uniquement si le `code` n'existe pas déjà.
-- Contraintes live : challenge_type ∈ {daily,weekly,monthly,special},
-- objective_type ∈ {count,duration,distance,weight}.
-- Appliquée au projet live `imchornjvmgmaovhypco` (migration 120_seed_physical_challenges).
insert into public.physical_challenges (code, name, description, challenge_type, sport_category, objective_type, objective_value, objective_unit, xp_reward, icon, difficulty, is_active)
select * from (values
  ('pushups_daily_30', '30 pompes', 'Enchaîne 30 pompes aujourd''hui. À ton rythme, pas de chrono.', 'daily', 'fitness', 'count', 30, 'pompes', 50, 'dumbbell', 'normal', true),
  ('plank_daily_2min', 'Gainage 2 min', 'Tiens la planche 2 minutes (en plusieurs fois si besoin).', 'daily', 'fitness', 'duration', 120, 's', 40, 'timer', 'normal', true),
  ('steps_daily_8000', '8000 pas', 'Bouge et atteins 8000 pas dans la journée.', 'daily', 'general', 'count', 8000, 'pas', 60, 'footprints', 'easy', true),
  ('run_weekly_5k', 'Course 5 km', 'Cours 5 km cette semaine, en une ou plusieurs sorties.', 'weekly', 'running', 'distance', 5000, 'm', 200, 'footprints', 'hard', true)
) as v(code, name, description, challenge_type, sport_category, objective_type, objective_value, objective_unit, xp_reward, icon, difficulty, is_active)
where not exists (
  select 1 from public.physical_challenges pc where pc.code = v.code
);
