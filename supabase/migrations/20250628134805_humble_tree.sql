/*
  # Agent System Setup

  1. New Tables
    - `agents` - Human agents for customer support
    - `agent_assignments` - Agent to chatbot assignments  
    - `conversation_agents` - Agent conversation assignments
    - `agent_notifications` - Agent notifications

  2. Security
    - Enable RLS on all tables
    - Create policies with IF NOT EXISTS
    - Grant necessary permissions

  3. Functions
    - Agent authentication
    - Assignment management
    - Conversation handling
    - Notification management
*/

-- Create agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id text NOT NULL UNIQUE,
  password text NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agent_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  chatbot_id uuid NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, chatbot_id)
);

-- Create conversation_agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversation_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  knowledge_base_enabled boolean DEFAULT true,
  UNIQUE(conversation_id, agent_id)
);

-- Create agent_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('escalation', 'new_message', 'manual_request')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  chatbot_name text,
  created_at timestamptz DEFAULT now()
);

-- Add agent_id column to messages table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'agent_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN agent_id uuid REFERENCES agents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  -- Drop policies for agents table
  DROP POLICY IF EXISTS "Users can manage their own agents" ON agents;
  DROP POLICY IF EXISTS "Allow agent authentication" ON agents;
  
  -- Drop policies for agent_assignments table
  DROP POLICY IF EXISTS "Users can manage assignments for their agents" ON agent_assignments;
  DROP POLICY IF EXISTS "Agents can read their own assignments" ON agent_assignments;
  DROP POLICY IF EXISTS "Allow checking existing assignments" ON agent_assignments;
  
  -- Drop policies for conversation_agents table
  DROP POLICY IF EXISTS "Users can manage conversation assignments for their agents" ON conversation_agents;
  DROP POLICY IF EXISTS "Agents can read assigned conversations" ON conversation_agents;
  DROP POLICY IF EXISTS "Allow agent conversation assignment" ON conversation_agents;
  DROP POLICY IF EXISTS "Allow reading conversation agents" ON conversation_agents;
  DROP POLICY IF EXISTS "Allow updating conversation agents" ON conversation_agents;
  
  -- Drop policies for agent_notifications table
  DROP POLICY IF EXISTS "Users can manage notifications for their agents" ON agent_notifications;
  DROP POLICY IF EXISTS "Agents can read their own notifications" ON agent_notifications;
  DROP POLICY IF EXISTS "Agents can update their own notifications" ON agent_notifications;
  DROP POLICY IF EXISTS "Allow creating notifications" ON agent_notifications;
  
  -- Drop policies for messages table
  DROP POLICY IF EXISTS "Agents can insert messages for assigned conversations" ON messages;
END;
$$;

-- Create RLS policies for agents table
CREATE POLICY "Users can manage their own agents"
  ON agents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow agent authentication"
  ON agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create RLS policies for agent_assignments table
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

CREATE POLICY "Agents can read their own assignments"
  ON agent_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow checking existing assignments"
  ON agent_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Create RLS policies for conversation_agents table
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

CREATE POLICY "Agents can read assigned conversations"
  ON conversation_agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow agent conversation assignment"
  ON conversation_agents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow reading conversation agents"
  ON conversation_agents
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow updating conversation agents"
  ON conversation_agents
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Create RLS policies for agent_notifications table
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

CREATE POLICY "Agents can read their own notifications"
  ON agent_notifications
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Agents can update their own notifications"
  ON agent_notifications
  FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow creating notifications"
  ON agent_notifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create message policies for agents
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_auth ON agents(agent_id, password);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_id ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_chatbot_id ON agent_assignments(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_chatbot ON agent_assignments(agent_id, chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_conversation_id ON conversation_agents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_agent_id ON conversation_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_agent_conversation ON conversation_agents(agent_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent_id ON agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_conversation_id ON agent_notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_created_at ON agent_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_is_read ON agent_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent_read ON agent_notifications(agent_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_knowledge_base_enabled ON conversation_agents(knowledge_base_enabled);

-- Create updated_at trigger function for agents
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agents
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agents_updated_at();

-- Grant necessary permissions
GRANT SELECT ON agents TO anon;
GRANT SELECT ON agent_assignments TO anon;
GRANT SELECT, INSERT, UPDATE ON conversation_agents TO anon;
GRANT SELECT, INSERT, UPDATE ON agent_notifications TO anon;
GRANT SELECT, INSERT ON messages TO anon;

-- Create agent authentication function
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

-- Create get_agent_assignments function
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

-- Create get_agent_conversations function
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

-- Create get_conversation_messages function
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

-- Create take_over_conversation function
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

-- Create send_agent_message function
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

-- Create get_agent_notifications function
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

-- Create mark_notification_read function
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