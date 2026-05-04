-- =============================================
-- MIGRATION 025: Activity Feed System
-- =============================================
-- Systeme de fil d'actualites pour amis et cercles
-- =============================================

-- Table des posts du feed
CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type de post
    post_type VARCHAR(50) NOT NULL CHECK (post_type IN (
        'status',           -- Statut texte simple
        'achievement',      -- Badge/achievement unlocked
        'level_up',         -- Montee de niveau
        'challenge_complete', -- Defi complete
        'creation',         -- Nouvelle creation partagee
        'record',           -- Nouveau record personnel
        'streak',           -- Milestone de streak
        'club_join',        -- Rejoindre un club
        'circle_create',    -- Creation de cercle
        'friendship',       -- Nouvelle amitie
        'poll',             -- Sondage
        'event',            -- Evenement
        'photo',            -- Photo partagee
        'video',            -- Video partagee
        'milestone'         -- Milestone generique
    )),

    -- Contenu
    content TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Reference optionnelle a une entite
    reference_type VARCHAR(50),
    reference_id UUID,

    -- Visibilite
    visibility VARCHAR(20) DEFAULT 'friends' CHECK (visibility IN (
        'public',    -- Visible par tous
        'friends',   -- Amis seulement
        'circle',    -- Cercle specifique
        'private'    -- Soi-meme seulement
    )),
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,

    -- Stats
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,

    -- Moderation
    is_pinned BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    reported_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour le feed
CREATE INDEX idx_feed_posts_user ON feed_posts(user_id, created_at DESC);
CREATE INDEX idx_feed_posts_type ON feed_posts(post_type);
CREATE INDEX idx_feed_posts_visibility ON feed_posts(visibility);
CREATE INDEX idx_feed_posts_circle ON feed_posts(circle_id) WHERE circle_id IS NOT NULL;
CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);

-- Table des likes sur les posts
CREATE TABLE IF NOT EXISTS feed_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type de reaction
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN (
        'like',     -- Coeur classique
        'love',     -- Super like
        'haha',     -- Drole
        'wow',      -- Impressionnant
        'sad',      -- Triste
        'fire',     -- En feu
        'clap'      -- Bravo
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX idx_feed_likes_user ON feed_likes(user_id);

-- Table des commentaires
CREATE TABLE IF NOT EXISTS feed_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    media_url TEXT,

    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,

    is_edited BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_comments_post ON feed_comments(post_id, created_at);
CREATE INDEX idx_feed_comments_user ON feed_comments(user_id);
CREATE INDEX idx_feed_comments_parent ON feed_comments(parent_id) WHERE parent_id IS NOT NULL;

-- Table des likes sur commentaires
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES feed_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(comment_id, user_id)
);

-- Table des partages
CREATE TABLE IF NOT EXISTS feed_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL,

    comment TEXT,
    share_type VARCHAR(20) DEFAULT 'repost' CHECK (share_type IN (
        'repost',   -- Simple repartage
        'quote',    -- Avec commentaire
        'story'     -- En story
    )),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_shares_original ON feed_shares(original_post_id);
CREATE INDEX idx_feed_shares_user ON feed_shares(shared_by);

-- Table des vues de posts
CREATE TABLE IF NOT EXISTS feed_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_duration INTEGER DEFAULT 0, -- en secondes
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

-- Table des bookmarks/saves
CREATE TABLE IF NOT EXISTS feed_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_feed_bookmarks_user ON feed_bookmarks(user_id, created_at DESC);

-- Table des mentions
CREATE TABLE IF NOT EXISTS feed_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX idx_feed_mentions_user ON feed_mentions(mentioned_user_id, is_read);

-- Table des hashtags
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(100) NOT NULL UNIQUE,
    posts_count INTEGER DEFAULT 0,
    trending_score FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hashtags_tag ON hashtags(tag);
CREATE INDEX idx_hashtags_trending ON hashtags(trending_score DESC);

-- Table de liaison posts-hashtags
CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

-- Table des posts masques par l'utilisateur
CREATE TABLE IF NOT EXISTS hidden_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, post_id)
);

