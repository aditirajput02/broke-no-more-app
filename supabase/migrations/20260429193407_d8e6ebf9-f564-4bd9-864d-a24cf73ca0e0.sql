-- Categories table: per-user, with name/emoji/color
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✨',
  color TEXT NOT NULL DEFAULT 'var(--primary)',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own categories select" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own categories insert" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own categories update" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own categories delete" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default categories on new user signup
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, emoji, color, sort_order) VALUES
    (NEW.id, 'Food',          '🍜', 'var(--coral)',        10),
    (NEW.id, 'Travel',        '✈️', 'var(--teal)',         20),
    (NEW.id, 'Shopping',      '🛍️', 'var(--primary)',      30),
    (NEW.id, 'Fun',           '🎉', 'var(--lime)',         40),
    (NEW.id, 'Rent',          '🏠', 'var(--amber)',        50),
    (NEW.id, 'Subscriptions', '📺', 'var(--primary-glow)', 60),
    (NEW.id, 'Health',        '💊', 'var(--teal)',         70)
  ON CONFLICT (user_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update handle_new_user to also seed categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  INSERT INTO public.categories (user_id, name, emoji, color, sort_order) VALUES
    (NEW.id, 'Food',          '🍜', 'var(--coral)',        10),
    (NEW.id, 'Travel',        '✈️', 'var(--teal)',         20),
    (NEW.id, 'Shopping',      '🛍️', 'var(--primary)',      30),
    (NEW.id, 'Fun',           '🎉', 'var(--lime)',         40),
    (NEW.id, 'Rent',          '🏠', 'var(--amber)',        50),
    (NEW.id, 'Subscriptions', '📺', 'var(--primary-glow)', 60),
    (NEW.id, 'Health',        '💊', 'var(--teal)',         70)
  ON CONFLICT (user_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill: seed categories for any existing users that don't have any
INSERT INTO public.categories (user_id, name, emoji, color, sort_order)
SELECT p.id, v.name, v.emoji, v.color, v.sort_order
FROM public.profiles p
CROSS JOIN (VALUES
  ('Food',          '🍜', 'var(--coral)',        10),
  ('Travel',        '✈️', 'var(--teal)',         20),
  ('Shopping',      '🛍️', 'var(--primary)',      30),
  ('Fun',           '🎉', 'var(--lime)',         40),
  ('Rent',          '🏠', 'var(--amber)',        50),
  ('Subscriptions', '📺', 'var(--primary-glow)', 60),
  ('Health',        '💊', 'var(--teal)',         70)
) AS v(name, emoji, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.user_id = p.id)
ON CONFLICT (user_id, name) DO NOTHING;