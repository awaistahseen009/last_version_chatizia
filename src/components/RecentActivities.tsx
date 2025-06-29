import React from 'react';
import { 
  Plus, 
  FileText, 
  Settings, 
  Download, 
  BarChart3,
  Database,
  CreditCard,
  Bot,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  action: string;
  item: string;
  time: string;
  type: 'create' | 'upload' | 'update' | 'report' | 'payment' | 'download';
  timestamp: Date;
}

const RecentActivities: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Fetch recent chatbot creations
        const { data: chatbots, error: chatbotsError } = await supabase
          .from('chatbots')
          .select('id, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (chatbotsError) throw chatbotsError;
        
        // Fetch recent document uploads
        const { data: documents, error: documentsError } = await supabase
          .from('documents')
          .select('id, filename, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (documentsError) throw documentsError;
        
        // Fetch recent knowledge base creations
        const { data: knowledgeBases, error: kbError } = await supabase
          .from('knowledge_bases')
          .select('id, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (kbError) throw kbError;
        
        // Fetch recent payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payment_transactions')
          .select('id, plan_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (paymentsError) throw paymentsError;
        
        // Combine all activities
        const allActivities: Activity[] = [
          ...(chatbots || []).map(bot => ({
            id: `chatbot-${bot.id}`,
            action: 'Chatbot created',
            item: bot.name,
            time: formatTimeAgo(new Date(bot.created_at)),
            type: 'create' as const,
            timestamp: new Date(bot.created_at)
          })),
          ...(documents || []).map(doc => ({
            id: `document-${doc.id}`,
            action: 'Document uploaded',
            item: doc.filename,
            time: formatTimeAgo(new Date(doc.created_at)),
            type: 'upload' as const,
            timestamp: new Date(doc.created_at)
          })),
          ...(knowledgeBases || []).map(kb => ({
            id: `kb-${kb.id}`,
            action: 'Knowledge base created',
            item: kb.name,
            time: formatTimeAgo(new Date(kb.created_at)),
            type: 'create' as const,
            timestamp: new Date(kb.created_at)
          })),
          ...(payments || []).map(payment => ({
            id: `payment-${payment.id}`,
            action: 'Payment processed',
            item: `${payment.plan_id.charAt(0).toUpperCase() + payment.plan_id.slice(1)} Plan`,
            time: formatTimeAgo(new Date(payment.created_at)),
            type: 'payment' as const,
            timestamp: new Date(payment.created_at)
          }))
        ];
        
        // Sort by timestamp (most recent first)
        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // Take the 5 most recent activities
        setActivities(allActivities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [user]);
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString();
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'upload':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'update':
        return <Settings className="w-4 h-4 text-yellow-600" />;
      case 'report':
        return <BarChart3 className="w-4 h-4 text-purple-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'download':
        return <Download className="w-4 h-4 text-orange-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-600" />;
    }
  };
  
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'bg-green-100';
      case 'upload':
        return 'bg-blue-100';
      case 'update':
        return 'bg-yellow-100';
      case 'report':
        return 'bg-purple-100';
      case 'payment':
        return 'bg-indigo-100';
      case 'download':
        return 'bg-orange-100';
      default:
        return 'bg-slate-100';
    }
  };
  
  const getActivityTextColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'text-green-600';
      case 'upload':
        return 'text-blue-600';
      case 'update':
        return 'text-yellow-600';
      case 'report':
        return 'text-purple-600';
      case 'payment':
        return 'text-indigo-600';
      case 'download':
        return 'text-orange-600';
      default:
        return 'text-slate-600';
    }
  };
  
  const getActivityIcon2 = (action: string) => {
    if (action.includes('Chatbot')) {
      return <Bot className="w-4 h-4 text-blue-500" />;
    } else if (action.includes('Document')) {
      return <FileText className="w-4 h-4 text-orange-500" />;
    } else if (action.includes('Knowledge base')) {
      return <Database className="w-4 h-4 text-purple-500" />;
    } else if (action.includes('Payment')) {
      return <CreditCard className="w-4 h-4 text-green-500" />;
    } else if (action.includes('Analytics')) {
      return <BarChart3 className="w-4 h-4 text-indigo-500" />;
    } else if (action.includes('Invoice')) {
      return <Download className="w-4 h-4 text-yellow-500" />;
    } else {
      return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getActivityBgColor(activity.type)} ${getActivityTextColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800">{activity.action}</p>
              <p className="text-sm font-medium text-slate-600 truncate">{activity.item}</p>
              <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No recent activity</p>
          <p className="text-xs text-slate-400 mt-1">Your activities will appear here</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivities;