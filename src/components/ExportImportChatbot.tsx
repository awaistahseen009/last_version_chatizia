import React, { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, Check, Loader, Zap } from 'lucide-react';
import { useChatbot } from '../contexts/ChatbotContext';
import { supabase } from '../lib/supabase';
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits';
import { useNavigate } from 'react-router-dom';
import SubscriptionLimitModal from './SubscriptionLimitModal';
import ImportLimitModal from './ImportLimitModal';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';

interface ExportImportChatbotProps {
  chatbotId?: string;
  onSuccess?: () => void;
}

const ExportImportChatbot: React.FC<ExportImportChatbotProps> = ({ chatbotId, onSuccess }) => {
  const { chatbots, addChatbot } = useChatbot();
  const { isWithinLimits, limits, usage } = useSubscriptionLimits();
  const { user } = useAuth();
  const { addNotification } = useNotificationContext();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [showImportLimitModal, setShowImportLimitModal] = useState(false);
  const [importResults, setImportResults] = useState<{success: number, failed: number}>({success: 0, failed: 0});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      
      // If chatbotId is provided, export that specific chatbot
      // Otherwise, export all chatbots
      const chatbotsToExport = chatbotId 
        ? chatbots.filter(bot => bot.id === chatbotId)
        : chatbots;
      
      if (chatbotsToExport.length === 0) {
        throw new Error('No chatbots found to export');
      }

      // Prepare export data
      const exportData = await Promise.all(chatbotsToExport.map(async (bot) => {
        // Get knowledge base details if available
        let knowledgeBase = null;
        if (bot.knowledge_base_id) {
          const { data: kbData } = await supabase
            .from('knowledge_bases')
            .select('name, description')
            .eq('id', bot.knowledge_base_id)
            .single();
          
          knowledgeBase = kbData;
        }

        return {
          name: bot.name,
          description: bot.description,
          configuration: bot.configuration,
          knowledge_base: knowledgeBase ? {
            name: knowledgeBase.name,
            description: knowledgeBase.description
          } : null
        };
      }));

      // Create a JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = chatbotId 
        ? `chatbot-${chatbotsToExport[0].name.toLowerCase().replace(/\s+/g, '-')}.json`
        : 'chatbots-export.json';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Chatbot exported successfully');
      
      // Add notification
      addNotification({
        title: 'Export Successful',
        message: `Successfully exported ${chatbotsToExport.length} chatbot${chatbotsToExport.length !== 1 ? 's' : ''}.`,
        type: 'chatbot'
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export chatbot');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      
      // Read file content
      const fileContent = await file.text();
      const importData = JSON.parse(fileContent);
      
      if (!Array.isArray(importData)) {
        throw new Error('Invalid import file format. Expected an array of chatbots.');
      }

      // Check subscription limits
      if (!isWithinLimits('chatbots') && importData.length > 0) {
        // If we're at the limit, show the limit modal
        setShowLimitModal(true);
        return;
      }

      // Check if we can import all chatbots or need to select
      const canImportAll = isWithinLimits('chatbots') && 
                          chatbots.length + importData.length <= (typeof limits.chatbots === 'number' ? limits.chatbots : Infinity);
      
      if (!canImportAll) {
        // Store import data and show selection modal
        setImportData(importData);
        setShowImportLimitModal(true);
        return;
      }

      // If we can import all, proceed with import
      await importChatbots(importData);
      
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import chatbot');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importChatbots = async (botsToImport: any[], selectedIndices?: number[]) => {
    try {
      setImporting(true);
      setError(null);
      setImportResults({success: 0, failed: 0});

      // Filter chatbots if we have selected indices
      const chatbotsToProcess = selectedIndices 
        ? botsToImport.filter((_, index) => selectedIndices.includes(index))
        : botsToImport;
      
      let successCount = 0;
      let failedCount = 0;
      
      // Process each chatbot
      for (const botData of chatbotsToProcess) {
        try {
          // Validate required fields
          if (!botData.name) {
            console.warn('Invalid chatbot data. Missing name.', botData);
            failedCount++;
            continue;
          }
          
          // Check if a chatbot with the same name already exists
          const existingBot = chatbots.find(bot => bot.name === botData.name);
          if (existingBot) {
            console.log(`Chatbot "${botData.name}" already exists, skipping import.`);
            failedCount++;
            continue;
          }
          
          // Create the chatbot using the addChatbot function from context
          await addChatbot({
            name: botData.name,
            description: botData.description || null,
            status: 'active',
            knowledge_base_id: null, // Skip knowledge base
            configuration: botData.configuration || {}
          });
          
          successCount++;
        } catch (err) {
          console.error(`Failed to import chatbot "${botData.name}":`, err);
          failedCount++;
        }
      }
      
      setImportResults({success: successCount, failed: failedCount});
      
      if (successCount > 0) {
        setSuccess(`Successfully imported ${successCount} chatbot${successCount !== 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
        
        // Add notification
        addNotification({
          title: 'Import Successful',
          message: `Successfully imported ${successCount} chatbot${successCount !== 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`,
          type: 'chatbot'
        });
        
        setTimeout(() => setSuccess(null), 5000);
        
        // Call onSuccess callback if provided
        onSuccess?.();
      } else if (failedCount > 0) {
        setError(`Failed to import ${failedCount} chatbot${failedCount !== 1 ? 's' : ''}. Please note that knowledge bases need to be set up manually.`);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import chatbot');
    } finally {
      setImporting(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/billing');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}
      
      {importResults.success > 0 && importResults.failed > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700">
            <strong>Note:</strong> Some chatbots were imported without their knowledge bases. 
            You'll need to set up knowledge bases manually in the Documents section.
          </p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center justify-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export {chatbotId ? 'Chatbot' : 'All Chatbots'}</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="flex items-center justify-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {importing ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Import Chatbot</span>
            </>
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Subscription Status</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Chatbots:</span>
            <span className="text-sm font-medium text-blue-800">
              {usage.chatbots} / {limits.chatbots === 'unlimited' ? '∞' : limits.chatbots}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Documents:</span>
            <span className="text-sm font-medium text-blue-800">
              {usage.documents} / {limits.documents === 'unlimited' ? '∞' : limits.documents}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Messages (this month):</span>
            <span className="text-sm font-medium text-blue-800">
              {usage.messages} / {limits.messages === 'unlimited' ? '∞' : limits.messages}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Important Note</h4>
            <p className="text-sm text-yellow-700 mt-1">
              When importing chatbots, knowledge bases will need to be set up manually. 
              After import, go to the Documents section to create knowledge bases and upload documents.
            </p>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-slate-500">
        Export your chatbot configurations to backup or transfer to another account. 
        Import previously exported chatbots to restore them.
      </p>

      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        resourceType="chatbots"
        onUpgrade={handleUpgrade}
      />

      {/* Import Limit Modal */}
      <ImportLimitModal
        isOpen={showImportLimitModal}
        onClose={() => setShowImportLimitModal(false)}
        chatbots={importData}
        onContinue={(selectedIndices) => importChatbots(importData, selectedIndices)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};

export default ExportImportChatbot;