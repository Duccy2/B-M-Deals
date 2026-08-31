function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
function escapeAttr(str) { return escapeHtml(str); }

function cardHtml(p) {
  var img = p.image
    ? '<img src="' + escapeAttr(p.image) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
    : '';
  var starburst = p.discountPct
    ? '<div class="starburst">' + p.discountPct.toFixed(0) + '%<br>OFF</div>'
    : '';
  var badges = [
    p.newArrival ? '<span class="flag-badge new">NEW</span>' : '',
    p.specialBuy ? '<span class="flag-badge special">SPECIAL BUY</span>' : '',
    p.blackFriday ? '<span class="flag-badge blackfriday">BLACK FRIDAY</span>' : '',
    p.sale ? '<span class="flag-badge sale">SALE</span>' : '',
  ].join('');
  var priceHtml = (p.was && p.discountPct)
    ? '<span class="now">£' + p.sell.toFixed(2) + '</span><span class="was">£' + p.was.toFixed(2) + '</span>'
    : (p.sell !== null ? '<span class="now">£' + p.sell.toFixed(2) + '</span>' : '<span class="now">—</span>');
  var link = p.url
    ? '<a class="card-link" href="' + escapeAttr(p.url) + '" target="_blank" rel="noopener">View product</a>'
    : '';

  return '' +
    '<div class="card">' +
      starburst +
      '<div class="thumb-wrap">' + img + '</div>' +
      '<div class="badges">' + badges + '</div>' +
      '<div class="ctitle">' + escapeHtml(p.title || '') + '</div>' +
      '<div class="cbrand">' + escapeHtml(p.brand || '') + '</div>' +
      '<div class="cprices">' + priceHtml + '</div>' +
      (p.stockMsg ? '<div class="cstock">' + escapeHtml(p.stockMsg) + '</div>' : '') +
      link +
    '</div>';
}

/**
 * Wires up a product grid: pagination always, plus live filtering via
 * whichever of these elements exist on the page:
 *   #searchInput      - free text (title/brand/category)
 *   #categorySelect   - category dropdown (options built from the page's
 *                       own product set, so it's automatically scoped)
 *   #minPrice/#maxPrice - price range (£)
 *   #minPct/#maxPct     - % off range
 *   #resetFiltersBtn    - clears every filter above
 * Pages that don't include a given element simply skip that filter.
 */
function initCatalog(products, opts) {
  opts = opts || {};
  var PAGE_SIZE = opts.pageSize || 60;
  var page = 1;
  var VIEW = products.slice();

  var grid = document.getElementById('grid');
  var resultCount = document.getElementById('resultCount');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var pageIndicator = document.getElementById('pageIndicator');
  var searchInput = document.getElementById('searchInput');
  var categorySelect = document.getElementById('categorySelect');
  var minPrice = document.getElementById('minPrice');
  var maxPrice = document.getElementById('maxPrice');
  var minPct = document.getElementById('minPct');
  var maxPct = document.getElementById('maxPct');
  var resetBtn = document.getElementById('resetFiltersBtn');

  if (categorySelect) {
    var cats = new Set();
    products.forEach(function (p) { if (p.category) cats.add(p.category); });
    Array.from(cats).sort().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
    categorySelect.addEventListener('change', function () { page = 1; applyFilters(); });
  }
  if (searchInput) {
    searchInput.addEventListener('input', function () { page = 1; applyFilters(); });
  }
  [minPrice, maxPrice, minPct, maxPct].forEach(function (el) {
    if (el) el.addEventListener('input', function () { page = 1; applyFilters(); });
  });
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = '';
      if (minPrice) minPrice.value = '';
      if (maxPrice) maxPrice.value = '';
      if (minPct) minPct.value = '';
      if (maxPct) maxPct.value = '';
      page = 1;
      applyFilters();
    });
  }
  if (prevBtn) prevBtn.addEventListener('click', function () { if (page > 1) { page--; renderPage(); } });
  if (nextBtn) nextBtn.addEventListener('click', function () {
    var maxPage = Math.max(1, Math.ceil(VIEW.length / PAGE_SIZE));
    if (page < maxPage) { page++; renderPage(); }
  });

  function numOrNull(el) {
    if (!el || el.value === '') return null;
    var n = parseFloat(el.value);
    return isNaN(n) ? null : n;
  }

  function applyFilters() {
    var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var cat = categorySelect ? categorySelect.value : '';
    var pMin = numOrNull(minPrice);
    var pMax = numOrNull(maxPrice);
    var dMin = numOrNull(minPct);
    var dMax = numOrNull(maxPct);

    VIEW = products.filter(function (p) {
      if (cat && p.category !== cat) return false;
      if (term) {
        var hay = ((p.title || '') + ' ' + (p.brand || '') + ' ' + (p.category || '')).toLowerCase();
        if (hay.indexOf(term) === -1) return false;
      }
      if (pMin !== null && (p.sell === null || p.sell < pMin)) return false;
      if (pMax !== null && (p.sell === null || p.sell > pMax)) return false;
      if (dMin !== null || dMax !== null) {
        var pct = p.discountPct || 0;
        if (dMin !== null && pct < dMin) return false;
        if (dMax !== null && pct > dMax) return false;
      }
      return true;
    });
    renderPage();
  }

  function renderPage() {
    if (resultCount) resultCount.textContent = VIEW.length.toLocaleString() + ' products match';
    var start = (page - 1) * PAGE_SIZE;
    var items = VIEW.slice(start, start + PAGE_SIZE);
    grid.innerHTML = items.length
      ? items.map(cardHtml).join('')
      : '<div class="empty-state">No products match.</div>';
    var maxPage = Math.max(1, Math.ceil(VIEW.length / PAGE_SIZE));
    if (pageIndicator) pageIndicator.textContent = 'Page ' + page + ' of ' + maxPage;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= maxPage;
  }

  applyFilters();
}
