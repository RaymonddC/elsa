import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type Toast as ToastType } from '../../hooks/useToast';

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES: Record<string, { icon: string; bg: string; border: string }> = {
  success: {
    icon: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.12)',
  },
  error: {
    icon: '#ef4444',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.12)',
  },
  warning: {
    icon: '#f59e0b',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.12)',
  },
  info: {
    icon: '#3b82f6',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.12)',
  },
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismissToast } = useToast();
  const Icon = TOAST_ICONS[toast.type];
  const colors = TOAST_STYLES[toast.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '12px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: '360px',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <Icon style={{ width: '16px', height: '16px', color: colors.icon, flexShrink: 0 }} strokeWidth={2} />

      <p style={{
        flex: 1,
        fontSize: '12px',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: '1.5',
        margin: 0,
      }}>
        {toast.message}
      </p>

      <span
        onClick={() => dismissToast(toast.id)}
        style={{
          flexShrink: 0,
          padding: '4px',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <X style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,0.3)' }} strokeWidth={2} />
      </span>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {toasts.slice(-3).map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
