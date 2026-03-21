import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: <CheckCircle2 size={17} />,
  error:   <XCircle      size={17} />,
  info:    <Info         size={17} />,
  warning: <AlertTriangle size={17} />,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 4200) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type, removing: false }]);
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 320);
    }, duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts(p => p.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 320);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type]} ${t.removing ? styles.removing : ''}`}
            role="alert"
          >
            <span className={styles.icon}>{ICONS[t.type]}</span>
            <span className={styles.msg}>{t.message}</span>
            <button className={styles.close} onClick={() => remove(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
