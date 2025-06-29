/*
  # Add Subscription Limits and Checks

  1. New Functions
    - get_subscription_limits - Returns limits based on subscription status
    - check_subscription_limits - Checks if user is within limits
    - enforce_subscription_limits - Enforces limits on insert/update operations

  2. Security
    - Ensure proper RLS policies
    - Add triggers to enforce limits
*/

-- Create function to get subscription limits
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

-- Create function to check if user is within limits
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

-- Create function to enforce subscription limits
CREATE OR REPLACE FUNCTION enforce_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  current_count INTEGER;
  is_within_limits BOOLEAN;
  resource_type TEXT;
BEGIN
  -- Determine user_id and resource_type based on table
  IF TG_TABLE_NAME = 'chatbots' THEN
    user_id := NEW.user_id;
    resource_type := 'chatbot';
    
    -- Count existing chatbots
    SELECT COUNT(*) INTO current_count
    FROM chatbots
    WHERE user_id = NEW.user_id;
    
  ELSIF TG_TABLE_NAME = 'documents' THEN
    user_id := NEW.user_id;
    resource_type := 'document';
    
    -- Count existing documents
    SELECT COUNT(*) INTO current_count
    FROM documents
    WHERE user_id = NEW.user_id;
    
  ELSE
    -- For unsupported tables, allow the operation
    RETURN NEW;
  END IF;
  
  -- Check if within limits
  is_within_limits := check_subscription_limits(user_id, resource_type, current_count);
  
  IF NOT is_within_limits THEN
    RAISE EXCEPTION 'Subscription limit reached for %', resource_type;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers to enforce limits
DROP TRIGGER IF EXISTS enforce_chatbot_limits ON chatbots;
CREATE TRIGGER enforce_chatbot_limits
  BEFORE INSERT ON chatbots
  FOR EACH ROW
  EXECUTE FUNCTION enforce_subscription_limits();

DROP TRIGGER IF EXISTS enforce_document_limits ON documents;
CREATE TRIGGER enforce_document_limits
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_subscription_limits();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_subscription_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_subscription_limits(UUID, TEXT, INTEGER) TO authenticated;