import React, { useState } from 'react';
import { 
  Users, 
  Filter, 
  Download, 
  RefreshCw, 
  MessageSquare, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Bot
} from 'lucide-react';
import { useChatbot } from '../contexts/ChatbotContext';
import UserInteractionsTable from '../components/UserInteractionsTable';

const Leads: React.FC = () => {
  const { chatbots } = useChatbot();
  const [selectedChatbot, setSelectedChatbot] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Leads & Interactions</h1>
          <p className="text-slate-600 mt-1">View and manage user interactions and leads from your chatbots</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select
            value={selectedChatbot}
            onChange={(e) => setSelectedChatbot(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Chatbots</option>
            {chatbots.map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">+12% this month</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">124</h3>
          <p className="text-slate-600">Total Leads</p>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+8% this month</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">87%</h3>
          <p className="text-slate-600">Email Capture Rate</p>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-purple-600 font-medium">+5% this month</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">76%</h3>
          <p className="text-slate-600">Positive Sentiment</p>
        </div>
      </div>

      {/* User Interactions Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-6">User Interactions</h2>
        <UserInteractionsTable chatbotId={selectedChatbot === 'all' ? undefined : selectedChatbot} />
      </div>
    </div>
  );
};

export default Leads;