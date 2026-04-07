// ============================================================
// Gorila Fitness - Redesigned Catalog Script
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // Configuration
  // ============================================================
  const CONFIG = {
    whatsappNumber: '5565999597133',
    productsJsonUrl: 'data/products.json',
    animationThreshold: 0.05,
    imageFallback: 'assets/logo.png',
    defaultRating: 5,
    defaultReviews: 12,
  };

  function wa(text) {
    return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  // ============================================================
  // State
  // ============================================================
  let allProducts = [];
  let filteredProducts = [];
  let activeCategory = 'all';
  let activeBrand = 'all';
  let searchQuery = '';
  let productLoadError = false;

  // ============================================================
  // Extract brands from product list
  // ============================================================
  function extractBrands(products) {
    const brands = new Set();
    products.forEach(p => {
      if (p.data && p.data.brand) brands.add(p.data.brand);
    });
    return Array.from(brands).sort();
  }

  // ============================================================
  // Generate star rating display
  // ============================================================
  function starHTML(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '&#9733;'.repeat(full) + (half ? '&#9734;' : '') + '&#9734;'.repeat(empty);
  }

  // ============================================================
  // Generate WhatsApp link text for individual product
  // ============================================================
  function waProduct(name, brand) {
    return wa(`Olá! Gostaria de saber o preço e disponibilidade do produto: ${name} (${brand})`);
  }

  // ============================================================
  // Badge CSS class
  // ============================================================
  function badgeClass(badge) {
    if (badge.includes('MAIS VENDIDO') || badge.includes('POPULAR')) return 'badge-best';
    if (badge === 'NOVO') return 'badge-new';
    if (badge === 'HOT' || badge.includes('OFERTA')) return 'badge-hot';
    return 'badge-best';
  }

  // ============================================================
  // Render products to grid
  // ============================================================
  function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    const empty = document.getElementById('emptyState');
    const stats = document.getElementById('searchStats');

    if (!products.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      stats.textContent = '';
      return;
    }

    empty.style.display = 'none';
    stats.textContent = `${products.length} produto${products.length > 1 ? 's' : ''} encontrado${products.length > 1 ? 's' : ''}`;

    grid.innerHTML = products.map(p => {
      const rating = p.data.rating || CONFIG.defaultRating + (Math.random() * 0.5 - 0.25);
      const reviews = p.data.reviews || Math.floor(CONFIG.defaultReviews + Math.random() * 30);
      const badgeHTML = p.data.badge
        ? `<span class="card-badge ${badgeClass(p.data.badge)}">${p.data.badge}</span>`
        : '';

      return `
        <article class="product-card" data-category="${p.category}" data-brand="${p.data.brand || ''}" data-title="${p.name.toLowerCase()}">
          ${badgeHTML}
          <div class="card-img-wrapper">
            <img src="${p.img}" alt="${p.name}" class="card-img" loading="lazy" decoding="async" width="300" height="300">
          </div>
          <p class="card-brand">${p.data.brand || ''}</p>
          <h3 class="card-title">${p.name}</h3>
          <div class="card-rating">
            <span class="card-stars">${starHTML(rating)}</span>
            <span class="card-reviews">(${reviews})</span>
          </div>
          <span class="card-price">Consulte o preço</span>
          <a href="${waProduct(p.name, p.data.brand || '')}" class="btn btn-card" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
            Pedir via WhatsApp
          </a>
        </article>
      `;
    }).join('');

    // Re-observe new cards
    document.querySelectorAll('.product-card:not(.observed)').forEach(card => {
      card.classList.add('observed');
      cardObserver.observe(card);
    });

    // Re-attach image fallback
    grid.querySelectorAll('.card-img').forEach(img => {
      img.addEventListener('error', function imgError() {
        if (this.dataset.fallbackUsed) return;
        this.dataset.fallbackUsed = 'true';
        this.src = CONFIG.imageFallback;
        this.alt = 'Imagem indisponível';
      });
    });
  }

  // ============================================================
  // Filter logic
  // ============================================================
  function applyFilters() {
    let result = allProducts;

    // Category filter
    if (activeCategory !== 'all') {
      const cat = activeCategory;
      // Check if category is a parent category (e.g. "Whey Protein" -> includes "Hipercalórico", "Creatina")
      const navBtn = document.querySelector(`.nav-cat[data-category="${cat}"]`);
      const altCats = navBtn ? navBtn.dataset.altCategories || '' : '';
      const altCatList = altCats.split(',').filter(Boolean);

      result = result.filter(p => {
        if (p.category === cat) return true;
        return altCatList.includes(p.category);
      });
    }

    // Brand filter
    if (activeBrand !== 'all') {
      result = result.filter(p => p.data.brand === activeBrand);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => p.name.toLowerCase().includes(q) || (p.data.brand || '').toLowerCase().includes(q));
    }

    filteredProducts = result;
    renderProducts(result);
  }

  function resetFilters() {
    activeCategory = 'all';
    activeBrand = 'all';
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    document.querySelectorAll('.nav-cat').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-cat[data-category="all"]').classList.add('active');
    document.querySelectorAll('.brand-option').forEach(b => b.classList.remove('active'));
    document.querySelector('.brand-option[data-brand="all"]').classList.add('active');
    document.getElementById('brandLabel').textContent = 'Todas as Marcas';
    applyFilters();
  }

  // ============================================================
  // Intersection Observer — card animations
  // ============================================================
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: CONFIG.animationThreshold });

  // ============================================================
  // Modal
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

  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function openModal(card) {
    lastFocused = document.activeElement;
    const title = card.dataset.title || '';
    const brand = card.dataset.brand || '';

    // Find matching product from allProducts
    const found = allProducts.find(p => p.name.toLowerCase() === title);
    let productName = title;
    let data = null;
    if (found) {
      productName = found.name;
      data = found.data;
    }
    if (!data) {
      data = {
        category: 'Suplemento',
        description: `${productName} da ${brand}. Entre em contato para informações.`,
        benefits: ['Qualidade', 'Entrega Rápida'],
        brand: brand
      };
    }

    const imgSrc = card.querySelector('.card-img')?.src || '';
    modalBrand.textContent = brand;
    modalTitle.textContent = productName;
    modalCategory.textContent = data.category;
    modalDesc.textContent = data.description;

    if (imgSrc) {
      modalImg.src = imgSrc;
      modalImg.alt = productName;
      modalImg.parentElement.style.display = 'flex';
    } else {
      modalImg.parentElement.style.display = 'none';
    }

    modalBenefits.innerHTML = (data.benefits || [])
      .map(b => `<span class="modal-benefit-tag">${b}</span>`)
      .join('');

    modalCta.href = waProduct(productName, brand);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', trapFocus);
    modalClose.focus();
    trackEvent('product_view', { product: productName, category: data.category });
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapFocus);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll(FOCUSABLE_SELECTOR);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Event delegation
  const productGrid = document.getElementById('productGrid');
  if (productGrid) {
    productGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card || e.target.closest('a')) return;
      openModal(card);
    });
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // ============================================================
  // Analytics
  // ============================================================
  function trackEvent(name, params = {}) {
    if (typeof gtag === 'function') gtag('event', name, params);
    if (typeof fbq === 'function') fbq('trackCustom', name, params);
  }

  // ============================================================
  // Noscript
  // ============================================================
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // ============================================================
  // Embedded Product Data (works without server / fetch)
  // ============================================================
  const PRODUCT_DATA = {
    "Ares (Maçã Verde) 300g": { category: "Pré-Treino", brand: "DCX Nutrition", description: "O Ares da DCX Nutrition é um pré-treino formulado para maximizar a energia, foco e pump muscular. Sua fórmula exclusiva NÃO contém Beta-Alanina, evitando a sensação de formigamento. Conta com L-Arginina para vasodilatação, Taurina para resistência, L-Tirosina para foco mental e Cafeína para energia explosiva. Rende aproximadamente 30 doses.", benefits: ["Energia Explosiva", "Foco Mental", "Pump Muscular", "Sem Beta-Alanina"] },
    "Blue Demon": { category: "Pré-Treino", brand: "DCX Nutrition", description: "O Blue Demon da DCX Nutrition é um pré-treino de alta potência com 400mg de cafeína por dose. Ideal para treinos que exigem intensidade máxima e foco absoluto.", benefits: ["400mg Cafeína", "Resistência", "Vasodilatação", "Foco Intenso"], badge: "MAIS VENDIDO" },
    "BAGDA (Frutas Amarelas) 420g": { category: "Pré-Treino", brand: "DCX Nutrition", description: "O Bagdá da DCX Nutrition é um pré-treino completo que proporciona energia explosiva, foco e resistência muscular. Rende aproximadamente 60 doses e é livre de glúten e lactose.", benefits: ["60 Doses", "Energia", "Foco", "Sem Glúten"] },
    "Night Up (Maçã Verde) 200g": { category: "Pré-Treino Noturno", brand: "DCX Nutrition", description: "O Night Up é o pré-treino sem cafeína com 3000mg de Beta-Alanina, 1500mg de Arginina e 1000mg de Taurina, perfeito para treinos noturnos.", benefits: ["Sem Cafeína", "Treino Noturno", "Vasodilatação", "Sem Glúten"], badge: "NOVO" },
    "Pré-treino BOPE (Frutas Amarelas) 150g": { category: "Pré-Treino", brand: "Black Skull", description: "O B.O.P.E da Black Skull contém Cafeína, Creatina Monohidratada, Arginina e Taurina. Para treinos de alta intensidade.", benefits: ["Com Creatina", "Energia", "Força", "Black Skull"] },
    "Pré-treino BOPE (Limão) 300g": { category: "Pré-Treino", brand: "Black Skull", description: "Versão 300g do B.O.P.E no sabor limão, rendendo o dobro de doses com a mesma fórmula potente.", benefits: ["Com Creatina", "Energia", "Rendimento Dobro", "Black Skull"] },
    "D-Methylex": { category: "Termogênico", brand: "Under Labz", description: "Termogênico em cápsulas com Burn Matrix™. 400mg de cafeína, laranja moro, L-carnitina, café verde, guaraná, picolinato de cromo e pimenta caiena.", benefits: ["Queima de Gordura", "400mg Cafeína", "Inibidor de Apetite", "Diurético"], badge: "HOT" },
    "Kratos Black": { category: "Termogênico", brand: "DCX Nutrition", description: "Termogênico com Laranja Moro (500mg), Cafeína Anidra, Guaraná, Inositol, Pimenta, Gengibre, Canela e Coenzima Q10.", benefits: ["Laranja Moro", "Metabolismo", "Definição", "60 Cápsulas"] },
    "Thermo Extreme": { category: "Termogênico", brand: "DCX Nutrition", description: "Termogênico de alta potência com cafeína, chá verde, guaraná e pimenta caiena para máxima termogênese.", benefits: ["Termogênico", "Queima de Gordura", "Energia", "Definição"] },
    "Thermo-X c/ cafeína (Frutas Amarelas)": { category: "Termogênico 4 em 1", brand: "DCX Nutrition", description: "Suplemento 4 em 1: emagrecedor, diurético, inibidor de apetite e pré-treino com 27 ingredientes.", benefits: ["4 em 1", "27 Ingredientes", "Diurético", "Inibidor de Apetite"] },
    "Diuretic (Frutas Amarelas) 225g": { category: "Diurético", brand: "DCX Nutrition", description: "Suplemento diurético natural com Chá Verde, Carqueja, Guaraná, Erva-Mate, Gengibre, Alecrim e Sálvia.", benefits: ["Diurético Natural", "Anti-Inchaço", "Definição", "Sem Glúten"] },
    "Whey 100% Gourmet (Choco Branco) 900g": { category: "Whey Protein", brand: "DCX Nutrition", description: "WPC com matéria-prima importada. 20g de proteína, 3,3g de Glutamina e 4,7g de BCAA naturais. Adoçado com Stévia.", benefits: ["20g Proteína", "BCAA 4,7g", "Glutamina", "Sem Glúten"], badge: "MAIS VENDIDO" },
    "Whey High (Morango) 900g": { category: "Whey Protein", brand: "Absolut", description: "23g de proteína com 3,6g de BCAA. Enriquecido com Glutamina Peptídeo. Livre de soja.", benefits: ["23g Proteína", "BCAA 3,6g", "Glutamina Peptídeo", "Sem Soja"] },
    "Whey High (Baunilha) 900g": { category: "Whey Protein", brand: "Absolut", description: "Versão baunilha do Whey High: 23g de proteína com BCAA e Glutamina Peptídeo.", benefits: ["23g Proteína", "BCAA 3,6g", "Versatilidade", "Recuperação"] },
    "Whey 100% 900g": { category: "Whey Protein", brand: "Nutrata", description: "Proteína concentrada do soro do leite de alta qualidade com excelente perfil de aminoácidos.", benefits: ["Alta Qualidade", "Aminoácidos Essenciais", "Massa Magra", "Nutrata"] },
    "Whey Black Skull 900g": { category: "Whey Protein", brand: "Black Skull", description: "Proteína concentrada de alta absorção da Black Skull, marca referência mundial.", benefits: ["Marca Premium", "Alta Absorção", "Recuperação", "Tradição"] },
    "Protein Crush (Chocobear) 900g": { category: "Whey Protein", brand: "Under Labz", description: "WPC + MPC com Coenzima Q10, Zinco e Vitaminas B. Avaliado pelo método DIAAS.", benefits: ["Coenzima Q10", "Alto DIAAS", "Sabor Gourmet", "Zinco + Vit B"], badge: "NOVO" },
    "Protein Crush (Dulce de Leche) 900g": { category: "Whey Protein", brand: "Under Labz", description: "Versão Dulce de Leche com WPC e MPC enriquecido com Coenzima Q10, Zinco e Vitaminas B.", benefits: ["Coenzima Q10", "Sabor Dulce de Leche", "Zinco", "Biotina"] },
    "Protein Crush (Strawbear Swiss) 900g": { category: "Whey Protein", brand: "Under Labz", description: "Sabor premium de morango suíço com fórmula WPC+MPC e Coenzima Q10.", benefits: ["Coenzima Q10", "Sabor Premium", "Alto DIAAS", "Vitaminas B"] },
    "Mass Up (Baunilha) 3kg": { category: "Hipercalórico", brand: "Grow Up", description: "Hipercalórico com carboidratos, whey protein e mix de vitaminas. Ideal para ganho de massa.", benefits: ["Hipercalórico", "3kg", "Ganho de Massa", "Vitaminas"] },
    "Mass Up (Morango) 3kg": { category: "Hipercalórico", brand: "Grow Up", description: "Versão morango do Mass Up: alta densidade calórica com whey protein e vitaminas.", benefits: ["Hipercalórico", "3kg", "Superávit Calórico", "Praticidade"] },
    "Creatina 100% Pura 100g (DCX)": { category: "Creatina", brand: "DCX Nutrition", description: "Creatina monohidratada de alta pureza. Força e potência para treinos de alta intensidade.", benefits: ["100% Pura", "Força", "Potência", "Fácil Dissolução"], badge: "MAIS VENDIDO" },
    "Creatina 100% Pura 300g": { category: "Creatina", brand: "DCX Nutrition", description: "Formato econômico de 300g que rende ~60 doses.", benefits: ["300g Econômico", "60 Doses", "Força", "Performance"] },
    "Creatina Refil 500g": { category: "Creatina", brand: "DCX Nutrition", description: "Opção mais econômica para uso contínuo. ~100 doses de creatina pura.", benefits: ["500g Refil", "100 Doses", "Melhor Custo", "Uso Contínuo"] },
    "Creatine Pure 300g": { category: "Creatina", brand: "Black Skull", description: "Creatina monohidratada com selo Black Skull. 300g pura.", benefits: ["Black Skull", "Pura", "Sem Aditivos", "300g"] },
    "Beta Alanina 100g": { category: "Aminoácido", brand: "Black Skull", description: "Aminoácido que aumenta resistência muscular e retarda a fadiga.", benefits: ["Resistência", "Anti-Fadiga", "Carnosina", "Black Skull"] },
    "Creatina 100% Pura 100g (Grow Up)": { category: "Creatina", brand: "Grow Up", description: "Creatina monohidratada da Grow Up com alto grau de pureza.", benefits: ["100% Pura", "Cientificamente Comprovada", "Grow Up", "Força"] },
    "Mult X": { category: "Multivitamínico", brand: "DCX Nutrition", description: "Suplemento multivitamínico e multimineral completo para atletas.", benefits: ["Multivitamínico", "Multi-Mineral", "Saúde Completa", "Performance"] },
    "Testi 1000GH": { category: "Hormonal", brand: "DCX Nutrition", description: "Auxilia na otimização dos níveis hormonais com suporte a testosterona e GH.", benefits: ["Testosterona", "GH Natural", "Massa Magra", "Disposição"] },
    "T-DALA X": { category: "Performance", brand: "DCX Nutrition", description: "Otimiza a performance masculina, circulação sanguínea, energia e disposição.", benefits: ["Performance", "Circulação", "Energia", "Bem-Estar"] },
    "Colagen II Condroitina + Glucosamina": { category: "Articulações", brand: "Bionatus Pharma", description: "Combinação de Colágeno Tipo II, Condroitina e Glucosamina para articulações.", benefits: ["Colágeno Tipo II", "Articulações", "Condroitina", "Mobilidade"] },
    "Megapoli A-Z": { category: "Multivitamínico", brand: "Bionatus Pharma", description: "Polivitamínico e mineral completo de A a Z.", benefits: ["Vitaminas A-Z", "Minerais", "Imunidade", "Saúde Geral"] },
    "Acetilcisteina 600mg + Vit C + D3 + ZINC": { category: "Imunidade", brand: "Katigua", description: "Combinação potente: N-Acetilcisteína, Vit C, D3 e Zinco para imunidade.", benefits: ["Imunidade", "Antioxidante", "Vitamina D3", "Zinco"] },
    "B12 Metilcobalamina": { category: "Vitamina", brand: "Katigua", description: "Vitamina B12 na forma mais biodisponível para energia e sistema nervoso.", benefits: ["Metilcobalamina", "Energia", "Sistema Nervoso", "Alta Absorção"] },
    "Pasta de Amendoim Choco Mix 600g": { category: "Pasta de Amendoim", brand: "DCX Nutrition", description: "Pasta gourmet rica em proteínas com pedaços de chocolate.", benefits: ["Proteínas", "Gorduras Boas", "Com Chocolate", "Gourmet"] },
    "Pasta de Amendoim Leite em Pó 600g": { category: "Pasta de Amendoim", brand: "DCX Nutrition", description: "Cremosidade do amendoim com sabor de leite em pó.", benefits: ["Sabor Leite em Pó", "Proteínas", "Fibras", "Versátil"], badge: "NOVO" },
    "Pasta de Amendoim Choco Kat 600g": { category: "Pasta de Amendoim", brand: "DCX Nutrition", description: "Sabor chocolate com wafer, amendoim moído com cacau e crocância.", benefits: ["Sabor Choco Kat", "Crocante", "Proteínas", "Gorduras Boas"] },
    "Pasta de Amendoim Choco Bueno 600g": { category: "Pasta de Amendoim", brand: "DCX Nutrition", description: "Inspirada no sabor de chocolate com avelã. Rica em proteínas.", benefits: ["Choco Bueno", "Avelã", "600g", "Ganho de Massa"], badge: "MAIS VENDIDO" },
    "Pasta de Amendoim Choco Bueno 250g": { category: "Pasta de Amendoim", brand: "DCX Nutrition", description: "Versão compacta de 250g, perfeita para experimentar ou levar.", benefits: ["Formato Prático", "250g", "Choco Bueno", "Para Levar"] },
  };

  const IMAGE_MAP = {
    "Ares (Maçã Verde) 300g": "assets/img-ares.png",
    "Blue Demon": "assets/bludemon.png",
    "BAGDA (Frutas Amarelas) 420g": "assets/bagda.png",
    "Night Up (Maçã Verde) 200g": "assets/nigthup.png",
    "Pré-treino BOPE (Frutas Amarelas) 150g": "assets/bope.png",
    "Pré-treino BOPE (Limão) 300g": "assets/bope.png",
    "D-Methylex": "assets/Dimethylex.png",
    "Kratos Black": "assets/kratosblack.png",
    "Thermo Extreme": "assets/ThermoExtreme.png",
    "Thermo-X c/ cafeína (Frutas Amarelas)": "assets/Thermo-Xcafeína.png",
    "Diuretic (Frutas Amarelas) 225g": "assets/Diuretic.png",
    "Whey 100% Gourmet (Choco Branco) 900g": "assets/WheyGourmet.png",
    "Whey High (Morango) 900g": "assets/wheyhigh.png",
    "Whey High (Baunilha) 900g": "assets/wheyhigh.png",
    "Whey 100% 900g": "assets/wheynutrata.png",
    "Whey Black Skull 900g": "assets/wheyblackskull.png",
    "Protein Crush (Chocobear) 900g": "assets/wheycrush.png",
    "Protein Crush (Dulce de Leche) 900g": "assets/wheycrush.png",
    "Protein Crush (Strawbear Swiss) 900g": "assets/wheycrush.png",
    "Mass Up (Baunilha) 3kg": "assets/wheygrowup.png",
    "Mass Up (Morango) 3kg": "assets/wheygrowup.png",
    "Creatina 100% Pura 100g (DCX)": "assets/creatina100g.png",
    "Creatina 100% Pura 300g": "assets/creatinadcx.png",
    "Creatina Refil 500g": "assets/refil.png",
    "Creatine Pure 300g": "assets/creatinaskull.png",
    "Beta Alanina 100g": "assets/betalanina.png",
    "Creatina 100% Pura 100g (Grow Up)": "assets/creatinagrowup.png",
    "Mult X": "assets/Multix.png",
    "Testi 1000GH": "assets/TestoGh.png",
    "T-DALA X": "assets/tadala.png",
    "Colagen II Condroitina + Glucosamina": "assets/colageno.png",
    "Megapoli A-Z": "assets/a-z.png",
    "Acetilcisteina 600mg + Vit C + D3 + ZINC": "assets/acetilcisteina.png",
    "B12 Metilcobalamina": "assets/b12.png",
    "Pasta de Amendoim Choco Mix 600g": "assets/chocomix.png",
    "Pasta de Amendoim Leite em Pó 600g": "assets/leiteempo.png",
    "Pasta de Amendoim Choco Kat 600g": "assets/Chocokat.png",
    "Pasta de Amendoim Choco Bueno 600g": "assets/chocobueno.png",
    "Pasta de Amendoim Choco Bueno 250g": "assets/chochobueno250g.png",
  };

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    // Build allProducts from embedded data (no fetch needed)
    allProducts = Object.entries(PRODUCT_DATA).map(([name, data]) => ({
      name, category: data.category, img: IMAGE_MAP[name] || CONFIG.imageFallback, data
    }));

    if (!allProducts.length) productLoadError = true;

    filteredProducts = [...allProducts];
    renderProducts(allProducts);

    // Populate brand dropdown
    const brands = extractBrands(allProducts);
    const dropdown = document.getElementById('brandDropdown');
    brands.forEach(brand => {
      const opt = document.createElement('div');
      opt.className = 'brand-option';
      opt.setAttribute('role', 'option');
      opt.dataset.brand = brand;
      opt.setAttribute('aria-selected', 'false');
      opt.textContent = brand;
      dropdown.appendChild(opt);
    });

    // Category nav events
    document.querySelectorAll('.nav-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-cat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.category;
        applyFilters();
      });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    let debounce;
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      searchClear.style.display = searchQuery ? 'flex' : 'none';
      clearTimeout(debounce);
      debounce = setTimeout(applyFilters, 250);
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchClear.style.display = 'none';
      applyFilters();
      searchInput.focus();
    });

    // Brand dropdown
    const brandToggle = document.getElementById('brandToggle');
    brandToggle.addEventListener('click', () => {
      const expanded = brandToggle.getAttribute('aria-expanded') === 'true';
      brandToggle.setAttribute('aria-expanded', String(!expanded));
      dropdown.hidden = expanded;
    });

    dropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.brand-option');
      if (!opt) return;
      const brand = opt.dataset.brand;
      activeBrand = brand;
      document.getElementById('brandLabel').textContent = opt.textContent;
      dropdown.querySelectorAll('.brand-option').forEach(o => {
        o.classList.remove('active');
        o.setAttribute('aria-selected', 'false');
      });
      opt.classList.add('active');
      opt.setAttribute('aria-selected', 'true');
      brandToggle.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
      applyFilters();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.brand-filter-wrapper')) {
        brandToggle.setAttribute('aria-expanded', 'false');
        dropdown.hidden = true;
      }
    });

    // Clear filters button
    document.getElementById('clearFilters')?.addEventListener('click', resetFilters);

    // Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Analytics
    trackEvent('page_view', { page_path: window.location.pathname, page_title: document.title });

    // Error banner
    if (productLoadError) {
      const banner = document.createElement('div');
      banner.className = 'product-load-error';
      banner.setAttribute('role', 'alert');
      banner.textContent = 'Não foi possível carregar os detalhes dos produtos. Verifique sua conexão.';
      banner.style.cssText = 'background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);color:#ffd700;padding:0.8rem 1rem;border-radius:8px;text-align:center;font-family:var(--font-heading);margin:1rem 0.8rem;font-size:0.85rem;';
      document.getElementById('products').prepend(banner);
    }
  }

  init();
})();
