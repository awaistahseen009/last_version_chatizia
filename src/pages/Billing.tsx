import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Zap,
  Crown,
  Star,
  FileText,
  Bot,
  MessageSquare,
  Users,
  Headphones,
  BarChart3,
  Shield,
  Clock,
  Infinity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import GooglePayButtonComponent from '../components/GooglePayButton';
import PaymentHistory from '../components/PaymentHistory';

interface BillingStats {
  totalChatbots: number;
  totalDocuments: number;
  messagesThisMonth: number;
  totalConversations: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  features: {
    chatbots: number | 'unlimited';
    messages: number;
    documents: number | 'unlimited';
    voice: boolean;
    analytics: boolean;
    support: string;
    knowledgeBase: boolean;
    customization: boolean;
    api: boolean;
  };
  popular?: boolean;
  color: string;
}

const Billing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [stats, setStats] = useState<BillingStats>({
    totalChatbots: 0,
    totalDocuments: 0,
    messagesThisMonth: 0,
    totalConversations: 0
  });
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchBillingStats();
  }, [user]);

  const fetchBillingStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get chatbots count
      const { data: chatbots, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id')
        .eq('user_id', user.id);

      if (chatbotsError) throw chatbotsError;

      // Get documents count
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id);

      if (documentsError) throw documentsError;

      // Get conversations count
      const chatbotIds = chatbots?.map(bot => bot.id) || [];
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id')
        .in('chatbot_id', chatbotIds);

      if (conversationsError) throw conversationsError;

      // Get messages this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, conversations!inner(chatbot_id)')
        .gte('created_at', startOfMonth.toISOString());

      if (messagesError) throw messagesError;

      const messagesThisMonth = messages?.filter((m: any) => 
        chatbotIds.includes(m.conversations?.chatbot_id)
      ).length || 0;

      setStats({
        totalChatbots: chatbots?.length || 0,
        totalDocuments: documents?.length || 0,
        messagesThisMonth,
        totalConversations: conversations?.length || 0
      });
    } catch (error) {
      console.error('Error fetching billing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      features: {
        chatbots: 1,
        messages: 100,
        documents: 5,
        voice: false,
        analytics: false,
        support: 'Community',
        knowledgeBase: false,
        customization: false,
        api: false
      },
      color: 'slate'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 9.99,
      yearlyPrice: 99.99,
      features: {
        chatbots: 5,
        messages: 1000,
        documents: 50,
        voice: true,
        analytics: true,
        support: 'Email',
        knowledgeBase: true,
        customization: true,
        api: false
      },
      popular: true,
      color: 'blue'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 29.99,
      yearlyPrice: 299.99,
      features: {
        chatbots: 'unlimited',
        messages: 10000,
        documents: 'unlimited',
        voice: true,
        analytics: true,
        support: '24/7 Priority',
        knowledgeBase: true,
        customization: true,
        api: true
      },
      color: 'purple'
    }
  ];

  const currentPlan = plans.find(plan => plan.id === (user?.subscription_status || 'free'));
  const currentPlanLimits = currentPlan?.features;

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentError(null);
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setSelectedPlan(null);
    
    // Refresh the page after 2 seconds to update the UI
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
  };

  const getUsagePercentage = (used: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited') return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounde-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Billing & Subscription</h1>
          <p className="text-slate-600 mt-1">Manage your subscription and billing information</p>
        </div>
        <button 
          onClick={() => document.getElementById('download-all-invoices-btn')?.click()}
          className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download All Invoices</span>
        </button>
      </div>

      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Payment Successful</p>
              <p className="text-sm text-green-700">
                Your subscription has been updated. Thank you for your payment!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Error Message */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Payment Failed</p>
              <p className="text-sm text-red-700">{paymentError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Current Plan</h2>
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-slate-800">{currentPlan?.name} Plan</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Active Chatbots</span>
              <Bot className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-slate-800">{stats.totalChatbots}</span>
              <span className="text-slate-500">/ {currentPlanLimits?.chatbots === 'unlimited' ? '∞' : currentPlanLimits?.chatbots}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className={`${getUsageColor(getUsagePercentage(stats.totalChatbots, currentPlanLimits?.chatbots || 1))} h-2 rounded-full transition-all`}
                style={{ 
                  width: `${getUsagePercentage(stats.totalChatbots, currentPlanLimits?.chatbots || 1)}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Messages This Month</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-slate-800">{stats.messagesThisMonth.toLocaleString()}</span>
              <span className="text-slate-500">/ {typeof currentPlanLimits?.messages === 'number' ? currentPlanLimits.messages.toLocaleString() : '∞'}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className={`${getUsageColor(getUsagePercentage(stats.messagesThisMonth, currentPlanLimits?.messages || 1))} h-2 rounded-full transition-all`}
                style={{ 
                  width: `${getUsagePercentage(stats.messagesThisMonth, currentPlanLimits?.messages || 1)}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Documents</span>
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-slate-800">{stats.totalDocuments}</span>
              <span className="text-slate-500">/ {currentPlanLimits?.documents === 'unlimited' ? '∞' : currentPlanLimits?.documents}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className={`${getUsageColor(getUsagePercentage(stats.totalDocuments, currentPlanLimits?.documents || 1))} h-2 rounded-full transition-all`}
                style={{ 
                  width: `${getUsagePercentage(stats.totalDocuments, currentPlanLimits?.documents || 1)}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">Total Conversations</span>
              <Star className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-end space-x-2">
              <span className="text-2xl font-bold text-slate-800">{stats.totalConversations}</span>
              <span className="text-slate-500">/ ∞</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: '25%' }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div>
            <p className="font-medium text-blue-800">Next billing date: {user?.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
            <p className="text-sm text-blue-600">Your subscription will renew automatically</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Feature Comparison</h2>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-600">Current: {currentPlan?.name}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Feature</th>
                {plans.map(plan => (
                  <th key={plan.id} className="px-4 py-3 text-center text-sm font-medium text-slate-500">
                    {plan.name}
                    {plan.popular && (
                      <div className="text-xs text-blue-600 font-normal mt-1">Most Popular</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Chatbots</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.chatbots === 'unlimited' ? (
                      <div className="flex items-center justify-center">
                        <Infinity className="w-4 h-4 text-blue-600" />
                      </div>
                    ) : plan.features.chatbots}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Monthly Messages</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.messages.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Documents</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.documents === 'unlimited' ? (
                      <div className="flex items-center justify-center">
                        <Infinity className="w-4 h-4 text-blue-600" />
                      </div>
                    ) : plan.features.documents}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Voice Support</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.voice ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-full mx-auto"></div>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Knowledge Base</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.knowledgeBase ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-full mx-auto"></div>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Advanced Analytics</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.analytics ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-full mx-auto"></div>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">API Access</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.api ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-full mx-auto"></div>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3 text-sm text-slate-700">Support</td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center text-sm text-slate-700">
                    {plan.features.support}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3"></td>
                {plans.map(plan => (
                  <td key={plan.id} className="px-4 py-3 text-center">
                    {plan.id === (user?.subscription_status || 'free') ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-medium cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : plan.price > 0 ? (
                      <div className="w-full">
                        {selectedPlan === plan.id ? (
                          <div className="space-y-3">
                            <GooglePayButtonComponent 
                              planId={plan.id}
                              amount={billingCycle === 'yearly' ? plan.yearlyPrice : plan.price}
                              onSuccess={handlePaymentSuccess}
                              onError={handlePaymentError}
                            />
                            <button
                              onClick={() => setSelectedPlan(null)}
                              className="w-full py-2 text-sm text-slate-600 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpgrade(plan.id)}
                            className={`w-full py-2 rounded-lg font-medium transition-colors ${
                              plan.popular
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-800 text-white hover:bg-slate-900'
                            }`}
                          >
                            Upgrade
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 rounded-lg font-medium transition-colors bg-slate-200 text-slate-600 cursor-not-allowed"
                      >
                        Free Plan
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Available Plans</h2>
          <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const colorClasses = {
              slate: 'border-slate-200',
              blue: 'border-blue-200 bg-blue-50',
              purple: 'border-purple-200 bg-purple-50'
            };

            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;

            return (
              <div
                key={plan.id}
                className={`relative border-2 rounded-lg p-6 transition-all hover:shadow-lg ${
                  plan.popular ? 'ring-2 ring-blue-500' : ''
                } ${colorClasses[plan.color as keyof typeof colorClasses]}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-slate-800">
                      ${price}
                    </span>
                    <span className="text-slate-600">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-slate-700">
                      {plan.features.chatbots === 'unlimited' ? 'Unlimited chatbots' : `${plan.features.chatbots} chatbots`}
                    </span>
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-slate-700">
                      {plan.features.messages.toLocaleString()} messages/month
                    </span>
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-slate-700">
                      {plan.features.documents === 'unlimited' ? 'Unlimited documents' : `${plan.features.documents} documents`}
                    </span>
                  </li>
                  {plan.features.voice && (
                    <li className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Voice responses</span>
                    </li>
                  )}
                  {plan.features.knowledgeBase && (
                    <li className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Knowledge base integration</span>
                    </li>
                  )}
                  {plan.features.analytics && (
                    <li className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Advanced analytics</span>
                    </li>
                  )}
                  {plan.features.customization && (
                    <li className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Full customization</span>
                    </li>
                  )}
                  {plan.features.api && (
                    <li className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">API access</span>
                    </li>
                  )}
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-slate-700">{plan.features.support} support</span>
                  </li>
                </ul>

                {plan.id === (user?.subscription_status || 'free') ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-lg font-medium transition-colors bg-slate-200 text-slate-600 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : plan.price > 0 ? (
                  <div className="w-full">
                    {selectedPlan === plan.id ? (
                      <div className="space-y-3">
                        <GooglePayButtonComponent 
                          planId={plan.id}
                          amount={billingCycle === 'yearly' ? plan.yearlyPrice : plan.price}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                        <button
                          onClick={() => setSelectedPlan(null)}
                          className="w-full py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          plan.popular
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-800 text-white hover:bg-slate-900'
                        }`}
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 rounded-lg font-medium transition-colors bg-slate-200 text-slate-600 cursor-not-allowed"
                  >
                    Free Plan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Usage Breakdown</h2>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">Current Billing Period</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">Messages</span>
              </div>
              <span className="text-sm text-slate-600">
                {stats.messagesThisMonth.toLocaleString()} / {typeof currentPlanLimits?.messages === 'number' ? currentPlanLimits.messages.toLocaleString() : '∞'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`${getUsageColor(getUsagePercentage(stats.messagesThisMonth, currentPlanLimits?.messages || 1))} h-2 rounded-full transition-all`}
                style={{ width: `${getUsagePercentage(stats.messagesThisMonth, currentPlanLimits?.messages || 1)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-slate-700">Chatbots</span>
              </div>
              <span className="text-sm text-slate-600">
                {stats.totalChatbots} / {currentPlanLimits?.chatbots === 'unlimited' ? '∞' : currentPlanLimits?.chatbots}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`${getUsageColor(getUsagePercentage(stats.totalChatbots, currentPlanLimits?.chatbots || 1))} h-2 rounded-full transition-all`}
                style={{ width: `${getUsagePercentage(stats.totalChatbots, currentPlanLimits?.chatbots || 1)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-slate-700">Documents</span>
              </div>
              <span className="text-sm text-slate-600">
                {stats.totalDocuments} / {currentPlanLimits?.documents === 'unlimited' ? '∞' : currentPlanLimits?.documents}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`${getUsageColor(getUsagePercentage(stats.totalDocuments, currentPlanLimits?.documents || 1))} h-2 rounded-full transition-all`}
                style={{ width: `${getUsagePercentage(stats.totalDocuments, currentPlanLimits?.documents || 1)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Usage Warnings */}
        {getUsagePercentage(stats.messagesThisMonth, currentPlanLimits?.messages || 1) > 80 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Approaching Message Limit</p>
                <p className="text-sm text-yellow-700">
                  You've used {Math.round(getUsagePercentage(stats.messagesThisMonth, currentPlanLimits?.messages || 1))}% of your monthly message allowance. 
                  Consider upgrading to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment History / Invoices */}
      <PaymentHistory />
    </div>
  );
};

export default Billing;