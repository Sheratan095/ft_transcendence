export interface FormInputOptions {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: string;
  maxLength?: number;
  focusRingColor?: string; // e.g., '#0dff66', '#00ffff'
}

export function createFormInput(options: FormInputOptions): { wrapper: HTMLDivElement; input: HTMLInputElement } {
  const focusColor = options.focusRingColor || '#0dff66';
  
  const wrapper = document.createElement('div');
  
  const label = document.createElement('label');
  label.htmlFor = options.id;
  label.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
  label.textContent = options.label;
  
  const input = document.createElement('input');
  input.id = options.id;
  input.name = options.name;
  input.type = options.type || 'text';
  input.required = options.required !== false;
  input.placeholder = options.placeholder || '';
  input.className = `w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[${focusColor}]`;
  
  if (options.inputMode) input.inputMode = options.inputMode;
  if (options.maxLength) input.maxLength = options.maxLength;
  
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  
  return { wrapper, input };
}

export function createTextarea(options: Omit<FormInputOptions, 'type'>): { wrapper: HTMLDivElement; textarea: HTMLTextAreaElement } {
  const focusColor = options.focusRingColor || '#0dff66';
  
  const wrapper = document.createElement('div');
  
  const label = document.createElement('label');
  label.htmlFor = options.id;
  label.className = 'text-xl text-neutral-300 uppercase font-semibold block mb-1';
  label.textContent = options.label;
  
  const textarea = document.createElement('textarea');
  textarea.id = options.id;
  textarea.name = options.name;
  textarea.required = options.required !== false;
  textarea.placeholder = options.placeholder || '';
  textarea.className = `w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-[${focusColor}] resize-none`;
  
  wrapper.appendChild(label);
  wrapper.appendChild(textarea);
  
  return { wrapper, textarea };
}
