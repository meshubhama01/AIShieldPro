const heroCard = document.querySelector(".hero-card");

if (heroCard) {
  window.requestAnimationFrame(() => {
    heroCard.classList.add("reveal");
  });
}
