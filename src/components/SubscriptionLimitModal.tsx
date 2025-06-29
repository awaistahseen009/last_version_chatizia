import React from 'react';
import { AlertTriangle, X, Lock, Zap } from 'lucide-react';
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits';

interface SubscriptionLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'chatbots' | 'messages' | 'documents';
  onUpgrade?: () => void;
}

const SubscriptionLimitModal: React.FC<SubscriptionLimitModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  onUpgrade
}) => {
  const { limits, usage } = useSubscriptionLimits();

  if (!isOpen) return null;

  const resourceLabels = {
    chatbots: 'chatbots',
    messages: 'messages',
    documents: 'documents'
  };

  const resourceLabel = resourceLabels[resourceType];
  const currentUsage = usage[resourceType];
  const limit = limits[resourceType];
  const limitDisplay = limit === 'unlimited' ? 'unlimited' : limit;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl animate-fade-in">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Subscription Limit Reached</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-slate-700">
            You've reached your subscription limit of <span className="font-semibold">{limitDisplay} {resourceLabel}</span>.
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-orange-700">
                  Your current plan allows for {limitDisplay} {resourceLabel}. You currently have {currentUsage}.
                </p>
                <p className="text-sm text-orange-700 mt-2">
                  To create more {resourceLabel}, please upgrade your subscription or remove some existing {resourceLabel}.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Upgrade Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLimitModal;