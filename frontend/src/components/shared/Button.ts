export interface ButtonOptions {
  text: string;
  type?: 'submit' | 'button' | 'reset';
  color?: string; // e.g., '#0dff66', '#00ffff'
  textColor?: string; // defaults to 'text-black'
  className?: string;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const color = options.color || '#0dff66';
  const textColor = options.textColor || 'text-black';
  
  const button = document.createElement('button');
  button.type = options.type || 'submit';
  button.textContent = options.text;
  button.className = `mt-6 w-full bg-[${color}] ${textColor} font-semibold py-2 rounded-md hover:brightness-90 hover:scale-[1.02] transition ${options.className || ''}`;
  
  return button;
}
