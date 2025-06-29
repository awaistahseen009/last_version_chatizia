/*
  # Agent System Setup

  1. New Tables
    - `agents` - Human agents for customer support
    - `agent_assignments` - Agent to chatbot assignments  
    - `conversation_agents` - Agent conversation assignments
    - `agent_notifications` - Agent notifications

  2. Security
    - Enable RLS on all tables
    - Create policies with proper checks to avoid duplicates
    - Grant necessary permissions

  3. Performance
    - Add indexes for common queries
*/

-- Create agents table
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

-- Create agent_assignments table (which chatbots an agent handles)
CREATE TABLE IF NOT EXISTS agent_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  chatbot_id uuid NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, chatbot_id)
);

-- Create conversation_agents table (agent takeover tracking)
CREATE TABLE IF NOT EXISTS conversation_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  knowledge_base_enabled boolean DEFAULT true,
  UNIQUE(conversation_id, agent_id)
);

-- Create agent_notifications table
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

-- Add agent_id column to messages table for tracking agent messages
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

-- Drop existing policies before creating new ones
DO $$
BEGIN
  -- Drop existing policies for agents table
  DROP POLICY IF EXISTS "Users can manage their own agents" ON agents;
  
  -- Drop existing policies for agent_assignments table
  DROP POLICY IF EXISTS "Users can manage assignments for their agents" ON agent_assignments;
  DROP POLICY IF EXISTS "Agents can read their own assignments" ON agent_assignments;
  DROP POLICY IF EXISTS "Allow checking existing assignments" ON agent_assignments;
  
  -- Drop existing policies for conversation_agents table
  DROP POLICY IF EXISTS "Users can manage conversation assignments for their agents" ON conversation_agents;
  DROP POLICY IF EXISTS "Agents can read assigned conversations" ON conversation_agents;
  DROP POLICY IF EXISTS "Allow agent conversation assignment" ON conversation_agents;
  DROP POLICY IF EXISTS "Allow reading conversation agents" ON conversation_agents;
  DROP POLICY IF EXISTS "Allow updating conversation agents" ON conversation_agents;
  
  -- Drop existing policies for agent_notifications table
  DROP POLICY IF EXISTS "Agents can manage their own notifications" ON agent_notifications;
  DROP POLICY IF EXISTS "Agents can read their own notifications" ON agent_notifications;
  DROP POLICY IF EXISTS "Agents can update their own notifications" ON agent_notifications;
  DROP POLICY IF EXISTS "Allow creating notifications" ON agent_notifications;
  DROP POLICY IF EXISTS "Users can manage notifications for their agents" ON agent_notifications;
  
  -- Drop existing policies for messages table (agent-related)
  DROP POLICY IF EXISTS "Agents can insert messages for assigned conversations" ON messages;
  DROP POLICY IF EXISTS "Agents can read messages from assigned conversations" ON messages;
END $$;

-- Create RLS policies for agents table
CREATE POLICY "Users can manage their own agents"
  ON agents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_assignments.agent_id
    )
  );

-- Allow checking for existing assignments before creating new ones
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
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = conversation_agents.agent_id
    )
  );

-- Allow conversation assignment
CREATE POLICY "Allow agent conversation assignment"
  ON conversation_agents
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow reading conversation agents"
  ON conversation_agents
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow updating conversation agents"
  ON conversation_agents
  FOR UPDATE
  TO public
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
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_notifications.agent_id
    )
  );

CREATE POLICY "Agents can update their own notifications"
  ON agent_notifications
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_notifications.agent_id
    )
  );

-- Allow creating notifications
CREATE POLICY "Allow creating notifications"
  ON agent_notifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Update message policies to allow agent messages
CREATE POLICY "Agents can insert messages for assigned conversations"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow if this is a session-based conversation for an active chatbot
    (NOT EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id
    ))
    OR
    -- Allow if agent is assigned to this conversation
    (EXISTS (
      SELECT 1 FROM conversation_agents ca
      WHERE ca.conversation_id = messages.conversation_id
      AND ca.agent_id = messages.agent_id
    ))
  );

CREATE POLICY "Agents can read messages from assigned conversations"
  ON messages
  FOR SELECT
  TO public
  USING (
    -- Allow if this is a session-based conversation for an active chatbot
    (NOT EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id
    ))
    OR
    -- Allow if agent is assigned to this conversation
    (EXISTS (
      SELECT 1 FROM conversation_agents ca
      WHERE ca.conversation_id = messages.conversation_id
    ))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_id ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_chatbot_id ON agent_assignments(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_conversation_id ON conversation_agents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_agent_id ON conversation_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent_id ON agent_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_conversation_id ON agent_notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_created_at ON agent_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_is_read ON agent_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_agents_knowledge_base_enabled ON conversation_agents(knowledge_base_enabled);

-- Create updated_at trigger for agents
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agents_updated_at();

-- Grant necessary permissions to anon role for agent authentication
GRANT SELECT ON agents TO anon;
GRANT SELECT ON agent_assignments TO anon;
GRANT SELECT, INSERT, UPDATE ON conversation_agents TO anon;
GRANT SELECT, INSERT, UPDATE ON agent_notifications TO anon;
GRANT SELECT, INSERT ON messages TO anon;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS add_session_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_session_message(UUID, TEXT, TEXT, TEXT, UUID);

-- Update add_session_message function to support agent messages
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
BEGIN
  -- Get chatbot information
  SELECT * INTO chatbot_record FROM chatbots WHERE id = chatbot_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chatbot not found';
  END IF;

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
  INSERT INTO messages (conversation_id, content, role, agent_id, created_at)
  VALUES (conversation_record_id, content_param, role_param, agent_id_param, NOW())
  RETURNING id INTO message_id;

  RETURN message_id;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION add_session_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;