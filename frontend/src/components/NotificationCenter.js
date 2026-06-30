import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, CheckCheck, AlertTriangle, Clock, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { notificationsAPI, followupAPI, pushSubscriptionAPI } from '@/api/api';
import { toast } from 'sonner';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [dueSoonFollowups, setDueSoonFollowups] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const audioRef = useRef(null);
  const shownFollowupAlerts = useRef(new Set());

  // Check push notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Track shown notification alerts to avoid duplicates
  const shownNotificationAlerts = useRef(new Set());

  // Fetch notifications and due-soon followups
  const fetchData = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsAPI.getAll(),
        notificationsAPI.getUnreadCount()
      ]);
      
      const allNotifications = notifRes.data;
      
      // Check for new unread notifications that should play audio
      allNotifications.forEach(notif => {
        if (!notif.is_read && notif.play_audio && !shownNotificationAlerts.current.has(notif.id)) {
          shownNotificationAlerts.current.add(notif.id);
          
          // Play alarm sound
          playAlarmSound();
          
          // Show browser notification
          showBrowserNotification(notif.title, notif.message, notif.type);
          
          // Show in-app toast with action
          if (notif.type === 'lead_converted') {
            toast.success(notif.message, {
              duration: 15000,
              action: {
                label: 'Enroll Now',
                onClick: () => window.location.href = '/enrollments'
              }
            });
          } else {
            toast.info(notif.message, { duration: 10000 });
          }
        }
      });
      
      setNotifications(allNotifications);
      setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  // Fetch follow-ups due soon (within 10 minutes)
  const checkDueSoonFollowups = useCallback(async () => {
    try {
      const response = await followupAPI.getDueSoon();
      const followups = response.data;
      
      // Show alarm for new due-soon followups
      followups.forEach(fu => {
        if (!shownFollowupAlerts.current.has(fu.id)) {
          shownFollowupAlerts.current.add(fu.id);
          
          // Play alarm sound
          playAlarmSound();
          
          // Show browser notification if permitted
          showBrowserNotification(
            'Follow-up Reminder',
            `Follow-up with ${fu.lead_name} is due soon!`,
            'followup'
          );
          
          // Show in-app toast
          toast.warning(`Follow-up with ${fu.lead_name} due soon!`, {
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/followups'
            }
          });
        }
      });
      
      setDueSoonFollowups(followups);
    } catch (error) {
      console.error('Failed to check due-soon followups:', error);
    }
  }, []);

  // Play alarm sound
  const playAlarmSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  // Show browser notification
  const showBrowserNotification = (title, body, type = 'general') => {
    if (pushPermission === 'granted') {
      const icon = type === 'task' ? '/task-icon.png' : '/notification-icon.png';
      new Notification(title, {
        body,
        icon,
        badge: '/badge-icon.png',
        tag: `${type}-${Date.now()}`,
        requireInteraction: type === 'followup'
      });
    }
  };

  // Request push notification permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
        // Subscribe to push notifications
        await subscribeToPush();
      } else if (permission === 'denied') {
        toast.error('Push notifications were denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKeyRes = await pushSubscriptionAPI.getVapidKey();
      const publicKey = vapidKeyRes.data.publicKey;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      await pushSubscriptionAPI.subscribe({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  // Dismiss/delete a notification
  const dismissNotification = async (notificationId, e) => {
    e.stopPropagation(); // Prevent triggering markAsRead
    try {
      await notificationsAPI.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification dismissed');
    } catch (error) {
      // If delete API doesn't exist, just remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  // Dismiss followup reminder
  const dismissFollowup = (followupId, e) => {
    e.stopPropagation();
    setDueSoonFollowups(prev => prev.filter(f => f.id !== followupId));
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    checkDueSoonFollowups();
    
    // Poll every 30 seconds for notifications
    const notifInterval = setInterval(fetchData, 30000);
    // Poll every minute for due-soon followups
    const followupInterval = setInterval(checkDueSoonFollowups, 60000);
    
    return () => {
      clearInterval(notifInterval);
      clearInterval(followupInterval);
    };
  }, [fetchData, checkDueSoonFollowups]);

  // Register service worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service worker registration failed:', err);
      });
    }
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task':
        return <ClipboardList className="w-4 h-4 text-blue-500" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  // Format time ago
  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const totalAlerts = unreadCount + dueSoonFollowups.length;

  return (
    <>
      {/* Hidden audio element for alarm */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQ0jh+ft0JcmBB6O0vjFjC8ILIbB9KqMNQ0+dJ3QmIY/EEZpfaKglEIVS1prcI6wnks8T3J3cIF6jnhuZXl2dmxnZHN2dHV0c3V0c3V0c3V0c3Vyc3V0c3V0c3V0c3Z0c3R0c3R0c3V0c3V0c3Z0c3R0c3V0c3V0c3V0c3V0c3V0c3V0c3V0c3V0c3V0c3V0c3V0c3V0" type="audio/wav"/>
      </audio>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative"
            data-testid="notification-bell"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-red-500 text-white text-xs p-0"
              >
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0 max-h-[500px] overflow-hidden"
          align="end"
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {pushPermission !== 'granted' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={requestPushPermission}
                  className="text-xs"
                >
                  Enable Push
                </Button>
              )}
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[400px]">
            {/* Due Soon Followups Alert Section */}
            {dueSoonFollowups.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-200">
                <div className="px-4 py-2 flex items-center gap-2 text-amber-700 font-medium text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Follow-ups Due Soon
                </div>
                {dueSoonFollowups.map(fu => (
                  <div 
                    key={fu.id}
                    className="px-4 py-3 border-b border-amber-100 hover:bg-amber-100 cursor-pointer relative group"
                    onClick={() => window.location.href = '/followups'}
                  >
                    <button
                      onClick={(e) => dismissFollowup(fu.id, e)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4 text-amber-600" />
                    </button>
                    <div className="flex items-start gap-3 pr-6">
                      <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          Follow-up with {fu.lead_name}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{fu.note}</p>
                        <p className="text-xs text-amber-600 mt-1">
                          Due: {new Date(fu.followup_date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Regular Notifications */}
            {notifications.length === 0 && dueSoonFollowups.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer relative group ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <button
                    onClick={(e) => dismissNotification(notification.id, e)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                  <div className="flex items-start gap-3 pr-6">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {timeAgo(notification.created_at)} • From {notification.sender_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default NotificationCenter;
