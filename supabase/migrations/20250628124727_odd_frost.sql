/*
  # Fix Agent Authentication

  1. Updates
    - Create a secure agent authentication function
    - Fix agent authentication issues
    - Ensure proper permissions for agent access
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

-- Grant necessary permissions to anon role for agent authentication
GRANT SELECT ON agents TO anon;
GRANT SELECT ON agent_assignments TO anon;
GRANT SELECT, INSERT, UPDATE ON conversation_agents TO anon;
GRANT SELECT, INSERT, UPDATE ON agent_notifications TO anon;
GRANT SELECT, INSERT ON messages TO anon;

-- Ensure proper indexes for agent authentication
CREATE INDEX IF NOT EXISTS idx_agents_auth ON agents(agent_id, password);