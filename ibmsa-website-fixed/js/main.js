
document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const mobilePanel = document.getElementById('mobilePanel');

  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 12) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (menuToggle && mobilePanel) {
    menuToggle.addEventListener('click', () => {
      const open = mobilePanel.classList.toggle('open');
      menuToggle.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      mobilePanel.setAttribute('aria-hidden', String(!open));
    });
  }

  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach((el) => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  const counters = document.querySelectorAll('.counter[data-target]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.getAttribute('data-target')) || 0;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 45));
      const tick = () => {
        current += step;
        if (current >= target) {
          el.textContent = String(target);
          return;
        }
        el.textContent = String(current);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((counter) => counterObserver.observe(counter));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  document.querySelectorAll('.mailto-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const recipient = form.dataset.recipient || '';
      const subject = form.dataset.subject || 'Website enquiry';
      const data = new FormData(form);
      const lines = [];
      for (const [key, value] of data.entries()) {
        if (!value) continue;
        lines.push(`${key}: ${value}`);
      }
      const body = encodeURIComponent(lines.join('\n'));
      const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.location.href = mailto;
    });
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const mobilePanel = document.getElementById('mobilePanel');
  if (menuToggle && mobilePanel) {
    document.addEventListener('click', (event) => {
      const clickedInsideMenu = mobilePanel.contains(event.target);
      const clickedToggle = menuToggle.contains(event.target);
      if (!clickedInsideMenu && !clickedToggle && mobilePanel.classList.contains('open')) {
        mobilePanel.classList.remove('open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        mobilePanel.setAttribute('aria-hidden', 'true');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobilePanel.classList.contains('open')) {
        mobilePanel.classList.remove('open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        mobilePanel.setAttribute('aria-hidden', 'true');
      }
    });
  }
});
