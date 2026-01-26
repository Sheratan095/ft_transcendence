export interface CardOptions {
  shadowColor?: string; // e.g., '#0dff66', '#00ffff', '#ff009d'
  className?: string;
}



export function createCard(options: CardOptions = {}): HTMLDivElement {
  const shadowColor = options.shadowColor || '#0dff66';
  const card = document.createElement('div');
  card.className = `rounded-xl border border-neutral-700 bg-neutral-900/50 shadow-[10px_10px_0_0_${shadowColor}] transition-all duration-[0.4s] hover:shadow-lg p-8 w-full flex items-start justify-start flex-col justify-between ${options.className || ''}`;
  return card;
}
