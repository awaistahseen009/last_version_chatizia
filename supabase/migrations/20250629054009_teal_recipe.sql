/*
  # Fix add_session_message function overloading

  1. Changes
    - Drop both versions of the add_session_message function
    - Create a single version that handles both cases
    - Fix parameter naming to avoid conflicts
    - Ensure proper error handling
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS add_session_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_session_message(UUID, TEXT, TEXT, TEXT, UUID);

-- Create a single function that handles both cases
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
    -- Use a dynamic SQL approach to handle tables with or without agent_id column
    EXECUTE 'INSERT INTO messages (conversation_id, content, role, created_at'
      || CASE WHEN has_agent_column THEN ', agent_id' ELSE '' END
      || ') VALUES ($1, $2, $3, $4'
      || CASE WHEN has_agent_column THEN ', $5' ELSE '' END
      || ') RETURNING id'
    INTO message_id
    USING 
      conversation_record_id, 
      content_param, 
      role_param, 
      NOW(),
      CASE WHEN has_agent_column THEN agent_id_param ELSE NULL END;
  END IF;

  RETURN message_id;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;