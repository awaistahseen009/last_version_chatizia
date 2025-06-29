/*
  # Fix Subscription Limits Function

  1. Updates
    - Fix get_subscription_limits function to return proper JSON
    - Ensure proper error handling
    - Fix type issues with unlimited values
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_subscription_limits(UUID);

-- Create improved get_subscription_limits function
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
        'chatbots', 1,
        'messages', 100,
        'documents', 5,
        'voice_enabled', false,
        'analytics_enabled', false,
        'api_access', false
      );
  END CASE;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error getting subscription limits: %', SQLERRM;
    -- Return default free tier limits on error
    RETURN json_build_object(
      'chatbots', 1,
      'messages', 100,
      'documents', 5,
      'voice_enabled', false,
      'analytics_enabled', false,
      'api_access', false
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subscription_limits(UUID) TO authenticated;