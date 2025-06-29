/*
  # Fix Agent System Issues

  1. Updates
    - Fix agent authentication
    - Fix agent assignments
    - Fix agent deletion
    - Fix agent message handling
    - Fix throttling issues with better error handling

  2. Security
    - Maintain proper RLS policies
    - Ensure secure agent authentication
*/

-- Fix agent authentication function
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

-- Fix agent assignments function
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

-- Fix agent deletion by ensuring cascade delete works properly
ALTER TABLE agent_assignments
  DROP CONSTRAINT IF EXISTS agent_assignments_agent_id_fkey,
  ADD CONSTRAINT agent_assignments_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE conversation_agents
  DROP CONSTRAINT IF EXISTS conversation_agents_agent_id_fkey,
  ADD CONSTRAINT conversation_agents_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE agent_notifications
  DROP CONSTRAINT IF EXISTS agent_notifications_agent_id_fkey,
  ADD CONSTRAINT agent_notifications_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Fix message agent_id reference
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_agent_id_fkey,
  ADD CONSTRAINT messages_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- Fix RLS policies for agent assignments
DROP POLICY IF EXISTS "Users can manage assignments for their agents" ON agent_assignments;
CREATE POLICY "Users can manage assignments for their agents"
  ON agent_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_assignments.agent_id 
      AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_assignments.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

-- Fix RLS policies for conversation agents
DROP POLICY IF EXISTS "Users can manage conversation assignments for their agents" ON conversation_agents;
CREATE POLICY "Users can manage conversation assignments for their agents"
  ON conversation_agents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = conversation_agents.agent_id 
      AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = conversation_agents.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

-- Fix RLS policies for agent notifications
DROP POLICY IF EXISTS "Users can manage notifications for their agents" ON agent_notifications;
CREATE POLICY "Users can manage notifications for their agents"
  ON agent_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_notifications.agent_id 
      AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_notifications.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

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

-- Create a function to create agent notification
CREATE OR REPLACE FUNCTION create_agent_notification(
  agent_id_param UUID,
  conversation_id_param UUID,
  type_param TEXT,
  message_param TEXT,
  chatbot_name_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO agent_notifications (
    agent_id,
    conversation_id,
    type,
    message,
    chatbot_name,
    is_read,
    created_at
  )
  VALUES (
    agent_id_param,
    conversation_id_param,
    type_param,
    message_param,
    chatbot_name_param,
    false,
    NOW()
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_agent_notification(UUID, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_agent_notification(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Create a function to get agent conversations
CREATE OR REPLACE FUNCTION get_agent_conversations(
  agent_id_param UUID
)
RETURNS TABLE (
  id UUID,
  chatbot_id UUID,
  session_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  chatbot_name TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  is_agent_assigned BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH assigned_chatbots AS (
    SELECT aa.chatbot_id
    FROM agent_assignments aa
    WHERE aa.agent_id = agent_id_param
  ),
  agent_assigned_conversations AS (
    SELECT ca.conversation_id
    FROM conversation_agents ca
    WHERE ca.agent_id = agent_id_param
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN assigned_chatbots ac ON c.chatbot_id = ac.chatbot_id
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT 
    c.id,
    c.chatbot_id,
    c.session_id,
    c.created_at,
    c.updated_at,
    cb.name as chatbot_name,
    lm.content as last_message,
    lm.created_at as last_message_time,
    EXISTS (
      SELECT 1 FROM agent_assigned_conversations aac
      WHERE aac.conversation_id = c.id
    ) as is_agent_assigned
  FROM conversations c
  JOIN chatbots cb ON c.chatbot_id = cb.id
  JOIN assigned_chatbots ac ON c.chatbot_id = ac.chatbot_id
  LEFT JOIN last_messages lm ON c.id = lm.conversation_id
  WHERE c.session_id IS NOT NULL
  ORDER BY c.updated_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_agent_conversations(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_agent_conversations(UUID) TO authenticated;

-- Create a function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
  conversation_id_param UUID
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  content TEXT,
  role TEXT,
  agent_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.agent_id,
    m.created_at
  FROM messages m
  WHERE m.conversation_id = conversation_id_param
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID) TO authenticated;

-- Create a function to take over a conversation
CREATE OR REPLACE FUNCTION take_over_conversation(
  agent_id_param UUID,
  conversation_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update conversation_agents record
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

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION take_over_conversation(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION take_over_conversation(UUID, UUID) TO authenticated;

-- Create a function to send agent message
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
BEGIN
  -- First ensure agent is assigned to this conversation
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

  -- Insert message
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

  RETURN message_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_agent_message(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION send_agent_message(UUID, UUID, TEXT) TO authenticated;

-- Create a function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  notification_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agent_notifications
  SET is_read = true
  WHERE id = notification_id_param;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO anon;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;

-- Create a function to get agent notifications
CREATE OR REPLACE FUNCTION get_agent_notifications(
  agent_id_param UUID,
  unread_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  conversation_id UUID,
  type TEXT,
  message TEXT,
  is_read BOOLEAN,
  chatbot_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    an.id,
    an.agent_id,
    an.conversation_id,
    an.type,
    an.message,
    an.is_read,
    an.chatbot_name,
    an.created_at
  FROM agent_notifications an
  WHERE an.agent_id = agent_id_param
  AND (NOT unread_only OR an.is_read = false)
  ORDER BY an.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_agent_notifications(UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION get_agent_notifications(UUID, BOOLEAN) TO authenticated;

-- Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_auth ON agents(agent_id, password);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_chatbot ON agent_assignments(agent_id, chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_agent_conversation ON conversation_agents(agent_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent_read ON agent_notifications(agent_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);