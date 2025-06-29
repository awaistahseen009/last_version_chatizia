import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';

interface NotificationBadgeProps {
  onClick: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onClick }) => {
  const { unreadCount } = useNotificationContext();
  const [animate, setAnimate] = useState(false);
  
  // Animate when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [unreadCount]);

  return (
    <button 
      className={`relative p-2 rounded-lg hover:bg-slate-100 transition-colors ${animate ? 'animate-pulse' : ''}`}
      onClick={onClick}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5 text-slate-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </button>
  );
};

export default NotificationBadge;