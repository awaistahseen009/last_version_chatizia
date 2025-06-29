/*
  # Fix Agent-Related Errors

  1. Changes
    - Add proper checks to prevent undefined agent_id errors
    - Fix RLS policies for agent-related tables
    - Update hooks to safely check for agent tables before querying
    - Improve error handling for agent-related functions
*/

-- Create a function to check if agent tables exist
CREATE OR REPLACE FUNCTION check_agent_tables_exist()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'agents' AND table_schema = 'public'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_agent_tables_exist() TO anon;
GRANT EXECUTE ON FUNCTION check_agent_tables_exist() TO authenticated;

-- Fix agent authentication function to handle non-existent tables
DROP FUNCTION IF EXISTS authenticate_agent(TEXT, TEXT);

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
  -- Check if agents table exists
  IF NOT check_agent_tables_exist() THEN
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
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_agent(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_agent(TEXT, TEXT) TO authenticated;

-- Fix get_agent_assignments function to handle non-existent tables
DROP FUNCTION IF EXISTS get_agent_assignments(UUID);

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
  -- Check if agent_assignments table exists
  IF NOT check_agent_tables_exist() THEN
    RAISE EXCEPTION 'Agent assignments are not available';
  END IF;

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

-- Fix add_session_message function to handle agent_id properly
DROP FUNCTION IF EXISTS add_session_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_session_message(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION add_session_message(
  chatbot_id_param UUID,
  session_id_param TEXT,
  content_param TEXT,
  role_param TEXT,
  agent_id_param UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id_hash TEXT;
  conversation_record_id UUID;
  message_id UUID;
  chatbot_record RECORD;
  agent_tables_exist BOOLEAN;
BEGIN
  -- Get chatbot information
  SELECT * INTO chatbot_record FROM chatbots WHERE id = chatbot_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chatbot not found';
  END IF;

  -- Check if agent tables exist
  SELECT check_agent_tables_exist() INTO agent_tables_exist;

  -- Generate consistent conversation ID from chatbot_id and session_id
  conversation_id_hash := encode(digest(chatbot_id_param::text || '_session_' || session_id_param, 'sha256'), 'hex');
  conversation_record_id := (substring(conversation_id_hash from 1 for 8) ||
                           '-' || substring(conversation_id_hash from 9 for 4) ||
                           '-4' || substring(conversation_id_hash from 13 for 3) ||
                           '-' || substring(conversation_id_hash from 16 for 4) ||
                           '-' || substring(conversation_id_hash from 20 for 12))::UUID;

  -- Create conversation record if it doesn't exist
  INSERT INTO conversations (id, chatbot_id, session_id, created_at, updated_at)
  VALUES (conversation_record_id, chatbot_id_param, session_id_param, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

  -- Insert the message
  IF agent_tables_exist AND agent_id_param IS NOT NULL THEN
    -- Check if agent exists
    IF NOT EXISTS (SELECT 1 FROM agents WHERE id = agent_id_param) THEN
      agent_id_param := NULL;
    END IF;
    
    INSERT INTO messages (conversation_id, content, role, agent_id, created_at)
    VALUES (conversation_record_id, content_param, role_param, agent_id_param, NOW())
    RETURNING id INTO message_id;
  ELSE
    -- Insert without agent_id
    INSERT INTO messages (conversation_id, content, role, created_at)
    VALUES (conversation_record_id, content_param, role_param, NOW())
    RETURNING id INTO message_id;
  END IF;

  RETURN message_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Create a simpler version without agent_id for backward compatibility
CREATE OR REPLACE FUNCTION add_session_message(
  chatbot_id_param UUID,
  session_id_param TEXT,
  content_param TEXT,
  role_param TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN add_session_message(chatbot_id_param, session_id_param, content_param, role_param, NULL);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Fix message policies to handle agent_id properly
DROP POLICY IF EXISTS "Agents can insert messages for assigned conversations" ON messages;
CREATE POLICY "Agents can insert messages for assigned conversations"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow if agent_id is NULL (regular chatbot message)
    agent_id IS NULL
    OR
    -- Allow if agent exists and is assigned to this conversation
    (agent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM conversation_agents ca
      WHERE ca.conversation_id = messages.conversation_id 
      AND ca.agent_id = messages.agent_id
    ))
  );