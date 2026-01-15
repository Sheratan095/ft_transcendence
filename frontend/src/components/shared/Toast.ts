export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

function getToastContainer(position: string = 'top-right'): HTMLElement {
  const containerId = `toast-container-${position}`;
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = `fixed z-50 flex flex-col gap-2`;

    // Position classes
    const positionMap: Record<string, string> = {
      'top-left': 'top-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4'
    };

    container.className += ` ${positionMap[position]}`;
    document.body.appendChild(container);
  }

  return container;
}

export function showToast(message: string, type: ToastType = 'info', options: ToastOptions = {}): void {
  const { duration = 4000, position = 'top-right' } = options;
  const container = getToastContainer(position);

  const toast = document.createElement('div');
  toast.className = 'animate-in fade-in slide-in-from-top-4 duration-200 rounded-lg px-4 py-3 shadow-lg max-w-sm';

  // Type-based styling
  const typeMap: Record<ToastType, { bg: string; text: string; icon: string }> = {
    success: {
      bg: 'bg-green-600',
      text: 'text-white',
      icon: '✓'
    },
    error: {
      bg: 'bg-red-600',
      text: 'text-white',
      icon: '✕'
    },
    info: {
      bg: 'bg-blue-600',
      text: 'text-white',
      icon: 'ℹ'
    },
    warning: {
      bg: 'bg-yellow-500',
      text: 'text-white',
      icon: '⚠'
    }
  };

  const style = typeMap[type];
  toast.className += ` ${style.bg} ${style.text}`;
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-lg font-bold">${style.icon}</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;

  container.appendChild(toast);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-4', 'duration-200');
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, duration);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Convenience functions
export function showSuccessToast(message: string, options?: ToastOptions): void {
  showToast(message, 'success', options);
}

export function showErrorToast(message: string, options?: ToastOptions): void {
  showToast(message, 'error', options);
}

export function showInfoToast(message: string, options?: ToastOptions): void {
  showToast(message, 'info', options);
}

export function showWarningToast(message: string, options?: ToastOptions): void {
  showToast(message, 'warning', options);
}
