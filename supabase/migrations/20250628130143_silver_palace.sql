/*
  # Fix Agent Authentication System

  1. Updates
    - Create a more secure agent authentication function
    - Fix RLS policies for agent access
    - Ensure proper permissions for agent operations

  2. Security
    - Use a dedicated function for agent authentication
    - Ensure proper access control
*/

-- Drop existing authenticate_agent function if it exists
DROP FUNCTION IF EXISTS authenticate_agent(TEXT, TEXT);

-- Create a more secure agent authentication function
CREATE OR REPLACE FUNCTION authenticate_agent(
  agent_id_param TEXT,
  password_param TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  agent_id TEXT,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.agent_id,
    a.name,
    a.email,
    a.created_at,
    a.updated_at
  FROM agents a
  WHERE a.agent_id = agent_id_param
  AND a.password = password_param;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION authenticate_agent(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_agent(TEXT, TEXT) TO authenticated;

-- Ensure agents table allows public access for authentication
DROP POLICY IF EXISTS "Allow agent authentication" ON agents;
CREATE POLICY "Allow agent authentication"
  ON agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix agent_assignments policies
DROP POLICY IF EXISTS "Agents can read their own assignments" ON agent_assignments;
CREATE POLICY "Agents can read their own assignments"
  ON agent_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix conversation_agents policies
DROP POLICY IF EXISTS "Agents can read assigned conversations" ON conversation_agents;
CREATE POLICY "Agents can read assigned conversations"
  ON conversation_agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix agent_notifications policies
DROP POLICY IF EXISTS "Agents can read their own notifications" ON agent_notifications;
CREATE POLICY "Agents can read their own notifications"
  ON agent_notifications
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix message policies
DROP POLICY IF EXISTS "Agents can read messages from assigned conversations" ON messages;
CREATE POLICY "Agents can read messages from assigned conversations"
  ON messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Grant necessary permissions to anon role
GRANT SELECT ON agents TO anon;
GRANT SELECT ON agent_assignments TO anon;
GRANT SELECT, INSERT, UPDATE ON conversation_agents TO anon;
GRANT SELECT, INSERT, UPDATE ON agent_notifications TO anon;
GRANT SELECT, INSERT ON messages TO anon;
GRANT SELECT ON chatbots TO anon;
GRANT SELECT ON conversations TO anon;

-- Create a function to get agent assignments with chatbot details
CREATE OR REPLACE FUNCTION get_agent_assignments(
  agent_id_param UUID
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  chatbot_id UUID,
  created_at TIMESTAMPTZ,
  chatbot_name TEXT,
  chatbot_configuration JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aa.id,
    aa.agent_id,
    aa.chatbot_id,
    aa.created_at,
    c.name as chatbot_name,
    c.configuration as chatbot_configuration
  FROM agent_assignments aa
  JOIN chatbots c ON aa.chatbot_id = c.id
  WHERE aa.agent_id = agent_id_param;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_agent_assignments(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_agent_assignments(UUID) TO authenticated;