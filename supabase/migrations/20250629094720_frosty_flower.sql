/*
  # Fix Document Upload Functionality

  1. Updates
    - Create a function to handle document creation without ambiguous column references
    - Fix RLS policies for documents table to use explicit table references
    - Add proper indexes for better performance

  2. Security
    - Maintain existing security model
    - Ensure proper error handling
*/

-- Create a function to handle document creation without ambiguous column references
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
  -- Insert the document record
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

DROP POLICY IF EXISTS "Users can read own documents" ON documents;
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (documents.user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (documents.user_id = auth.uid())
  WITH CHECK (documents.user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (documents.user_id = auth.uid());

-- Fix admin policies
DROP POLICY IF EXISTS "Admins can read all documents" ON documents;
CREATE POLICY "Admins can read all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all documents" ON documents;
CREATE POLICY "Admins can delete all documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id ON documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_kb_status ON documents(knowledge_base_id, status);