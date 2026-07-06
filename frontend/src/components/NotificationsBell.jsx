import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/api/api';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Bell, UserPlus, Flame, Users, GraduationCap, CalendarClock, AlertTriangle, Shuffle, Check,
} from 'lucide-react';

const ICON_MAP = {
  'user-plus': UserPlus,
  flame: Flame,
  users: Users,
  'graduation-cap': GraduationCap,
  'calendar-clock': CalendarClock,
  'alert-triangle': AlertTriangle,
  shuffle: Shuffle,
};
const TONE_BG = {
  blue: 'bg-blue-100 text-blue-600',
  rose: 'bg-rose-100 text-rose-600',
  pink: 'bg-pink-100 text-pink-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  violet: 'bg-violet-100 text-violet-600',
  amber: 'bg-amber-100 text-amber-600',
  sky: 'bg-sky-100 text-sky-600',
};

const POLL_MS = 30000;
const STORAGE_KEY = 'counsellor_seen_notif_ids';

const readSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch (_) { return new Set(); }
};
const writeSeen = (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s).slice(-200))); }
  catch (_) { /* ignore */ }
};

const NotificationsBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [browserGranted, setBrowserGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const ref = useRef(null);
  const seenRef = useRef(readSeen());
  const firstLoadDone = useRef(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/counsellor/notifications');
      const list = res.data?.notifications || [];
      setItems(list);

      // Trigger browser notifications only for items not seen before, and only after first poll
      if (firstLoadDone.current && browserGranted && typeof Notification !== 'undefined') {
        const newOnes = list.filter(n => !seenRef.current.has(n.id));
        for (const n of newOnes.slice(0, 3)) {
          try {
            const notif = new Notification(n.title || 'New activity', {
              body: n.body || '',
              tag: n.id,
              icon: '/favicon.ico',
            });
            notif.onclick = () => { window.focus(); if (n.lead_id) navigate('/leads'); };
          } catch (_) { /* ignore */ }
        }
      }
      list.forEach(n => seenRef.current.add(n.id));
      writeSeen(seenRef.current);
      firstLoadDone.current = true;
    } catch (e) { /* silent */ }
  }, [browserGranted, navigate]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const requestBrowserPerm = async (e) => {
    e.stopPropagation();
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setBrowserGranted(res === 'granted');
    } catch (_) { /* ignore */ }
  };

  const handleClickItem = async (n) => {
    if (n.notification_id) {
      try { await api.post(`/counsellor/notifications/${n.notification_id}/read`); } catch (_) { /* ignore */ }
    }
    setOpen(false);
    if (n.lead_id) navigate('/leads');
  };

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    try { await api.post('/counsellor/notifications/mark-all-read'); } catch (_) { /* ignore */ }
    setItems(prev => prev.map(i => ({ ...i, is_read: true })));
  };

  const isUnread = (n) => (n.is_read === false) || (!n.notification_id && !seenRef.current.has(n.id));
  const unreadCount = items.filter(isUnread).length;

  return (
    <div className="relative" ref={ref} data-testid="counsellor-notifications-bell">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition"
        aria-label="Notifications"
        data-testid="notifications-toggle"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
            data-testid="notifications-count"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50"
          data-testid="notifications-panel"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
              <p className="text-[11px] text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''} · refresh every 30s</p>
            </div>
            <div className="flex items-center gap-1">
              {!browserGranted && typeof Notification !== 'undefined' && (
                <button
                  className="text-[11px] px-2 py-1 rounded text-indigo-600 hover:bg-indigo-50"
                  onClick={requestBrowserPerm}
                  data-testid="enable-browser-notif-btn"
                >
                  Enable desktop alerts
                </button>
              )}
              {items.length > 0 && (
                <button
                  className="text-[11px] px-2 py-1 rounded text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
                  onClick={handleMarkAll}
                  data-testid="notif-mark-all-read-btn"
                >
                  <Check className="w-3 h-3" /> Mark read
                </button>
              )}
              <Badge className="bg-rose-100 text-rose-700 ml-1">{unreadCount}</Badge>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              <Bell className="w-7 h-7 mx-auto mb-2 text-slate-300" />
              No notifications yet — you&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const Icon = ICON_MAP[n.icon] || Bell;
                const tone = TONE_BG[n.tone] || 'bg-slate-100 text-slate-600';
                const unread = isUnread(n);
                return (
                  <li
                    key={n.id}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer flex gap-3 ${unread ? 'bg-blue-50/40' : ''}`}
                    onClick={() => handleClickItem(n)}
                    data-testid={`notification-${n.kind || n.id}`}
                  >
                    <div className={`flex-none w-9 h-9 rounded-full ${tone} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{n.title}</p>
                        {unread && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 mt-1.5" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      {n.timestamp && (
                        <p className="text-[10px] text-slate-400 mt-1">{String(n.timestamp).slice(0, 19).replace('T', ' ')}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
