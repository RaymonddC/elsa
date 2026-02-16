import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type Toast as ToastType } from '../../hooks/useToast';

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS = {
  success: 'text-success border-success/30 bg-success/10',
  error: 'text-danger border-danger/30 bg-danger/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  info: 'text-info border-info/30 bg-info/10',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismissToast } = useToast();
  const Icon = TOAST_ICONS[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border
        shadow-elevated min-w-[320px] max-w-[420px]
        animate-in slide-in-from-right duration-300
        ${TOAST_COLORS[toast.type]}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2} />

      <p className="flex-1 text-sm text-white/90 leading-relaxed">
        {toast.message}
      </p>

      <button
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors duration-200"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-white/60" strokeWidth={2} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.slice(-3).map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
