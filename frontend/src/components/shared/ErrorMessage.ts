export function createErrorContainer(): HTMLDivElement {
  const error = document.createElement('div');
  error.id = 'auth-error';
  error.className = 'text-red-400 text-sm text-center align-end hidden mt-4 min-h-[1.5rem] w-full';
  return error;
}

export function showError(element: HTMLElement, message: string): void {
  element.classList.remove('hidden');
  element.className = 'text-xl mt-2 text-center text-red-600';
  element.textContent = message;
}

export function showSuccess(element: HTMLElement, message: string): void {
  element.classList.remove('hidden');
  element.className = 'text-xl mt-2 text-center text-green-600';
  element.textContent = message;
}

export function showLoading(element: HTMLElement, message: string): void {
  element.classList.remove('hidden');
  element.className = 'text-xl mt-2 text-center text-neutral-400';
  element.textContent = message;
}

export function hideError(element: HTMLElement): void {
  element.classList.add('hidden');
  element.textContent = '';
}
