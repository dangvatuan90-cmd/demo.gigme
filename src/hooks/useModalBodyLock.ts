import { useEffect } from 'react';

/**
 * Global Reference Counter for open modals.
 * Ensures that if multiple modals or nested dialogs are open,
 * body scroll lock is maintained until the last modal closes.
 */
let openModalsCount = 0;
let originalOverflowBody = '';
let originalOverflowHtml = '';
let originalPaddingRight = '';

export function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (openModalsCount === 0) {
    originalOverflowBody = document.body.style.overflow || '';
    originalOverflowHtml = document.documentElement.style.overflow || '';
    originalPaddingRight = document.body.style.paddingRight || '';

    // Compensate for disappearing scrollbar on desktop to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    // Prevent background page dragging & rubber-banding on iOS Safari & mobile browsers
    window.addEventListener('touchmove', preventBackgroundTouch, { passive: false });
  }

  openModalsCount++;
}

const preventBackgroundTouch = (e: TouchEvent) => {
  const target = e.target as HTMLElement | null;
  // If user is interacting inside a scrollable modal container, allow internal scrolling
  if (target && target.closest('.modal-body, .overflow-y-auto, [data-modal-scroll="true"], .custom-scrollbar')) {
    return;
  }
  if (e.cancelable) {
    e.preventDefault();
  }
};

export function unlockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  openModalsCount = Math.max(0, openModalsCount - 1);

  if (openModalsCount === 0) {
    document.body.style.overflow = originalOverflowBody;
    document.documentElement.style.overflow = originalOverflowHtml;
    document.body.style.paddingRight = originalPaddingRight;
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');

    window.removeEventListener('touchmove', preventBackgroundTouch);
  }
}

/**
 * React hook to lock body scroll while modal/popup is open,
 * and optionally bind the Escape key to close the modal.
 */
export function useModalBodyLock(isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}
