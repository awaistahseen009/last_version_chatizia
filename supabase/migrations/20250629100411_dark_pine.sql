/*
  # Fix Document Upload Functionality

  1. Updates
    - Fix create_document function to properly handle document creation
    - Ensure proper error handling
    - Fix ambiguous column references
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_document(UUID, UUID, TEXT, BIGINT, TEXT);

-- Create improved create_document function
CREATE OR REPLACE FUNCTION create_document(
  user_id_param UUID,
  knowledge_base_id_param UUID,
  filename_param TEXT,
  file_size_param BIGINT,
  file_type_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_document_id UUID;
  result JSONB;
BEGIN
  -- Insert the document record with explicit table references
  INSERT INTO documents (
    user_id,
    knowledge_base_id,
    filename,
    file_size,
    file_type,
    status,
    created_at
  )
  VALUES (
    user_id_param,
    knowledge_base_id_param,
    filename_param,
    file_size_param,
    file_type_param,
    'processing',
    NOW()
  )
  RETURNING id INTO new_document_id;
  
  -- Get the full document record
  SELECT row_to_json(d)::jsonb INTO result
  FROM documents d
  WHERE d.id = new_document_id;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating document: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_document(UUID, UUID, TEXT, BIGINT, TEXT) TO authenticated;

-- Fix RLS policies for documents table to use explicit table references
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (documents.user_id = auth.uid());

-- Fix enforce_document_limits trigger to avoid ambiguous column references
CREATE OR REPLACE FUNCTION enforce_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  current_count INTEGER;
  is_within_limits BOOLEAN;
  resource_type TEXT;
BEGIN
  -- Determine user_id and resource_type based on table
  IF TG_TABLE_NAME = 'chatbots' THEN
    user_id := NEW.user_id;
    resource_type := 'chatbot';
    
    -- Count existing chatbots with explicit table reference
    SELECT COUNT(*) INTO current_count
    FROM chatbots c
    WHERE c.user_id = NEW.user_id;
    
  ELSIF TG_TABLE_NAME = 'documents' THEN
    user_id := NEW.user_id;
    resource_type := 'document';
    
    -- Count existing documents with explicit table reference
    SELECT COUNT(*) INTO current_count
    FROM documents d
    WHERE d.user_id = NEW.user_id;
    
  ELSE
    -- For unsupported tables, allow the operation
    RETURN NEW;
  END IF;
  
  -- Check if within limits
  is_within_limits := check_subscription_limits(user_id, resource_type, current_count);
  
  IF NOT is_within_limits THEN
    RAISE EXCEPTION 'Subscription limit reached for %', resource_type;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS enforce_document_limits ON documents;
CREATE TRIGGER enforce_document_limits
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_subscription_limits();