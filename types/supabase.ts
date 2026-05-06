export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievement_triggers: {
        Row: {
          achievement_id: string
          condition_config: Json
          condition_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          trigger_event: string
        }
        Insert: {
          achievement_id: string
          condition_config?: Json
          condition_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          trigger_event: string
        }
        Update: {
          achievement_id?: string
          condition_config?: Json
          condition_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_triggers_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          category: string
          code: string
          color_gradient: string | null
          created_at: string | null
          description: string
          icon: string
          id: string
          is_active: boolean | null
          is_secret: boolean | null
          name: string
          points: number
          rarity: string
          requirement_data: Json | null
          requirement_type: string
          requirement_value: number | null
          sort_order: number | null
          updated_at: string | null
          xp_reward: number
        }
        Insert: {
          category: string
          code: string
          color_gradient?: string | null
          created_at?: string | null
          description: string
          icon?: string
          id?: string
          is_active?: boolean | null
          is_secret?: boolean | null
          name: string
          points?: number
          rarity?: string
          requirement_data?: Json | null
          requirement_type: string
          requirement_value?: number | null
          sort_order?: number | null
          updated_at?: string | null
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          color_gradient?: string | null
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          is_secret?: boolean | null
          name?: string
          points?: number
          rarity?: string
          requirement_data?: Json | null
          requirement_type?: string
          requirement_value?: number | null
          sort_order?: number | null
          updated_at?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      activity_comments: {
        Row: {
          activity_id: string
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          is_hidden: boolean | null
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_hidden?: boolean | null
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_hidden?: boolean | null
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "activity_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_feed_preferences: {
        Row: {
          created_at: string | null
          feed_order: string | null
          id: string
          notify_comments: boolean | null
          notify_likes: boolean | null
          notify_mentions: boolean | null
          show_achievements: boolean | null
          show_collections: boolean | null
          show_crew_activities: boolean | null
          show_events: boolean | null
          show_following_activities: boolean | null
          show_friends_activities: boolean | null
          show_games: boolean | null
          show_level_ups: boolean | null
          show_social: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feed_order?: string | null
          id?: string
          notify_comments?: boolean | null
          notify_likes?: boolean | null
          notify_mentions?: boolean | null
          show_achievements?: boolean | null
          show_collections?: boolean | null
          show_crew_activities?: boolean | null
          show_events?: boolean | null
          show_following_activities?: boolean | null
          show_friends_activities?: boolean | null
          show_games?: boolean | null
          show_level_ups?: boolean | null
          show_social?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feed_order?: string | null
          id?: string
          notify_comments?: boolean | null
          notify_likes?: boolean | null
          notify_mentions?: boolean | null
          show_achievements?: boolean | null
          show_collections?: boolean | null
          show_crew_activities?: boolean | null
          show_events?: boolean | null
          show_following_activities?: boolean | null
          show_friends_activities?: boolean | null
          show_games?: boolean | null
          show_level_ups?: boolean | null
          show_social?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_likes: {
        Row: {
          activity_id: string
          created_at: string | null
          id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          id?: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_likes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_public_by_default: boolean | null
          name: string
          points: number | null
          slug: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public_by_default?: boolean | null
          name: string
          points?: number | null
          slug: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public_by_default?: boolean | null
          name?: string
          points?: number | null
          slug?: string
        }
        Relationships: []
      }
      activity_visibility_settings: {
        Row: {
          allow_comments: boolean | null
          allow_likes: boolean | null
          allow_shares: boolean | null
          auto_publish_badges: boolean | null
          auto_publish_challenges: boolean | null
          auto_publish_collections: boolean | null
          auto_publish_crew_joins: boolean | null
          auto_publish_event_attendance: boolean | null
          auto_publish_level_ups: boolean | null
          created_at: string | null
          default_visibility: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_comments?: boolean | null
          allow_likes?: boolean | null
          allow_shares?: boolean | null
          auto_publish_badges?: boolean | null
          auto_publish_challenges?: boolean | null
          auto_publish_collections?: boolean | null
          auto_publish_crew_joins?: boolean | null
          auto_publish_event_attendance?: boolean | null
          auto_publish_level_ups?: boolean | null
          created_at?: string | null
          default_visibility?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_comments?: boolean | null
          allow_likes?: boolean | null
          allow_shares?: boolean | null
          auto_publish_badges?: boolean | null
          auto_publish_challenges?: boolean | null
          auto_publish_collections?: boolean | null
          auto_publish_crew_joins?: boolean | null
          auto_publish_event_attendance?: boolean | null
          auto_publish_level_ups?: boolean | null
          created_at?: string | null
          default_visibility?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      adaptive_learning_tracker: {
        Row: {
          algorithm_version: string | null
          created_at: string | null
          current_skill_level: Json | null
          difficulty_adjustment: number | null
          id: string
          last_updated_at: string | null
          learning_path: Json | null
          mastery_topics: string[] | null
          next_focus_areas: string[] | null
          next_recommended_content: Json | null
          pace_adjustment: number | null
          struggling_topics: string[] | null
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          algorithm_version?: string | null
          created_at?: string | null
          current_skill_level?: Json | null
          difficulty_adjustment?: number | null
          id?: string
          last_updated_at?: string | null
          learning_path?: Json | null
          mastery_topics?: string[] | null
          next_focus_areas?: string[] | null
          next_recommended_content?: Json | null
          pace_adjustment?: number | null
          struggling_topics?: string[] | null
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          algorithm_version?: string | null
          created_at?: string | null
          current_skill_level?: Json | null
          difficulty_adjustment?: number | null
          id?: string
          last_updated_at?: string | null
          learning_path?: Json | null
          mastery_topics?: string[] | null
          next_focus_areas?: string[] | null
          next_recommended_content?: Json | null
          pace_adjustment?: number | null
          struggling_topics?: string[] | null
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_learning_tracker_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: true
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          role?: string
        }
        Relationships: []
      }
      advent_calendar_days: {
        Row: {
          advent_calendar_id: string | null
          challenge_id: string | null
          created_at: string | null
          day_number: number
          description: string | null
          icon: string | null
          id: string
          is_bonus: boolean | null
          is_premium: boolean | null
          reward_amount: number | null
          reward_data: Json | null
          reward_type: string
          title: string | null
        }
        Insert: {
          advent_calendar_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          day_number: number
          description?: string | null
          icon?: string | null
          id?: string
          is_bonus?: boolean | null
          is_premium?: boolean | null
          reward_amount?: number | null
          reward_data?: Json | null
          reward_type: string
          title?: string | null
        }
        Update: {
          advent_calendar_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          day_number?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_bonus?: boolean | null
          is_premium?: boolean | null
          reward_amount?: number | null
          reward_data?: Json | null
          reward_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advent_calendar_days_advent_calendar_id_fkey"
            columns: ["advent_calendar_id"]
            isOneToOne: false
            referencedRelation: "advent_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advent_calendar_days_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "seasonal_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      advent_calendars: {
        Row: {
          bonus_reward: Json | null
          bonus_reward_day: number | null
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          theme: string | null
          title: string
          total_days: number | null
          year: number
        }
        Insert: {
          bonus_reward?: Json | null
          bonus_reward_day?: number | null
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          theme?: string | null
          title: string
          total_days?: number | null
          year: number
        }
        Update: {
          bonus_reward?: Json | null
          bonus_reward_day?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          theme?: string | null
          title?: string
          total_days?: number | null
          year?: number
        }
        Relationships: []
      }
      ai_generation_templates: {
        Row: {
          category: string | null
          content_type: string
          created_at: string | null
          difficulty: string | null
          generation_config: Json | null
          grade_level: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          success_rate: number | null
          system_prompt: string
          updated_at: string | null
          usage_count: number | null
          user_prompt_template: string
          validation_rules: Json | null
        }
        Insert: {
          category?: string | null
          content_type: string
          created_at?: string | null
          difficulty?: string | null
          generation_config?: Json | null
          grade_level?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          success_rate?: number | null
          system_prompt: string
          updated_at?: string | null
          usage_count?: number | null
          user_prompt_template: string
          validation_rules?: Json | null
        }
        Update: {
          category?: string | null
          content_type?: string
          created_at?: string | null
          difficulty?: string | null
          generation_config?: Json | null
          grade_level?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          success_rate?: number | null
          system_prompt?: string
          updated_at?: string | null
          usage_count?: number | null
          user_prompt_template?: string
          validation_rules?: Json | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_after_xp: number | null
          booking_reference: string | null
          created_at: string | null
          event_id: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
          xp_used: number | null
          xp_value: number | null
        }
        Insert: {
          amount_after_xp?: number | null
          booking_reference?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp_used?: number | null
          xp_value?: number | null
        }
        Update: {
          amount_after_xp?: number | null
          booking_reference?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp_used?: number | null
          xp_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_messages: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "friend_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          current_score: number
          id: string
          is_winner: boolean | null
          joined_at: string | null
          start_score: number | null
          status: string
          team: string | null
          updated_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          challenge_id: string
          current_score?: number
          id?: string
          is_winner?: boolean | null
          joined_at?: string | null
          start_score?: number | null
          status?: string
          team?: string | null
          updated_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          challenge_id?: string
          current_score?: number
          id?: string
          is_winner?: boolean | null
          joined_at?: string | null
          start_score?: number | null
          status?: string
          team?: string | null
          updated_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "friend_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress_log: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          new_total: number
          score_change: number
          source: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          new_total: number
          score_change: number
          source?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          new_total?: number
          score_change?: number
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_log_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "friend_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_types: {
        Row: {
          color: string
          created_at: string
          default_duration_hours: number
          default_target: number | null
          description: string | null
          draw_xp: number | null
          icon: string
          id: string
          is_active: boolean
          max_participants: number
          min_participants: number
          mode: string
          name: string
          objective_type: string
          participant_xp: number
          slug: string
          winner_xp: number
        }
        Insert: {
          color?: string
          created_at?: string
          default_duration_hours?: number
          default_target?: number | null
          description?: string | null
          draw_xp?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          max_participants?: number
          min_participants?: number
          mode: string
          name: string
          objective_type: string
          participant_xp?: number
          slug: string
          winner_xp?: number
        }
        Update: {
          color?: string
          created_at?: string
          default_duration_hours?: number
          default_target?: number | null
          description?: string | null
          draw_xp?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          max_participants?: number
          min_participants?: number
          mode?: string
          name?: string
          objective_type?: string
          participant_xp?: number
          slug?: string
          winner_xp?: number
        }
        Relationships: []
      }
      challenge_votes: {
        Row: {
          created_at: string | null
          id: string
          submission_id: string
          user_id: string
          vote_value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          submission_id: string
          user_id: string
          vote_value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          submission_id?: string
          user_id?: string
          vote_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "special_challenge_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_challenge_participants: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_value: number | null
          id: string
          joined_at: string | null
          proof_type: string | null
          proof_url: string | null
          teen_id: string
          updated_at: string | null
          xp_earned: number | null
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          joined_at?: string | null
          proof_type?: string | null
          proof_url?: string | null
          teen_id: string
          updated_at?: string | null
          xp_earned?: number | null
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          joined_at?: string | null
          proof_type?: string | null
          proof_url?: string | null
          teen_id?: string
          updated_at?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "circle_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_challenge_participants_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_challenges: {
        Row: {
          challenge_type: string | null
          circle_id: string
          created_at: string | null
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          objective_type: string | null
          objective_unit: string | null
          objective_value: number | null
          starts_at: string | null
          status: string | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          challenge_type?: string | null
          circle_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          objective_type?: string | null
          objective_unit?: string | null
          objective_value?: number | null
          starts_at?: string | null
          status?: string | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          challenge_type?: string | null
          circle_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          objective_type?: string | null
          objective_unit?: string | null
          objective_value?: number | null
          starts_at?: string | null
          status?: string | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_challenges_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_invitations: {
        Row: {
          circle_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invited_teen_id: string
          message: string | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          circle_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_teen_id: string
          message?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          circle_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_teen_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_invitations_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_invitations_invited_teen_id_fkey"
            columns: ["invited_teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          messages_sent: number | null
          nickname: string | null
          notifications_enabled: boolean | null
          role: string | null
          status: string | null
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          messages_sent?: number | null
          nickname?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          status?: string | null
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          messages_sent?: number | null
          nickname?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          status?: string | null
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_message_reads: {
        Row: {
          circle_id: string
          id: string
          last_read_at: string | null
          last_read_message_id: string | null
          teen_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          teen_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          teen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_message_reads_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_message_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "circle_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_message_reads_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_messages: {
        Row: {
          circle_id: string
          content: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          pinned_at: string | null
          pinned_by: string | null
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          circle_id: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          circle_id?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "circle_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_ids: Json
          poll_id: string
          teen_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_ids: Json
          poll_id: string
          teen_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_ids?: Json
          poll_id?: string
          teen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "circle_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_poll_votes_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_polls: {
        Row: {
          allow_multiple: boolean | null
          anonymous: boolean | null
          circle_id: string
          created_at: string | null
          created_by: string
          ends_at: string | null
          id: string
          is_closed: boolean | null
          message_id: string | null
          options: Json
          question: string
        }
        Insert: {
          allow_multiple?: boolean | null
          anonymous?: boolean | null
          circle_id: string
          created_at?: string | null
          created_by: string
          ends_at?: string | null
          id?: string
          is_closed?: boolean | null
          message_id?: string | null
          options: Json
          question: string
        }
        Update: {
          allow_multiple?: boolean | null
          anonymous?: boolean | null
          circle_id?: string
          created_at?: string | null
          created_by?: string
          ends_at?: string | null
          id?: string
          is_closed?: boolean | null
          message_id?: string | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_polls_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "circle_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          avatar_url: string | null
          circle_type: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          max_members: number | null
          message_count: number | null
          name: string
          theme_color: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          circle_type?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          max_members?: number | null
          message_count?: number | null
          name: string
          theme_color?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          circle_type?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          max_members?: number | null
          message_count?: number | null
          name?: string
          theme_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      club_attendance: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          check_out_time: string | null
          club_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          teen_id: string
          verification_method: string | null
          verified: boolean | null
          verified_by: string | null
          xp_awarded: number | null
        }
        Insert: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          club_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          teen_id: string
          verification_method?: string | null
          verified?: boolean | null
          verified_by?: string | null
          xp_awarded?: number | null
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          club_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          teen_id?: string
          verification_method?: string | null
          verified?: boolean | null
          verified_by?: string | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "club_attendance_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "sport_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_attendance_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          teen_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          teen_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          teen_id?: string
          transaction_type?: string
        }
        Relationships: []
      }
      collectible_items: {
        Row: {
          animation_type: string | null
          coin_price: number | null
          created_at: string | null
          description: string | null
          drop_rate: number | null
          event_exclusive: boolean | null
          event_id: string | null
          id: string
          image_url: string
          is_active: boolean | null
          item_number: number
          name: string
          obtainable_from: string[] | null
          rarity: string
          set_id: string
          slug: string
          thumbnail_url: string | null
        }
        Insert: {
          animation_type?: string | null
          coin_price?: number | null
          created_at?: string | null
          description?: string | null
          drop_rate?: number | null
          event_exclusive?: boolean | null
          event_id?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          item_number: number
          name: string
          obtainable_from?: string[] | null
          rarity?: string
          set_id: string
          slug: string
          thumbnail_url?: string | null
        }
        Update: {
          animation_type?: string | null
          coin_price?: number | null
          created_at?: string | null
          description?: string | null
          drop_rate?: number | null
          event_exclusive?: boolean | null
          event_id?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          item_number?: number
          name?: string
          obtainable_from?: string[] | null
          rarity?: string
          set_id?: string
          slug?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collectible_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "collection_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_sets: {
        Row: {
          available_from: string | null
          available_until: string | null
          completion_badge_id: string | null
          completion_coins: number | null
          completion_title_id: string | null
          completion_xp: number | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_limited: boolean | null
          name: string
          season: string | null
          set_type: string
          slug: string
          theme_color: string | null
          theme_gradient: string | null
          total_items: number
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          completion_badge_id?: string | null
          completion_coins?: number | null
          completion_title_id?: string | null
          completion_xp?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          name: string
          season?: string | null
          set_type: string
          slug: string
          theme_color?: string | null
          theme_gradient?: string | null
          total_items?: number
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          completion_badge_id?: string | null
          completion_coins?: number | null
          completion_title_id?: string | null
          completion_xp?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          name?: string
          season?: string | null
          set_type?: string
          slug?: string
          theme_color?: string | null
          theme_gradient?: string | null
          total_items?: number
        }
        Relationships: []
      }
      collection_trades: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          receiver_id: string
          receiver_item_ids: string[]
          responded_at: string | null
          sender_id: string
          sender_item_ids: string[]
          sender_message: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          receiver_id: string
          receiver_item_ids: string[]
          responded_at?: string | null
          sender_id: string
          sender_item_ids: string[]
          sender_message?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          receiver_id?: string
          receiver_item_ids?: string[]
          responded_at?: string | null
          sender_id?: string
          sender_item_ids?: string[]
          sender_message?: string | null
          status?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_curriculum_mapping: {
        Row: {
          adapted_description: string | null
          adapted_title: string | null
          content_id: string
          content_type: string
          created_at: string | null
          curriculum: string
          id: string
          language: string | null
          school_type: string
          updated_at: string | null
        }
        Insert: {
          adapted_description?: string | null
          adapted_title?: string | null
          content_id: string
          content_type: string
          created_at?: string | null
          curriculum: string
          id?: string
          language?: string | null
          school_type: string
          updated_at?: string | null
        }
        Update: {
          adapted_description?: string | null
          adapted_title?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          curriculum?: string
          id?: string
          language?: string | null
          school_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content_factual_verification: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          expert_id: string | null
          expert_notes: string | null
          facts_total: number | null
          facts_verified: number | null
          id: string
          reviewed_by_expert: boolean | null
          updated_at: string | null
          verification_method: string | null
          verification_score: number | null
          verification_sources: Json | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          expert_id?: string | null
          expert_notes?: string | null
          facts_total?: number | null
          facts_verified?: number | null
          id?: string
          reviewed_by_expert?: boolean | null
          updated_at?: string | null
          verification_method?: string | null
          verification_score?: number | null
          verification_sources?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          expert_id?: string | null
          expert_notes?: string | null
          facts_total?: number | null
          facts_verified?: number | null
          id?: string
          reviewed_by_expert?: boolean | null
          updated_at?: string | null
          verification_method?: string | null
          verification_score?: number | null
          verification_sources?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_factual_verification_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_logs: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          completed_at: string | null
          content_type: string
          cost_estimate: number | null
          created_at: string | null
          error_message: string | null
          generated_content_id: string | null
          generated_content_type: string | null
          generation_params: Json
          generation_time_ms: number | null
          id: string
          is_published: boolean | null
          published_at: string | null
          quality_score: number | null
          requires_manual_review: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_type: string
          tokens_used: number | null
          validation_id: string | null
          validation_status: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          completed_at?: string | null
          content_type: string
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          generated_content_id?: string | null
          generated_content_type?: string | null
          generation_params?: Json
          generation_time_ms?: number | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          quality_score?: number | null
          requires_manual_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_type: string
          tokens_used?: number | null
          validation_id?: string | null
          validation_status?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          completed_at?: string | null
          content_type?: string
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          generated_content_id?: string | null
          generated_content_type?: string | null
          generation_params?: Json
          generation_time_ms?: number | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          quality_score?: number | null
          requires_manual_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_type?: string
          tokens_used?: number | null
          validation_id?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_logs_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "content_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_performance_metrics: {
        Row: {
          accuracy_score: number | null
          average_score: number | null
          average_time_seconds: number | null
          completion_rate: number | null
          content_id: string
          content_type: string
          created_at: string | null
          error_report_count: number | null
          flagged_issues: string[] | null
          id: string
          last_issue_detected_at: string | null
          performance_by_difficulty: Json | null
          performance_by_grade_level: Json | null
          total_attempts: number | null
          total_completions: number | null
          updated_at: string | null
          user_satisfaction_score: number | null
        }
        Insert: {
          accuracy_score?: number | null
          average_score?: number | null
          average_time_seconds?: number | null
          completion_rate?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          error_report_count?: number | null
          flagged_issues?: string[] | null
          id?: string
          last_issue_detected_at?: string | null
          performance_by_difficulty?: Json | null
          performance_by_grade_level?: Json | null
          total_attempts?: number | null
          total_completions?: number | null
          updated_at?: string | null
          user_satisfaction_score?: number | null
        }
        Update: {
          accuracy_score?: number | null
          average_score?: number | null
          average_time_seconds?: number | null
          completion_rate?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          error_report_count?: number | null
          flagged_issues?: string[] | null
          id?: string
          last_issue_detected_at?: string | null
          performance_by_difficulty?: Json | null
          performance_by_grade_level?: Json | null
          total_attempts?: number | null
          total_completions?: number | null
          updated_at?: string | null
          user_satisfaction_score?: number | null
        }
        Relationships: []
      }
      content_quality_rules: {
        Row: {
          category: string | null
          content_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          quality_threshold: number | null
          updated_at: string | null
          validation_rules: Json
        }
        Insert: {
          category?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          quality_threshold?: number | null
          updated_at?: string | null
          validation_rules?: Json
        }
        Update: {
          category?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          quality_threshold?: number | null
          updated_at?: string | null
          validation_rules?: Json
        }
        Relationships: []
      }
      content_recommendations: {
        Row: {
          actual_performance: number | null
          confidence_level: number | null
          content_id: string
          content_type: string
          expires_at: string | null
          id: string
          recommendation_factors: Json | null
          recommendation_score: number
          recommended_at: string | null
          shown_at: string | null
          status: string | null
          teen_id: string
          user_feedback: string | null
        }
        Insert: {
          actual_performance?: number | null
          confidence_level?: number | null
          content_id: string
          content_type: string
          expires_at?: string | null
          id?: string
          recommendation_factors?: Json | null
          recommendation_score: number
          recommended_at?: string | null
          shown_at?: string | null
          status?: string | null
          teen_id: string
          user_feedback?: string | null
        }
        Update: {
          actual_performance?: number | null
          confidence_level?: number | null
          content_id?: string
          content_type?: string
          expires_at?: string | null
          id?: string
          recommendation_factors?: Json | null
          recommendation_score?: number
          recommended_at?: string | null
          shown_at?: string | null
          status?: string | null
          teen_id?: string
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_recommendations_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reliability_scores: {
        Row: {
          calculation_method: string | null
          confidence_interval: number | null
          content_id: string
          content_type: string
          created_at: string | null
          expert_validation: number | null
          factual_accuracy: number | null
          id: string
          last_calculated_at: string | null
          performance_consistency: number | null
          reliability_score: number | null
          updated_at: string | null
          user_accuracy: number | null
        }
        Insert: {
          calculation_method?: string | null
          confidence_interval?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          expert_validation?: number | null
          factual_accuracy?: number | null
          id?: string
          last_calculated_at?: string | null
          performance_consistency?: number | null
          reliability_score?: number | null
          updated_at?: string | null
          user_accuracy?: number | null
        }
        Update: {
          calculation_method?: string | null
          confidence_interval?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          expert_validation?: number | null
          factual_accuracy?: number | null
          id?: string
          last_calculated_at?: string | null
          performance_consistency?: number | null
          reliability_score?: number | null
          updated_at?: string | null
          user_accuracy?: number | null
        }
        Relationships: []
      }
      content_validations: {
        Row: {
          auto_validated_at: string | null
          auto_validation_checks: Json | null
          auto_validation_score: number | null
          content_id: string
          content_type: string
          created_at: string | null
          error_details: Json | null
          has_errors: boolean | null
          has_warnings: boolean | null
          id: string
          quality_metrics: Json | null
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
          validation_status: string
          warning_details: Json | null
        }
        Insert: {
          auto_validated_at?: string | null
          auto_validation_checks?: Json | null
          auto_validation_score?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          error_details?: Json | null
          has_errors?: boolean | null
          has_warnings?: boolean | null
          id?: string
          quality_metrics?: Json | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          validation_status?: string
          warning_details?: Json | null
        }
        Update: {
          auto_validated_at?: string | null
          auto_validation_checks?: Json | null
          auto_validation_score?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          error_details?: Json | null
          has_errors?: boolean | null
          has_warnings?: boolean | null
          id?: string
          quality_metrics?: Json | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          validation_status?: string
          warning_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_validations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_likes: {
        Row: {
          created_at: string | null
          creation_id: string
          id: string
          teen_id: string
        }
        Insert: {
          created_at?: string | null
          creation_id: string
          id?: string
          teen_id: string
        }
        Update: {
          created_at?: string | null
          creation_id?: string
          id?: string
          teen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_likes_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "teen_creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_likes_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_achievements: {
        Row: {
          color: string | null
          condition_type: string
          condition_value: number
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          rarity: string | null
          slug: string
          xp_reward: number | null
        }
        Insert: {
          color?: string | null
          condition_type: string
          condition_value: number
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          rarity?: string | null
          slug: string
          xp_reward?: number | null
        }
        Update: {
          color?: string | null
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rarity?: string | null
          slug?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      crew_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          crew_id: string
          description: string | null
          id: string
          metadata: Json | null
          user_id: string | null
          xp_amount: number | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          crew_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
          xp_amount?: number | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          crew_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
          xp_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_activity_log_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_invitations: {
        Row: {
          created_at: string | null
          crew_id: string
          expires_at: string | null
          id: string
          invitee_id: string
          inviter_id: string
          message: string | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          crew_id: string
          expires_at?: string | null
          id?: string
          invitee_id: string
          inviter_id: string
          message?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          crew_id?: string
          expires_at?: string | null
          id?: string
          invitee_id?: string
          inviter_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_invitations_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_join_requests: {
        Row: {
          created_at: string | null
          crew_id: string
          id: string
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crew_id: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crew_id?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_join_requests_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          challenges_won: number | null
          crew_id: string
          events_attended: number | null
          id: string
          joined_at: string | null
          last_active_at: string | null
          role: string | null
          status: string | null
          user_id: string
          xp_contributed: number | null
        }
        Insert: {
          challenges_won?: number | null
          crew_id: string
          events_attended?: number | null
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          role?: string | null
          status?: string | null
          user_id: string
          xp_contributed?: number | null
        }
        Update: {
          challenges_won?: number | null
          crew_id?: string
          events_attended?: number | null
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          role?: string | null
          status?: string | null
          user_id?: string
          xp_contributed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_unlocked_achievements: {
        Row: {
          achievement_id: string
          crew_id: string
          id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_id: string
          crew_id: string
          id?: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string
          crew_id?: string
          id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_unlocked_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "crew_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_unlocked_achievements_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_weekly_stats: {
        Row: {
          active_members: number | null
          challenges_won: number | null
          created_at: string | null
          crew_id: string
          events_attended: number | null
          id: string
          previous_rank: number | null
          rank: number | null
          week_end: string
          week_start: string
          xp_earned: number | null
        }
        Insert: {
          active_members?: number | null
          challenges_won?: number | null
          created_at?: string | null
          crew_id: string
          events_attended?: number | null
          id?: string
          previous_rank?: number | null
          rank?: number | null
          week_end: string
          week_start: string
          xp_earned?: number | null
        }
        Update: {
          active_members?: number | null
          challenges_won?: number | null
          created_at?: string | null
          crew_id?: string
          events_attended?: number | null
          id?: string
          previous_rank?: number | null
          rank?: number | null
          week_end?: string
          week_start?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_weekly_stats_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          avatar_url: string | null
          average_level: number | null
          badge_icon: string | null
          banner_url: string | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          max_members: number | null
          min_level_required: number | null
          motto: string | null
          name: string
          owner_id: string
          requires_approval: boolean | null
          slug: string
          total_challenges_won: number | null
          total_events_attended: number | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_level?: number | null
          badge_icon?: string | null
          banner_url?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          min_level_required?: number | null
          motto?: string | null
          name: string
          owner_id: string
          requires_approval?: boolean | null
          slug: string
          total_challenges_won?: number | null
          total_events_attended?: number | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_level?: number | null
          badge_icon?: string | null
          banner_url?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          min_level_required?: number | null
          motto?: string | null
          name?: string
          owner_id?: string
          requires_approval?: boolean | null
          slug?: string
          total_challenges_won?: number | null
          total_events_attended?: number | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crews_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_content_library: {
        Row: {
          category: string | null
          content_data: Json
          content_type: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          grade_level: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          last_used_at: string | null
          subject: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          usage_count: number | null
          validated_at: string | null
          validated_by: string | null
          validation_notes: string | null
        }
        Insert: {
          category?: string | null
          content_data: Json
          content_type: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          subject?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          usage_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
        }
        Update: {
          category?: string | null
          content_data?: Json
          content_type?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          subject?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          usage_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_content_library_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_subjects: {
        Row: {
          available_grade_levels: string[] | null
          created_at: string | null
          curriculum: string
          id: string
          is_active: boolean | null
          school_type: string
          sort_order: number | null
          subject_id: string
          subject_label_ar: string | null
          subject_label_en: string | null
          subject_label_fr: string | null
          updated_at: string | null
        }
        Insert: {
          available_grade_levels?: string[] | null
          created_at?: string | null
          curriculum: string
          id?: string
          is_active?: boolean | null
          school_type: string
          sort_order?: number | null
          subject_id: string
          subject_label_ar?: string | null
          subject_label_en?: string | null
          subject_label_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          available_grade_levels?: string[] | null
          created_at?: string | null
          curriculum?: string
          id?: string
          is_active?: boolean | null
          school_type?: string
          sort_order?: number | null
          subject_id?: string
          subject_label_ar?: string | null
          subject_label_en?: string | null
          subject_label_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_bonuses: {
        Row: {
          created_at: string | null
          id: string
          last_free_spin: string | null
          last_login_date: string | null
          login_streak: number | null
          monthly_bonuses_claimed: number | null
          monthly_reset_at: string | null
          paid_spins_today: number | null
          teen_id: string
          updated_at: string | null
          weekly_bonus_claimed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_free_spin?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          monthly_bonuses_claimed?: number | null
          monthly_reset_at?: string | null
          paid_spins_today?: number | null
          teen_id: string
          updated_at?: string | null
          weekly_bonus_claimed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_free_spin?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          monthly_bonuses_claimed?: number | null
          monthly_reset_at?: string | null
          paid_spins_today?: number | null
          teen_id?: string
          updated_at?: string | null
          weekly_bonus_claimed_at?: string | null
        }
        Relationships: []
      }
      daily_content_schedule: {
        Row: {
          completed_at: string | null
          content_plan: Json
          failed_count: number | null
          generated_count: number | null
          generation_log: Json | null
          id: string
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          target_date: string
        }
        Insert: {
          completed_at?: string | null
          content_plan?: Json
          failed_count?: number | null
          generated_count?: number | null
          generation_log?: Json | null
          id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          target_date: string
        }
        Update: {
          completed_at?: string | null
          content_plan?: Json
          failed_count?: number | null
          generated_count?: number | null
          generation_log?: Json | null
          id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          target_date?: string
        }
        Relationships: []
      }
      daily_game_scores: {
        Row: {
          best_score: number | null
          created_at: string | null
          game_type_id: string | null
          games_played: number | null
          id: string
          score_date: string | null
          total_xp_earned: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          best_score?: number | null
          created_at?: string | null
          game_type_id?: string | null
          games_played?: number | null
          id?: string
          score_date?: string | null
          total_xp_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          best_score?: number | null
          created_at?: string | null
          game_type_id?: string | null
          games_played?: number | null
          id?: string
          score_date?: string | null
          total_xp_earned?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_game_scores_game_type_id_fkey"
            columns: ["game_type_id"]
            isOneToOne: false
            referencedRelation: "mini_game_types"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_quizzes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          grade_level: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          passing_score: number | null
          quality_score: number | null
          question_type_mix: Json | null
          questions: Json
          subject: string
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          quality_score?: number | null
          question_type_mix?: Json | null
          questions?: Json
          subject: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          quality_score?: number | null
          question_type_mix?: Json | null
          questions?: Json
          subject?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      educational_tutorial_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          progress_percent: number | null
          teen_id: string
          tutorial_id: string
          updated_at: string | null
          watch_time_seconds: number | null
          xp_earned: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          progress_percent?: number | null
          teen_id: string
          tutorial_id: string
          updated_at?: string | null
          watch_time_seconds?: number | null
          xp_earned?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          progress_percent?: number | null
          teen_id?: string
          tutorial_id?: string
          updated_at?: string | null
          watch_time_seconds?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "educational_tutorial_progress_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_tutorial_progress_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "educational_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_tutorials: {
        Row: {
          code: string
          completion_threshold: number | null
          content_type: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          grade_level: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          subject: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_duration_minutes: number | null
          video_url: string | null
          xp_reward: number | null
        }
        Insert: {
          code: string
          completion_threshold?: number | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          subject: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_duration_minutes?: number | null
          video_url?: string | null
          xp_reward?: number | null
        }
        Update: {
          code?: string
          completion_threshold?: number | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          subject?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_duration_minutes?: number | null
          video_url?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      event_challenge_types: {
        Row: {
          bonus_xp: number | null
          challenge_type: string
          color: string | null
          condition_type: string | null
          condition_value: number | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          name: string
          slug: string
          xp_reward: number | null
        }
        Insert: {
          bonus_xp?: number | null
          challenge_type: string
          color?: string | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name: string
          slug: string
          xp_reward?: number | null
        }
        Update: {
          bonus_xp?: number | null
          challenge_type?: string
          color?: string | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name?: string
          slug?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      event_challenges: {
        Row: {
          available_from: string | null
          available_until: string | null
          challenge_type_id: string
          completions_count: number | null
          created_at: string | null
          custom_description: string | null
          custom_name: string | null
          custom_xp_reward: number | null
          event_id: string
          id: string
          is_active: boolean | null
          max_completions: number | null
          specific_conditions: Json | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          challenge_type_id: string
          completions_count?: number | null
          created_at?: string | null
          custom_description?: string | null
          custom_name?: string | null
          custom_xp_reward?: number | null
          event_id: string
          id?: string
          is_active?: boolean | null
          max_completions?: number | null
          specific_conditions?: Json | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          challenge_type_id?: string
          completions_count?: number | null
          created_at?: string | null
          custom_description?: string | null
          custom_name?: string | null
          custom_xp_reward?: number | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          max_completions?: number | null
          specific_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_challenges_challenge_type_id_fkey"
            columns: ["challenge_type_id"]
            isOneToOne: false
            referencedRelation: "event_challenge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_check_ins: {
        Row: {
          check_in_method: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          device_info: Json | null
          event_id: string
          id: string
          latitude: number | null
          longitude: number | null
          teen_id: string
          xp_awarded: number | null
        }
        Insert: {
          check_in_method?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          device_info?: Json | null
          event_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          teen_id: string
          xp_awarded?: number | null
        }
        Update: {
          check_in_method?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          device_info?: Json | null
          event_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          teen_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_check_ins_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          ambiance_rating: number | null
          comment: string | null
          cons: string[] | null
          created_at: string | null
          event_id: string
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          is_visible: boolean | null
          moderated_at: string | null
          music_rating: number | null
          overall_rating: number
          photo_urls: string[] | null
          pros: string[] | null
          staff_rating: number | null
          teen_id: string
          updated_at: string | null
          value_rating: number | null
          xp_awarded: number | null
        }
        Insert: {
          ambiance_rating?: number | null
          comment?: string | null
          cons?: string[] | null
          created_at?: string | null
          event_id: string
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          is_visible?: boolean | null
          moderated_at?: string | null
          music_rating?: number | null
          overall_rating: number
          photo_urls?: string[] | null
          pros?: string[] | null
          staff_rating?: number | null
          teen_id: string
          updated_at?: string | null
          value_rating?: number | null
          xp_awarded?: number | null
        }
        Update: {
          ambiance_rating?: number | null
          comment?: string | null
          cons?: string[] | null
          created_at?: string | null
          event_id?: string
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          is_visible?: boolean | null
          moderated_at?: string | null
          music_rating?: number | null
          overall_rating?: number
          photo_urls?: string[] | null
          pros?: string[] | null
          staff_rating?: number | null
          teen_id?: string
          updated_at?: string | null
          value_rating?: number | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string | null
          id: string
          slug: string | null
          status: string | null
          title: string
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          slug?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          accepted_at: string | null
          family_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          family_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          family_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      family_subscriptions: {
        Row: {
          created_at: string | null
          family_name: string | null
          id: string
          max_members: number | null
          owner_id: string
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          family_name?: string | null
          id?: string
          max_members?: number | null
          owner_id: string
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          family_name?: string | null
          id?: string
          max_members?: number | null
          owner_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_subscriptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_bookmarks: {
        Row: {
          collection: string | null
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection?: string | null
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection?: string | null
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          is_hidden: boolean | null
          likes_count: number | null
          media_url: string | null
          parent_id: string | null
          post_id: string
          replies_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_hidden?: boolean | null
          likes_count?: number | null
          media_url?: string | null
          parent_id?: string | null
          post_id: string
          replies_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_hidden?: boolean | null
          likes_count?: number | null
          media_url?: string | null
          parent_id?: string | null
          post_id?: string
          replies_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_mentions: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_by: string
          mentioned_user_id: string
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          mentioned_by?: string
          mentioned_user_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_muted_users: {
        Row: {
          created_at: string | null
          id: string
          mute_until: string | null
          muted_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mute_until?: string | null
          muted_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mute_until?: string | null
          muted_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_muted_users_muted_user_id_fkey"
            columns: ["muted_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_muted_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          circle_id: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          id: string
          is_hidden: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          media_urls: Json | null
          metadata: Json | null
          post_type: string
          reference_id: string | null
          reference_type: string | null
          reported_count: number | null
          shares_count: number | null
          updated_at: string | null
          user_id: string
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          circle_id?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: Json | null
          metadata?: Json | null
          post_type: string
          reference_id?: string | null
          reference_type?: string | null
          reported_count?: number | null
          shares_count?: number | null
          updated_at?: string | null
          user_id: string
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          circle_id?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: Json | null
          metadata?: Json | null
          post_type?: string
          reference_id?: string | null
          reference_type?: string | null
          reported_count?: number | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_shares: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          original_post_id: string
          share_type: string | null
          shared_by: string
          shared_post_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          original_post_id: string
          share_type?: string | null
          shared_by: string
          shared_post_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          original_post_id?: string
          share_type?: string | null
          shared_by?: string
          shared_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_shares_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_shares_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_views: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
          view_duration: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
          view_duration?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
          view_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_activities: {
        Row: {
          activity_type: string
          color: string | null
          comments_count: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          likes_count: number | null
          related_id: string | null
          related_type: string | null
          teen_id: string
          title: string
          visibility: string | null
        }
        Insert: {
          activity_type: string
          color?: string | null
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          likes_count?: number | null
          related_id?: string | null
          related_type?: string | null
          teen_id: string
          title: string
          visibility?: string | null
        }
        Update: {
          activity_type?: string
          color?: string | null
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          likes_count?: number | null
          related_id?: string | null
          related_type?: string | null
          teen_id?: string
          title?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_activities_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_challenges: {
        Row: {
          challenge_type_id: string | null
          created_at: string
          creator_id: string
          ends_at: string
          id: string
          is_draw: boolean | null
          name: string | null
          stake_xp: number | null
          starts_at: string
          status: string
          target_value: number | null
          updated_at: string
          winner_id: string | null
          winning_team: string | null
        }
        Insert: {
          challenge_type_id?: string | null
          created_at?: string
          creator_id: string
          ends_at: string
          id?: string
          is_draw?: boolean | null
          name?: string | null
          stake_xp?: number | null
          starts_at?: string
          status?: string
          target_value?: number | null
          updated_at?: string
          winner_id?: string | null
          winning_team?: string | null
        }
        Update: {
          challenge_type_id?: string | null
          created_at?: string
          creator_id?: string
          ends_at?: string
          id?: string
          is_draw?: boolean | null
          name?: string | null
          stake_xp?: number | null
          starts_at?: string
          status?: string
          target_value?: number | null
          updated_at?: string
          winner_id?: string | null
          winning_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_challenges_challenge_type_id_fkey"
            columns: ["challenge_type_id"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_connections: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_teen_id: string
          id: string
          initiated_by: string
          status: string
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_teen_id: string
          id?: string
          initiated_by: string
          status?: string
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_teen_id?: string
          id?: string
          initiated_by?: string
          status?: string
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_connections_friend_teen_id_fkey"
            columns: ["friend_teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          message: string | null
          receiver_id: string
          responded_at: string | null
          seen_at: string | null
          sender_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          seen_at?: string | null
          sender_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          seen_at?: string | null
          sender_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_suggestions: {
        Row: {
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          reason: string | null
          score: number | null
          shown_count: number | null
          suggested_teen_id: string
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          reason?: string | null
          score?: number | null
          shown_count?: number | null
          suggested_teen_id: string
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          reason?: string | null
          score?: number | null
          shown_count?: number | null
          suggested_teen_id?: string
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_suggestions_suggested_teen_id_fkey"
            columns: ["suggested_teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_suggestions_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friendship_level: number | null
          id: string
          initiated_by: string
          interaction_count: number | null
          is_best_friend: boolean | null
          is_favorite: boolean | null
          last_interaction_at: string | null
          nickname: string | null
          status: string | null
          updated_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friendship_level?: number | null
          id?: string
          initiated_by: string
          interaction_count?: number | null
          is_best_friend?: boolean | null
          is_favorite?: boolean | null
          last_interaction_at?: string | null
          nickname?: string | null
          status?: string | null
          updated_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friendship_level?: number | null
          id?: string
          initiated_by?: string
          interaction_count?: number | null
          is_best_friend?: boolean | null
          is_favorite?: boolean | null
          last_interaction_at?: string | null
          nickname?: string | null
          status?: string | null
          updated_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_share_cards: {
        Row: {
          content_data: Json
          content_id: string | null
          content_type: string
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          height: number | null
          id: string
          image_url: string
          share_count: number | null
          template_id: string | null
          thumbnail_url: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          content_data: Json
          content_id?: string | null
          content_type: string
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          height?: number | null
          id?: string
          image_url: string
          share_count?: number | null
          template_id?: string | null
          thumbnail_url?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          content_data?: Json
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          height?: number | null
          id?: string
          image_url?: string
          share_count?: number | null
          template_id?: string | null
          thumbnail_url?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_share_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "share_card_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_share_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      geolocation_zones: {
        Row: {
          created_at: string | null
          description: string | null
          discovery_xp: number | null
          event_id: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          name: string
          radius_meters: number | null
          venue_id: string | null
          zone_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discovery_xp?: number | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          name: string
          radius_meters?: number | null
          venue_id?: string | null
          zone_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discovery_xp?: number | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number | null
          venue_id?: string | null
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geolocation_zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string | null
          id: string
          posts_count: number | null
          tag: string
          trending_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          posts_count?: number | null
          tag: string
          trending_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          posts_count?: number | null
          tag?: string
          trending_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hidden_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string | null
          id: string
          leaderboard_type: string
          period_end: string
          period_label: string | null
          period_start: string
          rankings: Json
          total_participants: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          leaderboard_type: string
          period_end: string
          period_label?: string | null
          period_start: string
          rankings?: Json
          total_participants?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          leaderboard_type?: string
          period_end?: string
          period_label?: string | null
          period_start?: string
          rankings?: Json
          total_participants?: number | null
        }
        Relationships: []
      }
      memory_game_cards: {
        Row: {
          card_set: string
          created_at: string | null
          difficulty: string | null
          id: string
          image_url: string
          is_active: boolean | null
          label: string | null
          pair_id: string
        }
        Insert: {
          card_set: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          label?: string | null
          pair_id: string
        }
        Update: {
          card_set?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          label?: string | null
          pair_id?: string
        }
        Relationships: []
      }
      mini_game_participants: {
        Row: {
          finished_at: string | null
          game_state: Json | null
          id: string
          joined_at: string | null
          rank: number | null
          score: number | null
          session_id: string | null
          user_id: string | null
          xp_earned: number | null
        }
        Insert: {
          finished_at?: string | null
          game_state?: Json | null
          id?: string
          joined_at?: string | null
          rank?: number | null
          score?: number | null
          session_id?: string | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Update: {
          finished_at?: string | null
          game_state?: Json | null
          id?: string
          joined_at?: string | null
          rank?: number | null
          score?: number | null
          session_id?: string | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_game_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mini_game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_game_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          event_id: string | null
          game_data: Json | null
          game_type_id: string | null
          host_user_id: string | null
          id: string
          settings: Json | null
          started_at: string | null
          status: string | null
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          event_id?: string | null
          game_data?: Json | null
          game_type_id?: string | null
          host_user_id?: string | null
          id?: string
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          event_id?: string | null
          game_data?: Json | null
          game_type_id?: string | null
          host_user_id?: string | null
          id?: string
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_game_sessions_game_type_id_fkey"
            columns: ["game_type_id"]
            isOneToOne: false
            referencedRelation: "mini_game_types"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_game_types: {
        Row: {
          base_xp: number | null
          color: string | null
          cooldown_minutes: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_daily: boolean | null
          max_players: number | null
          min_players: number | null
          name: string
          rules: string | null
          slug: string
          time_limit_seconds: number | null
        }
        Insert: {
          base_xp?: number | null
          color?: string | null
          cooldown_minutes?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_daily?: boolean | null
          max_players?: number | null
          min_players?: number | null
          name: string
          rules?: string | null
          slug: string
          time_limit_seconds?: number | null
        }
        Update: {
          base_xp?: number | null
          color?: string | null
          cooldown_minutes?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_daily?: boolean | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          rules?: string | null
          slug?: string
          time_limit_seconds?: number | null
        }
        Relationships: []
      }
      mission_progress_log: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          id: string
          progress_after: number
          progress_increment: number
          user_mission_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          progress_after: number
          progress_increment: number
          user_mission_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          progress_after?: number
          progress_increment?: number
          user_mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_progress_log_user_mission_id_fkey"
            columns: ["user_mission_id"]
            isOneToOne: false
            referencedRelation: "user_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_templates: {
        Row: {
          bonus_rewards: Json | null
          category: string | null
          code: string
          color: string | null
          created_at: string | null
          description: string
          difficulty: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_repeatable: boolean | null
          mission_type: string
          name: string
          objective_config: Json | null
          objective_target: number
          objective_type: string
          season: string | null
          sort_order: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          xp_reward: number
        }
        Insert: {
          bonus_rewards?: Json | null
          category?: string | null
          code: string
          color?: string | null
          created_at?: string | null
          description: string
          difficulty?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_repeatable?: boolean | null
          mission_type: string
          name: string
          objective_config?: Json | null
          objective_target?: number
          objective_type: string
          season?: string | null
          sort_order?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          xp_reward?: number
        }
        Update: {
          bonus_rewards?: Json | null
          category?: string | null
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string
          difficulty?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_repeatable?: boolean | null
          mission_type?: string
          name?: string
          objective_config?: Json | null
          objective_target?: number
          objective_type?: string
          season?: string | null
          sort_order?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      music_quiz_questions: {
        Row: {
          album_art_url: string | null
          artist: string
          audio_preview_url: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          genre: string | null
          hint: string | null
          id: string
          is_active: boolean | null
          options: Json | null
          play_count: number | null
          points: number | null
          question_type: string | null
          release_year: number | null
          song_title: string
          success_rate: number | null
        }
        Insert: {
          album_art_url?: string | null
          artist: string
          audio_preview_url?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          genre?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          play_count?: number | null
          points?: number | null
          question_type?: string | null
          release_year?: number | null
          song_title: string
          success_rate?: number | null
        }
        Update: {
          album_art_url?: string | null
          artist?: string
          audio_preview_url?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          genre?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          play_count?: number | null
          points?: number | null
          question_type?: string | null
          release_year?: number | null
          song_title?: string
          success_rate?: number | null
        }
        Relationships: []
      }
      notification_analytics: {
        Row: {
          avg_time_to_click_seconds: number | null
          avg_time_to_read_seconds: number | null
          clicked_count: number | null
          created_at: string | null
          date: string
          delivered_count: number | null
          dismissed_count: number | null
          id: string
          read_count: number | null
          sent_count: number | null
          template_id: string | null
          total_coins_awarded: number | null
          total_xp_awarded: number | null
        }
        Insert: {
          avg_time_to_click_seconds?: number | null
          avg_time_to_read_seconds?: number | null
          clicked_count?: number | null
          created_at?: string | null
          date: string
          delivered_count?: number | null
          dismissed_count?: number | null
          id?: string
          read_count?: number | null
          sent_count?: number | null
          template_id?: string | null
          total_coins_awarded?: number | null
          total_xp_awarded?: number | null
        }
        Update: {
          avg_time_to_click_seconds?: number | null
          avg_time_to_read_seconds?: number | null
          clicked_count?: number | null
          created_at?: string | null
          date?: string
          delivered_count?: number | null
          dismissed_count?: number | null
          id?: string
          read_count?: number | null
          sent_count?: number | null
          template_id?: string | null
          total_coins_awarded?: number | null
          total_xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          achievements_enabled: boolean | null
          challenges_enabled: boolean | null
          created_at: string | null
          digest_enabled: boolean | null
          digest_time: string | null
          email_enabled: boolean | null
          events_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          max_daily_push: number | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          rewards_enabled: boolean | null
          social_enabled: boolean | null
          sounds_enabled: boolean | null
          system_enabled: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          achievements_enabled?: boolean | null
          challenges_enabled?: boolean | null
          created_at?: string | null
          digest_enabled?: boolean | null
          digest_time?: string | null
          email_enabled?: boolean | null
          events_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          max_daily_push?: number | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          rewards_enabled?: boolean | null
          social_enabled?: boolean | null
          sounds_enabled?: boolean | null
          system_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          achievements_enabled?: boolean | null
          challenges_enabled?: boolean | null
          created_at?: string | null
          digest_enabled?: boolean | null
          digest_time?: string | null
          email_enabled?: boolean | null
          events_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          max_daily_push?: number | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          rewards_enabled?: boolean | null
          social_enabled?: boolean | null
          sounds_enabled?: boolean | null
          system_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          action_label: string | null
          action_url: string | null
          animation: string | null
          auto_dismiss_seconds: number | null
          body_template: string
          category: string
          coin_reward: number | null
          color: string | null
          created_at: string | null
          emoji: string | null
          group_key: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_dismissable: boolean | null
          is_pushable: boolean | null
          max_group_size: number | null
          priority: string | null
          requires_action: boolean | null
          slug: string
          sound: string | null
          title_template: string
          xp_reward: number | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          animation?: string | null
          auto_dismiss_seconds?: number | null
          body_template: string
          category: string
          coin_reward?: number | null
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          group_key?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissable?: boolean | null
          is_pushable?: boolean | null
          max_group_size?: number | null
          priority?: string | null
          requires_action?: boolean | null
          slug: string
          sound?: string | null
          title_template: string
          xp_reward?: number | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          animation?: string | null
          auto_dismiss_seconds?: number | null
          body_template?: string
          category?: string
          coin_reward?: number | null
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          group_key?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissable?: boolean | null
          is_pushable?: boolean | null
          max_group_size?: number | null
          priority?: string | null
          requires_action?: boolean | null
          slug?: string
          sound?: string | null
          title_template?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      notification_triggers: {
        Row: {
          cooldown_minutes: number | null
          created_at: string | null
          delay_minutes: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_per_day: number | null
          max_per_week: number | null
          name: string
          slug: string
          template_id: string | null
          trigger_conditions: Json | null
          trigger_event: string
          use_smart_timing: boolean | null
        }
        Insert: {
          cooldown_minutes?: number | null
          created_at?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_per_week?: number | null
          name: string
          slug: string
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_event: string
          use_smart_timing?: boolean | null
        }
        Update: {
          cooldown_minutes?: number | null
          created_at?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_per_week?: number | null
          name?: string
          slug?: string
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_event?: string
          use_smart_timing?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_triggers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          accumulated_xp: number | null
          bonus_coins: number | null
          completed_at: string | null
          completion_completed: boolean | null
          completion_completed_at: string | null
          created_at: string | null
          earned_badges: string[] | null
          features_completed: boolean | null
          features_completed_at: string | null
          form_data: Json | null
          id: string
          profile_type_completed: boolean | null
          profile_type_completed_at: string | null
          setup_completed: boolean | null
          setup_completed_at: string | null
          showcase_completed: boolean | null
          showcase_completed_at: string | null
          started_at: string | null
          synced_at: string | null
          synced_to_teen_id: string | null
          temp_user_id: string
          updated_at: string | null
          user_type: string | null
          welcome_completed: boolean | null
          welcome_completed_at: string | null
        }
        Insert: {
          accumulated_xp?: number | null
          bonus_coins?: number | null
          completed_at?: string | null
          completion_completed?: boolean | null
          completion_completed_at?: string | null
          created_at?: string | null
          earned_badges?: string[] | null
          features_completed?: boolean | null
          features_completed_at?: string | null
          form_data?: Json | null
          id?: string
          profile_type_completed?: boolean | null
          profile_type_completed_at?: string | null
          setup_completed?: boolean | null
          setup_completed_at?: string | null
          showcase_completed?: boolean | null
          showcase_completed_at?: string | null
          started_at?: string | null
          synced_at?: string | null
          synced_to_teen_id?: string | null
          temp_user_id: string
          updated_at?: string | null
          user_type?: string | null
          welcome_completed?: boolean | null
          welcome_completed_at?: string | null
        }
        Update: {
          accumulated_xp?: number | null
          bonus_coins?: number | null
          completed_at?: string | null
          completion_completed?: boolean | null
          completion_completed_at?: string | null
          created_at?: string | null
          earned_badges?: string[] | null
          features_completed?: boolean | null
          features_completed_at?: string | null
          form_data?: Json | null
          id?: string
          profile_type_completed?: boolean | null
          profile_type_completed_at?: string | null
          setup_completed?: boolean | null
          setup_completed_at?: string | null
          showcase_completed?: boolean | null
          showcase_completed_at?: string | null
          started_at?: string | null
          synced_at?: string | null
          synced_to_teen_id?: string | null
          temp_user_id?: string
          updated_at?: string | null
          user_type?: string | null
          welcome_completed?: boolean | null
          welcome_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_synced_to_teen_id_fkey"
            columns: ["synced_to_teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_teen_links: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          teen_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          teen_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          teen_id?: string
        }
        Relationships: []
      }
      passion_path_levels: {
        Row: {
          created_at: string | null
          description: string | null
          exercises: Json | null
          id: string
          level_number: number
          name: string
          path_id: string
          prerequisites: Json | null
          tutorials: Json | null
          validation_config: Json | null
          validation_type: string | null
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          exercises?: Json | null
          id?: string
          level_number: number
          name: string
          path_id: string
          prerequisites?: Json | null
          tutorials?: Json | null
          validation_config?: Json | null
          validation_type?: string | null
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          exercises?: Json | null
          id?: string
          level_number?: number
          name?: string
          path_id?: string
          prerequisites?: Json | null
          tutorials?: Json | null
          validation_config?: Json | null
          validation_type?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "passion_path_levels_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "passion_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      passion_paths: {
        Row: {
          category: string
          code: string
          color: string | null
          completion_badge_id: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          thumbnail_url: string | null
          total_levels: number | null
          updated_at: string | null
          xp_per_level: number | null
        }
        Insert: {
          category: string
          code: string
          color?: string | null
          completion_badge_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          thumbnail_url?: string | null
          total_levels?: number | null
          updated_at?: string | null
          xp_per_level?: number | null
        }
        Update: {
          category?: string
          code?: string
          color?: string | null
          completion_badge_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          total_levels?: number | null
          updated_at?: string | null
          xp_per_level?: number | null
        }
        Relationships: []
      }
      passion_tutorial_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          progress_percent: number | null
          teen_id: string
          tutorial_id: string
          watch_time_seconds: number | null
          xp_earned: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          progress_percent?: number | null
          teen_id: string
          tutorial_id: string
          watch_time_seconds?: number | null
          xp_earned?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          progress_percent?: number | null
          teen_id?: string
          tutorial_id?: string
          watch_time_seconds?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "passion_tutorial_progress_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passion_tutorial_progress_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "passion_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      passion_tutorials: {
        Row: {
          category: string
          code: string
          completion_threshold: number | null
          content: Json | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_active: boolean | null
          level_required: number | null
          path_id: string | null
          thumbnail_url: string | null
          title: string
          video_duration_minutes: number | null
          video_url: string | null
          xp_reward: number | null
        }
        Insert: {
          category: string
          code: string
          completion_threshold?: number | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          level_required?: number | null
          path_id?: string | null
          thumbnail_url?: string | null
          title: string
          video_duration_minutes?: number | null
          video_url?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string
          code?: string
          completion_threshold?: number | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          level_required?: number | null
          path_id?: string | null
          thumbnail_url?: string | null
          title?: string
          video_duration_minutes?: number | null
          video_url?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "passion_tutorials_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "passion_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          approval_token: string | null
          approved_at: string | null
          approved_by: string | null
          approver_email: string | null
          approver_phone: string | null
          billing_cycle: string
          created_at: string | null
          expires_at: string | null
          id: string
          notes: string | null
          plan_id: string
          pos_location: string | null
          pos_reference: string | null
          request_type: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_email?: string | null
          approver_phone?: string | null
          billing_cycle: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          pos_location?: string | null
          pos_reference?: string | null
          request_type: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_email?: string | null
          approver_phone?: string | null
          billing_cycle?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          pos_location?: string | null
          pos_reference?: string | null
          request_type?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      personalized_content_assignments: {
        Row: {
          assigned_at: string | null
          assignment_reason: string | null
          completed_at: string | null
          content_id: string
          content_type: string
          expires_at: string | null
          id: string
          match_criteria: Json | null
          match_score: number | null
          status: string | null
          teen_id: string
          user_feedback: string | null
          user_rating: number | null
          viewed_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assignment_reason?: string | null
          completed_at?: string | null
          content_id: string
          content_type: string
          expires_at?: string | null
          id?: string
          match_criteria?: Json | null
          match_score?: number | null
          status?: string | null
          teen_id: string
          user_feedback?: string | null
          user_rating?: number | null
          viewed_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assignment_reason?: string | null
          completed_at?: string | null
          content_id?: string
          content_type?: string
          expires_at?: string | null
          id?: string
          match_criteria?: Json | null
          match_score?: number | null
          status?: string | null
          teen_id?: string
          user_feedback?: string | null
          user_rating?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personalized_content_assignments_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_challenges: {
        Row: {
          challenge_type: string
          code: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          objective_type: string
          objective_unit: string | null
          objective_value: number
          sport_category: string | null
          valid_from: string | null
          valid_until: string | null
          xp_reward: number | null
        }
        Insert: {
          challenge_type: string
          code: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          objective_type: string
          objective_unit?: string | null
          objective_value: number
          sport_category?: string | null
          valid_from?: string | null
          valid_until?: string | null
          xp_reward?: number | null
        }
        Update: {
          challenge_type?: string
          code?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          objective_type?: string
          objective_unit?: string | null
          objective_value?: number
          sport_category?: string | null
          valid_from?: string | null
          valid_until?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          feature_id: string
          is_enabled: boolean | null
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          feature_id: string
          is_enabled?: boolean | null
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          feature_id?: string
          is_enabled?: boolean | null
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "premium_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_averages: {
        Row: {
          active_users_30d: number | null
          active_users_7d: number | null
          avg_badges_per_user: number | null
          avg_challenges_per_user: number | null
          avg_event_streak: number | null
          avg_events_per_user: number | null
          avg_friends_per_user: number | null
          avg_games_per_user: number | null
          avg_login_streak: number | null
          avg_xp_per_user: number | null
          calculated_at: string | null
          id: string
          period: string | null
          total_users: number | null
        }
        Insert: {
          active_users_30d?: number | null
          active_users_7d?: number | null
          avg_badges_per_user?: number | null
          avg_challenges_per_user?: number | null
          avg_event_streak?: number | null
          avg_events_per_user?: number | null
          avg_friends_per_user?: number | null
          avg_games_per_user?: number | null
          avg_login_streak?: number | null
          avg_xp_per_user?: number | null
          calculated_at?: string | null
          id?: string
          period?: string | null
          total_users?: number | null
        }
        Update: {
          active_users_30d?: number | null
          active_users_7d?: number | null
          avg_badges_per_user?: number | null
          avg_challenges_per_user?: number | null
          avg_event_streak?: number | null
          avg_events_per_user?: number | null
          avg_friends_per_user?: number | null
          avg_games_per_user?: number | null
          avg_login_streak?: number | null
          avg_xp_per_user?: number | null
          calculated_at?: string | null
          id?: string
          period?: string | null
          total_users?: number | null
        }
        Relationships: []
      }
      post_hashtags: {
        Row: {
          hashtag_id: string
          post_id: string
        }
        Insert: {
          hashtag_id: string
          post_id: string
        }
        Update: {
          hashtag_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_questions: {
        Row: {
          bonus_points: number | null
          category: string
          correct_option_index: number | null
          created_at: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          max_bonus_slots: number | null
          options: Json
          points_for_correct: number | null
          question: string
          resolution_time: string | null
          status: string | null
          total_predictions: number | null
        }
        Insert: {
          bonus_points?: number | null
          category: string
          correct_option_index?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          max_bonus_slots?: number | null
          options: Json
          points_for_correct?: number | null
          question: string
          resolution_time?: string | null
          status?: string | null
          total_predictions?: number | null
        }
        Update: {
          bonus_points?: number | null
          category?: string
          correct_option_index?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          max_bonus_slots?: number | null
          options?: Json
          points_for_correct?: number | null
          question?: string
          resolution_time?: string | null
          status?: string | null
          total_predictions?: number | null
        }
        Relationships: []
      }
      premium_features: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          free_limit: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          free_limit?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          free_limit?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      presence_history: {
        Row: {
          activity: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          session_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          activity?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          session_id?: string | null
          started_at: string
          status: string
          user_id: string
        }
        Update: {
          activity?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          session_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_backgrounds: {
        Row: {
          background_type: string
          background_value: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_limited: boolean | null
          name: string
          overlay_opacity: number | null
          rarity: string | null
          slug: string
          unlock_requirement: Json | null
          unlock_type: string
        }
        Insert: {
          background_type: string
          background_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          name: string
          overlay_opacity?: number | null
          rarity?: string | null
          slug: string
          unlock_requirement?: Json | null
          unlock_type: string
        }
        Update: {
          background_type?: string
          background_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          name?: string
          overlay_opacity?: number | null
          rarity?: string | null
          slug?: string
          unlock_requirement?: Json | null
          unlock_type?: string
        }
        Relationships: []
      }
      profile_colors: {
        Row: {
          accent_color: string | null
          background_gradient: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          primary_color: string
          rarity: string | null
          secondary_color: string | null
          slug: string
          text_color: string | null
          unlock_requirement: Json | null
          unlock_type: string
        }
        Insert: {
          accent_color?: string | null
          background_gradient?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          primary_color: string
          rarity?: string | null
          secondary_color?: string | null
          slug: string
          text_color?: string | null
          unlock_requirement?: Json | null
          unlock_type: string
        }
        Update: {
          accent_color?: string | null
          background_gradient?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          primary_color?: string
          rarity?: string | null
          secondary_color?: string | null
          slug?: string
          text_color?: string | null
          unlock_requirement?: Json | null
          unlock_type?: string
        }
        Relationships: []
      }
      profile_frames: {
        Row: {
          animation_class: string | null
          available_until: string | null
          border_style: string | null
          created_at: string | null
          description: string | null
          frame_type: string
          gradient_colors: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_limited: boolean | null
          name: string
          rarity: string | null
          slug: string
          unlock_requirement: Json | null
          unlock_type: string
        }
        Insert: {
          animation_class?: string | null
          available_until?: string | null
          border_style?: string | null
          created_at?: string | null
          description?: string | null
          frame_type: string
          gradient_colors?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_limited?: boolean | null
          name: string
          rarity?: string | null
          slug: string
          unlock_requirement?: Json | null
          unlock_type: string
        }
        Update: {
          animation_class?: string | null
          available_until?: string | null
          border_style?: string | null
          created_at?: string | null
          description?: string | null
          frame_type?: string
          gradient_colors?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_limited?: boolean | null
          name?: string
          rarity?: string | null
          slug?: string
          unlock_requirement?: Json | null
          unlock_type?: string
        }
        Relationships: []
      }
      profile_titles: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          display_text: string
          emoji: string | null
          gradient: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_limited: boolean | null
          name: string
          rarity: string | null
          slug: string
          unlock_requirement: Json | null
          unlock_type: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_text: string
          emoji?: string | null
          gradient?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          name: string
          rarity?: string | null
          slug: string
          unlock_requirement?: Json | null
          unlock_type: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_text?: string
          emoji?: string | null
          gradient?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          name?: string
          rarity?: string | null
          slug?: string
          unlock_requirement?: Json | null
          unlock_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          id: string
          promo_code_id: string
          purchase_id: string | null
          used_at: string
          user_id: string
          xp_saved: number
        }
        Insert: {
          id?: string
          promo_code_id: string
          purchase_id?: string | null
          used_at?: string
          user_id: string
          xp_saved: number
        }
        Update: {
          id?: string
          promo_code_id?: string
          purchase_id?: string | null
          used_at?: string
          user_id?: string
          xp_saved?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "shop_promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "user_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_cycles: string[] | null
          applicable_plans: string[] | null
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          referrer_id: string | null
          referrer_reward_tokens: number | null
          referrer_reward_xp: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_cycles?: string[] | null
          applicable_plans?: string[] | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          referrer_id?: string | null
          referrer_reward_tokens?: number | null
          referrer_reward_xp?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_cycles?: string[] | null
          applicable_plans?: string[] | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          referrer_id?: string | null
          referrer_reward_tokens?: number | null
          referrer_reward_xp?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          browser: string | null
          created_at: string | null
          device_name: string | null
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          correct_count: number | null
          created_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number
          started_at: string
          teen_id: string
          time_spent_seconds: number | null
          total_questions: number | null
          xp_earned: number | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score: number
          started_at?: string
          teen_id: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          xp_earned?: number | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number
          started_at?: string
          teen_id?: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "educational_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          audio_url: string | null
          category: string
          correct_answer_index: number
          created_at: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          options: Json
          points: number | null
          question: string
          question_type: string | null
          time_limit_seconds: number | null
          times_correct: number | null
          times_shown: number | null
        }
        Insert: {
          audio_url?: string | null
          category: string
          correct_answer_index: number
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          options: Json
          points?: number | null
          question: string
          question_type?: string | null
          time_limit_seconds?: number | null
          times_correct?: number | null
          times_shown?: number | null
        }
        Update: {
          audio_url?: string | null
          category?: string
          correct_answer_index?: number
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          options?: Json
          points?: number | null
          question?: string
          question_type?: string | null
          time_limit_seconds?: number | null
          times_correct?: number | null
          times_shown?: number | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          referee_coins_reward: number | null
          referee_xp_reward: number | null
          referrer_coins_reward: number | null
          referrer_xp_reward: number | null
          successful_conversions: number | null
          total_uses: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referee_coins_reward?: number | null
          referee_xp_reward?: number | null
          referrer_coins_reward?: number | null
          referrer_xp_reward?: number | null
          successful_conversions?: number | null
          total_uses?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referee_coins_reward?: number | null
          referee_xp_reward?: number | null
          referrer_coins_reward?: number | null
          referrer_xp_reward?: number | null
          successful_conversions?: number | null
          total_uses?: number | null
          user_id?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referee_rewarded: boolean | null
          referral_code_id: string
          referred_user_id: string
          referrer_rewarded: boolean | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referee_rewarded?: boolean | null
          referral_code_id: string
          referred_user_id: string
          referrer_rewarded?: boolean | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referee_rewarded?: boolean | null
          referral_code_id?: string
          referred_user_id?: string
          referrer_rewarded?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      seasonal_challenges: {
        Row: {
          bonus_xp: number | null
          category: string
          challenge_type: string
          color: string | null
          created_at: string | null
          day_number: number | null
          description: string | null
          end_date: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          reward_data: Json | null
          reward_type: string | null
          season_id: string | null
          sort_order: number | null
          start_date: string | null
          target_count: number | null
          title: string
          unlock_condition: Json | null
          xp_reward: number
        }
        Insert: {
          bonus_xp?: number | null
          category: string
          challenge_type: string
          color?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          reward_data?: Json | null
          reward_type?: string | null
          season_id?: string | null
          sort_order?: number | null
          start_date?: string | null
          target_count?: number | null
          title: string
          unlock_condition?: Json | null
          xp_reward?: number
        }
        Update: {
          bonus_xp?: number | null
          category?: string
          challenge_type?: string
          color?: string | null
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          reward_data?: Json | null
          reward_type?: string | null
          season_id?: string | null
          sort_order?: number | null
          start_date?: string | null
          target_count?: number | null
          title?: string
          unlock_condition?: Json | null
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_challenges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_rewards: {
        Row: {
          created_at: string | null
          current_claims: number | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_limited: boolean | null
          max_claims: number | null
          rarity: string | null
          required_challenges: number | null
          required_points: number | null
          reward_data: Json | null
          reward_type: string
          season_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          current_claims?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          max_claims?: number | null
          rarity?: string | null
          required_challenges?: number | null
          required_points?: number | null
          reward_data?: Json | null
          reward_type: string
          season_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          current_claims?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_limited?: boolean | null
          max_claims?: number | null
          rarity?: string | null
          required_challenges?: number | null
          required_points?: number | null
          reward_data?: Json | null
          reward_type?: string
          season_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          start_date: string
          theme_color: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          start_date: string
          theme_color?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          start_date?: string
          theme_color?: string | null
        }
        Relationships: []
      }
      share_card_templates: {
        Row: {
          config: Json | null
          content_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          template_url: string
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          config?: Json | null
          content_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          template_url: string
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          config?: Json | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          template_url?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      share_image_templates: {
        Row: {
          background_type: string | null
          background_value: string | null
          created_at: string | null
          fonts: Json | null
          height: number | null
          id: string
          is_active: boolean | null
          layout: Json
          name: string
          slug: string
          updated_at: string | null
          width: number | null
        }
        Insert: {
          background_type?: string | null
          background_value?: string | null
          created_at?: string | null
          fonts?: Json | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          layout?: Json
          name: string
          slug: string
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          background_type?: string | null
          background_value?: string | null
          created_at?: string | null
          fonts?: Json | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          layout?: Json
          name?: string
          slug?: string
          updated_at?: string | null
          width?: number | null
        }
        Relationships: []
      }
      share_link_clicks: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          link_id: string
          platform: string | null
          referrer: string | null
          visitor_hash: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          link_id: string
          platform?: string | null
          referrer?: string | null
          visitor_hash?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          link_id?: string
          platform?: string | null
          referrer?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          click_count: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          short_code: string
          target_id: string | null
          target_type: string
          target_url: string
          unique_visitors: number | null
          user_id: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          short_code: string
          target_id?: string | null
          target_type: string
          target_url: string
          unique_visitors?: number | null
          user_id: string
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          short_code?: string
          target_id?: string | null
          target_type?: string
          target_url?: string
          unique_visitors?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      share_rewards: {
        Row: {
          click_bonus_xp: number | null
          click_milestone: number | null
          content_type: string | null
          created_at: string | null
          daily_limit: number | null
          id: string
          is_active: boolean | null
          platform: string
          tokens_reward: number | null
          weekly_limit: number | null
          xp_reward: number | null
        }
        Insert: {
          click_bonus_xp?: number | null
          click_milestone?: number | null
          content_type?: string | null
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          platform: string
          tokens_reward?: number | null
          weekly_limit?: number | null
          xp_reward?: number | null
        }
        Update: {
          click_bonus_xp?: number | null
          click_milestone?: number | null
          content_type?: string | null
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          platform?: string
          tokens_reward?: number | null
          weekly_limit?: number | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      share_templates: {
        Row: {
          coins_reward: number | null
          content_type: string
          created_at: string | null
          default_image_url: string | null
          description: string | null
          description_template: string | null
          first_share_bonus: number | null
          generate_image: boolean | null
          hashtags: string[] | null
          id: string
          image_template_id: string | null
          is_active: boolean | null
          name: string
          slug: string
          title_template: string
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          coins_reward?: number | null
          content_type: string
          created_at?: string | null
          default_image_url?: string | null
          description?: string | null
          description_template?: string | null
          first_share_bonus?: number | null
          generate_image?: boolean | null
          hashtags?: string[] | null
          id?: string
          image_template_id?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          title_template: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          coins_reward?: number | null
          content_type?: string
          created_at?: string | null
          default_image_url?: string | null
          description?: string | null
          description_template?: string | null
          first_share_bonus?: number | null
          generate_image?: boolean | null
          hashtags?: string[] | null
          id?: string
          image_template_id?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          title_template?: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      sharing_achievements: {
        Row: {
          badge_id: string | null
          coins_reward: number | null
          condition_platform_id: string | null
          condition_type: string
          condition_value: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          xp_reward: number | null
        }
        Insert: {
          badge_id?: string | null
          coins_reward?: number | null
          condition_platform_id?: string | null
          condition_type: string
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          xp_reward?: number | null
        }
        Update: {
          badge_id?: string | null
          coins_reward?: number | null
          condition_platform_id?: string | null
          condition_type?: string
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sharing_achievements_condition_platform_id_fkey"
            columns: ["condition_platform_id"]
            isOneToOne: false
            referencedRelation: "sharing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_platforms: {
        Row: {
          base_share_url: string | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          url_params: Json | null
        }
        Insert: {
          base_share_url?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          url_params?: Json | null
        }
        Update: {
          base_share_url?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          url_params?: Json | null
        }
        Relationships: []
      }
      shop_promo_codes: {
        Row: {
          applicable_category_ids: string[] | null
          applicable_reward_ids: string[] | null
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_xp_cost: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_category_ids?: string[] | null
          applicable_reward_ids?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_xp_cost?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_category_ids?: string[] | null
          applicable_reward_ids?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_xp_cost?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      shop_rewards: {
        Row: {
          available_from: string | null
          available_until: string | null
          category_id: string | null
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          min_level: number | null
          min_vip_tier: string | null
          name: string
          original_xp_cost: number | null
          purchase_limit_per_user: number | null
          purchase_limit_period: string | null
          required_badge_id: string | null
          reward_type: string
          reward_value: Json
          short_description: string | null
          stock_quantity: number | null
          stock_remaining: number | null
          stock_type: string
          updated_at: string
          vip_only: boolean
          xp_cost: number
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          min_level?: number | null
          min_vip_tier?: string | null
          name: string
          original_xp_cost?: number | null
          purchase_limit_per_user?: number | null
          purchase_limit_period?: string | null
          required_badge_id?: string | null
          reward_type: string
          reward_value?: Json
          short_description?: string | null
          stock_quantity?: number | null
          stock_remaining?: number | null
          stock_type?: string
          updated_at?: string
          vip_only?: boolean
          xp_cost: number
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          min_level?: number | null
          min_vip_tier?: string | null
          name?: string
          original_xp_cost?: number | null
          purchase_limit_per_user?: number | null
          purchase_limit_period?: string | null
          required_badge_id?: string | null
          reward_type?: string
          reward_value?: Json
          short_description?: string | null
          stock_quantity?: number | null
          stock_remaining?: number | null
          stock_type?: string
          updated_at?: string
          vip_only?: boolean
          xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_rewards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "reward_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_rewards_required_badge_id_fkey"
            columns: ["required_badge_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      social_shares: {
        Row: {
          click_count: number | null
          content_id: string | null
          content_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          platform: string
          share_description: string | null
          share_hashtags: string[] | null
          share_image_url: string | null
          share_title: string | null
          share_url: string | null
          user_id: string
          was_completed: boolean | null
        }
        Insert: {
          click_count?: number | null
          content_id?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform: string
          share_description?: string | null
          share_hashtags?: string[] | null
          share_image_url?: string | null
          share_title?: string | null
          share_url?: string | null
          user_id: string
          was_completed?: boolean | null
        }
        Update: {
          click_count?: number | null
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: string
          share_description?: string | null
          share_hashtags?: string[] | null
          share_image_url?: string | null
          share_title?: string | null
          share_url?: string | null
          user_id?: string
          was_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "social_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      special_challenge_submissions: {
        Row: {
          accuracy_meters: number | null
          answers: Json | null
          challenge_id: string
          content: Json
          id: string
          image_url: string | null
          is_validated: boolean | null
          latitude: number | null
          longitude: number | null
          rejection_reason: string | null
          score: number | null
          submission_type: string
          submitted_at: string | null
          thumbnail_url: string | null
          time_taken_seconds: number | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          vote_count: number | null
          xp_awarded: number | null
        }
        Insert: {
          accuracy_meters?: number | null
          answers?: Json | null
          challenge_id: string
          content: Json
          id?: string
          image_url?: string | null
          is_validated?: boolean | null
          latitude?: number | null
          longitude?: number | null
          rejection_reason?: string | null
          score?: number | null
          submission_type: string
          submitted_at?: string | null
          thumbnail_url?: string | null
          time_taken_seconds?: number | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          vote_count?: number | null
          xp_awarded?: number | null
        }
        Update: {
          accuracy_meters?: number | null
          answers?: Json | null
          challenge_id?: string
          content?: Json
          id?: string
          image_url?: string | null
          is_validated?: boolean | null
          latitude?: number | null
          longitude?: number | null
          rejection_reason?: string | null
          score?: number | null
          submission_type?: string
          submitted_at?: string | null
          thumbnail_url?: string | null
          time_taken_seconds?: number | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          vote_count?: number | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "special_challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "special_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_challenge_submissions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      special_challenge_types: {
        Row: {
          auto_validate: boolean | null
          base_xp_reward: number | null
          challenge_category: string
          color: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          icon: string
          id: string
          is_active: boolean | null
          max_participants: number | null
          min_level_required: number | null
          name: string
          participation_xp: number | null
          requires_validation: boolean | null
          slug: string
          winner_bonus_xp: number | null
        }
        Insert: {
          auto_validate?: boolean | null
          base_xp_reward?: number | null
          challenge_category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          icon: string
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          min_level_required?: number | null
          name: string
          participation_xp?: number | null
          requires_validation?: boolean | null
          slug: string
          winner_bonus_xp?: number | null
        }
        Update: {
          auto_validate?: boolean | null
          base_xp_reward?: number | null
          challenge_category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          icon?: string
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          min_level_required?: number | null
          name?: string
          participation_xp?: number | null
          requires_validation?: boolean | null
          slug?: string
          winner_bonus_xp?: number | null
        }
        Relationships: []
      }
      special_challenges: {
        Row: {
          challenge_type_id: string
          config: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string
          event_id: string | null
          id: string
          instructions: string | null
          is_flash: boolean | null
          starts_at: string
          status: string | null
          title: string
          total_participants: number | null
          winner_id: string | null
        }
        Insert: {
          challenge_type_id: string
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at: string
          event_id?: string | null
          id?: string
          instructions?: string | null
          is_flash?: boolean | null
          starts_at: string
          status?: string | null
          title: string
          total_participants?: number | null
          winner_id?: string | null
        }
        Update: {
          challenge_type_id?: string
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string
          event_id?: string | null
          id?: string
          instructions?: string | null
          is_flash?: boolean | null
          starts_at?: string
          status?: string | null
          title?: string
          total_participants?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_challenges_challenge_type_id_fkey"
            columns: ["challenge_type_id"]
            isOneToOne: false
            referencedRelation: "special_challenge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_challenges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_clubs: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_partner: boolean | null
          logo_url: string | null
          name: string
          sport_type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_partner?: boolean | null
          logo_url?: string | null
          name: string
          sport_type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_partner?: boolean | null
          logo_url?: string | null
          name?: string
          sport_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          discount_amount: number | null
          external_reference: string | null
          final_amount: number
          gateway_response: Json | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          metadata: Json | null
          payment_method: string
          period_end: string | null
          period_start: string | null
          plan_id: string
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          external_reference?: string | null
          final_amount: number
          gateway_response?: Json | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          payment_method: string
          period_end?: string | null
          period_start?: string | null
          plan_id: string
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          discount_amount?: number | null
          external_reference?: string | null
          final_amount?: number
          gateway_response?: Json | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          badge_label: string | null
          code: string
          color: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          discount_quarterly_percent: number | null
          discount_yearly_percent: number | null
          features: Json | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          name_ar: string | null
          plan_type: string
          price_lifetime: number | null
          price_monthly: number | null
          price_quarterly: number | null
          price_yearly: number | null
          sort_order: number | null
          tier: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          badge_label?: string | null
          code: string
          color?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          discount_quarterly_percent?: number | null
          discount_yearly_percent?: number | null
          features?: Json | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          name_ar?: string | null
          plan_type: string
          price_lifetime?: number | null
          price_monthly?: number | null
          price_quarterly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          tier?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_label?: string | null
          code?: string
          color?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          discount_quarterly_percent?: number | null
          discount_yearly_percent?: number | null
          features?: Json | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_ar?: string | null
          plan_type?: string
          price_lifetime?: number | null
          price_monthly?: number | null
          price_quarterly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          tier?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teen_behavioral_profile: {
        Row: {
          abandonment_rate: number | null
          analysis_version: number | null
          attention_span_minutes: number | null
          average_quiz_score: number | null
          average_session_duration_minutes: number | null
          avoided_subjects: string[] | null
          best_subject: string | null
          completion_rate: number | null
          confidence_score: number | null
          created_at: string | null
          engagement_score: number | null
          id: string
          improvement_rate: number | null
          last_analyzed_at: string | null
          learning_style: string | null
          most_active_day: string | null
          most_active_hour: number | null
          optimal_quiz_length: number | null
          preferred_content_types: string[] | null
          preferred_difficulty: string | null
          preferred_subjects: string[] | null
          struggling_subject: string | null
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          abandonment_rate?: number | null
          analysis_version?: number | null
          attention_span_minutes?: number | null
          average_quiz_score?: number | null
          average_session_duration_minutes?: number | null
          avoided_subjects?: string[] | null
          best_subject?: string | null
          completion_rate?: number | null
          confidence_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          improvement_rate?: number | null
          last_analyzed_at?: string | null
          learning_style?: string | null
          most_active_day?: string | null
          most_active_hour?: number | null
          optimal_quiz_length?: number | null
          preferred_content_types?: string[] | null
          preferred_difficulty?: string | null
          preferred_subjects?: string[] | null
          struggling_subject?: string | null
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          abandonment_rate?: number | null
          analysis_version?: number | null
          attention_span_minutes?: number | null
          average_quiz_score?: number | null
          average_session_duration_minutes?: number | null
          avoided_subjects?: string[] | null
          best_subject?: string | null
          completion_rate?: number | null
          confidence_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          improvement_rate?: number | null
          last_analyzed_at?: string | null
          learning_style?: string | null
          most_active_day?: string | null
          most_active_hour?: number | null
          optimal_quiz_length?: number | null
          preferred_content_types?: string[] | null
          preferred_difficulty?: string | null
          preferred_subjects?: string[] | null
          struggling_subject?: string | null
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_behavioral_profile_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: true
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_club_memberships: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          joined_at: string
          left_at: string | null
          status: string | null
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          status?: string | null
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          status?: string | null
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "sport_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teen_club_memberships_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_creations: {
        Row: {
          category: string
          comments_count: number | null
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          likes_count: number | null
          media_type: string
          media_url: string
          path_id: string | null
          shares_count: number | null
          tags: Json | null
          teen_id: string
          thumbnail_url: string | null
          title: string
          tutorial_id: string | null
          updated_at: string | null
          visibility: string | null
          xp_awarded: number | null
        }
        Insert: {
          category: string
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          media_type: string
          media_url: string
          path_id?: string | null
          shares_count?: number | null
          tags?: Json | null
          teen_id: string
          thumbnail_url?: string | null
          title: string
          tutorial_id?: string | null
          updated_at?: string | null
          visibility?: string | null
          xp_awarded?: number | null
        }
        Update: {
          category?: string
          comments_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          media_type?: string
          media_url?: string
          path_id?: string | null
          shares_count?: number | null
          tags?: Json | null
          teen_id?: string
          thumbnail_url?: string | null
          title?: string
          tutorial_id?: string | null
          updated_at?: string | null
          visibility?: string | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_creations_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "passion_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teen_creations_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teen_creations_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "passion_tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_grades: {
        Row: {
          created_at: string | null
          grade: number
          grade_date: string
          grade_type: string | null
          id: string
          max_grade: number
          rejection_reason: string | null
          school_year: string | null
          status: string | null
          subject: string
          subject_label: string
          teen_id: string
          term: string | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          xp_awarded: number | null
        }
        Insert: {
          created_at?: string | null
          grade: number
          grade_date?: string
          grade_type?: string | null
          id?: string
          max_grade?: number
          rejection_reason?: string | null
          school_year?: string | null
          status?: string | null
          subject: string
          subject_label: string
          teen_id: string
          term?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          xp_awarded?: number | null
        }
        Update: {
          created_at?: string | null
          grade?: number
          grade_date?: string
          grade_type?: string | null
          id?: string
          max_grade?: number
          rejection_reason?: string | null
          school_year?: string | null
          status?: string | null
          subject?: string
          subject_label?: string
          teen_id?: string
          term?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_grades_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_passion_path_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          current_level: number | null
          exercises_completed: Json | null
          id: string
          last_activity_at: string | null
          level_progress_percent: number | null
          path_id: string
          started_at: string | null
          teen_id: string
          total_xp_earned: number | null
          tutorials_completed: Json | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          current_level?: number | null
          exercises_completed?: Json | null
          id?: string
          last_activity_at?: string | null
          level_progress_percent?: number | null
          path_id: string
          started_at?: string | null
          teen_id: string
          total_xp_earned?: number | null
          tutorials_completed?: Json | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          current_level?: number | null
          exercises_completed?: Json | null
          id?: string
          last_activity_at?: string | null
          level_progress_percent?: number | null
          path_id?: string
          started_at?: string | null
          teen_id?: string
          total_xp_earned?: number | null
          tutorials_completed?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_passion_path_progress_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "passion_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teen_passion_path_progress_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_personal_records: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          id: string
          improvement_percent: number | null
          previous_value: number | null
          proof_url: string | null
          record_category: string | null
          record_type: string
          teen_id: string
          unit: string
          value: number
          verified: boolean | null
          xp_awarded: number | null
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          id?: string
          improvement_percent?: number | null
          previous_value?: number | null
          proof_url?: string | null
          record_category?: string | null
          record_type: string
          teen_id: string
          unit: string
          value: number
          verified?: boolean | null
          xp_awarded?: number | null
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          id?: string
          improvement_percent?: number | null
          previous_value?: number | null
          proof_url?: string | null
          record_category?: string | null
          record_type?: string
          teen_id?: string
          unit?: string
          value?: number
          verified?: boolean | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_personal_records_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_physical_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_value: number | null
          id: string
          objective_value: number
          progress_percent: number | null
          proof_type: string | null
          proof_url: string | null
          started_at: string | null
          teen_id: string
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          xp_earned: number | null
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          objective_value: number
          progress_percent?: number | null
          proof_type?: string | null
          proof_url?: string | null
          started_at?: string | null
          teen_id: string
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          xp_earned?: number | null
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_value?: number | null
          id?: string
          objective_value?: number
          progress_percent?: number | null
          proof_type?: string | null
          proof_url?: string | null
          started_at?: string | null
          teen_id?: string
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teen_physical_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "physical_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teen_physical_challenge_progress_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      teens: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          curriculum: string | null
          date_of_birth: string | null
          first_name: string | null
          id: string
          last_name: string | null
          parent_id: string | null
          primary_language: string | null
          pseudo: string | null
          school_type: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          parent_id?: string | null
          primary_language?: string | null
          pseudo?: string | null
          school_type?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          parent_id?: string | null
          primary_language?: string | null
          pseudo?: string | null
          school_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      token_limits_tracking: {
        Row: {
          daily_count: number | null
          daily_reset_at: string | null
          id: string
          last_used_at: string | null
          monthly_count: number | null
          monthly_reset_at: string | null
          source_code: string
          teen_id: string
          total_count: number | null
          weekly_count: number | null
          weekly_reset_at: string | null
        }
        Insert: {
          daily_count?: number | null
          daily_reset_at?: string | null
          id?: string
          last_used_at?: string | null
          monthly_count?: number | null
          monthly_reset_at?: string | null
          source_code: string
          teen_id: string
          total_count?: number | null
          weekly_count?: number | null
          weekly_reset_at?: string | null
        }
        Update: {
          daily_count?: number | null
          daily_reset_at?: string | null
          id?: string
          last_used_at?: string | null
          monthly_count?: number | null
          monthly_reset_at?: string | null
          source_code?: string
          teen_id?: string
          total_count?: number | null
          weekly_count?: number | null
          weekly_reset_at?: string | null
        }
        Relationships: []
      }
      token_redemptions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          delivered_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          redemption_code: string | null
          reward_id: string
          shipped_at: string | null
          shipping_address: Json | null
          status: string | null
          teen_id: string
          token_type: string | null
          tokens_spent: number
          tracking_number: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          redemption_code?: string | null
          reward_id: string
          shipped_at?: string | null
          shipping_address?: Json | null
          status?: string | null
          teen_id: string
          token_type?: string | null
          tokens_spent: number
          tracking_number?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          redemption_code?: string | null
          reward_id?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          status?: string | null
          teen_id?: string
          token_type?: string | null
          tokens_spent?: number
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "token_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      token_rewards: {
        Row: {
          available_from: string | null
          available_until: string | null
          category: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          max_per_user: number | null
          min_level: number | null
          name: string
          name_ar: string | null
          premium_only: boolean | null
          requires_shipping: boolean | null
          shipping_zones: string[] | null
          stock_quantity: number | null
          stock_remaining: number | null
          stock_type: string | null
          token_cost: number
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_per_user?: number | null
          min_level?: number | null
          name: string
          name_ar?: string | null
          premium_only?: boolean | null
          requires_shipping?: boolean | null
          shipping_zones?: string[] | null
          stock_quantity?: number | null
          stock_remaining?: number | null
          stock_type?: string | null
          token_cost: number
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_per_user?: number | null
          min_level?: number | null
          name?: string
          name_ar?: string | null
          premium_only?: boolean | null
          requires_shipping?: boolean | null
          shipping_zones?: string[] | null
          stock_quantity?: number | null
          stock_remaining?: number | null
          stock_type?: string | null
          token_cost?: number
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      token_sources: {
        Row: {
          base_amount: number
          code: string
          cooldown_minutes: number | null
          created_at: string | null
          daily_limit: number | null
          description: string | null
          id: string
          is_active: boolean | null
          min_level: number | null
          monthly_limit: number | null
          name: string
          premium_multiplier: number | null
          required_subscription: string | null
          token_type: string | null
          weekly_limit: number | null
        }
        Insert: {
          base_amount: number
          code: string
          cooldown_minutes?: number | null
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_level?: number | null
          monthly_limit?: number | null
          name: string
          premium_multiplier?: number | null
          required_subscription?: string | null
          token_type?: string | null
          weekly_limit?: number | null
        }
        Update: {
          base_amount?: number
          code?: string
          cooldown_minutes?: number | null
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_level?: number | null
          monthly_limit?: number | null
          name?: string
          premium_multiplier?: number | null
          required_subscription?: string | null
          token_type?: string | null
          weekly_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_sources_token_type_fkey"
            columns: ["token_type"]
            isOneToOne: false
            referencedRelation: "token_types"
            referencedColumns: ["code"]
          },
        ]
      }
      token_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          multiplier_applied: number | null
          related_user_id: string | null
          source_code: string | null
          source_id: string | null
          teen_id: string
          token_type: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          multiplier_applied?: number | null
          related_user_id?: string | null
          source_code?: string | null
          source_id?: string | null
          teen_id: string
          token_type?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          multiplier_applied?: number | null
          related_user_id?: string | null
          source_code?: string | null
          source_id?: string | null
          teen_id?: string
          token_type?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      token_transfers: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string | null
          token_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string | null
          token_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string | null
          token_type?: string | null
        }
        Relationships: []
      }
      token_types: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          exchange_rate: number | null
          expires_days: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_purchasable: boolean | null
          is_tradeable: boolean | null
          name: string
          name_ar: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          expires_days?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_purchasable?: boolean | null
          is_tradeable?: boolean | null
          name: string
          name_ar?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          expires_days?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_purchasable?: boolean | null
          is_tradeable?: boolean | null
          name?: string
          name_ar?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string | null
          id: string
          is_unlocked: boolean | null
          notified_at: string | null
          progress: number | null
          teen_id: string
          unlocked_at: string | null
          updated_at: string | null
        }
        Insert: {
          achievement_id: string
          created_at?: string | null
          id?: string
          is_unlocked?: boolean | null
          notified_at?: string | null
          progress?: number | null
          teen_id: string
          unlocked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          achievement_id?: string
          created_at?: string | null
          id?: string
          is_unlocked?: boolean | null
          notified_at?: string | null
          progress?: number | null
          teen_id?: string
          unlocked_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type_id: string
          comments_count: number | null
          created_at: string | null
          data: Json | null
          description: string | null
          hidden_reason: string | null
          id: string
          image_url: string | null
          is_hidden: boolean | null
          is_highlighted: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          shares_count: number | null
          target_id: string | null
          target_type: string | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          activity_type_id: string
          comments_count?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          hidden_reason?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean | null
          is_highlighted?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          shares_count?: number | null
          target_id?: string | null
          target_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          activity_type_id?: string
          comments_count?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          hidden_reason?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean | null
          is_highlighted?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          shares_count?: number | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_advent_progress: {
        Row: {
          advent_calendar_id: string | null
          challenge_completed: boolean | null
          created_at: string | null
          day_number: number
          id: string
          opened_at: string | null
          reward_claimed: boolean | null
          user_id: string | null
          xp_earned: number | null
        }
        Insert: {
          advent_calendar_id?: string | null
          challenge_completed?: boolean | null
          created_at?: string | null
          day_number: number
          id?: string
          opened_at?: string | null
          reward_claimed?: boolean | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Update: {
          advent_calendar_id?: string | null
          challenge_completed?: boolean | null
          created_at?: string | null
          day_number?: number
          id?: string
          opened_at?: string | null
          reward_claimed?: boolean | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_advent_progress_advent_calendar_id_fkey"
            columns: ["advent_calendar_id"]
            isOneToOne: false
            referencedRelation: "advent_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_annual_wrapped: {
        Row: {
          created_at: string | null
          first_viewed_at: string | null
          generated_at: string | null
          id: string
          is_public: boolean | null
          share_count: number | null
          share_token: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          wrapped_data: Json
          year: number
        }
        Insert: {
          created_at?: string | null
          first_viewed_at?: string | null
          generated_at?: string | null
          id?: string
          is_public?: boolean | null
          share_count?: number | null
          share_token?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          wrapped_data?: Json
          year: number
        }
        Update: {
          created_at?: string | null
          first_viewed_at?: string | null
          generated_at?: string | null
          id?: string
          is_public?: boolean | null
          share_count?: number | null
          share_token?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          wrapped_data?: Json
          year?: number
        }
        Relationships: []
      }
      user_bonus_spins: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          source: string
          spins_remaining: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          source: string
          spins_remaining?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          spins_remaining?: number
          user_id?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          lifetime_earned: number | null
          lifetime_spent: number | null
          pending_tokens: number | null
          premium_tokens: number | null
          seasonal_tokens: number | null
          teen_id: string
          token_multiplier: number | null
          total_lifetime_tokens: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_spent?: number | null
          pending_tokens?: number | null
          premium_tokens?: number | null
          seasonal_tokens?: number | null
          teen_id: string
          token_multiplier?: number | null
          total_lifetime_tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_spent?: number | null
          pending_tokens?: number | null
          premium_tokens?: number | null
          seasonal_tokens?: number | null
          teen_id?: string
          token_multiplier?: number | null
          total_lifetime_tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_collectibles: {
        Row: {
          created_at: string | null
          gifted_by_user_id: string | null
          id: string
          is_favorite: boolean | null
          is_new: boolean | null
          item_id: string
          obtained_at: string | null
          obtained_from: string | null
          quantity: number | null
          source_event_id: string | null
          source_game_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gifted_by_user_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_new?: boolean | null
          item_id: string
          obtained_at?: string | null
          obtained_from?: string | null
          quantity?: number | null
          source_event_id?: string | null
          source_game_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gifted_by_user_id?: string | null
          id?: string
          is_favorite?: boolean | null
          is_new?: boolean | null
          item_id?: string
          obtained_at?: string | null
          obtained_from?: string | null
          quantity?: number | null
          source_event_id?: string | null
          source_game_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collectibles_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "collectible_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collection_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          items_collected: number | null
          rewards_claimed: boolean | null
          rewards_claimed_at: string | null
          set_id: string
          total_items: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          items_collected?: number | null
          rewards_claimed?: boolean | null
          rewards_claimed_at?: string | null
          set_id: string
          total_items?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          items_collected?: number | null
          rewards_claimed?: boolean | null
          rewards_claimed_at?: string | null
          set_id?: string
          total_items?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_progress_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "collection_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_activity: {
        Row: {
          activity_date: string
          badges_unlocked: number | null
          challenge_streak: number | null
          challenges_completed: number | null
          coins_earned: number | null
          created_at: string | null
          event_streak: number | null
          events_attended: number | null
          friends_made: number | null
          games_played: number | null
          id: string
          login_streak: number | null
          messages_sent: number | null
          photos_uploaded: number | null
          predictions_made: number | null
          reviews_written: number | null
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          activity_date?: string
          badges_unlocked?: number | null
          challenge_streak?: number | null
          challenges_completed?: number | null
          coins_earned?: number | null
          created_at?: string | null
          event_streak?: number | null
          events_attended?: number | null
          friends_made?: number | null
          games_played?: number | null
          id?: string
          login_streak?: number | null
          messages_sent?: number | null
          photos_uploaded?: number | null
          predictions_made?: number | null
          reviews_written?: number | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          activity_date?: string
          badges_unlocked?: number | null
          challenge_streak?: number | null
          challenges_completed?: number | null
          coins_earned?: number | null
          created_at?: string | null
          event_streak?: number | null
          events_attended?: number | null
          friends_made?: number | null
          games_played?: number | null
          id?: string
          login_streak?: number | null
          messages_sent?: number | null
          photos_uploaded?: number | null
          predictions_made?: number | null
          reviews_written?: number | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      user_event_challenge_progress: {
        Row: {
          completed_at: string | null
          event_challenge_id: string
          id: string
          progress_data: Json | null
          progress_value: number | null
          started_at: string | null
          status: string | null
          teen_id: string
          xp_awarded: number | null
        }
        Insert: {
          completed_at?: string | null
          event_challenge_id: string
          id?: string
          progress_data?: Json | null
          progress_value?: number | null
          started_at?: string | null
          status?: string | null
          teen_id: string
          xp_awarded?: number | null
        }
        Update: {
          completed_at?: string | null
          event_challenge_id?: string
          id?: string
          progress_data?: Json | null
          progress_value?: number | null
          started_at?: string | null
          status?: string | null
          teen_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_event_challenge_progress_event_challenge_id_fkey"
            columns: ["event_challenge_id"]
            isOneToOne: false
            referencedRelation: "event_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_event_challenge_progress_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lifetime_stats: {
        Row: {
          average_review_rating: number | null
          average_stay_duration_minutes: number | null
          best_memory_time_seconds: number | null
          challenge_completion_rate: number | null
          created_at: string | null
          current_challenge_streak: number | null
          current_event_streak: number | null
          current_login_streak: number | null
          earliest_arrival_time: string | null
          favorite_challenge_type: string | null
          favorite_day_of_week: number | null
          favorite_event_type: string | null
          favorite_game: string | null
          first_activity_at: string | null
          game_win_rate: number | null
          highest_quiz_score: number | null
          id: string
          last_activity_at: string | null
          last_event_date: string | null
          last_login_date: string | null
          latest_departure_time: string | null
          longest_challenge_streak: number | null
          longest_event_streak: number | null
          longest_login_streak: number | null
          prediction_accuracy: number | null
          predictions_correct: number | null
          predictions_total: number | null
          rarest_badge_id: string | null
          total_badges_earned: number | null
          total_challenges_completed: number | null
          total_challenges_failed: number | null
          total_coins_earned: number | null
          total_coins_spent: number | null
          total_comments_posted: number | null
          total_crews_joined: number | null
          total_duels_played: number | null
          total_duels_won: number | null
          total_event_hours: number | null
          total_events_attended: number | null
          total_friend_requests_received: number | null
          total_friend_requests_sent: number | null
          total_friends: number | null
          total_game_wins: number | null
          total_games_played: number | null
          total_items_owned: number | null
          total_photos_liked: number | null
          total_photos_uploaded: number | null
          total_purchases: number | null
          total_reviews_written: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_review_rating?: number | null
          average_stay_duration_minutes?: number | null
          best_memory_time_seconds?: number | null
          challenge_completion_rate?: number | null
          created_at?: string | null
          current_challenge_streak?: number | null
          current_event_streak?: number | null
          current_login_streak?: number | null
          earliest_arrival_time?: string | null
          favorite_challenge_type?: string | null
          favorite_day_of_week?: number | null
          favorite_event_type?: string | null
          favorite_game?: string | null
          first_activity_at?: string | null
          game_win_rate?: number | null
          highest_quiz_score?: number | null
          id?: string
          last_activity_at?: string | null
          last_event_date?: string | null
          last_login_date?: string | null
          latest_departure_time?: string | null
          longest_challenge_streak?: number | null
          longest_event_streak?: number | null
          longest_login_streak?: number | null
          prediction_accuracy?: number | null
          predictions_correct?: number | null
          predictions_total?: number | null
          rarest_badge_id?: string | null
          total_badges_earned?: number | null
          total_challenges_completed?: number | null
          total_challenges_failed?: number | null
          total_coins_earned?: number | null
          total_coins_spent?: number | null
          total_comments_posted?: number | null
          total_crews_joined?: number | null
          total_duels_played?: number | null
          total_duels_won?: number | null
          total_event_hours?: number | null
          total_events_attended?: number | null
          total_friend_requests_received?: number | null
          total_friend_requests_sent?: number | null
          total_friends?: number | null
          total_game_wins?: number | null
          total_games_played?: number | null
          total_items_owned?: number | null
          total_photos_liked?: number | null
          total_photos_uploaded?: number | null
          total_purchases?: number | null
          total_reviews_written?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_review_rating?: number | null
          average_stay_duration_minutes?: number | null
          best_memory_time_seconds?: number | null
          challenge_completion_rate?: number | null
          created_at?: string | null
          current_challenge_streak?: number | null
          current_event_streak?: number | null
          current_login_streak?: number | null
          earliest_arrival_time?: string | null
          favorite_challenge_type?: string | null
          favorite_day_of_week?: number | null
          favorite_event_type?: string | null
          favorite_game?: string | null
          first_activity_at?: string | null
          game_win_rate?: number | null
          highest_quiz_score?: number | null
          id?: string
          last_activity_at?: string | null
          last_event_date?: string | null
          last_login_date?: string | null
          latest_departure_time?: string | null
          longest_challenge_streak?: number | null
          longest_event_streak?: number | null
          longest_login_streak?: number | null
          prediction_accuracy?: number | null
          predictions_correct?: number | null
          predictions_total?: number | null
          rarest_badge_id?: string | null
          total_badges_earned?: number | null
          total_challenges_completed?: number | null
          total_challenges_failed?: number | null
          total_coins_earned?: number | null
          total_coins_spent?: number | null
          total_comments_posted?: number | null
          total_crews_joined?: number | null
          total_duels_played?: number | null
          total_duels_won?: number | null
          total_event_hours?: number | null
          total_events_attended?: number | null
          total_friend_requests_received?: number | null
          total_friend_requests_sent?: number | null
          total_friends?: number | null
          total_game_wins?: number | null
          total_games_played?: number | null
          total_items_owned?: number | null
          total_photos_liked?: number | null
          total_photos_uploaded?: number | null
          total_purchases?: number | null
          total_reviews_written?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_milestones: {
        Row: {
          achieved_at: string | null
          badge_id: string | null
          coins_reward: number | null
          id: string
          milestone_type: string
          milestone_value: number | null
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          achieved_at?: string | null
          badge_id?: string | null
          coins_reward?: number | null
          id?: string
          milestone_type: string
          milestone_value?: number | null
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          achieved_at?: string | null
          badge_id?: string | null
          coins_reward?: number | null
          id?: string
          milestone_type?: string
          milestone_value?: number | null
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          mission_id: string
          period_end: string
          period_start: string
          progress: number | null
          progress_data: Json | null
          rewards_claimed: Json | null
          status: string
          teen_id: string
          updated_at: string | null
          xp_earned: number | null
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mission_id: string
          period_end: string
          period_start: string
          progress?: number | null
          progress_data?: Json | null
          rewards_claimed?: Json | null
          status?: string
          teen_id: string
          updated_at?: string | null
          xp_earned?: number | null
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mission_id?: string
          period_end?: string
          period_start?: string
          progress?: number | null
          progress_data?: Json | null
          rewards_claimed?: Json | null
          status?: string
          teen_id?: string
          updated_at?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_monthly_stats: {
        Row: {
          activity_change_percent: number | null
          badges_earned: number | null
          challenges_completed: number | null
          coins_earned: number | null
          created_at: string | null
          events_attended: number | null
          games_played: number | null
          id: string
          month_year: string
          monthly_rank: number | null
          percentile: number | null
          updated_at: string | null
          user_id: string
          xp_change_percent: number | null
          xp_earned: number | null
        }
        Insert: {
          activity_change_percent?: number | null
          badges_earned?: number | null
          challenges_completed?: number | null
          coins_earned?: number | null
          created_at?: string | null
          events_attended?: number | null
          games_played?: number | null
          id?: string
          month_year: string
          monthly_rank?: number | null
          percentile?: number | null
          updated_at?: string | null
          user_id: string
          xp_change_percent?: number | null
          xp_earned?: number | null
        }
        Update: {
          activity_change_percent?: number | null
          badges_earned?: number | null
          challenges_completed?: number | null
          coins_earned?: number | null
          created_at?: string | null
          events_attended?: number | null
          games_played?: number | null
          id?: string
          month_year?: string
          monthly_rank?: number | null
          percentile?: number | null
          updated_at?: string | null
          user_id?: string
          xp_change_percent?: number | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          animation: string | null
          body: string
          clicked_at: string | null
          coin_reward: number | null
          color: string | null
          created_at: string | null
          data: Json | null
          dismissed_at: string | null
          emoji: string | null
          expires_at: string | null
          group_count: number | null
          group_key: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_clicked: boolean | null
          is_dismissed: boolean | null
          is_read: boolean | null
          priority: string | null
          push_clicked: boolean | null
          push_sent: boolean | null
          push_sent_at: string | null
          read_at: string | null
          rewards_claimed: boolean | null
          scheduled_for: string | null
          template_id: string | null
          title: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          animation?: string | null
          body: string
          clicked_at?: string | null
          coin_reward?: number | null
          color?: string | null
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          emoji?: string | null
          expires_at?: string | null
          group_count?: number | null
          group_key?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_clicked?: boolean | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string | null
          push_clicked?: boolean | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read_at?: string | null
          rewards_claimed?: boolean | null
          scheduled_for?: string | null
          template_id?: string | null
          title: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          animation?: string | null
          body?: string
          clicked_at?: string | null
          coin_reward?: number | null
          color?: string | null
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          emoji?: string | null
          expires_at?: string | null
          group_count?: number | null
          group_key?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_clicked?: boolean | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          priority?: string | null
          push_clicked?: boolean | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read_at?: string | null
          rewards_claimed?: boolean | null
          scheduled_for?: string | null
          template_id?: string | null
          title?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_personal_records: {
        Row: {
          achieved_at: string | null
          context_data: Json | null
          id: string
          previous_record: number | null
          record_type: string
          record_value: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          context_data?: Json | null
          id?: string
          previous_record?: number | null
          record_type: string
          record_value: number
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          context_data?: Json | null
          id?: string
          previous_record?: number | null
          record_type?: string
          record_value?: number
          user_id?: string
        }
        Relationships: []
      }
      user_predictions: {
        Row: {
          bonus_earned: boolean | null
          confidence: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          prediction_question_id: string | null
          prediction_time: string | null
          selected_option_index: number
          user_id: string | null
        }
        Insert: {
          bonus_earned?: boolean | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          prediction_question_id?: string | null
          prediction_time?: string | null
          selected_option_index: number
          user_id?: string | null
        }
        Update: {
          bonus_earned?: boolean | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          prediction_question_id?: string | null
          prediction_time?: string | null
          selected_option_index?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_predictions_prediction_question_id_fkey"
            columns: ["prediction_question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string | null
          current_activity: string | null
          current_page: string | null
          device_id: string | null
          device_type: string | null
          id: string
          last_heartbeat_at: string | null
          last_seen_at: string | null
          session_started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_activity?: string | null
          current_page?: string | null
          device_id?: string | null
          device_type?: string | null
          id?: string
          last_heartbeat_at?: string | null
          last_seen_at?: string | null
          session_started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_activity?: string | null
          current_page?: string | null
          device_id?: string | null
          device_type?: string | null
          id?: string
          last_heartbeat_at?: string | null
          last_seen_at?: string | null
          session_started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profile_customization: {
        Row: {
          bio_emoji: string | null
          created_at: string | null
          custom_bio: string | null
          custom_status: string | null
          equipped_background_id: string | null
          equipped_color_id: string | null
          equipped_frame_id: string | null
          equipped_title_id: string | null
          id: string
          show_badges_count: boolean | null
          show_crew: boolean | null
          show_events_count: boolean | null
          show_friends_count: boolean | null
          show_level: boolean | null
          show_xp: boolean | null
          showcase_badge_ids: string[] | null
          status_emoji: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio_emoji?: string | null
          created_at?: string | null
          custom_bio?: string | null
          custom_status?: string | null
          equipped_background_id?: string | null
          equipped_color_id?: string | null
          equipped_frame_id?: string | null
          equipped_title_id?: string | null
          id?: string
          show_badges_count?: boolean | null
          show_crew?: boolean | null
          show_events_count?: boolean | null
          show_friends_count?: boolean | null
          show_level?: boolean | null
          show_xp?: boolean | null
          showcase_badge_ids?: string[] | null
          status_emoji?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio_emoji?: string | null
          created_at?: string | null
          custom_bio?: string | null
          custom_status?: string | null
          equipped_background_id?: string | null
          equipped_color_id?: string | null
          equipped_frame_id?: string | null
          equipped_title_id?: string | null
          id?: string
          show_badges_count?: boolean | null
          show_crew?: boolean | null
          show_events_count?: boolean | null
          show_friends_count?: boolean | null
          show_level?: boolean | null
          show_xp?: boolean | null
          showcase_badge_ids?: string[] | null
          status_emoji?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_customization_equipped_background_id_fkey"
            columns: ["equipped_background_id"]
            isOneToOne: false
            referencedRelation: "profile_backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_customization_equipped_color_id_fkey"
            columns: ["equipped_color_id"]
            isOneToOne: false
            referencedRelation: "profile_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_customization_equipped_frame_id_fkey"
            columns: ["equipped_frame_id"]
            isOneToOne: false
            referencedRelation: "profile_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_customization_equipped_title_id_fkey"
            columns: ["equipped_title_id"]
            isOneToOne: false
            referencedRelation: "profile_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progression: {
        Row: {
          achievements_unlocked: number | null
          challenges_completed: number | null
          coins: number | null
          created_at: string | null
          current_level: number | null
          events_attended: number | null
          id: string
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements_unlocked?: number | null
          challenges_completed?: number | null
          coins?: number | null
          created_at?: string | null
          current_level?: number | null
          events_attended?: number | null
          id?: string
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements_unlocked?: number | null
          challenges_completed?: number | null
          coins?: number | null
          created_at?: string | null
          current_level?: number | null
          events_attended?: number | null
          id?: string
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          purchase_metadata: Json | null
          quantity: number
          reward_id: string
          status: string
          used_at: string | null
          used_at_event_id: string | null
          user_id: string
          xp_spent: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          purchase_metadata?: Json | null
          quantity?: number
          reward_id: string
          status?: string
          used_at?: string | null
          used_at_event_id?: string | null
          user_id: string
          xp_spent: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          purchase_metadata?: Json | null
          quantity?: number
          reward_id?: string
          status?: string
          used_at?: string | null
          used_at_event_id?: string | null
          user_id?: string
          xp_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "shop_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_seasonal_progress: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string | null
          current_count: number | null
          id: string
          seasonal_challenge_id: string | null
          status: string | null
          unlocked_at: string | null
          updated_at: string | null
          user_id: string | null
          xp_earned: number | null
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          seasonal_challenge_id?: string | null
          status?: string | null
          unlocked_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          seasonal_challenge_id?: string | null
          status?: string | null
          unlocked_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_seasonal_progress_seasonal_challenge_id_fkey"
            columns: ["seasonal_challenge_id"]
            isOneToOne: false
            referencedRelation: "seasonal_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_seasonal_rewards: {
        Row: {
          claimed_at: string | null
          id: string
          seasonal_reward_id: string | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          seasonal_reward_id?: string | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          id?: string
          seasonal_reward_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_seasonal_rewards_seasonal_reward_id_fkey"
            columns: ["seasonal_reward_id"]
            isOneToOne: false
            referencedRelation: "seasonal_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_share_stats: {
        Row: {
          best_share_clicks: number | null
          best_share_id: string | null
          daily_reset_at: string | null
          daily_shares: number | null
          id: string
          shares_by_platform: Json | null
          shares_by_type: Json | null
          total_clicks: number | null
          total_shares: number | null
          total_xp_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_share_clicks?: number | null
          best_share_id?: string | null
          daily_reset_at?: string | null
          daily_shares?: number | null
          id?: string
          shares_by_platform?: Json | null
          shares_by_type?: Json | null
          total_clicks?: number | null
          total_shares?: number | null
          total_xp_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_share_clicks?: number | null
          best_share_id?: string | null
          daily_reset_at?: string | null
          daily_shares?: number | null
          id?: string
          shares_by_platform?: Json | null
          shares_by_type?: Json | null
          total_clicks?: number | null
          total_shares?: number | null
          total_xp_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_share_stats_best_share_id_fkey"
            columns: ["best_share_id"]
            isOneToOne: false
            referencedRelation: "social_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_share_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_shares: {
        Row: {
          click_count: number | null
          coins_earned: number | null
          content_id: string | null
          content_type: string
          conversion_count: number | null
          created_at: string | null
          id: string
          platform_id: string
          rewards_claimed: boolean | null
          share_code: string | null
          shared_description: string | null
          shared_image_url: string | null
          shared_title: string
          shared_url: string | null
          template_id: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          click_count?: number | null
          coins_earned?: number | null
          content_id?: string | null
          content_type: string
          conversion_count?: number | null
          created_at?: string | null
          id?: string
          platform_id: string
          rewards_claimed?: boolean | null
          share_code?: string | null
          shared_description?: string | null
          shared_image_url?: string | null
          shared_title: string
          shared_url?: string | null
          template_id?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          click_count?: number | null
          coins_earned?: number | null
          content_id?: string | null
          content_type?: string
          conversion_count?: number | null
          created_at?: string | null
          id?: string
          platform_id?: string
          rewards_claimed?: boolean | null
          share_code?: string | null
          shared_description?: string | null
          shared_image_url?: string | null
          shared_title?: string
          shared_url?: string | null
          template_id?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_shares_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "sharing_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_shares_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "share_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sharing_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sharing_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "sharing_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sharing_stats: {
        Row: {
          created_at: string | null
          current_share_streak: number | null
          first_share_at: string | null
          id: string
          last_share_date: string | null
          longest_share_streak: number | null
          shares_by_platform: Json | null
          shares_by_type: Json | null
          total_clicks: number | null
          total_coins_earned: number | null
          total_conversions: number | null
          total_shares: number | null
          total_xp_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_share_streak?: number | null
          first_share_at?: string | null
          id?: string
          last_share_date?: string | null
          longest_share_streak?: number | null
          shares_by_platform?: Json | null
          shares_by_type?: Json | null
          total_clicks?: number | null
          total_coins_earned?: number | null
          total_conversions?: number | null
          total_shares?: number | null
          total_xp_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_share_streak?: number | null
          first_share_at?: string | null
          id?: string
          last_share_date?: string | null
          longest_share_streak?: number | null
          shares_by_platform?: Json | null
          shares_by_type?: Json | null
          total_clicks?: number | null
          total_coins_earned?: number | null
          total_conversions?: number | null
          total_shares?: number | null
          total_xp_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          streak_freezes: number | null
          streak_started_at: string | null
          teen_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_freezes?: number | null
          streak_started_at?: string | null
          teen_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_freezes?: number | null
          streak_started_at?: string | null
          teen_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount_paid: number | null
          auto_renew: boolean | null
          billing_cycle: string
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string
          id: string
          last_payment_date: string | null
          metadata: Json | null
          next_payment_date: string | null
          payment_method: string | null
          plan_id: string
          status: string
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          auto_renew?: boolean | null
          billing_cycle: string
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          last_payment_date?: string | null
          metadata?: Json | null
          next_payment_date?: string | null
          payment_method?: string | null
          plan_id: string
          status?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          last_payment_date?: string | null
          metadata?: Json | null
          next_payment_date?: string | null
          payment_method?: string | null
          plan_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unlocked_backgrounds: {
        Row: {
          background_id: string
          id: string
          unlock_source: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          background_id: string
          id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          background_id?: string
          id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_backgrounds_background_id_fkey"
            columns: ["background_id"]
            isOneToOne: false
            referencedRelation: "profile_backgrounds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unlocked_colors: {
        Row: {
          color_id: string
          id: string
          unlock_source: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          color_id: string
          id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          color_id?: string
          id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "profile_colors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unlocked_frames: {
        Row: {
          frame_id: string
          id: string
          unlock_source: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          frame_id: string
          id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          frame_id?: string
          id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_frames_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "profile_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unlocked_titles: {
        Row: {
          id: string
          title_id: string
          unlock_source: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          title_id: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          title_id?: string
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "profile_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vip_status: {
        Row: {
          benefits_used_count: number | null
          created_at: string | null
          current_period_xp: number | null
          current_tier_id: string
          events_attended: number | null
          first_event_date: string | null
          highest_tier_achieved_id: string | null
          id: string
          last_month_processed: string | null
          lifetime_xp: number | null
          monthly_coins_claimed: boolean | null
          monthly_coins_claimed_at: string | null
          months_active: number | null
          next_tier_id: string | null
          progress_percentage: number | null
          tier_achieved_at: string | null
          tier_history: Json | null
          total_savings: number | null
          updated_at: string | null
          user_id: string
          xp_to_next_tier: number | null
        }
        Insert: {
          benefits_used_count?: number | null
          created_at?: string | null
          current_period_xp?: number | null
          current_tier_id: string
          events_attended?: number | null
          first_event_date?: string | null
          highest_tier_achieved_id?: string | null
          id?: string
          last_month_processed?: string | null
          lifetime_xp?: number | null
          monthly_coins_claimed?: boolean | null
          monthly_coins_claimed_at?: string | null
          months_active?: number | null
          next_tier_id?: string | null
          progress_percentage?: number | null
          tier_achieved_at?: string | null
          tier_history?: Json | null
          total_savings?: number | null
          updated_at?: string | null
          user_id: string
          xp_to_next_tier?: number | null
        }
        Update: {
          benefits_used_count?: number | null
          created_at?: string | null
          current_period_xp?: number | null
          current_tier_id?: string
          events_attended?: number | null
          first_event_date?: string | null
          highest_tier_achieved_id?: string | null
          id?: string
          last_month_processed?: string | null
          lifetime_xp?: number | null
          monthly_coins_claimed?: boolean | null
          monthly_coins_claimed_at?: string | null
          months_active?: number | null
          next_tier_id?: string | null
          progress_percentage?: number | null
          tier_achieved_at?: string | null
          tier_history?: Json | null
          total_savings?: number | null
          updated_at?: string | null
          user_id?: string
          xp_to_next_tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vip_status_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vip_status_highest_tier_achieved_id_fkey"
            columns: ["highest_tier_achieved_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vip_status_next_tier_id_fkey"
            columns: ["next_tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wheel_spins: {
        Row: {
          created_at: string
          id: string
          reward_type: string
          reward_value: Json
          segment_id: string
          spin_date: string
          spin_type: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          reward_type: string
          reward_value: Json
          segment_id: string
          spin_date?: string
          spin_type?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          reward_type?: string
          reward_value?: Json
          segment_id?: string
          spin_date?: string
          spin_type?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_wheel_spins_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "wheel_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wishlists: {
        Row: {
          added_at: string
          id: string
          notify_on_sale: boolean
          reward_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          notify_on_sale?: boolean
          reward_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          notify_on_sale?: boolean
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wishlists_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "shop_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          balance_multiplier: number | null
          crea_score: number | null
          created_at: string | null
          current_level: number | null
          id: string
          last_balance_check: string | null
          school_score: number | null
          sport_score: number | null
          teen_id: string
          total_xp: number | null
          updated_at: string | null
          xp_multiplier: number | null
          xp_to_next_level: number | null
        }
        Insert: {
          balance_multiplier?: number | null
          crea_score?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_balance_check?: string | null
          school_score?: number | null
          sport_score?: number | null
          teen_id: string
          total_xp?: number | null
          updated_at?: string | null
          xp_multiplier?: number | null
          xp_to_next_level?: number | null
        }
        Update: {
          balance_multiplier?: number | null
          crea_score?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_balance_check?: string | null
          school_score?: number | null
          sport_score?: number | null
          teen_id?: string
          total_xp?: number | null
          updated_at?: string | null
          xp_multiplier?: number | null
          xp_to_next_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: true
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      vip_benefits_log: {
        Row: {
          benefit_type: string
          benefit_value: number | null
          context: string | null
          created_at: string | null
          id: string
          tier_id: string
          user_id: string
        }
        Insert: {
          benefit_type: string
          benefit_value?: number | null
          context?: string | null
          created_at?: string | null
          id?: string
          tier_id: string
          user_id: string
        }
        Update: {
          benefit_type?: string
          benefit_value?: number | null
          context?: string | null
          created_at?: string | null
          id?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_benefits_log_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_exclusive_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          item_id: string
          item_type: string
          min_tier_id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_id: string
          item_type: string
          min_tier_id: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_id?: string
          item_type?: string
          min_tier_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_exclusive_items_min_tier_id_fkey"
            columns: ["min_tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_perks: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_highlighted: boolean | null
          name: string
          slug: string
          sort_order: number | null
          tier_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_highlighted?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          tier_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_highlighted?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_perks_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_tiers: {
        Row: {
          badge_url: string | null
          can_create_crew: boolean | null
          can_host_private_events: boolean | null
          coin_multiplier: number | null
          color: string
          created_at: string | null
          custom_frame: boolean | null
          custom_title: boolean | null
          dedicated_support: boolean | null
          description: string | null
          discount_percentage: number | null
          drop_rate_bonus: number | null
          early_access_hours: number | null
          emoji: string | null
          exclusive_events: boolean | null
          frame_url: string | null
          free_monthly_coins: number | null
          gradient: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          leaderboard_highlight: boolean | null
          max_crew_size: number | null
          max_daily_packs: number | null
          max_daily_wheel_spins: number | null
          min_events_attended: number | null
          min_lifetime_xp: number
          min_months_active: number | null
          name: string
          priority_queue: boolean | null
          profile_highlight: boolean | null
          slug: string
          tier_level: number
          xp_multiplier: number | null
        }
        Insert: {
          badge_url?: string | null
          can_create_crew?: boolean | null
          can_host_private_events?: boolean | null
          coin_multiplier?: number | null
          color: string
          created_at?: string | null
          custom_frame?: boolean | null
          custom_title?: boolean | null
          dedicated_support?: boolean | null
          description?: string | null
          discount_percentage?: number | null
          drop_rate_bonus?: number | null
          early_access_hours?: number | null
          emoji?: string | null
          exclusive_events?: boolean | null
          frame_url?: string | null
          free_monthly_coins?: number | null
          gradient?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          leaderboard_highlight?: boolean | null
          max_crew_size?: number | null
          max_daily_packs?: number | null
          max_daily_wheel_spins?: number | null
          min_events_attended?: number | null
          min_lifetime_xp?: number
          min_months_active?: number | null
          name: string
          priority_queue?: boolean | null
          profile_highlight?: boolean | null
          slug: string
          tier_level: number
          xp_multiplier?: number | null
        }
        Update: {
          badge_url?: string | null
          can_create_crew?: boolean | null
          can_host_private_events?: boolean | null
          coin_multiplier?: number | null
          color?: string
          created_at?: string | null
          custom_frame?: boolean | null
          custom_title?: boolean | null
          dedicated_support?: boolean | null
          description?: string | null
          discount_percentage?: number | null
          drop_rate_bonus?: number | null
          early_access_hours?: number | null
          emoji?: string | null
          exclusive_events?: boolean | null
          frame_url?: string | null
          free_monthly_coins?: number | null
          gradient?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          leaderboard_highlight?: boolean | null
          max_crew_size?: number | null
          max_daily_packs?: number | null
          max_daily_wheel_spins?: number | null
          min_events_attended?: number | null
          min_lifetime_xp?: number
          min_months_active?: number | null
          name?: string
          priority_queue?: boolean | null
          profile_highlight?: boolean | null
          slug?: string
          tier_level?: number
          xp_multiplier?: number | null
        }
        Relationships: []
      }
      weekly_game_leaderboard: {
        Row: {
          best_score: number | null
          created_at: string | null
          game_type_id: string | null
          games_played: number | null
          id: string
          rank: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string | null
          week_start: string
          win_count: number | null
        }
        Insert: {
          best_score?: number | null
          created_at?: string | null
          game_type_id?: string | null
          games_played?: number | null
          id?: string
          rank?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          week_start: string
          win_count?: number | null
        }
        Update: {
          best_score?: number | null
          created_at?: string | null
          game_type_id?: string | null
          games_played?: number | null
          id?: string
          rank?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          week_start?: string
          win_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_game_leaderboard_game_type_id_fkey"
            columns: ["game_type_id"]
            isOneToOne: false
            referencedRelation: "mini_game_types"
            referencedColumns: ["id"]
          },
        ]
      }
      wheel_jackpots: {
        Row: {
          contribution_percent: number
          created_at: string
          current_pool: number
          id: string
          is_active: boolean
          min_pool: number
          name: string
          winner_id: string | null
          won_amount: number | null
          won_at: string | null
        }
        Insert: {
          contribution_percent?: number
          created_at?: string
          current_pool?: number
          id?: string
          is_active?: boolean
          min_pool?: number
          name: string
          winner_id?: string | null
          won_amount?: number | null
          won_at?: string | null
        }
        Update: {
          contribution_percent?: number
          created_at?: string
          current_pool?: number
          id?: string
          is_active?: boolean
          min_pool?: number
          name?: string
          winner_id?: string | null
          won_amount?: number | null
          won_at?: string | null
        }
        Relationships: []
      }
      wheel_segments: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          min_level: number | null
          name: string
          probability: number
          reward_type: string
          reward_value: Json
          segment_index: number
          vip_only: boolean
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          min_level?: number | null
          name: string
          probability: number
          reward_type: string
          reward_value?: Json
          segment_index: number
          vip_only?: boolean
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          min_level?: number | null
          name?: string
          probability?: number
          reward_type?: string
          reward_value?: Json
          segment_index?: number
          vip_only?: boolean
        }
        Relationships: []
      }
      wheel_streaks: {
        Row: {
          best_streak: number
          current_streak: number
          last_spin_date: string | null
          streak_multiplier: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          last_spin_date?: string | null
          streak_multiplier?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          last_spin_date?: string | null
          streak_multiplier?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wrapped_achievements: {
        Row: {
          achievement_slug: string
          created_at: string | null
          description: string | null
          emoji: string | null
          id: string
          rarity: string | null
          title: string
          wrapped_id: string
        }
        Insert: {
          achievement_slug: string
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          rarity?: string | null
          title: string
          wrapped_id: string
        }
        Update: {
          achievement_slug?: string
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          rarity?: string | null
          title?: string
          wrapped_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapped_achievements_wrapped_id_fkey"
            columns: ["wrapped_id"]
            isOneToOne: false
            referencedRelation: "user_annual_wrapped"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapped_comparisons: {
        Row: {
          comparison_type: string
          comparison_value: number | null
          created_at: string | null
          fun_text: string | null
          id: string
          percentage_diff: number | null
          title: string
          user_value: number | null
          wrapped_id: string
        }
        Insert: {
          comparison_type: string
          comparison_value?: number | null
          created_at?: string | null
          fun_text?: string | null
          id?: string
          percentage_diff?: number | null
          title: string
          user_value?: number | null
          wrapped_id: string
        }
        Update: {
          comparison_type?: string
          comparison_value?: number | null
          created_at?: string | null
          fun_text?: string | null
          id?: string
          percentage_diff?: number | null
          title?: string
          user_value?: number | null
          wrapped_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapped_comparisons_wrapped_id_fkey"
            columns: ["wrapped_id"]
            isOneToOne: false
            referencedRelation: "user_annual_wrapped"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapped_highlights: {
        Row: {
          created_at: string | null
          description: string | null
          highlight_type: string
          id: string
          metadata: Json | null
          rank: number | null
          title: string
          unit: string | null
          value: number | null
          wrapped_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          highlight_type: string
          id?: string
          metadata?: Json | null
          rank?: number | null
          title: string
          unit?: string | null
          value?: number | null
          wrapped_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          highlight_type?: string
          id?: string
          metadata?: Json | null
          rank?: number | null
          title?: string
          unit?: string | null
          value?: number | null
          wrapped_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapped_highlights_wrapped_id_fkey"
            columns: ["wrapped_id"]
            isOneToOne: false
            referencedRelation: "user_annual_wrapped"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_monthly: {
        Row: {
          best_weekly_rank: number | null
          challenges_completed: number | null
          created_at: string | null
          events_attended: number | null
          id: string
          month: number
          streak_max: number | null
          teen_id: string
          updated_at: string | null
          xp_earned: number | null
          year: number
        }
        Insert: {
          best_weekly_rank?: number | null
          challenges_completed?: number | null
          created_at?: string | null
          events_attended?: number | null
          id?: string
          month: number
          streak_max?: number | null
          teen_id: string
          updated_at?: string | null
          xp_earned?: number | null
          year: number
        }
        Update: {
          best_weekly_rank?: number | null
          challenges_completed?: number | null
          created_at?: string | null
          events_attended?: number | null
          id?: string
          month?: number
          streak_max?: number | null
          teen_id?: string
          updated_at?: string | null
          xp_earned?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_monthly_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_payment_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_payment_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_shop_items: {
        Row: {
          available: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          xp_cost: number
        }
        Insert: {
          available?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          xp_cost: number
        }
        Update: {
          available?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          xp_cost?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          description: string | null
          id: string
          multiplier_applied: number | null
          reference_id: string | null
          reference_type: string | null
          source_id: string | null
          source_type: string
          teen_id: string
          type: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          multiplier_applied?: number | null
          reference_id?: string | null
          reference_type?: string | null
          source_id?: string | null
          source_type: string
          teen_id: string
          type?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          multiplier_applied?: number | null
          reference_id?: string | null
          reference_type?: string | null
          source_id?: string | null
          source_type?: string
          teen_id?: string
          type?: string | null
        }
        Relationships: []
      }
      xp_weekly: {
        Row: {
          challenges_completed: number | null
          created_at: string | null
          events_attended: number | null
          id: string
          streak_max: number | null
          teen_id: string
          updated_at: string | null
          week_end: string
          week_number: number
          week_start: string
          xp_earned: number | null
          year: number
        }
        Insert: {
          challenges_completed?: number | null
          created_at?: string | null
          events_attended?: number | null
          id?: string
          streak_max?: number | null
          teen_id: string
          updated_at?: string | null
          week_end: string
          week_number: number
          week_start: string
          xp_earned?: number | null
          year: number
        }
        Update: {
          challenges_completed?: number | null
          created_at?: string | null
          events_attended?: number | null
          id?: string
          streak_max?: number | null
          teen_id?: string
          updated_at?: string | null
          week_end?: string
          week_number?: number
          week_start?: string
          xp_earned?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_weekly_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_leaderboard_all_time: {
        Row: {
          avatar_url: string | null
          city: string | null
          current_streak: number | null
          level: number | null
          longest_streak: number | null
          percentile: number | null
          pseudo: string | null
          rank: number | null
          teen_id: string | null
          total_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: true
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      v_leaderboard_monthly: {
        Row: {
          avatar_url: string | null
          best_weekly_rank: number | null
          challenges_completed: number | null
          city: string | null
          events_attended: number | null
          level: number | null
          month: number | null
          pseudo: string | null
          rank: number | null
          streak_max: number | null
          teen_id: string | null
          xp_earned: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_monthly_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
      v_leaderboard_weekly: {
        Row: {
          avatar_url: string | null
          challenges_completed: number | null
          city: string | null
          events_attended: number | null
          level: number | null
          pseudo: string | null
          rank: number | null
          streak_max: number | null
          teen_id: string | null
          week_end: string | null
          week_start: string | null
          xp_earned: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_weekly_teen_id_fkey"
            columns: ["teen_id"]
            isOneToOne: false
            referencedRelation: "teens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_friend_request: {
        Args: { p_receiver_id: string; p_request_id: string }
        Returns: string
      }
      add_activity_comment: {
        Args: {
          p_activity_id: string
          p_content: string
          p_parent_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      add_coins_to_user: {
        Args: {
          p_amount: number
          p_description?: string
          p_source_id?: string
          p_source_type: string
          p_teen_id: string
          p_transaction_type: string
        }
        Returns: Json
      }
      add_collectible_to_user: {
        Args: {
          p_gifted_by?: string
          p_item_id: string
          p_source?: string
          p_source_event_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      add_feed_comment: {
        Args: {
          p_content: string
          p_media_url?: string
          p_parent_id?: string
          p_post_id: string
          p_user_id: string
        }
        Returns: string
      }
      add_message_reaction: {
        Args: { p_emoji: string; p_message_id: string; p_teen_id: string }
        Returns: Json
      }
      add_tokens_to_user: {
        Args: {
          p_amount: number
          p_description?: string
          p_force_no_limit?: boolean
          p_source_code: string
          p_source_id?: string
          p_teen_id: string
          p_token_type?: string
        }
        Returns: Json
      }
      add_vip_xp: {
        Args: { p_source?: string; p_user_id: string; p_xp: number }
        Returns: Json
      }
      add_xp_to_user: {
        Args: {
          p_description?: string
          p_source_category?: string
          p_source_id?: string
          p_source_type: string
          p_teen_id: string
          p_xp_amount: number
        }
        Returns: Json
      }
      are_friends: {
        Args: { p_user1: string; p_user2: string }
        Returns: boolean
      }
      assign_missions_for_period: {
        Args: { p_date?: string; p_mission_type: string; p_teen_id: string }
        Returns: Json
      }
      calculate_balance_bonus: { Args: { p_teen_id: string }; Returns: Json }
      calculate_content_match_score: {
        Args: { p_content_params: Json; p_teen_id: string }
        Returns: number
      }
      calculate_content_reliability: {
        Args: { p_content_id: string; p_content_type: string }
        Returns: number
      }
      calculate_crea_score: { Args: { p_teen_id: string }; Returns: number }
      calculate_school_score: { Args: { p_teen_id: string }; Returns: number }
      calculate_sport_score: { Args: { p_teen_id: string }; Returns: number }
      calculate_teen_behavioral_profile: {
        Args: { p_teen_id: string }
        Returns: Json
      }
      calculate_vip_tier: { Args: { p_user_id: string }; Returns: Json }
      can_spin_wheel: { Args: { p_user_id: string }; Returns: Json }
      cancel_subscription: {
        Args: { p_immediate?: boolean; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      check_achievements_for_user: {
        Args: { p_teen_id: string }
        Returns: Json
      }
      check_crew_achievements: { Args: { p_crew_id: string }; Returns: number }
      check_expired_challenges: { Args: never; Returns: number }
      check_feature_access: {
        Args: { p_feature_code: string; p_user_id: string }
        Returns: Json
      }
      check_in_to_event: {
        Args: {
          p_event_id: string
          p_latitude?: number
          p_longitude?: number
          p_method?: string
          p_teen_id: string
        }
        Returns: Json
      }
      check_out_from_event: {
        Args: { p_event_id: string; p_teen_id: string }
        Returns: Json
      }
      check_sharing_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_user_milestones: { Args: { p_user_id: string }; Returns: Json }
      claim_daily_bonus: { Args: { p_teen_id: string }; Returns: Json }
      claim_mission_rewards: {
        Args: { p_teen_id: string; p_user_mission_id: string }
        Returns: Json
      }
      claim_monthly_vip_coins: { Args: { p_user_id: string }; Returns: Json }
      claim_notification_rewards: {
        Args: { p_notification_id: string; p_user_id: string }
        Returns: Json
      }
      claim_set_completion_rewards: {
        Args: { p_set_id: string; p_user_id: string }
        Returns: Json
      }
      cleanup_old_onboarding_progress: { Args: never; Returns: number }
      cleanup_stale_presence: {
        Args: { p_timeout_minutes?: number }
        Returns: number
      }
      complete_challenge: {
        Args: { p_challenge_id: string; p_winner_id?: string }
        Returns: Json
      }
      complete_event_challenge: {
        Args: {
          p_challenge_slug: string
          p_event_id: string
          p_teen_id: string
        }
        Returns: boolean
      }
      complete_referral: { Args: { p_referred_user_id: string }; Returns: Json }
      complete_seasonal_challenge: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      complete_special_challenge: {
        Args: { p_challenge_id: string }
        Returns: Json
      }
      create_activity: {
        Args: {
          p_activity_type: string
          p_data?: Json
          p_description?: string
          p_image_url?: string
          p_target_id?: string
          p_target_type?: string
          p_title: string
          p_user_id: string
          p_visibility?: string
        }
        Returns: string
      }
      create_crew: {
        Args: {
          p_color?: string
          p_description?: string
          p_is_public?: boolean
          p_motto?: string
          p_name: string
          p_owner_id: string
          p_requires_approval?: boolean
        }
        Returns: Json
      }
      create_feed_post: {
        Args: {
          p_circle_id?: string
          p_content?: string
          p_media_urls?: Json
          p_metadata?: Json
          p_post_type: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
          p_visibility?: string
        }
        Returns: string
      }
      create_friend_challenge: {
        Args: {
          p_challenge_type_slug: string
          p_creator_id: string
          p_duration_hours?: number
          p_invited_user_ids: string[]
          p_name?: string
          p_stake_xp?: number
          p_target_value?: number
        }
        Returns: Json
      }
      create_game_session: {
        Args: { p_game_type_slug: string; p_settings?: Json; p_user_id: string }
        Returns: Json
      }
      create_notification_from_template: {
        Args: {
          p_data?: Json
          p_scheduled_for?: string
          p_template_slug: string
          p_user_id: string
        }
        Returns: string
      }
      create_share: {
        Args: {
          p_content_id?: string
          p_content_type: string
          p_description?: string
          p_image_url?: string
          p_platform_slug: string
          p_template_slug?: string
          p_title?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_share_link: {
        Args: {
          p_expires_days?: number
          p_og_description?: string
          p_og_image?: string
          p_og_title?: string
          p_target_id: string
          p_target_type: string
          p_target_url: string
          p_user_id: string
        }
        Returns: {
          full_url: string
          link_id: string
          short_code: string
        }[]
      }
      create_special_challenge: {
        Args: {
          p_config?: Json
          p_created_by?: string
          p_description: string
          p_ends_at: string
          p_event_id?: string
          p_instructions: string
          p_is_flash?: boolean
          p_starts_at: string
          p_title: string
          p_type_slug: string
        }
        Returns: Json
      }
      create_subscription: {
        Args: {
          p_billing_cycle: string
          p_payment_method: string
          p_plan_id: string
          p_promo_code?: string
          p_user_id: string
        }
        Returns: Json
      }
      detect_school_type: { Args: { p_school_name: string }; Returns: string }
      end_game_session: { Args: { p_session_id: string }; Returns: Json }
      equip_profile_item: {
        Args: { p_item_id: string; p_item_type: string; p_user_id: string }
        Returns: boolean
      }
      expire_old_missions: { Args: never; Returns: number }
      generate_friend_suggestions: {
        Args: { p_limit?: number; p_teen_id: string }
        Returns: undefined
      }
      generate_short_code: { Args: { length?: number }; Returns: string }
      generate_user_wrapped: {
        Args: { p_user_id: string; p_year: number }
        Returns: string
      }
      generate_wrapped_achievements: {
        Args: {
          p_data: Json
          p_user_id: string
          p_wrapped_id: string
          p_year: number
        }
        Returns: undefined
      }
      generate_wrapped_highlights: {
        Args: { p_user_id: string; p_wrapped_id: string; p_year: number }
        Returns: undefined
      }
      get_achievement_stats: { Args: { p_teen_id: string }; Returns: Json }
      get_active_advent_calendar: {
        Args: { p_user_id: string }
        Returns: {
          calendar: Json
          days: Json
          stats: Json
          user_progress: Json
        }[]
      }
      get_active_special_challenges: {
        Args: { p_user_id?: string }
        Returns: {
          base_xp: number
          category: string
          challenge_id: string
          color: string
          description: string
          ends_at: string
          has_participated: boolean
          icon: string
          is_flash: boolean
          starts_at: string
          time_remaining_seconds: number
          title: string
          total_participants: number
          type_name: string
          type_slug: string
          winner_xp: number
        }[]
      }
      get_activity_feed: {
        Args: {
          p_feed_type?: string
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: Json
      }
      get_activity_stats: {
        Args: { p_days?: number; p_user_id: string }
        Returns: Json
      }
      get_circle_with_stats: {
        Args: { p_circle_id: string; p_teen_id: string }
        Returns: {
          avatar_url: string
          circle_id: string
          circle_type: string
          description: string
          emoji: string
          is_muted: boolean
          last_message: Json
          member_count: number
          name: string
          theme_color: string
          unread_count: number
          user_role: string
        }[]
      }
      get_crew_leaderboard: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          avatar_url: string
          average_level: number
          color: string
          crew_id: string
          member_count: number
          name: string
          owner_pseudo: string
          rank: number
          slug: string
          total_xp: number
        }[]
      }
      get_curated_content_fallback: {
        Args: {
          p_category?: string
          p_content_type: string
          p_grade_level?: string
          p_limit?: number
        }
        Returns: {
          content_data: Json
          content_type: string
          id: string
          match_score: number
          title: string
        }[]
      }
      get_curriculum_name: { Args: { p_school_type: string }; Returns: string }
      get_event_challenges: {
        Args: { p_event_id: string; p_teen_id?: string }
        Returns: {
          challenge_id: string
          challenge_type: string
          color: string
          completions_count: number
          description: string
          icon: string
          name: string
          slug: string
          user_completed_at: string
          user_status: string
          xp_reward: number
        }[]
      }
      get_friends: {
        Args: { p_teen_id: string }
        Returns: {
          accepted_at: string
          friend_id: string
          friendship_id: string
          friendship_level: number
          is_best_friend: boolean
          is_favorite: boolean
          last_interaction_at: string
          nickname: string
          status: string
        }[]
      }
      get_friends_leaderboard: {
        Args: { p_limit?: number; p_teen_id: string; p_type?: string }
        Returns: {
          avatar_url: string
          is_current_user: boolean
          level: number
          pseudo: string
          rank: number
          teen_id: string
          xp: number
        }[]
      }
      get_friends_list: {
        Args: { p_teen_id: string }
        Returns: {
          avatar_url: string
          friend_id: string
          friendship_since: string
          level: number
          pseudo: string
          total_xp: number
        }[]
      }
      get_friends_presence: {
        Args: { p_user_id?: string }
        Returns: {
          avatar_url: string
          current_activity: string
          full_name: string
          last_seen_at: string
          status: string
          user_id: string
        }[]
      }
      get_game_leaderboard: {
        Args: { p_game_type_slug: string; p_limit?: number; p_period?: string }
        Returns: Json
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_offset?: number; p_type?: string }
        Returns: {
          avatar_url: string
          city: string
          current_streak: number
          level: number
          percentile: number
          pseudo: string
          rank: number
          teen_id: string
          xp: number
        }[]
      }
      get_mission_stats: { Args: { p_teen_id: string }; Returns: Json }
      get_mutual_friends_count: {
        Args: { p_user1: string; p_user2: string }
        Returns: number
      }
      get_onboarding_progress: {
        Args: { p_temp_user_id: string }
        Returns: Json
      }
      get_or_create_referral_code: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_personalized_feed: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_level: number
          author_username: string
          circle_id: string
          circle_name: string
          comments_count: number
          content: string
          created_at: string
          is_bookmarked: boolean
          is_pinned: boolean
          likes_count: number
          media_urls: Json
          metadata: Json
          post_id: string
          post_type: string
          shares_count: number
          user_reaction: string
          visibility: string
        }[]
      }
      get_pillar_scores: { Args: { p_teen_id: string }; Returns: Json }
      get_post_comments: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_post_id: string
          p_user_id: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          comment_id: string
          content: string
          created_at: string
          is_edited: boolean
          likes_count: number
          media_url: string
          parent_id: string
          replies_count: number
          user_liked: boolean
        }[]
      }
      get_public_wrapped: { Args: { p_share_token: string }; Returns: Json }
      get_quiz_questions: {
        Args: { p_category?: string; p_count?: number; p_difficulty?: string }
        Returns: {
          audio_url: string
          category: string
          difficulty: string
          image_url: string
          options: Json
          points: number
          question: string
          question_id: string
          question_type: string
          time_limit: number
        }[]
      }
      get_random_collectible: {
        Args: { p_rarity?: string; p_set_id?: string }
        Returns: string
      }
      get_random_quiz_questions: {
        Args: { p_count?: number; p_difficulty?: string; p_genre?: string }
        Returns: Json
      }
      get_seasonal_challenges: {
        Args: {
          p_challenge_type?: string
          p_season_slug?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_share_stats: { Args: { p_user_id: string }; Returns: Json }
      get_shop_rewards: {
        Args: {
          p_category_slug?: string
          p_only_affordable?: boolean
          p_only_available?: boolean
          p_user_id: string
        }
        Returns: {
          can_purchase: boolean
          category_id: string
          category_name: string
          category_slug: string
          description: string
          icon: string
          image_url: string
          is_featured: boolean
          is_in_wishlist: boolean
          is_new: boolean
          min_level: number
          name: string
          original_xp_cost: number
          purchase_limit: number
          required_badge_id: string
          reward_id: string
          reward_type: string
          reward_value: Json
          short_description: string
          stock_remaining: number
          stock_type: string
          user_purchase_count: number
          vip_only: boolean
          xp_cost: number
        }[]
      }
      get_teen_generation_params: { Args: { p_teen_id: string }; Returns: Json }
      get_teen_id_for_user: { Args: { p_user_id: string }; Returns: string }
      get_trending_hashtags: {
        Args: { p_limit?: number }
        Returns: {
          hashtag_id: string
          posts_count: number
          tag: string
          trending_score: number
        }[]
      }
      get_user_achievements: {
        Args: { p_teen_id: string }
        Returns: {
          category: string
          code: string
          color_gradient: string
          description: string
          icon: string
          id: string
          is_secret: boolean
          is_unlocked: boolean
          name: string
          percentage_complete: number
          points: number
          progress: number
          rarity: string
          requirement_value: number
          unlocked_at: string
          xp_reward: number
        }[]
      }
      get_user_challenges: {
        Args: { p_status?: string; p_user_id: string }
        Returns: {
          challenge_id: string
          challenge_name: string
          challenge_type_name: string
          challenge_type_slug: string
          color: string
          ends_at: string
          icon: string
          is_creator: boolean
          is_draw: boolean
          mode: string
          participants: Json
          stake_xp: number
          starts_at: string
          status: string
          target_value: number
          user_score: number
          user_team: string
          winner_id: string
          winning_team: string
        }[]
      }
      get_user_collections: { Args: { p_user_id: string }; Returns: Json }
      get_user_crew: { Args: { p_user_id: string }; Returns: Json }
      get_user_customization_items: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_event_stats: { Args: { p_teen_id: string }; Returns: Json }
      get_user_missions: {
        Args: { p_mission_type?: string; p_status?: string; p_teen_id: string }
        Returns: {
          category: string
          claimed_at: string
          code: string
          color: string
          completed_at: string
          description: string
          difficulty: string
          icon: string
          id: string
          mission_id: string
          mission_type: string
          name: string
          objective_target: number
          percentage_complete: number
          period_end: string
          period_start: string
          progress: number
          status: string
          xp_reward: number
        }[]
      }
      get_user_notifications: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_unread_only?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      get_user_plan: {
        Args: { p_user_id: string }
        Returns: {
          current_period_end: string
          features: Json
          is_family_member: boolean
          plan_code: string
          plan_id: string
          plan_name: string
          plan_type: string
          status: string
          subscription_id: string
        }[]
      }
      get_user_purchases: {
        Args: {
          p_include_expired?: boolean
          p_status?: string
          p_user_id: string
        }
        Returns: {
          expires_at: string
          is_expired: boolean
          is_usable: boolean
          purchase_id: string
          purchased_at: string
          reward_description: string
          reward_icon: string
          reward_id: string
          reward_name: string
          reward_type: string
          reward_value: Json
          status: string
          used_at: string
          xp_spent: number
        }[]
      }
      get_user_rank: {
        Args: { p_teen_id: string; p_type?: string }
        Returns: Json
      }
      get_user_vip_status: { Args: { p_user_id: string }; Returns: Json }
      get_user_wallet: { Args: { p_teen_id: string }; Returns: Json }
      get_user_wrapped: {
        Args: { p_user_id: string; p_year: number }
        Returns: Json
      }
      get_wheel_history: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          reward_type: string
          reward_value: Json
          segment_color: string
          segment_icon: string
          segment_name: string
          spin_id: string
          spin_type: string
          spun_at: string
          xp_earned: number
        }[]
      }
      get_wheel_stats: { Args: { p_user_id: string }; Returns: Json }
      group_similar_notifications: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      handle_join_request: {
        Args: {
          p_approve: boolean
          p_rejection_reason?: string
          p_request_id: string
          p_reviewer_id: string
        }
        Returns: Json
      }
      has_active_subscription: { Args: { p_user_id: string }; Returns: boolean }
      increase_friendship_interaction: {
        Args: { p_user1: string; p_user2: string }
        Returns: number
      }
      init_onboarding_progress: {
        Args: { p_temp_user_id: string }
        Returns: Json
      }
      init_user_achievements: {
        Args: { p_teen_id: string }
        Returns: undefined
      }
      init_user_gamification: {
        Args: { p_teen_id: string }
        Returns: undefined
      }
      invite_to_crew: {
        Args: {
          p_crew_id: string
          p_invitee_id: string
          p_inviter_id: string
          p_message?: string
        }
        Returns: Json
      }
      join_game_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: Json
      }
      leave_crew: {
        Args: { p_crew_id: string; p_user_id: string }
        Returns: Json
      }
      make_prediction: {
        Args: {
          p_confidence?: number
          p_option_index: number
          p_question_id: string
          p_user_id: string
        }
        Returns: Json
      }
      mark_notifications_read: {
        Args: { p_notification_ids?: string[]; p_user_id: string }
        Returns: number
      }
      mark_user_offline: { Args: never; Returns: undefined }
      open_advent_day: {
        Args: { p_day_number: number; p_user_id: string }
        Returns: Json
      }
      process_special_challenges: { Args: never; Returns: undefined }
      purchase_reward: {
        Args: { p_promo_code?: string; p_reward_id: string; p_user_id: string }
        Returns: Json
      }
      recalculate_all_pillar_scores: {
        Args: { p_teen_id: string }
        Returns: Json
      }
      record_link_click: {
        Args: {
          p_country?: string
          p_platform?: string
          p_referrer?: string
          p_short_code: string
          p_visitor_hash?: string
        }
        Returns: Json
      }
      record_onboarding_step: {
        Args: {
          p_step: string
          p_temp_user_id: string
          p_user_type?: string
          p_xp?: number
        }
        Returns: Json
      }
      record_social_share: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_platform: string
          p_share_data?: Json
          p_user_id: string
        }
        Returns: Json
      }
      record_xp_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_reference_type?: string
          p_teen_id: string
          p_type: string
        }
        Returns: string
      }
      refund_booking_xp: { Args: { p_booking_id: string }; Returns: boolean }
      remove_message_reaction: {
        Args: { p_emoji: string; p_message_id: string; p_teen_id: string }
        Returns: Json
      }
      request_to_join_crew: {
        Args: { p_crew_id: string; p_message?: string; p_user_id: string }
        Returns: Json
      }
      resolve_prediction: {
        Args: { p_correct_option_index: number; p_question_id: string }
        Returns: Json
      }
      respond_to_challenge: {
        Args: { p_accept: boolean; p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      respond_to_crew_invitation: {
        Args: { p_accept: boolean; p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      send_circle_message: {
        Args: {
          p_circle_id: string
          p_content: string
          p_media_url?: string
          p_message_type?: string
          p_metadata?: Json
          p_reply_to_id?: string
          p_sender_id: string
        }
        Returns: string
      }
      send_custom_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_animation?: string
          p_body: string
          p_category?: string
          p_coin_reward?: number
          p_color?: string
          p_data?: Json
          p_emoji?: string
          p_icon?: string
          p_priority?: string
          p_title: string
          p_user_id: string
          p_xp_reward?: number
        }
        Returns: string
      }
      send_friend_request: {
        Args: { p_message?: string; p_receiver_id: string; p_sender_id: string }
        Returns: string
      }
      spend_tokens: {
        Args: {
          p_amount: number
          p_reason?: string
          p_reference_id?: string
          p_teen_id: string
          p_token_type?: string
        }
        Returns: Json
      }
      spin_wheel: {
        Args: { p_spin_type?: string; p_user_id: string }
        Returns: Json
      }
      start_challenge: { Args: { p_challenge_id: string }; Returns: undefined }
      start_game_session: {
        Args: { p_game_data?: Json; p_session_id: string; p_user_id: string }
        Returns: Json
      }
      submit_challenge_entry: {
        Args: {
          p_answers?: Json
          p_challenge_id: string
          p_content: Json
          p_image_url?: string
          p_latitude?: number
          p_longitude?: number
          p_submission_type: string
          p_time_taken?: number
          p_user_id: string
        }
        Returns: Json
      }
      submit_event_review: {
        Args: {
          p_ambiance_rating?: number
          p_comment?: string
          p_cons?: string[]
          p_event_id: string
          p_music_rating?: number
          p_overall_rating: number
          p_pros?: string[]
          p_staff_rating?: number
          p_teen_id: string
          p_value_rating?: number
        }
        Returns: Json
      }
      submit_game_score: {
        Args: {
          p_game_state?: Json
          p_score: number
          p_session_id: string
          p_user_id: string
        }
        Returns: Json
      }
      sync_onboarding_to_user: {
        Args: { p_teen_id: string; p_temp_user_id: string }
        Returns: Json
      }
      to_utc_date: { Args: { ts: string }; Returns: string }
      toggle_activity_like: {
        Args: {
          p_activity_id: string
          p_reaction_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      toggle_post_like: {
        Args: { p_post_id: string; p_reaction_type?: string; p_user_id: string }
        Returns: Json
      }
      toggle_wishlist: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: Json
      }
      track_share_click: { Args: { p_share_code: string }; Returns: Json }
      transfer_tokens: {
        Args: {
          p_amount: number
          p_message?: string
          p_receiver_id: string
          p_sender_id: string
          p_token_type?: string
        }
        Returns: Json
      }
      unlock_achievement: {
        Args: { p_achievement_code: string; p_teen_id: string }
        Returns: Json
      }
      unlock_profile_item: {
        Args: {
          p_item_id: string
          p_item_type: string
          p_source?: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_achievement_progress: {
        Args: {
          p_achievement_code: string
          p_increment?: boolean
          p_progress?: number
          p_teen_id: string
        }
        Returns: Json
      }
      update_challenge_progress: {
        Args: { p_source?: string; p_user_id: string }
        Returns: number
      }
      update_crew_stats: { Args: { p_crew_id: string }; Returns: undefined }
      update_daily_activity: {
        Args: { p_activity_type: string; p_amount?: number; p_user_id: string }
        Returns: undefined
      }
      update_lifetime_stats: { Args: { p_user_id: string }; Returns: undefined }
      update_mission_progress: {
        Args: {
          p_action_data?: Json
          p_action_type?: string
          p_increment?: number
          p_mission_code: string
          p_teen_id: string
        }
        Returns: Json
      }
      update_monthly_stats: {
        Args: { p_teen_id: string; p_xp_amount: number }
        Returns: undefined
      }
      update_personal_record: {
        Args: {
          p_context?: Json
          p_new_value: number
          p_record_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_pillar_score: {
        Args: { p_pillar: string; p_teen_id: string }
        Returns: number
      }
      update_seasonal_progress: {
        Args: {
          p_challenge_id: string
          p_increment?: number
          p_user_id: string
        }
        Returns: Json
      }
      update_user_presence: {
        Args: {
          p_activity?: string
          p_device_id?: string
          p_device_type?: string
          p_page?: string
          p_status?: string
        }
        Returns: {
          created_at: string | null
          current_activity: string | null
          current_page: string | null
          device_id: string | null
          device_type: string | null
          id: string
          last_heartbeat_at: string | null
          last_seen_at: string | null
          session_started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_presence"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_user_streak: { Args: { p_teen_id: string }; Returns: Json }
      update_weekly_stats: {
        Args: { p_teen_id: string; p_xp_amount: number }
        Returns: undefined
      }
      use_referral_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      use_reward: {
        Args: { p_event_id?: string; p_purchase_id: string; p_user_id: string }
        Returns: Json
      }
      validate_quiz_content: { Args: { p_quiz_id: string }; Returns: Json }
      vote_on_submission: {
        Args: { p_submission_id: string; p_user_id: string; p_vote: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
