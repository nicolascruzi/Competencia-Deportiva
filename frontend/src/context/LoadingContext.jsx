import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const LoadingContext = createContext(null);

function LoadingOverlay({ visible }) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'rgba(var(--t-ground-r, 245,242,237), 0.82)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.18s ease',
    }}>
      <svg width="52" height="52" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="27" stroke="var(--t-accent)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)"/>
        <path d="M31 14l-10 16h9l-5 12 12-18h-9l3-10z" fill="var(--t-accent)"/>
      </svg>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2.5px solid var(--t-dim)',
        borderTopColor: 'var(--t-accent)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>,
    document.body
  );
}

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const startLoading = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

  // Helper: wraps an async fn, showing the loader for its duration
  const withLoading = useCallback(async (fn) => {
    startLoading();
    try { return await fn(); }
    finally { stopLoading(); }
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading, withLoading }}>
      {children}
      <LoadingOverlay visible={count > 0} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
