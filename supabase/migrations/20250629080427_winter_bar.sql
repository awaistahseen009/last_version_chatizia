/*
  # Fix Chatbot Creation Error

  1. Changes
    - Fix ambiguous column reference "user_id" error in chatbots table
    - Update RLS policies to use explicit table references
    - Add proper index for user_id to improve performance
*/

-- Fix ambiguous column reference in chatbots table policies
DROP POLICY IF EXISTS "Users can insert own chatbots" ON chatbots;
CREATE POLICY "Users can insert own chatbots"
  ON chatbots
  FOR INSERT
  TO authenticated
  WITH CHECK (chatbots.user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own chatbots" ON chatbots;
CREATE POLICY "Users can read own chatbots"
  ON chatbots
  FOR SELECT
  TO authenticated
  USING (chatbots.user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own chatbots" ON chatbots;
CREATE POLICY "Users can update own chatbots"
  ON chatbots
  FOR UPDATE
  TO authenticated
  USING (chatbots.user_id = auth.uid())
  WITH CHECK (chatbots.user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own chatbots" ON chatbots;
CREATE POLICY "Users can delete own chatbots"
  ON chatbots
  FOR DELETE
  TO authenticated
  USING (chatbots.user_id = auth.uid());

-- Ensure proper index exists for user_id
CREATE INDEX IF NOT EXISTS idx_chatbots_user_id ON chatbots(user_id);

-- Fix any other policies that might have ambiguous references
DROP POLICY IF EXISTS "Admins can read all chatbots" ON chatbots;
CREATE POLICY "Admins can read all chatbots"
  ON chatbots
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all chatbots" ON chatbots;
CREATE POLICY "Admins can update all chatbots"
  ON chatbots
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all chatbots" ON chatbots;
CREATE POLICY "Admins can delete all chatbots"
  ON chatbots
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can read active chatbots for embedding" ON chatbots;
CREATE POLICY "Public can read active chatbots for embedding"
  ON chatbots
  FOR SELECT
  TO public
  USING (chatbots.status = 'active');