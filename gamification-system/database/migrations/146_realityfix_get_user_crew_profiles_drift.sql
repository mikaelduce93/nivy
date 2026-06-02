-- 146_realityfix_get_user_crew_profiles_drift.sql
--
-- BUG (Postgres 42703): "column p.pseudo does not exist". Surfaced at runtime on
-- /teen/circles (et le crew-hub du dashboard) sous la forme
-- `Error fetching user crew: {}` pour TOUT teen possédant un crew actif.
--
-- Cause: public.get_user_crew agrège les membres via `JOIN profiles p` et lit
-- p.pseudo / p.level. La table profiles live ne contient plus que l'identité auth
-- {id,email,full_name,avatar_url,role,...} — ni pseudo ni level. Ces données ont
-- migré : pseudo -> teens.pseudo (fallback full_name), level -> user_xp.current_level.
-- Le `IF NOT FOUND` n'est franchi que si le user a un crew, d'où le crash sélectif.
-- supabase-js sérialise le PostgrestError 42703 en {} dans la console RSC Next 16.
--
-- Fix: réécrire UNIQUEMENT la sous-requête membres (LEFT JOIN teens + user_xp,
-- COALESCE pour pseudo/avatar/level), passer la fonction en SECURITY DEFINER +
-- search_path='' + noms pleinement qualifiés. Le SECURITY DEFINER est nécessaire
-- pour que le roster résolve les pseudos des AUTRES membres une fois la lecture
-- publique de `teens` verrouillée (cf. 147_realityfix_teens_pii_public_read.sql),
-- et aligne get_user_crew sur les autres RPC SECDEF du module crews.
--
-- Le reste de la fonction (lookup crew, achievements, JSON de sortie) est inchangé.
-- Idempotent: CREATE OR REPLACE FUNCTION.

CREATE OR REPLACE FUNCTION public.get_user_crew(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_member RECORD;
    v_members JSONB;
    v_achievements JSONB;
BEGIN
    -- Trouver le crew de l'utilisateur
    SELECT cm.*, c.*
    INTO v_member
    FROM public.crew_members cm
    JOIN public.crews c ON cm.crew_id = c.id
    WHERE cm.user_id = p_user_id AND cm.status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_crew', false);
    END IF;

    -- Récupérer les membres
    -- realityfix: pseudo/avatar depuis teens (fallback profiles), level depuis user_xp.
    -- LEFT JOIN partout pour ne jamais faire disparaître un membre sans ligne annexe.
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', cm.user_id,
            'pseudo', COALESCE(t.pseudo, p.full_name),
            'avatar_url', COALESCE(t.avatar_url, p.avatar_url),
            'level', COALESCE(ux.current_level, 1),
            'role', cm.role,
            'xp_contributed', cm.xp_contributed,
            'joined_at', cm.joined_at
        ) ORDER BY
            CASE cm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
            cm.xp_contributed DESC
    )
    INTO v_members
    FROM public.crew_members cm
    LEFT JOIN public.teens t    ON t.id = cm.user_id
    LEFT JOIN public.user_xp ux ON ux.teen_id = cm.user_id
    LEFT JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.crew_id = v_member.crew_id AND cm.status = 'active';

    -- Récupérer les achievements
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ca.id,
            'name', ca.name,
            'description', ca.description,
            'icon', ca.icon,
            'color', ca.color,
            'rarity', ca.rarity,
            'unlocked_at', cua.unlocked_at
        )
    )
    INTO v_achievements
    FROM public.crew_unlocked_achievements cua
    JOIN public.crew_achievements ca ON cua.achievement_id = ca.id
    WHERE cua.crew_id = v_member.crew_id;

    RETURN jsonb_build_object(
        'has_crew', true,
        'crew', jsonb_build_object(
            'id', v_member.crew_id,
            'name', v_member.name,
            'slug', v_member.slug,
            'description', v_member.description,
            'motto', v_member.motto,
            'avatar_url', v_member.avatar_url,
            'banner_url', v_member.banner_url,
            'color', v_member.color,
            'total_xp', v_member.total_xp,
            'average_level', v_member.average_level,
            'total_events_attended', v_member.total_events_attended,
            'total_challenges_won', v_member.total_challenges_won,
            'max_members', v_member.max_members,
            'is_public', v_member.is_public,
            'requires_approval', v_member.requires_approval,
            'created_at', v_member.created_at
        ),
        'user_role', v_member.role,
        'members', COALESCE(v_members, '[]'::jsonb),
        'achievements', COALESCE(v_achievements, '[]'::jsonb)
    );
END;
$function$;