-- Table des utilisateurs mutes dans le feed
CREATE TABLE IF NOT EXISTS feed_muted_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mute_until TIMESTAMPTZ, -- NULL = permanent
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, muted_user_id)
);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction pour obtenir le feed personnalise
CREATE OR REPLACE FUNCTION get_personalized_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_filter VARCHAR DEFAULT 'all'
)
RETURNS TABLE (
    post_id UUID,
    post_type VARCHAR,
    content TEXT,
    media_urls JSONB,
    metadata JSONB,
    visibility VARCHAR,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    is_pinned BOOLEAN,
    created_at TIMESTAMPTZ,
    author_id UUID,
    author_username VARCHAR,
    author_display_name VARCHAR,
    author_avatar_url TEXT,
    author_level INTEGER,
    user_reaction VARCHAR,
    is_bookmarked BOOLEAN,
    circle_id UUID,
    circle_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH friend_ids AS (
        SELECT
            CASE
                WHEN user1_id = p_user_id THEN user2_id
                ELSE user1_id
            END as friend_id
        FROM friendships
        WHERE (user1_id = p_user_id OR user2_id = p_user_id)
        AND status = 'accepted'
    ),
    circle_ids AS (
        SELECT circle_id FROM circle_members
        WHERE user_id = p_user_id AND status = 'active'
    ),
    muted_ids AS (
        SELECT muted_user_id FROM feed_muted_users
        WHERE user_id = p_user_id
        AND (mute_until IS NULL OR mute_until > NOW())
    ),
    hidden_ids AS (
        SELECT post_id FROM hidden_posts WHERE user_id = p_user_id
    )
    SELECT
        fp.id as post_id,
        fp.post_type::VARCHAR,
        fp.content,
        fp.media_urls,
        fp.metadata,
        fp.visibility::VARCHAR,
        fp.likes_count,
        fp.comments_count,
        fp.shares_count,
        fp.is_pinned,
        fp.created_at,
        u.id as author_id,
        u.username::VARCHAR,
        u.display_name::VARCHAR,
        u.avatar_url,
        u.level,
        fl.reaction_type::VARCHAR as user_reaction,
        (fb.id IS NOT NULL) as is_bookmarked,
        fp.circle_id,
        c.name::VARCHAR as circle_name
    FROM feed_posts fp
    JOIN users u ON fp.user_id = u.id
    LEFT JOIN feed_likes fl ON fp.id = fl.post_id AND fl.user_id = p_user_id
    LEFT JOIN feed_bookmarks fb ON fp.id = fb.post_id AND fb.user_id = p_user_id
    LEFT JOIN circles c ON fp.circle_id = c.id
    WHERE fp.is_hidden = false
    AND fp.user_id NOT IN (SELECT muted_user_id FROM muted_ids)
    AND fp.id NOT IN (SELECT post_id FROM hidden_ids)
    AND (
        -- Ses propres posts
        fp.user_id = p_user_id
        -- Posts publics
        OR fp.visibility = 'public'
        -- Posts d'amis
        OR (fp.visibility = 'friends' AND fp.user_id IN (SELECT friend_id FROM friend_ids))
        -- Posts de cercles
        OR (fp.visibility = 'circle' AND fp.circle_id IN (SELECT circle_id FROM circle_ids))
    )
    AND (
        p_filter = 'all'
        OR (p_filter = 'friends' AND fp.user_id IN (SELECT friend_id FROM friend_ids))
        OR (p_filter = 'achievements' AND fp.post_type IN ('achievement', 'level_up', 'milestone'))
        OR (p_filter = 'challenges' AND fp.post_type IN ('challenge_complete', 'record'))
        OR (p_filter = 'creations' AND fp.post_type IN ('creation', 'photo', 'video'))
        OR (p_filter = 'circles' AND fp.circle_id IS NOT NULL)
    )
    ORDER BY fp.is_pinned DESC, fp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour creer un post
CREATE OR REPLACE FUNCTION create_feed_post(
    p_user_id UUID,
    p_post_type VARCHAR,
    p_content TEXT DEFAULT NULL,
    p_media_urls JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_visibility VARCHAR DEFAULT 'friends',
    p_circle_id UUID DEFAULT NULL,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_post_id UUID;
    v_hashtag TEXT;
    v_hashtag_id UUID;
BEGIN
    -- Creer le post
    INSERT INTO feed_posts (
        user_id, post_type, content, media_urls, metadata,
        visibility, circle_id, reference_type, reference_id
    )
    VALUES (
        p_user_id, p_post_type, p_content, p_media_urls, p_metadata,
        p_visibility, p_circle_id, p_reference_type, p_reference_id
    )
    RETURNING id INTO v_post_id;

    -- Extraire et enregistrer les hashtags
    IF p_content IS NOT NULL THEN
        FOR v_hashtag IN
            SELECT DISTINCT lower(substring(word from 2))
            FROM regexp_split_to_table(p_content, '\s+') AS word
            WHERE word ~ '^#[a-zA-Z0-9_]+'
        LOOP
            -- Inserer ou recuperer le hashtag
            INSERT INTO hashtags (tag)
            VALUES (v_hashtag)
            ON CONFLICT (tag) DO UPDATE SET
                posts_count = hashtags.posts_count + 1,
                updated_at = NOW()
            RETURNING id INTO v_hashtag_id;

            -- Lier au post
            INSERT INTO post_hashtags (post_id, hashtag_id)
            VALUES (v_post_id, v_hashtag_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- XP pour poster
    UPDATE users SET xp = xp + 5 WHERE id = p_user_id;

    RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour liker un post
CREATE OR REPLACE FUNCTION toggle_post_like(
    p_user_id UUID,
    p_post_id UUID,
    p_reaction_type VARCHAR DEFAULT 'like'
)
RETURNS JSONB AS $$
DECLARE
    v_existing_like UUID;
    v_post_author UUID;
    v_result JSONB;
BEGIN
    -- Verifier si deja like
    SELECT id INTO v_existing_like
    FROM feed_likes
    WHERE post_id = p_post_id AND user_id = p_user_id;

    SELECT user_id INTO v_post_author FROM feed_posts WHERE id = p_post_id;

    IF v_existing_like IS NOT NULL THEN
        -- Supprimer le like
        DELETE FROM feed_likes WHERE id = v_existing_like;

        UPDATE feed_posts SET likes_count = likes_count - 1 WHERE id = p_post_id;

        v_result := jsonb_build_object('action', 'unliked', 'likes_count',
            (SELECT likes_count FROM feed_posts WHERE id = p_post_id));
    ELSE
        -- Ajouter le like
        INSERT INTO feed_likes (post_id, user_id, reaction_type)
        VALUES (p_post_id, p_user_id, p_reaction_type);

        UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = p_post_id;

        -- XP pour l'auteur
        IF v_post_author != p_user_id THEN
            UPDATE users SET xp = xp + 2 WHERE id = v_post_author;

            -- Notification
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (
                v_post_author,
                'like',
                'Nouveau like',
                (SELECT display_name FROM users WHERE id = p_user_id) || ' a aime votre post',
                jsonb_build_object('post_id', p_post_id, 'liker_id', p_user_id, 'reaction', p_reaction_type)
            );
        END IF;

        v_result := jsonb_build_object('action', 'liked', 'likes_count',
            (SELECT likes_count FROM feed_posts WHERE id = p_post_id));
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ajouter un commentaire
CREATE OR REPLACE FUNCTION add_feed_comment(
    p_user_id UUID,
    p_post_id UUID,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL,
    p_media_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_comment_id UUID;
    v_post_author UUID;
    v_parent_author UUID;
    v_mentioned_user UUID;
BEGIN
    -- Creer le commentaire
    INSERT INTO feed_comments (post_id, user_id, parent_id, content, media_url)
    VALUES (p_post_id, p_user_id, p_parent_id, p_content, p_media_url)
    RETURNING id INTO v_comment_id;

    -- Mettre a jour les compteurs
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = p_post_id;

    IF p_parent_id IS NOT NULL THEN
        UPDATE feed_comments SET replies_count = replies_count + 1 WHERE id = p_parent_id;
    END IF;

    -- Notifications
    SELECT user_id INTO v_post_author FROM feed_posts WHERE id = p_post_id;

    IF v_post_author != p_user_id THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_post_author,
            'comment',
            'Nouveau commentaire',
            (SELECT display_name FROM users WHERE id = p_user_id) || ' a commente votre post',
            jsonb_build_object('post_id', p_post_id, 'comment_id', v_comment_id)
        );

        -- XP pour l'auteur du post
        UPDATE users SET xp = xp + 3 WHERE id = v_post_author;
    END IF;

    -- Notification au parent si reponse
    IF p_parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_author FROM feed_comments WHERE id = p_parent_id;

        IF v_parent_author != p_user_id AND v_parent_author != v_post_author THEN
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (
                v_parent_author,
                'reply',
                'Nouvelle reponse',
                (SELECT display_name FROM users WHERE id = p_user_id) || ' a repondu a votre commentaire',
                jsonb_build_object('post_id', p_post_id, 'comment_id', v_comment_id)
            );
        END IF;
    END IF;

    -- Extraire les mentions @username
    FOR v_mentioned_user IN
        SELECT DISTINCT u.id
        FROM regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g') AS m(username)
        JOIN users u ON lower(u.username) = lower(m.username[1])
        WHERE u.id != p_user_id
    LOOP
        INSERT INTO feed_mentions (comment_id, mentioned_user_id, mentioned_by)
        VALUES (v_comment_id, v_mentioned_user, p_user_id);

        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_mentioned_user,
            'mention',
            'Vous avez ete mentionne',
            (SELECT display_name FROM users WHERE id = p_user_id) || ' vous a mentionne',
            jsonb_build_object('post_id', p_post_id, 'comment_id', v_comment_id)
        );
    END LOOP;

    -- XP pour commenter
    UPDATE users SET xp = xp + 2 WHERE id = p_user_id;

    RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les commentaires d'un post
CREATE OR REPLACE FUNCTION get_post_comments(
    p_user_id UUID,
    p_post_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    comment_id UUID,
    content TEXT,
    media_url TEXT,
    likes_count INTEGER,
    replies_count INTEGER,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ,
    parent_id UUID,
    author_id UUID,
    author_username VARCHAR,
    author_display_name VARCHAR,
    author_avatar_url TEXT,
    user_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fc.id as comment_id,
        fc.content,
        fc.media_url,
        fc.likes_count,
        fc.replies_count,
        fc.is_edited,
        fc.created_at,
        fc.parent_id,
        u.id as author_id,
        u.username::VARCHAR,
        u.display_name::VARCHAR,
        u.avatar_url,
        EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = fc.id AND cl.user_id = p_user_id) as user_liked
    FROM feed_comments fc
    JOIN users u ON fc.user_id = u.id
    WHERE fc.post_id = p_post_id
    AND fc.is_hidden = false
    AND fc.parent_id IS NULL
    ORDER BY fc.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour les hashtags tendance
CREATE OR REPLACE FUNCTION get_trending_hashtags(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    hashtag_id UUID,
    tag VARCHAR,
    posts_count INTEGER,
    trending_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id as hashtag_id,
        h.tag::VARCHAR,
        h.posts_count,
        h.trending_score
    FROM hashtags h
    WHERE h.updated_at > NOW() - INTERVAL '7 days'
    ORDER BY h.trending_score DESC, h.posts_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre a jour le score tendance des hashtags
CREATE OR REPLACE FUNCTION update_hashtag_trending()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE hashtags h
    SET trending_score = (
        SELECT COUNT(*) *
            CASE
                WHEN ph.post_id IN (SELECT id FROM feed_posts WHERE created_at > NOW() - INTERVAL '1 hour') THEN 10
                WHEN ph.post_id IN (SELECT id FROM feed_posts WHERE created_at > NOW() - INTERVAL '6 hours') THEN 5
                WHEN ph.post_id IN (SELECT id FROM feed_posts WHERE created_at > NOW() - INTERVAL '24 hours') THEN 2
                ELSE 1
            END
        FROM post_hashtags ph
        WHERE ph.hashtag_id = h.id
    )
    WHERE h.id IN (SELECT hashtag_id FROM post_hashtags WHERE post_id = NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hashtag_trending
    AFTER INSERT ON post_hashtags
    FOR EACH ROW
    EXECUTE FUNCTION update_hashtag_trending();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_muted_users ENABLE ROW LEVEL SECURITY;

-- Policies pour feed_posts
CREATE POLICY "Users can view accessible posts" ON feed_posts
    FOR SELECT USING (
        visibility = 'public'
        OR user_id = auth.uid()
        OR (visibility = 'friends' AND user_id IN (
            SELECT CASE WHEN user1_id = auth.uid() THEN user2_id ELSE user1_id END
            FROM friendships WHERE (user1_id = auth.uid() OR user2_id = auth.uid()) AND status = 'accepted'
        ))
        OR (visibility = 'circle' AND circle_id IN (
            SELECT circle_id FROM circle_members WHERE user_id = auth.uid() AND status = 'active'
        ))
    );

CREATE POLICY "Users can create their own posts" ON feed_posts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON feed_posts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON feed_posts
    FOR DELETE USING (user_id = auth.uid());

-- Policies pour feed_likes
CREATE POLICY "Users can view likes" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their likes" ON feed_likes
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_comments
CREATE POLICY "Users can view comments" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON feed_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their comments" ON feed_comments
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their comments" ON feed_comments
    FOR DELETE USING (user_id = auth.uid());

-- Policies pour comment_likes
CREATE POLICY "Users can view comment likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their comment likes" ON comment_likes
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_bookmarks
CREATE POLICY "Users can manage their bookmarks" ON feed_bookmarks
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_mentions
CREATE POLICY "Users can view their mentions" ON feed_mentions
    FOR SELECT USING (mentioned_user_id = auth.uid() OR mentioned_by = auth.uid());

-- Policies pour hidden_posts
CREATE POLICY "Users can manage their hidden posts" ON hidden_posts
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_muted_users
CREATE POLICY "Users can manage their muted users" ON feed_muted_users
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- INDEXES ADDITIONNELS POUR PERFORMANCE
-- =============================================

CREATE INDEX idx_feed_posts_trending ON feed_posts(likes_count DESC, comments_count DESC, created_at DESC)
    WHERE is_hidden = false AND created_at > NOW() - INTERVAL '7 days';

CREATE INDEX idx_feed_comments_recent ON feed_comments(post_id, created_at DESC)
    WHERE is_hidden = false;
