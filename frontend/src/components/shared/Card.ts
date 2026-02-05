
export async function initCardOverlay() {
	const cardsContainer = document.querySelector<HTMLDivElement>(".cards");
	const cards = Array.from(document.querySelectorAll<HTMLDivElement>(".card"));
	const overlay = document.querySelector<HTMLDivElement>(".overlay");

	if (!cardsContainer || !overlay) {
	throw new Error("Required elements not found");
	}

	const applyOverlayMask = (e: PointerEvent) => {
	const x = e.pageX - cardsContainer.offsetLeft;
	const y = e.pageY - cardsContainer.offsetTop;

	overlay.style.setProperty("--opacity", "1");
	overlay.style.setProperty("--x", `${x}px`);
	overlay.style.setProperty("--y", `${y}px`);
	};

	const observer = new ResizeObserver((entries) => {
	entries.forEach((entry) => {
		const index = cards.indexOf(entry.target as HTMLDivElement);
		if (index === -1) return;

		const { inlineSize, blockSize } = entry.borderBoxSize[0];

		const overlayCard = overlay.children[index] as HTMLDivElement;
		overlayCard.style.width = `${inlineSize}px`;
		overlayCard.style.height = `${blockSize}px`;
	});
	});

	const initOverlayCard = (card: HTMLDivElement) => {
	const clone = card.cloneNode(true) as HTMLDivElement;
	clone.setAttribute("aria-hidden", "true");
	overlay.appendChild(clone);
	observer.observe(card);
	};

	cards.forEach(initOverlayCard);
	cardsContainer.addEventListener("pointermove", applyOverlayMask);
}