// ============================================================
// Gorila Fitness - Main Script
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // Configuration
  // ============================================================
  const CONFIG = {
    whatsappNumber: '5565999597133',
    productsJsonUrl: 'data/products.json',
    animationThreshold: 0.1,
    sectionThreshold: 0.3,
    imageFallback: 'assets/logo.png'
  };

  // ============================================================
  // Product Data
  // ============================================================
  let productData = {};
  let productLoadError = false;

  async function loadProductData() {
    try {
      const response = await fetch(CONFIG.productsJsonUrl);
      if (!response.ok) throw new Error('Failed to load products');
      const data = await response.json();
      productData = data.products || {};
    } catch (error) {
      productLoadError = true;
      productData = {};
    }
  }

  // ============================================================
  // Modal Functionality
  // ============================================================
  const modal = document.getElementById('productModal');
  const modalClose = document.getElementById('modalClose');
  const modalImg = document.getElementById('modalImg');
  const modalBrand = document.getElementById('modalBrand');
  const modalTitle = document.getElementById('modalTitle');
  const modalCategory = document.getElementById('modalCategory');
  const modalDesc = document.getElementById('modalDesc');
  const modalBenefits = document.getElementById('modalBenefits');
  const modalCta = document.getElementById('modalCta');
  const whatsappBase = `https://wa.me/${CONFIG.whatsappNumber}?text=`;

  // Focusable elements for trap
  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll(FOCUSABLE_SELECTOR);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openModal(card) {
    const title = card.querySelector('h3')?.textContent.trim() || '';
    const brand = card.querySelector('.brand')?.textContent.trim() || '';
    const imgEl = card.querySelector('.product-img');
    const imgSrc = imgEl ? imgEl.src : '';

    // Direct lookup by title (titles now include brand for duplicates)
    let data = productData[title];
    if (!data) {
      data = {
        category: 'Suplemento',
        description: `${title} da ${brand}. Entre em contato pelo WhatsApp para mais informações sobre este produto, disponibilidade e valores especiais.`,
        benefits: ['Qualidade', 'Entrega Rápida']
      };
    }

    modalBrand.textContent = brand;
    modalTitle.textContent = title;
    modalCategory.textContent = data.category;
    modalDesc.textContent = data.description;

    if (imgSrc) {
      modalImg.src = imgSrc;
      modalImg.alt = title;
      modalImg.parentElement.style.display = 'flex';
    } else {
      modalImg.parentElement.style.display = 'none';
    }

    modalBenefits.innerHTML = data.benefits
      .map(b => `<span class="modal-benefit-tag">${b}</span>`)
      .join('');

    const msg = encodeURIComponent(`Olá! Gostaria de saber o preço e disponibilidade do produto: ${title} (${brand})`);
    modalCta.href = whatsappBase + msg;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', trapFocus);
    modalClose.focus();

    trackEvent('product_view', { product: title, category: data.category });
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapFocus);
  }

  // Event delegation on catalog container
  const catalogContainer = document.querySelector('.catalog-container');
  if (catalogContainer) {
    catalogContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card || e.target.closest('a')) return;
      openModal(card);
    });
  }

  document.querySelectorAll('.product-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver detalhes de ${card.querySelector('h3')?.textContent || 'produto'}`);

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card);
      }
    });
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ============================================================
  // Image Error Handling (with infinite loop prevention)
  // ============================================================
  document.querySelectorAll('.product-img').forEach(img => {
    img.addEventListener('error', function () {
      if (this.dataset.fallbackUsed) return;
      this.dataset.fallbackUsed = 'true';
      this.src = CONFIG.imageFallback;
      this.alt = 'Imagem indisponível';
    });
  });

  // ============================================================
  // IntersectionObserver — card animations
  // ============================================================
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: CONFIG.animationThreshold });

  document.querySelectorAll('.product-card').forEach(card => {
    cardObserver.observe(card);
  });

  // ============================================================
  // Active nav dot on scroll (single observer, multiple targets)
  // ============================================================
  const sections = document.querySelectorAll('.catalog-page');
  const navDots = document.querySelectorAll('.nav-dot');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navDots.forEach(dot => dot.classList.remove('active'));
        const activeDot = document.querySelector(`.nav-dot[href="#${entry.target.id}"]`);
        if (activeDot) activeDot.classList.add('active');
      }
    });
  }, { threshold: CONFIG.sectionThreshold });

  sections.forEach(section => {
    sectionObserver.observe(section);
  });

  // ============================================================
  // Analytics (no console.log in production)
  // ============================================================
  function trackEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
    if (typeof fbq === 'function') {
      fbq('trackCustom', eventName, params);
    }
  }

  function trackPageView() {
    trackEvent('page_view', { page_path: window.location.pathname, page_title: document.title });
  }

  // ============================================================
  // Noscript class removal
  // ============================================================
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // ============================================================
  // Initialize
  // ============================================================
  async function init() {
    await loadProductData();

    if (productLoadError) {
      const banner = document.createElement('div');
      banner.className = 'product-load-error';
      banner.setAttribute('role', 'alert');
      banner.textContent = 'Não foi possível carregar os detalhes dos produtos. Verifique sua conexão.';
      const main = document.querySelector('.catalog-container');
      if (main) main.prepend(banner);
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    trackPageView();

    // Track section views with single observer
    const sectionTrackObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          trackEvent('section_view', {
            section: entry.target.id,
            category: entry.target.querySelector('.page-header p')?.textContent || ''
          });
          sectionTrackObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(section => {
      sectionTrackObserver.observe(section);
    });
  }

  init();
})();
