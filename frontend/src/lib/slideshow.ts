/**
 * Slideshow functionality for alternating between tris and pong game cards
 */

let currentSlide = 0;
const SLIDES = ['tris', 'pong']; // Slide identifiers

/**
 * Initialize the slideshow
 */
export function initSlideshow() {
  setupSlideShowEventListeners();
  renderSlideshow();
}

/**
 * Setup event listeners for slideshow navigation
 */
function setupSlideShowEventListeners() {
  const prevBtn = document.getElementById('slideshow-prev-btn');
  const nextBtn = document.getElementById('slideshow-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', previousSlide);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', nextSlide);
  }

  // Optional: Add keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      previousSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  });
}

/**
 * Navigate to next slide
 */
function nextSlide() {
  currentSlide = (currentSlide + 1) % SLIDES.length;
  renderSlideshow();
}

/**
 * Navigate to previous slide
 */
function previousSlide() {
  currentSlide = (currentSlide - 1 + SLIDES.length) % SLIDES.length;
  renderSlideshow();
}

/**
 * Render the slideshow - show/hide slides
 */
function renderSlideshow() {
  const trisCard = document.getElementById('tris-card-wrapper');
  const pongCard = document.getElementById('pong-card-wrapper');

  if (trisCard && pongCard) {
    const trisIndex = SLIDES.indexOf('tris');
    const pongIndex = SLIDES.indexOf('pong');

    // Hide all slides
    trisCard.classList.add('hidden');
    pongCard.classList.add('hidden');

    // Show current slide
    if (currentSlide === trisIndex) {
      trisCard.classList.remove('hidden');
      updateIndicators('tris');
    } else if (currentSlide === pongIndex) {
      pongCard.classList.remove('hidden');
      updateIndicators('pong');
    }
  }
}

/**
 * Update slide indicators (dots)
 */
function updateIndicators(activeSlide: string) {
  const indicators = document.querySelectorAll('.slideshow-indicator');
  indicators.forEach((indicator) => {
    const dot = indicator as HTMLElement;
    if (dot.dataset.slide === activeSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

/**
 * Navigate to a specific slide by clicking a dot
 */
export function goToSlide(slideId: string) {
  const index = SLIDES.indexOf(slideId);
  if (index !== -1) {
    currentSlide = index;
    renderSlideshow();
  }
}
