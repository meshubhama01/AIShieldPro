const heroCard = document.querySelector(".hero-card");
const waitlistForm = document.querySelector("#waitlist-form");
const formStatus = document.querySelector("#form-status");

if (heroCard) {
  window.requestAnimationFrame(() => {
    heroCard.classList.add("reveal");
  });
}

if (waitlistForm && formStatus) {
  waitlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = waitlistForm.querySelector('button[type="submit"]');
    const formData = new FormData(waitlistForm);

    formStatus.textContent = "Submitting...";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        body: formData
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Submission failed. Please try again.");
      }

      waitlistForm.reset();
      formStatus.textContent = payload.message || "Thanks. You are on the list.";
    } catch (error) {
      formStatus.textContent = error.message || "Something went wrong. Please try again.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Request Early Access";
      }
    }
  });
}
