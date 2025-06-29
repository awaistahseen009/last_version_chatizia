import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Voice {
  id: string;
  name: string;
  voice_id: string;
  description: string | null;
  created_at: string;
}

export const useVoices = () => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchVoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_available_voices');

      if (error) throw error;
      setVoices(data || []);
    } catch (err) {
      console.error('Error fetching voices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  const addVoice = async (name: string, voiceId: string, description?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.rpc('admin_add_voice', {
        voice_name: name,
        elevenlabs_voice_id: voiceId,
        voice_description: description || null
      });

      if (error) throw error;
      await fetchVoices(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error adding voice:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to add voice');
    }
  };

  const deleteVoice = async (voiceId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase.rpc('admin_delete_voice', {
        target_voice_id: voiceId
      });

      if (error) throw error;
      await fetchVoices(); // Refresh the list
    } catch (err) {
      console.error('Error deleting voice:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to delete voice');
    }
  };

  useEffect(() => {
    if (user) {
      fetchVoices();
    }
  }, [user]);

  return {
    voices,
    loading,
    error,
    addVoice,
    deleteVoice,
    refetch: fetchVoices,
  };
};