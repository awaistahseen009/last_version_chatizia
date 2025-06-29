/*
  # Fix Knowledge Base Creation

  1. Updates
    - Fix ambiguous column reference in knowledge_bases table policies
    - Ensure proper RLS policies for knowledge base operations
    - Add proper indexes for performance
*/

-- Fix ambiguous column reference in knowledge_bases table policies
DROP POLICY IF EXISTS "Allow authenticated users to insert their own knowledge bases" ON knowledge_bases;
CREATE POLICY "Allow authenticated users to insert their own knowledge bases"
  ON knowledge_bases
  FOR INSERT
  TO authenticated
  WITH CHECK (knowledge_bases.user_id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated users to select their own knowledge bases" ON knowledge_bases;
CREATE POLICY "Allow authenticated users to select their own knowledge bases"
  ON knowledge_bases
  FOR SELECT
  TO authenticated
  USING (knowledge_bases.user_id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated users to update their own knowledge bases" ON knowledge_bases;
CREATE POLICY "Allow authenticated users to update their own knowledge bases"
  ON knowledge_bases
  FOR UPDATE
  TO authenticated
  USING (knowledge_bases.user_id = auth.uid())
  WITH CHECK (knowledge_bases.user_id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated users to delete their own knowledge bases" ON knowledge_bases;
CREATE POLICY "Allow authenticated users to delete their own knowledge bases"
  ON knowledge_bases
  FOR DELETE
  TO authenticated
  USING (knowledge_bases.user_id = auth.uid());

-- Ensure proper index exists for user_id
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON knowledge_bases(user_id);

-- Fix admin policies
DROP POLICY IF EXISTS "Admins can read all knowledge bases" ON knowledge_bases;
CREATE POLICY "Admins can read all knowledge bases"
  ON knowledge_bases
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Fix document policies to ensure proper access
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

-- Ensure proper index exists for user_id in documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);