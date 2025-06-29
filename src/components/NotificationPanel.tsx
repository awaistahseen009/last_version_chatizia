import React, { useState, useEffect } from 'react';
import { X, Bell, Check, Bot, FileText, CreditCard, BarChart3, Database, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'chatbot' | 'document' | 'payment' | 'analytics' | 'knowledge_base' | 'system';
}

interface NotificationPanelProps {
  onClose: () => void;
  onMarkAllRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, onMarkAllRead }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Load notifications from localStorage
    const storedNotifications = localStorage.getItem('notifications');
    if (storedNotifications) {
      try {
        const parsedNotifications = JSON.parse(storedNotifications);
        // Convert string timestamps back to Date objects
        const notificationsWithDates = parsedNotifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (err) {
        console.error('Error parsing notifications:', err);
        setNotifications([]);
      }
    } else {
      // Create sample notifications if none exist
      const sampleNotifications: Notification[] = [
        {
          id: '1',
          title: 'New Chatbot Created',
          message: 'Your chatbot "Customer Support" has been created successfully.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          read: false,
          type: 'chatbot'
        },
        {
          id: '2',
          title: 'Document Processed',
          message: 'Your document "Product Manual.pdf" has been processed and is ready to use.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          read: true,
          type: 'document'
        },
        {
          id: '3',
          title: 'Payment Successful',
          message: 'Your payment for the Pro Plan subscription was successful.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          read: true,
          type: 'payment'
        },
        {
          id: '4',
          title: 'Knowledge Base Created',
          message: 'Your knowledge base "Product Documentation" has been created.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
          read: false,
          type: 'knowledge_base'
        },
        {
          id: '5',
          title: 'Analytics Report Ready',
          message: 'Your monthly analytics report is now available for download.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
          read: true,
          type: 'analytics'
        }
      ];
      setNotifications(sampleNotifications);
      localStorage.setItem('notifications', JSON.stringify(sampleNotifications));
    }
  }, []);

  const handleMarkAsRead = (id: string) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const handleMarkAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    onMarkAllRead();
  };

  const handleDeleteNotification = (id: string) => {
    const updatedNotifications = notifications.filter(notification => notification.id !== id);
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem('notifications', JSON.stringify([]));
    onMarkAllRead();
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chatbot':
        return <Bot className="w-5 h-5 text-blue-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-orange-500" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'analytics':
        return <BarChart3 className="w-5 h-5 text-purple-500" />;
      case 'knowledge_base':
        return <Database className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
      
      <div className="p-2 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
            filter === 'all' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
            filter === 'unread' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => setFilter('chatbot')}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
            filter === 'chatbot' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Chatbots
        </button>
        <button
          onClick={() => setFilter('document')}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
            filter === 'document' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setFilter('payment')}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
            filter === 'payment' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Payments
        </button>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                      {formatTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    {!notification.read ? (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark as read
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Read</span>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No notifications</p>
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-3 border-t border-slate-200 flex justify-between">
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;