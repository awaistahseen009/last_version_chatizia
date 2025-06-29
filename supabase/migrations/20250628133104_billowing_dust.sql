/*
  # Fix Throttling Issues and Agent Errors

  1. Updates
    - Add check_agent_tables_exist function to safely check if agent tables exist
    - Update add_session_message function to handle missing agent tables
    - Fix message policies to prevent errors with undefined agent_id
    - Add proper error handling for agent-related functions

  2. Security
    - Maintain existing RLS policies
    - Ensure proper error handling for non-existent tables
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

-- Fix add_session_message function to handle missing agent tables
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
  has_agent_column BOOLEAN;
BEGIN
  -- Get chatbot information
  SELECT * INTO chatbot_record FROM chatbots WHERE id = chatbot_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chatbot not found';
  END IF;

  -- Check if messages table has agent_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'agent_id'
  ) INTO has_agent_column;

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

  -- Insert the message with or without agent_id based on schema
  IF has_agent_column AND agent_id_param IS NOT NULL THEN
    INSERT INTO messages (conversation_id, content, role, agent_id, created_at)
    VALUES (conversation_record_id, content_param, role_param, agent_id_param, NOW())
    RETURNING id INTO message_id;
  ELSE
    INSERT INTO messages (conversation_id, content, role, created_at)
    VALUES (conversation_record_id, content_param, role_param, NOW())
    RETURNING id INTO message_id;
  END IF;

  RETURN message_id;
END;
$$;

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Fix message policies to prevent errors with undefined agent_id
DO $$
BEGIN
  -- Drop agent-related policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Agents can insert messages for assigned conversations" ON messages;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Agents can read messages from assigned conversations" ON messages;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;

-- Fix public message policies to ensure they work without agent tables
DROP POLICY IF EXISTS "Public can read messages for active chatbot sessions" ON messages;
CREATE POLICY "Public can read messages for active chatbot sessions"
  ON messages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN chatbots cb ON c.chatbot_id = cb.id
      WHERE c.id = messages.conversation_id 
      AND cb.status = 'active'
      AND c.session_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can insert messages for active chatbot sessions" ON messages;
CREATE POLICY "Public can insert messages for active chatbot sessions"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN chatbots cb ON c.chatbot_id = cb.id
      WHERE c.id = messages.conversation_id 
      AND cb.status = 'active'
      AND c.session_id IS NOT NULL
    )
  );

-- Create a function to safely get agent assignments
CREATE OR REPLACE FUNCTION safe_get_agent_assignments(
  agent_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if agent tables exist
  IF NOT check_agent_tables_exist() THEN
    RETURN '[]'::JSON;
  END IF;

  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT 
        aa.id,
        aa.agent_id,
        aa.chatbot_id,
        aa.created_at,
        c.name as chatbot_name,
        c.configuration as chatbot_configuration
      FROM agent_assignments aa
      JOIN chatbots c ON aa.chatbot_id = c.id
      WHERE aa.agent_id = agent_id_param
    ) t
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION safe_get_agent_assignments(UUID) TO anon;
GRANT EXECUTE ON FUNCTION safe_get_agent_assignments(UUID) TO authenticated;