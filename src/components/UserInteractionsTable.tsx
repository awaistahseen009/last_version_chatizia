import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  Eye,
  X,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useChatbot } from '../contexts/ChatbotContext';

interface UserInteraction {
  id: string;
  chatbot_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  reaction: 'good' | 'neutral' | 'worse';
  conversation_history: string[] | null;
  created_at: string;
  chatbot_name?: string;
}

interface UserInteractionsTableProps {
  chatbotId?: string;
}

const UserInteractionsTable: React.FC<UserInteractionsTableProps> = ({ chatbotId }) => {
  const { user } = useAuth();
  const { chatbots } = useChatbot();
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChatbot, setFilterChatbot] = useState<string>(chatbotId || 'all');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showConversation, setShowConversation] = useState<string | null>(null);
  const [selectedInteraction, setSelectedInteraction] = useState<UserInteraction | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchInteractions();
  }, [user, chatbotId]);

  const fetchInteractions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('user_interactions')
        .select(`
          *,
          chatbots (
            name
          )
        `);

      // Filter by chatbot if specified
      if (chatbotId) {
        query = query.eq('chatbot_id', chatbotId);
      } else {
        // Otherwise, get interactions for all user's chatbots
        const { data: userChatbots } = await supabase
          .from('chatbots')
          .select('id')
          .eq('user_id', user.id);
        
        if (userChatbots && userChatbots.length > 0) {
          const chatbotIds = userChatbots.map(c => c.id);
          query = query.in('chatbot_id', chatbotIds);
        }
      }

      // Order by created_at desc by default
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include chatbot name
      const transformedData = data.map(item => ({
        ...item,
        chatbot_name: item.chatbots?.name || 'Unknown'
      }));

      setInteractions(transformedData);
    } catch (err) {
      console.error('Error fetching user interactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user interactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interaction? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_interactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setInteractions(prev => prev.filter(interaction => interaction.id !== id));
    } catch (err) {
      console.error('Error deleting interaction:', err);
      alert('Failed to delete interaction');
    }
  };

  const handleViewConversation = (interaction: UserInteraction) => {
    setSelectedInteraction(interaction);
    setShowConversation(interaction.id);
  };

  const handleCloseConversation = () => {
    setShowConversation(null);
    setSelectedInteraction(null);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(email);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Chatbot', 'Sentiment', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredInteractions.map(interaction => [
        interaction.name || 'N/A',
        interaction.email || 'N/A',
        interaction.phone || 'N/A',
        interaction.chatbot_name,
        interaction.sentiment,
        new Date(interaction.created_at).toLocaleString()
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'user_interactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Apply filters and sorting
  const filteredInteractions = interactions
    .filter(interaction => {
      // Apply search term
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (interaction.name?.toLowerCase().includes(searchLower) || false) ||
        (interaction.email?.toLowerCase().includes(searchLower) || false) ||
        (interaction.phone?.toLowerCase().includes(searchLower) || false);

      // Apply chatbot filter
      const matchesChatbot = filterChatbot === 'all' || interaction.chatbot_id === filterChatbot;

      // Apply sentiment filter
      const matchesSentiment = filterSentiment === 'all' || interaction.sentiment === filterSentiment;

      return matchesSearch && matchesChatbot && matchesSentiment;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortField === 'created_at') {
        return sortDirection === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      // String comparison for other fields
      const aValue = a[sortField as keyof UserInteraction] || '';
      const bValue = b[sortField as keyof UserInteraction] || '';
      
      return sortDirection === 'asc'
        ? aValue.toString().localeCompare(bValue.toString())
        : bValue.toString().localeCompare(aValue.toString());
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full"
          />
        </div>
        
        {!chatbotId && (
          <select
            value={filterChatbot}
            onChange={(e) => setFilterChatbot(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Chatbots</option>
            {chatbots.map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
        )}
        
        <select
          value={filterSentiment}
          onChange={(e) => setFilterSentiment(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        
        <div className="flex space-x-2">
          <button
            onClick={fetchInteractions}
            className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Phone</span>
                    {sortField === 'phone' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                {!chatbotId && (
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('chatbot_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Chatbot</span>
                      {sortField === 'chatbot_name' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                )}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('sentiment')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Sentiment</span>
                    {sortField === 'sentiment' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInteractions.length > 0 ? (
                filteredInteractions.map((interaction) => (
                  <tr key={interaction.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {interaction.name || 'Anonymous'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interaction.email ? (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{interaction.email}</span>
                          <button 
                            onClick={() => handleCopyEmail(interaction.email!)}
                            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                            title="Copy email"
                          >
                            {copied === interaction.email ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interaction.phone ? (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{interaction.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not provided</span>
                      )}
                    </td>
                    {!chatbotId && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{interaction.chatbot_name}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        interaction.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        interaction.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {interaction.sentiment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {new Date(interaction.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewConversation(interaction)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          title="View conversation"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInteraction(interaction.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete interaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={chatbotId ? 6 : 7} className="px-6 py-10 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No user interactions found</p>
                    <p className="text-sm text-slate-400 mt-1">
                      User interactions will appear here when users provide their information through your chatbots.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversation Modal */}
      {showConversation && selectedInteraction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Conversation History</h3>
                <p className="text-sm text-slate-600">
                  {selectedInteraction.name || 'Anonymous'} • {new Date(selectedInteraction.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleCloseConversation}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{selectedInteraction.name || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{selectedInteraction.email || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{selectedInteraction.phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Interaction Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Chatbot: {selectedInteraction.chatbot_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-4 h-4 rounded-full ${
                          selectedInteraction.sentiment === 'positive' ? 'bg-green-500' :
                          selectedInteraction.sentiment === 'negative' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`}></span>
                        <span className="text-sm text-slate-600">Sentiment: {selectedInteraction.sentiment}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <h4 className="text-sm font-medium text-slate-700 mb-3">Conversation</h4>
              {selectedInteraction.conversation_history && selectedInteraction.conversation_history.length > 0 ? (
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                  {selectedInteraction.conversation_history.map((message, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        index % 2 === 0 
                          ? 'bg-blue-100 ml-auto max-w-[80%]' 
                          : 'bg-white max-w-[80%]'
                      }`}
                    >
                      <p className="text-sm">{message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {index % 2 === 0 ? 'User' : 'Bot'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No conversation history available</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleCloseConversation}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInteractionsTable;