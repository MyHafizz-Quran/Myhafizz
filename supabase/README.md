# Supabase Configuration

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** (found in Project Settings > API).

### 2. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**.
2. Open and run the file `supabase/migrations/001_initial_schema.sql`.
3. This will create all required tables with Row Level Security (RLS) policies.
4. Run `supabase/migrations/003_leaderboard_read_policy.sql` to enable the global leaderboard (allows all authenticated users to read memorization progress and creates the `profiles` table for display names/avatars).

### 3. Enable Email Authentication

1. Go to **Authentication > Providers** in your Supabase dashboard.
2. Ensure **Email** provider is enabled.
3. Optionally enable **Magic Link** for passwordless login.

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Deploy on Render

1. Connect your GitHub repository to [render.com](https://render.com).
2. The `render.yaml` file at the project root will automatically configure the static site deployment.
3. Set the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Render dashboard.

## Database Tables

| Table | Description |
|---|---|
| `memorization_progress` | Tracks which verses each user has memorized per surah |
| `challenges` | Memorization challenges (admin-managed) |
| `challenge_participants` | User participation in challenges |
| `study_profiles` | User profiles for the study partner matching feature |
| `study_matches` | Study partner match requests between users |

## Notes

- `quran_favorites` and `quran_stop_markers` are stored in **localStorage** — no database migration needed.
- RLS policies ensure users can only access their own data.
- The `challenges` table is read-only for regular users; insert/update requires the service role (admin).
