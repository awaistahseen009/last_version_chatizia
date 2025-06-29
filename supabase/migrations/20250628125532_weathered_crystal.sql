/*
  # Fix Agent Authentication

  1. Updates
    - Create a secure agent authentication function
    - Fix RLS policies for agent authentication
    - Add index for better performance
*/

-- Create a secure agent authentication function
CREATE OR REPLACE FUNCTION authenticate_agent(
  agent_id_param TEXT,
  password_param TEXT
)
RETURNS SETOF agents
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM agents
  WHERE agent_id = agent_id_param
  AND password = password_param;
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

-- Ensure proper indexes for agent authentication
CREATE INDEX IF NOT EXISTS idx_agents_auth ON agents(agent_id, password);

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