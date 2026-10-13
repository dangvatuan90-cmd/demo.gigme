import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useModalBodyLock } from '../../hooks/useModalBodyLock';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // e.g. 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl'
  maxHeightClass?: string; // e.g. 'max-h-[85vh]' (default)
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string; // extra classes for modal card
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  zIndexClass?: string; // e.g. 'z-[9999]'
  preventBodyScroll?: boolean;
}

/**
 * Standard Universal Modal/Popup Component for Web & Mobile App (PWA/Hybrid)
 * Conforms to UI/UX Standards:
 * 1. Fixed Centering & Viewport Lock:
 *    - `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;`
 *    - Modal stays locked in exact center even when the page behind is scrolled.
 * 2. Full Backdrop / Overlay:
 *    - `position: fixed; inset: 0; background: rgba(0,0,0,0.6)`
 *    - Automatically locks body scroll (`overflow: hidden` on document.body) when opened.
 * 3. Max Height & Internal Scroll:
 *    - `max-height: 85vh` with flex layout.
 *    - Title (Header) and actions (Footer) remain fixed while body content scrolls independently (`overflow-y: auto`).
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  maxHeightClass = 'max-h-[85vh]',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  zIndexClass = 'z-[9999]',
  preventBodyScroll = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // 1. Lock body scroll on open, restore on close
  useModalBodyLock(isOpen && preventBodyScroll, onClose);

  if (!isOpen) return null;


  return (
    <>
      {/* 2. Full Backdrop / Overlay (100% viewport coverage) */}
      <div
        className={`fixed inset-0 ${zIndexClass} bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-fade-in`}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* 1. Fixed Centering Container - rigidly locked at viewport center */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${zIndexClass} w-[92vw] sm:w-full ${maxWidthClass} pointer-events-none select-none`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Card Box */}
        <div
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto select-auto w-full ${maxHeightClass} flex flex-col rounded-3xl bg-[#0E1B2E] border border-[#C5E5EC]/25 text-white shadow-2xl shadow-black/60 overflow-hidden animate-modal-in transition-all ${className}`}
        >
          {/* Header - Fixed & Pinned */}
          {(title || icon || showCloseButton) && (
            <div
              className={`p-4 sm:p-5 border-b border-[#C5E5EC]/15 bg-[#12233B]/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none ${headerClassName}`}
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                {icon && <div className="shrink-0">{icon}</div>}
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    {typeof title === 'string' ? (
                      <h3 className="font-black text-sm sm:text-base text-white truncate">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {badge}
                  </div>
                  {subtitle && (
                    typeof subtitle === 'string' ? (
                      <p className="text-[11px] sm:text-xs text-[#C5E5EC]/70 truncate">
                        {subtitle}
                      </p>
                    ) : (
                      subtitle
                    )
                  )}
                </div>
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-xl bg-[#0E1B2E]/80 hover:bg-[#1A2D4A] text-[#C5E5EC] border border-[#C5E5EC]/20 hover:text-white transition cursor-pointer shrink-0"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          )}

          {/* 3. Internal Scrollable Content (Header and Footer remain fixed) */}
          <div
            className={`flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 custom-scrollbar ${bodyClassName}`}
          >
            {children}
          </div>

          {/* Footer - Fixed & Pinned */}
          {footer && (
            <div
              className={`p-3.5 sm:p-4 border-t border-[#C5E5EC]/15 bg-[#12233B]/90 backdrop-blur-md shrink-0 flex items-center justify-end space-x-2 select-none ${footerClassName}`}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BaseModal;
