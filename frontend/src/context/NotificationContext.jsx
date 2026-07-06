import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getNotificaciones, markAllRead, markOneRead } from '../api/notificaciones';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30_000; // 30 segundos

export function NotificationProvider({ children, isLoggedIn }) {
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef              = useRef(null);

  const unread = notifs.filter(n => !n.leida).length;

  // Actualizar el badge de la app en pantalla de inicio
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    if (unread > 0) {
      navigator.setAppBadge(unread).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [unread]);

  const fetch = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getNotificaciones();
      setNotifs(data);
    } catch {
      // silencioso — no romper la UI si falla
    }
  }, [isLoggedIn]);

  // Poll mientras el usuario esté logueado
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifs([]);
      return;
    }
    fetch();
    timerRef.current = setInterval(fetch, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [isLoggedIn, fetch]);

  const markRead = useCallback(async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    markOneRead(id).catch(() => {});
  }, []);

  const markAll = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    markAllRead().catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider value={{ notifs, unread, loading, markRead, markAll, refresh: fetch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
