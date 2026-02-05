/**
 * Interactive card hover effect
 * Tracks mouse movement and applies radial gradient following the cursor
 */
export function initCardHoverEffect() {
  const cards = document.querySelectorAll(".card");
  const wrapper = document.querySelector(".cards") as HTMLElement;

  if (!wrapper || cards.length === 0) return;

  wrapper.addEventListener("mousemove", function ($event: MouseEvent) {
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = $event.clientX - rect.left;
      const y = $event.clientY - rect.top;

      (card as HTMLElement).style.setProperty("--xPos", `${x}px`);
      (card as HTMLElement).style.setProperty("--yPos", `${y}px`);
    });
  });
}
