/*
  # Fix Agent Functions

  1. Updates
    - Fix take_over_conversation function to handle errors properly
    - Fix send_agent_message function to handle errors properly
    - Improve error handling in agent-related functions
    - Fix conversation_agents table constraints

  2. Security
    - Maintain existing security model
    - Ensure proper error handling
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS take_over_conversation(UUID, UUID);
DROP FUNCTION IF EXISTS send_agent_message(UUID, UUID, TEXT);

-- Fix conversation_agents table constraints if needed
DO $$
BEGIN
  -- Check if the unique constraint exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversation_agents_conversation_id_agent_id_key'
  ) THEN
    ALTER TABLE conversation_agents DROP CONSTRAINT conversation_agents_conversation_id_agent_id_key;
  END IF;
END $$;

-- Create improved take_over_conversation function
CREATE OR REPLACE FUNCTION take_over_conversation(
  agent_id_param UUID,
  conversation_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_exists BOOLEAN;
  conversation_exists BOOLEAN;
BEGIN
  -- Check if agent exists
  SELECT EXISTS (
    SELECT 1 FROM agents WHERE id = agent_id_param
  ) INTO agent_exists;
  
  IF NOT agent_exists THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;
  
  -- Check if conversation exists
  SELECT EXISTS (
    SELECT 1 FROM conversations WHERE id = conversation_id_param
  ) INTO conversation_exists;
  
  IF NOT conversation_exists THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- Insert or update conversation_agents record
  BEGIN
    INSERT INTO conversation_agents (
      conversation_id,
      agent_id,
      assigned_at,
      knowledge_base_enabled
    )
    VALUES (
      conversation_id_param,
      agent_id_param,
      NOW(),
      true
    )
    ON CONFLICT (conversation_id, agent_id) 
    DO UPDATE SET assigned_at = NOW();
  EXCEPTION WHEN unique_violation THEN
    -- If there's a unique violation, try again with an update
    UPDATE conversation_agents
    SET assigned_at = NOW()
    WHERE conversation_id = conversation_id_param
    AND agent_id = agent_id_param;
  END;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error taking over conversation: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create improved send_agent_message function
CREATE OR REPLACE FUNCTION send_agent_message(
  agent_id_param UUID,
  conversation_id_param UUID,
  content_param TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_id UUID;
  agent_exists BOOLEAN;
  conversation_exists BOOLEAN;
  has_agent_column BOOLEAN;
BEGIN
  -- Check if agent exists
  SELECT EXISTS (
    SELECT 1 FROM agents WHERE id = agent_id_param
  ) INTO agent_exists;
  
  IF NOT agent_exists THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;
  
  -- Check if conversation exists
  SELECT EXISTS (
    SELECT 1 FROM conversations WHERE id = conversation_id_param
  ) INTO conversation_exists;
  
  IF NOT conversation_exists THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- Check if messages table has agent_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'agent_id'
  ) INTO has_agent_column;

  -- First ensure agent is assigned to this conversation
  BEGIN
    INSERT INTO conversation_agents (
      conversation_id,
      agent_id,
      assigned_at,
      knowledge_base_enabled
    )
    VALUES (
      conversation_id_param,
      agent_id_param,
      NOW(),
      true
    )
    ON CONFLICT (conversation_id, agent_id) 
    DO UPDATE SET assigned_at = NOW();
  EXCEPTION WHEN unique_violation THEN
    -- If there's a unique violation, try again with an update
    UPDATE conversation_agents
    SET assigned_at = NOW()
    WHERE conversation_id = conversation_id_param
    AND agent_id = agent_id_param;
  END;

  -- Insert message with or without agent_id based on schema
  IF has_agent_column THEN
    INSERT INTO messages (
      conversation_id,
      content,
      role,
      agent_id,
      created_at
    )
    VALUES (
      conversation_id_param,
      content_param,
      'assistant',
      agent_id_param,
      NOW()
    )
    RETURNING id INTO message_id;
  ELSE
    -- Insert without agent_id
    INSERT INTO messages (
      conversation_id,
      content,
      role,
      created_at
    )
    VALUES (
      conversation_id_param,
      content_param,
      'assistant',
      NOW()
    )
    RETURNING id INTO message_id;
  END IF;

  RETURN message_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error sending agent message: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION take_over_conversation(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION take_over_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_agent_message(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION send_agent_message(UUID, UUID, TEXT) TO authenticated;

-- Ensure conversation_agents has the right constraint
DO $$
BEGIN
  -- Add the unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversation_agents_conversation_id_agent_id_key'
  ) THEN
    ALTER TABLE conversation_agents ADD CONSTRAINT conversation_agents_conversation_id_agent_id_key UNIQUE(conversation_id, agent_id);
  END IF;
END $$;

-- Fix RLS policies for conversation_agents
DROP POLICY IF EXISTS "Allow agent conversation assignment" ON conversation_agents;
CREATE POLICY "Allow agent conversation assignment"
  ON conversation_agents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow reading conversation agents" ON conversation_agents;
CREATE POLICY "Allow reading conversation agents"
  ON conversation_agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow updating conversation agents" ON conversation_agents;
CREATE POLICY "Allow updating conversation agents"
  ON conversation_agents
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Fix message policies to handle agent_id properly
DROP POLICY IF EXISTS "Agents can insert messages for assigned conversations" ON messages;
CREATE POLICY "Agents can insert messages for assigned conversations"
  ON messages
  FOR INSERT
  TO anon, authenticated
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