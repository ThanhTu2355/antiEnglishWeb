import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Xác nhận thao tác',
  subtitle = 'Vui lòng xác nhận để tiếp tục',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onClose,
  loading = false,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={() => !loading && onClose()}
    >
      <div 
        className="relative w-full max-w-md bg-surface border-2 border-theme rounded-3xl shadow-2xl p-6 text-theme-main transition-all transform animate-scale-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-theme-subtle hover:text-theme-main hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start space-x-4 mb-4">
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              isDanger 
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-rose-500/20' 
                : isWarning 
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-amber-500/20'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-indigo-500/20'
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-6 h-6 animate-pulse" />
            ) : isWarning ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>

          <div className="pr-6">
            <h3 className="text-lg font-black text-theme-main">
              {title}
            </h3>
            <div className="text-xs text-theme-subtle mt-0.5 font-medium">
              {subtitle}
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="text-sm text-theme-muted mb-6 pl-1 pr-1 leading-relaxed bg-input-theme/60 p-3.5 rounded-2xl border border-theme-subtle">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl border border-theme hover:bg-surface-hover text-theme-muted hover:text-theme-main text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-2xl text-white text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25 active:scale-95'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25 active:scale-95'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                {isDanger && <Trash2 className="w-4 h-4" />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
