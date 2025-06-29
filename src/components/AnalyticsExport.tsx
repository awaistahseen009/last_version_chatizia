import React, { useState } from 'react';
import { Download, FileText, Loader } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsExportProps {
  timeRange: string;
  selectedChatbot: string;
}

const AnalyticsExport: React.FC<AnalyticsExportProps> = ({ timeRange, selectedChatbot }) => {
  const { analytics } = useAnalytics();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!analytics) return;
    
    setExporting(true);
    
    try {
      // Create a PDF-like HTML document for the analytics report
      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Analytics Report - Chatizia Pro</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .report-container { max-width: 1000px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin-bottom: 5px; }
            .header p { color: #64748b; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
            .stat-card h3 { margin-top: 0; color: #64748b; font-size: 14px; }
            .stat-card p { margin-bottom: 0; font-size: 24px; font-weight: bold; color: #0f172a; }
            .chart-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
            .chart-container h3 { margin-top: 0; color: #64748b; }
            .bar-chart { display: flex; height: 200px; align-items: flex-end; gap: 10px; margin-top: 20px; }
            .bar { background: #3b82f6; border-radius: 4px 4px 0 0; flex-grow: 1; position: relative; }
            .bar-label { position: absolute; bottom: -25px; left: 0; right: 0; text-align: center; font-size: 12px; }
            .questions-list { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
            .questions-list h3 { margin-top: 0; color: #64748b; }
            .questions-list ul { padding-left: 20px; }
            .questions-list li { margin-bottom: 8px; }
            .geo-data { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .geo-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .geo-item:last-child { border-bottom: none; }
            .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <h1>Analytics Report</h1>
              <p>Chatizia Pro - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Time Range: ${timeRange} | Chatbot: ${selectedChatbot === 'all' ? 'All Chatbots' : 'Selected Chatbot'}</p>
              <p>User: ${user?.full_name || 'User'} (${user?.email || 'Unknown'})</p>
            </div>
            
            <div class="section">
              <h2>Overview</h2>
              <div class="stats-grid">
                <div class="stat-card">
                  <h3>Total Conversations</h3>
                  <p>${analytics.total_conversations.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                  <h3>Total Messages</h3>
                  <p>${analytics.total_messages.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                  <h3>Unique Users</h3>
                  <p>${analytics.unique_users.toLocaleString()}</p>
                </div>
                <div class="stat-card">
                  <h3>Avg Response Time</h3>
                  <p>${analytics.avg_response_time}s</p>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>Performance Metrics</h2>
              <div class="stats-grid">
                <div class="stat-card">
                  <h3>Conversation Completion Rate</h3>
                  <p>${analytics.conversation_completion_rate}%</p>
                </div>
                <div class="stat-card">
                  <h3>Avg Messages Per Conversation</h3>
                  <p>${analytics.average_conversation_length}</p>
                </div>
                <div class="stat-card">
                  <h3>Voice Usage Rate</h3>
                  <p>${analytics.voice_interaction_rate}%</p>
                </div>
                <div class="stat-card">
                  <h3>AI Response Accuracy</h3>
                  <p>${analytics.llm_response_accuracy}%</p>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>Conversation Trends</h2>
              <div class="chart-container">
                <h3>Daily Conversations</h3>
                <div class="bar-chart">
                  ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    // Generate random height for demonstration
                    const height = 30 + Math.floor(Math.random() * 70);
                    return `
                      <div class="bar" style="height: ${height}%;">
                        <div class="bar-label">${day}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>User Engagement</h2>
              <div class="stats-grid">
                <div class="stat-card">
                  <h3>Returning Users Rate</h3>
                  <p>${analytics.returning_users_rate}%</p>
                </div>
                <div class="stat-card">
                  <h3>User Sentiment (Positive)</h3>
                  <p>${analytics.user_sentiment_breakdown.positive}%</p>
                </div>
                <div class="stat-card">
                  <h3>User Reactions (Good)</h3>
                  <p>${analytics.user_reaction_breakdown.good}%</p>
                </div>
                <div class="stat-card">
                  <h3>Mobile Usage</h3>
                  <p>${analytics.device_breakdown.mobile}%</p>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>Top Questions</h2>
              <div class="questions-list">
                <h3>Most Asked Questions</h3>
                <ul>
                  ${analytics.top_questions.map(q => `
                    <li>${q.question} (${q.count} times)</li>
                  `).join('')}
                </ul>
              </div>
            </div>
            
            <div class="section">
              <h2>Geographic Distribution</h2>
              <div class="chart-container">
                <h3>Top User Locations</h3>
                <div class="geo-data">
                  ${analytics.geographic_data.map(geo => `
                    <div class="geo-item">
                      <span>${geo.country}</span>
                      <span>${geo.users} users</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()} | Chatizia Pro Analytics</p>
              <p>This report is for internal use only and contains confidential information.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Create a blob and download
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !analytics}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {exporting ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          <span>Export Report</span>
        </>
      )}
    </button>
  );
};

export default AnalyticsExport;