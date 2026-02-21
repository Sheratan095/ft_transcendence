import { t } from '../../lib/intlayer';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
  style?: 'primary' | 'secondary';
}

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  actions?: ToastAction[];
  onClick?: () => void | Promise<void>;
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
  const { duration = 4000, position = 'top-right', actions = [] } = options;
  const container = getToastContainer(position);

  const toast = document.createElement('div');
  toast.className = 'animate-in fade-in slide-in-from-top-4 duration-200 rounded-lg px-4 py-3 shadow-lg max-w-md pointer-events-auto';

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

  // Build content with message and actions
  let content = `
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold">${style.icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
  `;

  if (actions.length > 0) {
    content += '<div class="flex gap-2 mt-2">';
    actions.forEach(action => {
      const btnStyle = action.style === 'primary' 
        ? 'bg-white text-gray-900 hover:bg-gray-100' 
        : 'bg-gray-800 text-white hover:bg-gray-700';
      
      content += `
        <button class="px-3 py-1 rounded text-sm font-medium ${btnStyle} transition cursor-pointer">
          ${escapeHtml(action.label)}
        </button>
      `;
    });
    content += '</div>';
  }

  content += '</div>';
  toast.innerHTML = content;

  // Attach event listeners to buttons
  if (actions.length > 0) {
    const buttons = toast.querySelectorAll('button');
    buttons.forEach((button, index) => {
      if (actions[index]) {
        button.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await actions[index].onClick();
          } catch (err) {
            console.error('Toast action error:', err);
          }
          removeToast();
        });
      }
    });
  }

  // If a top-level onClick handler is provided, make the whole toast clickable
  if ((options as any).onClick) {
    const onClickFn = (options as any).onClick as () => void | Promise<void>;
    toast.classList.add('cursor-pointer');
    toast.setAttribute('role', 'button');
    toast.setAttribute('tabindex', '0');
    const handler = async (e: Event) => {
      try {
        await onClickFn();
      } catch (err) {
        console.error('Toast onClick error:', err);
      }
      removeToast();
    };
    toast.addEventListener('click', handler);
    // Allow keyboard activation
    toast.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(e as unknown as Event);
      }
    });
  }

  container.appendChild(toast);

  const removeToast = () => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-4', 'duration-200');
    setTimeout(() => {
      toast.remove();
    }, 200);
  };

  // Auto-remove after duration (unless there are actions)
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        removeToast();
      }
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

// Dev debug helpers: expose simple toast triggers on window for manual testing
if (typeof window !== 'undefined') {
  (window as any).debugToast = (message: string, type: ToastType = 'info') => {
    try {
      showToast(String(message), type);
    } catch (err) {
      console.error('debugToast error:', err);
    }
  };

  (window as any).debugShowToast = (key: string, vars?: Record<string, any>, type: ToastType = 'info') => {
    try {
      const msg = t ? t(key, vars) : key;
      showToast(String(msg), type);
    } catch (err) {
      console.error('debugShowToast error:', err);
      showToast(key, type);
    }
  };
}
