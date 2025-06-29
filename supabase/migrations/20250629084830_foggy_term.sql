/*
  # Add User Interactions Table

  1. Updates
    - Add additional fields to user_interactions table
    - Create indexes for better performance
    - Update RLS policies
*/

-- Add additional fields to user_interactions table if they don't exist
DO $$
BEGIN
  -- Add company field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'company'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN company text;
  END IF;

  -- Add order_number field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN order_number text;
  END IF;

  -- Add product_interest field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'product_interest'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN product_interest text;
  END IF;

  -- Add grade_level field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN grade_level text;
  END IF;

  -- Add learning_goals field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'learning_goals'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN learning_goals text;
  END IF;

  -- Add preferred_date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'preferred_date'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN preferred_date text;
  END IF;

  -- Add reason_for_visit field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_interactions' AND column_name = 'reason_for_visit'
  ) THEN
    ALTER TABLE user_interactions ADD COLUMN reason_for_visit text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_email ON user_interactions(email);
CREATE INDEX IF NOT EXISTS idx_user_interactions_name ON user_interactions(name);
CREATE INDEX IF NOT EXISTS idx_user_interactions_phone ON user_interactions(phone);
CREATE INDEX IF NOT EXISTS idx_user_interactions_company ON user_interactions(company);
CREATE INDEX IF NOT EXISTS idx_user_interactions_order_number ON user_interactions(order_number);

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Chatbot owners can read their interactions" ON user_interactions;
CREATE POLICY "Chatbot owners can read their interactions"
  ON user_interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = user_interactions.chatbot_id
      AND chatbots.user_id = auth.uid()
    )
  );

-- Allow public insert for embedded chatbots
DROP POLICY IF EXISTS "Allow public insert for embedded chatbots" ON user_interactions;
CREATE POLICY "Allow public insert for embedded chatbots"
  ON user_interactions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = user_interactions.chatbot_id
      AND chatbots.status = 'active'
    )
  );

-- Allow admins to read all user interactions
DROP POLICY IF EXISTS "Admins can read all user interactions" ON user_interactions;
CREATE POLICY "Admins can read all user interactions"
  ON user_interactions
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));