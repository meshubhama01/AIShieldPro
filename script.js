const heroCard = document.querySelector(".hero-card");
const waitlistForm = document.querySelector("#waitlist-form");
const formStatus = document.querySelector("#form-status");
const turnstileContainer = document.querySelector("#turnstile-container");
const revealNodes = document.querySelectorAll(".reveal-on-scroll");
let turnstileWidgetId = null;
let turnstileReady = false;
let turnstileToken = "";

if (heroCard) {
  window.requestAnimationFrame(() => {
    heroCard.classList.add("reveal");
  });
}

initializeRevealAnimations();
initializeTurnstile();

if (waitlistForm && formStatus) {
  waitlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = waitlistForm.querySelector('button[type="submit"]');
    const formData = new FormData(waitlistForm);

    if (!turnstileReady || !window.turnstile || turnstileWidgetId === null) {
      formStatus.textContent = "Verification is still loading. Please try again in a moment.";
      return;
    }

    if (!turnstileToken) {
      formStatus.textContent = "Please complete the verification check.";
      return;
    }

    formData.append("cf-turnstile-response", turnstileToken);
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
      if (window.turnstile && turnstileWidgetId !== null) {
        turnstileToken = "";
        window.turnstile.reset(turnstileWidgetId);
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Request Early Access";
      }
    }
  });
}

async function initializeTurnstile() {
  if (!turnstileContainer || !formStatus) {
    return;
  }

  try {
    const response = await fetch("/api/config");
    const payload = await response.json();

    if (!response.ok || !payload.turnstileSiteKey) {
      formStatus.textContent = "Form setup is incomplete. Please try again later.";
      return;
    }

    await waitForTurnstile();
    turnstileWidgetId = window.turnstile.render("#turnstile-container", {
      sitekey: payload.turnstileSiteKey,
      theme: "dark",
      callback(token) {
        turnstileToken = token;
      },
      "expired-callback"() {
        turnstileToken = "";
      },
      "error-callback"() {
        turnstileToken = "";
      }
    });
    turnstileReady = true;
  } catch (error) {
    formStatus.textContent = "Could not load verification. Please refresh and try again.";
  }
}

function waitForTurnstile() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;

    const check = () => {
      if (window.turnstile) {
        resolve();
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        reject(new Error("Turnstile failed to load."));
        return;
      }

      window.setTimeout(check, 200);
    };

    check();
  });
}

function initializeRevealAnimations() {
  if (!revealNodes.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.14
    }
  );

  revealNodes.forEach((node) => observer.observe(node));
}
