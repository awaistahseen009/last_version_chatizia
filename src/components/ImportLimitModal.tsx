import React, { useState } from 'react';
import { AlertCircle, X, Check, Zap } from 'lucide-react';
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits';

interface ImportLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbots: any[];
  onContinue: (selectedIds: number[]) => void;
  onUpgrade?: () => void;
}

const ImportLimitModal: React.FC<ImportLimitModalProps> = ({
  isOpen,
  onClose,
  chatbots,
  onContinue,
  onUpgrade
}) => {
  const { limits, usage } = useSubscriptionLimits();
  const [selectedChatbots, setSelectedChatbots] = useState<number[]>([]);

  if (!isOpen) return null;

  const chatbotLimit = typeof limits.chatbots === 'number' ? limits.chatbots : Infinity;
  const remainingSlots = Math.max(0, chatbotLimit - usage.chatbots);
  const canSelectMore = selectedChatbots.length < remainingSlots;

  const handleToggleSelect = (index: number) => {
    if (selectedChatbots.includes(index)) {
      setSelectedChatbots(prev => prev.filter(i => i !== index));
    } else if (canSelectMore) {
      setSelectedChatbots(prev => [...prev, index]);
    }
  };

  const handleContinue = () => {
    onContinue(selectedChatbots);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Subscription Limit Warning</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700">
              You're trying to import {chatbots.length} chatbots, but your subscription only allows for {remainingSlots} more chatbots.
              Please select up to {remainingSlots} chatbots to import, or upgrade your plan.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-800">Select chatbots to import ({selectedChatbots.length}/{remainingSlots})</h4>
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-200">
              {chatbots.map((bot, index) => (
                <div 
                  key={index}
                  className={`p-3 flex items-center space-x-3 ${
                    !selectedChatbots.includes(index) && selectedChatbots.length >= remainingSlots
                      ? 'opacity-50'
                      : 'hover:bg-slate-50 cursor-pointer'
                  }`}
                  onClick={() => handleToggleSelect(index)}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-md border ${
                      selectedChatbots.includes(index)
                        ? 'bg-blue-600 border-blue-600 flex items-center justify-center'
                        : 'border-slate-300'
                    }`}>
                      {selectedChatbots.includes(index) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{bot.name}</p>
                    {bot.description && (
                      <p className="text-sm text-slate-500 truncate">{bot.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {selectedChatbots.length} of {remainingSlots} slots selected
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onUpgrade}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Upgrade Plan</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedChatbots.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue with Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportLimitModal;