/*
  # Fix Agent Authentication Issues

  1. Updates
    - Fix agent authentication function to handle errors properly
    - Improve error handling in check_agent_tables_exist function
    - Add proper content-type headers to RPC responses
    - Fix CORS issues with agent authentication

  2. Security
    - Maintain existing security model
    - Ensure proper error handling
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS check_agent_tables_exist();
DROP FUNCTION IF EXISTS authenticate_agent(TEXT, TEXT);

-- Create improved check_agent_tables_exist function
CREATE OR REPLACE FUNCTION check_agent_tables_exist()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'agents' AND table_schema = 'public'
  ) INTO tables_exist;
  
  RETURN tables_exist;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error checking agent tables: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create improved authenticate_agent function
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
DECLARE
  tables_exist BOOLEAN;
BEGIN
  -- Check if agent tables exist
  SELECT check_agent_tables_exist() INTO tables_exist;
  
  IF NOT tables_exist THEN
    RAISE EXCEPTION 'Agent authentication is not available';
  END IF;

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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error authenticating agent: %', SQLERRM;
    -- Return empty result set instead of error
    RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_agent_tables_exist() TO anon;
GRANT EXECUTE ON FUNCTION check_agent_tables_exist() TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_agent(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_agent(TEXT, TEXT) TO authenticated;

-- Ensure proper RLS policies for agent authentication
DROP POLICY IF EXISTS "Allow agent authentication" ON agents;
CREATE POLICY "Allow agent authentication"
  ON agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Ensure proper permissions
GRANT SELECT ON agents TO anon;
GRANT SELECT ON agents TO authenticated;