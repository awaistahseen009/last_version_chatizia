/*
  # Add Stripe Integration Fields

  1. Updates
    - Add stripe_customer_id to users table
    - Add subscription_end_date to users table
    - Add subscription_status check constraint to include all plan types
    - Add usage tracking fields

  2. Security
    - Maintain existing RLS policies
*/

-- Add stripe_customer_id to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

-- Add subscription_end_date to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_end_date'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_end_date timestamptz;
  END IF;
END $$;

-- Update the subscription_status check constraint to include all plan types
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_status_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_status_check 
  CHECK (subscription_status = ANY (ARRAY['free'::text, 'starter'::text, 'pro'::text, 'enterprise'::text, 'admin'::text, 'blocked'::text]));

-- Create index for stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Create function to check if user is within subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits(
  user_id_param UUID,
  resource_type TEXT,
  current_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_subscription TEXT;
  chatbot_limit INTEGER;
  message_limit INTEGER;
  document_limit INTEGER;
BEGIN
  -- Get user's subscription status
  SELECT subscription_status INTO user_subscription
  FROM users
  WHERE id = user_id_param;
  
  -- Set limits based on subscription
  CASE user_subscription
    WHEN 'free' THEN
      chatbot_limit := 1;
      message_limit := 100;
      document_limit := 5;
    WHEN 'starter' THEN
      chatbot_limit := 3;
      message_limit := 2000;
      document_limit := 50;
    WHEN 'pro' THEN
      chatbot_limit := 10;
      message_limit := 10000;
      document_limit := 500;
    WHEN 'enterprise' THEN
      chatbot_limit := NULL; -- unlimited
      message_limit := 100000;
      document_limit := NULL; -- unlimited
    WHEN 'admin' THEN
      chatbot_limit := NULL; -- unlimited
      message_limit := NULL; -- unlimited
      document_limit := NULL; -- unlimited
    ELSE
      chatbot_limit := 0;
      message_limit := 0;
      document_limit := 0;
  END CASE;
  
  -- Check if within limits
  CASE resource_type
    WHEN 'chatbot' THEN
      RETURN chatbot_limit IS NULL OR current_count < chatbot_limit;
    WHEN 'message' THEN
      RETURN message_limit IS NULL OR current_count < message_limit;
    WHEN 'document' THEN
      RETURN document_limit IS NULL OR current_count < document_limit;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_subscription_limits(UUID, TEXT, INTEGER) TO authenticated;

-- Create function to get user's subscription limits
CREATE OR REPLACE FUNCTION get_subscription_limits(
  user_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_subscription TEXT;
  result JSON;
BEGIN
  -- Get user's subscription status
  SELECT subscription_status INTO user_subscription
  FROM users
  WHERE id = user_id_param;
  
  -- Set limits based on subscription
  CASE user_subscription
    WHEN 'free' THEN
      result := json_build_object(
        'chatbots', 1,
        'messages', 100,
        'documents', 5,
        'voice_enabled', false,
        'analytics_enabled', false,
        'api_access', false
      );
    WHEN 'starter' THEN
      result := json_build_object(
        'chatbots', 3,
        'messages', 2000,
        'documents', 50,
        'voice_enabled', false,
        'analytics_enabled', true,
        'api_access', false
      );
    WHEN 'pro' THEN
      result := json_build_object(
        'chatbots', 10,
        'messages', 10000,
        'documents', 500,
        'voice_enabled', true,
        'analytics_enabled', true,
        'api_access', false
      );
    WHEN 'enterprise' THEN
      result := json_build_object(
        'chatbots', 'unlimited',
        'messages', 100000,
        'documents', 'unlimited',
        'voice_enabled', true,
        'analytics_enabled', true,
        'api_access', true
      );
    WHEN 'admin' THEN
      result := json_build_object(
        'chatbots', 'unlimited',
        'messages', 'unlimited',
        'documents', 'unlimited',
        'voice_enabled', true,
        'analytics_enabled', true,
        'api_access', true
      );
    ELSE
      result := json_build_object(
        'chatbots', 0,
        'messages', 0,
        'documents', 0,
        'voice_enabled', false,
        'analytics_enabled', false,
        'api_access', false
      );
  END CASE;
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subscription_limits(UUID) TO authenticated;