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