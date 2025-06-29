import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface SubscriptionLimits {
  chatbots: number | 'unlimited';
  messages: number | 'unlimited';
  documents: number | 'unlimited';
  voice_enabled: boolean;
  analytics_enabled: boolean;
  api_access: boolean;
}

export interface SubscriptionUsage {
  chatbots: number;
  messages: number;
  documents: number;
}

export const useSubscriptionLimits = () => {
  const { user } = useAuth();
  const [limits, setLimits] = useState<SubscriptionLimits>({
    chatbots: 1,
    messages: 100,
    documents: 5,
    voice_enabled: false,
    analytics_enabled: false,
    api_access: false
  });
  const [usage, setUsage] = useState<SubscriptionUsage>({
    chatbots: 0,
    messages: 0,
    documents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription limits and usage
  const fetchLimitsAndUsage = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get subscription limits
      const { data: limitsData, error: limitsError } = await supabase.rpc(
        'get_subscription_limits',
        { user_id_param: user.id }
      );

      if (limitsError) throw limitsError;

      // Get usage data
      // 1. Count chatbots
      const { data: chatbots, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id')
        .eq('user_id', user.id);

      if (chatbotsError) throw chatbotsError;

      // 2. Count documents
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id);

      if (documentsError) throw documentsError;

      // 3. Count messages this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const chatbotIds = chatbots?.map(bot => bot.id) || [];
      
      let messageCount = 0;
      if (chatbotIds.length > 0) {
        const { count, error: messagesError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())
          .in('conversation_id', function() {
            this.select('id')
              .from('conversations')
              .in('chatbot_id', chatbotIds);
          });

        if (messagesError) throw messagesError;
        messageCount = count || 0;
      }

      // Parse the limits data properly
      const parsedLimits: SubscriptionLimits = {
        chatbots: limitsData.chatbots === 'unlimited' ? 'unlimited' : parseInt(limitsData.chatbots),
        messages: limitsData.messages === 'unlimited' ? 'unlimited' : parseInt(limitsData.messages),
        documents: limitsData.documents === 'unlimited' ? 'unlimited' : parseInt(limitsData.documents),
        voice_enabled: limitsData.voice_enabled,
        analytics_enabled: limitsData.analytics_enabled,
        api_access: limitsData.api_access
      };

      // Set limits and usage
      setLimits(parsedLimits);
      setUsage({
        chatbots: chatbots?.length || 0,
        documents: documents?.length || 0,
        messages: messageCount
      });
    } catch (err) {
      console.error('Error fetching subscription limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription limits');
      
      // Set default limits in case of error
      setLimits({
        chatbots: 1,
        messages: 100,
        documents: 5,
        voice_enabled: false,
        analytics_enabled: false,
        api_access: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchLimitsAndUsage();
  }, [user?.id]);

  // Check if user is within limits
  const isWithinLimits = (resourceType: 'chatbots' | 'messages' | 'documents'): boolean => {
    if (!limits || !usage) return false;
    
    const limit = limits[resourceType];
    const currentUsage = usage[resourceType];
    
    if (limit === 'unlimited') return true;
    return currentUsage < limit;
  };

  // Get remaining resources
  const getRemainingResources = (resourceType: 'chatbots' | 'messages' | 'documents'): number | 'unlimited' => {
    if (!limits || !usage) return 0;
    
    const limit = limits[resourceType];
    const currentUsage = usage[resourceType];
    
    if (limit === 'unlimited') return 'unlimited';
    return Math.max(0, limit - currentUsage);
  };

  // Get usage percentage
  const getUsagePercentage = (resourceType: 'chatbots' | 'messages' | 'documents'): number => {
    if (!limits || !usage) return 0;
    
    const limit = limits[resourceType];
    const currentUsage = usage[resourceType];
    
    if (limit === 'unlimited' || limit === 0) return 0;
    return Math.min(100, Math.round((currentUsage / limit) * 100));
  };

  return {
    limits,
    usage,
    loading,
    error,
    isWithinLimits,
    getRemainingResources,
    getUsagePercentage,
    refetch: fetchLimitsAndUsage
  };
};