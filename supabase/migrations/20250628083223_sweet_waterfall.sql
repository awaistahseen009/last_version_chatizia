/*
  # Voice Management System

  1. New Tables
    - `admin_voices` - Store ElevenLabs voice configurations

  2. Security
    - Enable RLS on admin_voices table
    - Create admin-only policies
    - Grant necessary permissions

  3. Functions
    - Admin voice management functions
*/

-- Create admin_voices table
CREATE TABLE IF NOT EXISTS admin_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  voice_id text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE admin_voices ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "Admins can manage voices"
  ON admin_voices
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create public read policy for voice selection
CREATE POLICY "Users can read available voices"
  ON admin_voices
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_voices_voice_id ON admin_voices(voice_id);
CREATE INDEX IF NOT EXISTS idx_admin_voices_created_by ON admin_voices(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_voices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_voices_updated_at
  BEFORE UPDATE ON admin_voices
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_voices_updated_at();

-- Function to add voice (admin only)
CREATE OR REPLACE FUNCTION admin_add_voice(
  voice_name TEXT,
  elevenlabs_voice_id TEXT,
  voice_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  voice_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Insert new voice
  INSERT INTO admin_voices (name, voice_id, description, created_by)
  VALUES (voice_name, elevenlabs_voice_id, voice_description, auth.uid())
  RETURNING id INTO voice_id;

  RETURN voice_id;
END;
$$;

-- Function to delete voice (admin only)
CREATE OR REPLACE FUNCTION admin_delete_voice(
  target_voice_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Delete voice
  DELETE FROM admin_voices WHERE id = target_voice_id;

  RETURN TRUE;
END;
$$;

-- Function to get all voices
CREATE OR REPLACE FUNCTION get_available_voices()
RETURNS TABLE (
  id UUID,
  name TEXT,
  voice_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    av.id,
    av.name,
    av.voice_id,
    av.description,
    av.created_at
  FROM admin_voices av
  ORDER BY av.name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_add_voice(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_voice(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_voices() TO authenticated;

-- Grant table permissions
GRANT SELECT ON admin_voices TO authenticated;

-- Insert default ElevenLabs voices
INSERT INTO admin_voices (name, voice_id, description) VALUES
  ('Alloy', 'alloy', 'Neutral and balanced voice'),
  ('Echo', 'echo', 'Professional and clear voice'),
  ('Fable', 'fable', 'Friendly and warm voice'),
  ('Onyx', 'onyx', 'Deep and authoritative voice'),
  ('Nova', 'nova', 'Bright and energetic voice'),
  ('Shimmer', 'shimmer', 'Gentle and soothing voice')
ON CONFLICT (voice_id) DO NOTHING;