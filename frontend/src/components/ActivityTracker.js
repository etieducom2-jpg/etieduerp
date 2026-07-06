import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Auto-logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_BEFORE_LOGOUT = 2 * 60 * 1000; // Show warning 2 minutes before logout

const useActivityTracker = () => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const warningShownRef = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.error('Session expired due to inactivity. Please login again.');
    navigate('/login');
  }, [navigate]);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      toast.warning('Your session will expire in 2 minutes due to inactivity. Move your mouse or press any key to stay logged in.', {
        duration: 10000,
      });
    }
  }, []);

  const resetTimer = useCallback(() => {
    // Only track if user is logged in
    const token = localStorage.getItem('token');
    if (!token) return;

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    // Reset warning flag
    warningShownRef.current = false;

    // Set warning timer (2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout, showWarning]);

  useEffect(() => {
    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [resetTimer]);

  return null;
};

// Component wrapper for the hook
const ActivityTracker = () => {
  useActivityTracker();
  return null;
};

export default ActivityTracker;
