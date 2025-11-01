/**
 * ===================================================================
 * Products.js - وظائف خاصة بصفحات عرض المنتجات
 * ===================================================================
 */

(function () {
    "use strict";

    const API_BASE_URL = 'https://action-sports-api.vercel.app/api';

    let allProducts = [];
    let categoriesFromApi = [];
    let categoryHierarchy = new Map();
    let currentCategory = 'all';
    let currentSubCategory = 'all';
    let searchQuery = '';
    let isFetchingProducts = false;
    let isFetchingCategories = false;

    const FALLBACK_IMAGE = 'assets/images/product1.png';

    const productMetadataCache = (() => {
        if (typeof window !== 'undefined') {
            if (window.__actionSportsProductMetadata__ instanceof Map) {
                return window.__actionSportsProductMetadata__;
            }
            const map = new Map();
            window.__actionSportsProductMetadata__ = map;
            return map;
        }
        return new Map();
    })();

    function getCartStateSafe() {
        if (typeof cartState === 'object' && cartState) {
            return cartState;
        }
        return {
            items: [],
            totals: { subtotal: 0, shipping: 0, total: 0 },
            isLoading: false,
            isLoaded: false
        };
    }

    function ensureCartStateLoaded(force = false) {
        if (typeof refreshCartState === 'function') {
            return refreshCartState(force);
        }
        return Promise.resolve(getCartStateSafe());
    }

    function getTotalCartItems(items) {
        if (typeof getCartItemCount === 'function') {
            return getCartItemCount(items);
        }
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    }

    /* ===================================================================
    1. Initialize Page
    =================================================================== */
    window.addEventListener('load', async function() {
        const urlParams = new URLSearchParams(window.location.search);
        currentCategory = urlParams.get('category') || 'all';
        currentSubCategory = urlParams.get('subcategory') || 'all';

        setupEventListeners();
        await loadCategories();
        await loadProducts();

        document.addEventListener('cart:updated', () => {
            updateCartCount();
            renderCart();
        });

        document.addEventListener('cart:loading', ({ detail }) => {
            if (detail?.loading) {
                const cartList = document.getElementById('cart-items-list');
                if (cartList) {
                    cartList.innerHTML = '<p class="cart-loading-msg">جاري تحميل السلة...</p>';
                }
            }
        });

        try {
            await ensureCartStateLoaded();
        } catch (error) {
            console.warn('⚠️ Failed to preload cart state on products page:', error);
        } finally {
            updateCartCount();
            renderCart();
        }
    });

    /* ===================================================================
    2. Setup Event Listeners
    =================================================================== */
    // Prepare UI event handlers for filters, search, and cart overlay
    function setupEventListeners() {
        const filtersContainer = document.getElementById('categoryFilters');

        if (filtersContainer) {
            filtersContainer.addEventListener('click', function(event) {
                const subButton = event.target.closest('.sub-filter-btn');
                if (subButton && filtersContainer.contains(subButton)) {
                    event.preventDefault();
                    handleSubCategoryClick(subButton);
                    return;
                }

                const categoryButton = event.target.closest('.filter-btn');
                if (categoryButton && filtersContainer.contains(categoryButton)) {
                    event.preventDefault();
                    handleCategoryClick(categoryButton);
                }
            });
        }

        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                searchQuery = e.target.value.trim().toLowerCase();
                if (clearSearch) {
                    clearSearch.classList.toggle('active', searchQuery !== '');
                }
                filterProducts();
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', function() {
                if (searchInput) {
                    searchInput.value = '';
                    searchQuery = '';
                    clearSearch.classList.remove('active');
                    filterProducts();
                    searchInput.focus();
                }
            });
        }

        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.addEventListener('click', function(event) {
                const addButton = event.target.closest('.add-to-cart-btn');
                if (!addButton || !productsGrid.contains(addButton)) return;

                event.preventDefault();
                const productId = addButton.dataset.id;
                const product = allProducts.find(p => p.id === productId);
                if (product) {
                    productMetadataCache.set(product.id, {
                        name: product.name,
                        price: product.price,
                        image: product.image
                    });
                    addToCart(product);
                }
            });
        }

        // Cart icon
        const cartIcon = document.getElementById('cart-icon');
        if (cartIcon) {
            cartIcon.addEventListener('click', function(e) {
                e.preventDefault();
                openCart(e);
            });
        }

        // Close cart button
        const closeCartBtn = document.getElementById('close-cart-btn');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', closeCart);
        }

        // Cart overlay
        const cartOverlay = document.querySelector('.cart-popup-overlay');
        if (cartOverlay) {
            cartOverlay.addEventListener('click', closeCart);
        }
    }

    /* ===================================================================
    3. Filter and Render Products
    =================================================================== */
    // Render products matching current category/search filters
    function filterProducts() {
        const grid = document.getElementById('productsGrid');
        const noProducts = document.getElementById('noProducts');

        if (!grid) return;

        const filteredProducts = allProducts.filter(product => {
            const matchesCategory = matchesFilter(currentCategory, product.categorySlug, product.categoryId, product.categoryName);
            const matchesSubCategory = matchesFilter(currentSubCategory, product.subCategorySlug, product.subCategoryId, product.subCategoryName);
            const matchesSearch = !searchQuery ||
                product.name.toLowerCase().includes(searchQuery) ||
                (product.categoryName && product.categoryName.toLowerCase().includes(searchQuery)) ||
                (product.description && product.description.toLowerCase().includes(searchQuery));
            return matchesCategory && matchesSubCategory && matchesSearch;
        });

        if (filteredProducts.length === 0) {
            grid.style.display = 'none';
            if (noProducts) noProducts.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        if (noProducts) noProducts.style.display = 'none';

        grid.innerHTML = filteredProducts.map(product => `
            <div class="product-item product-card" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image}" data-category="${product.categorySlug}">
                <div class="image-thumb">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="down-content">
                    <span>${product.categoryName}</span>
                    <div class="product-heading">
                        <h4>${product.name}</h4>
                    </div>
                    <p class="product-description">${product.description}</p>
                    <p class="product-price">${formatPrice(product.price)} <img src="./assets/images/Saudi_Riyal_Symbol.png" alt="" aria-hidden="true" class="saudi-riyal-symbol" /></p>
                    <div class="product-buttons">
                        <a href="productDetails.html?id=${product.id}" class="secondary-button">عرض المنتج</a>
                        <a href="#" class="add-to-cart-btn secondary-button" data-id="${product.id}">أضف للسلة</a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /* ===================================================================
    4. Cart Functions
    =================================================================== */
    // Persist selected product into session cart storage
    async function addToCart(product) {
        if (!product || !product.id) {
            showToast('تعذر إضافة هذا المنتج للسلة.');
            return;
        }

        try {
            await ensureCartStateLoaded();
            await addProductToCartById(product.id, 1, {
                name: product.name,
                price: product.price
            });
            showToast(`تمت إضافة "${product.name}" إلى السلة!`);
        } catch (error) {
            console.error('❌ addToCart error:', error);
            showToast(error.message || 'تعذر إضافة المنتج للسلة.');
        }
    }

    // Populate sidebar cart with current session contents
    function renderCart() {
        const cartList = document.getElementById('cart-items-list');
        const cartTotalPrice = document.getElementById('cart-total-price');

        if (!cartList) return;

        const state = getCartStateSafe();

        if (state.isLoading && !state.isLoaded) {
            cartList.innerHTML = '<p class="cart-loading-msg">جاري تحميل السلة...</p>';
            return;
        }

        if (!state.items.length) {
            cartList.innerHTML = '<p class="cart-empty-msg">سلة المشتريات فارغة.</p>';
            if (cartTotalPrice) cartTotalPrice.textContent = '0 ﷼';
            return;
        }

        let total = 0;
        cartList.innerHTML = '';

        state.items.forEach(item => {
            const cartItemDiv = document.createElement('div');
            cartItemDiv.classList.add('cart-item');
            cartItemDiv.dataset.itemId = item.id;

            cartItemDiv.innerHTML = `
                <div class="cart-item-info">
                    <img class="cart-item-image" src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${formatPrice(item.price)} </div>
                    </div>
                </div>
                <div class="cart-item-controls" style="display: flex; align-items: center; gap: 5px;">
                    <button class="decrease-btn" data-id="${item.id}" style="width: 28px; height: 28px; border: 1px solid #ddd; background: white; color: #333; cursor: pointer; border-radius: 3px; font-size: 16px; font-weight: 700;">−</button>
                    <span class="quantity-display" style="width: 28px; text-align: center; font-weight: 700; font-size: 14px;">${item.quantity}</span>
                    <button class="increase-btn" data-id="${item.id}" style="width: 28px; height: 28px; border: 1px solid #ddd; background: white; color: #333; cursor: pointer; border-radius: 3px; font-size: 16px; font-weight: 700;">+</button>
                    <button class="remove-btn" data-id="${item.id}" style="width: 28px; height: 28px; border: 1px solid #ff6b6b; background: white; color: #ff6b6b; cursor: pointer; border-radius: 3px; font-size: 14px; margin-right: 8px;" title="إزالة">🗑</button>
                </div>
            `;

            cartList.appendChild(cartItemDiv);
            total += item.price * item.quantity;
        });

        if (cartTotalPrice) {
            cartTotalPrice.textContent = `${formatPrice(total)} ﷼`;
        }

        // Add event listeners
        cartList.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (!id) return;
                ensureCartStateLoaded()
                    .then(() => updateCartItemQuantity(id, (getCartStateSafe().items.find(i => i.id === id)?.quantity || 0) + 1))
                    .catch(error => console.error('❌ Failed to increase quantity:', error));
            });
        });

        cartList.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (!id) return;
                ensureCartStateLoaded()
                    .then(() => updateCartItemQuantity(id, (getCartStateSafe().items.find(i => i.id === id)?.quantity || 0) - 1))
                    .catch(error => console.error('❌ Failed to decrease quantity:', error));
            });
        });

        cartList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (!id) return;
                ensureCartStateLoaded()
                    .then(() => removeCartItem(id))
                    .catch(error => console.error('❌ Failed to remove item:', error));
            });
        });
    }

    // Update header badge with total number of cart items
    function updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            const state = getCartStateSafe();
            const totalItems = getTotalCartItems(state.items);
            cartCount.textContent = totalItems || '0';
        }
    }

    // Display cart sidebar overlay and prevent body scroll
    function openCart(triggerEvent) {
        const cartPopup = document.getElementById('cart-popup');
        if (!requireAuth(triggerEvent, 'cart.html')) {
            return;
        }
        if (cartPopup) {
            cartPopup.style.display = 'block';
            document.body.style.overflow = 'hidden';
            ensureCartStateLoaded().finally(() => {
                renderCart();
            });
        }
    }

    // Hide cart sidebar overlay and restore body scroll
    function closeCart() {
        const cartPopup = document.getElementById('cart-popup');
        if (cartPopup) {
            cartPopup.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Proxy to global toast helper if available (fallback otherwise)
    function showToast(message) {
        // استخدام الـ toast من script.js 
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        }
    }

    function handleCategoryClick(button) {
        const categoryId = button.dataset.category;
        if (categoryId === undefined) return;

        currentCategory = categoryId;
        currentSubCategory = 'all';

        document.querySelectorAll('#categoryFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const subSections = document.querySelectorAll('#categoryFilters .sub-categories');
        subSections.forEach(section => section.classList.remove('show'));

        const subContainer = button.nextElementSibling;
        if (subContainer && subContainer.classList.contains('sub-categories')) {
            subContainer.classList.add('show');
            subContainer.querySelectorAll('.sub-filter-btn').forEach(btn => btn.classList.remove('active'));
        }

        const url = new URL(window.location.href);
        if (normalizeFilterValue(categoryId) === 'all') {
            url.searchParams.delete('category');
            url.searchParams.delete('subcategory');
        } else {
            url.searchParams.set('category', categoryId);
            url.searchParams.delete('subcategory');
        }
        window.history.replaceState({}, '', url);

        filterProducts();
    }

    function handleSubCategoryClick(button) {
        const subCategoryId = button.dataset.subcategory;
        if (subCategoryId === undefined) return;

        currentSubCategory = subCategoryId;
        document.querySelectorAll('#categoryFilters .sub-filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const url = new URL(window.location.href);
        if (currentCategory && normalizeFilterValue(currentCategory) !== 'all') {
            url.searchParams.set('category', currentCategory);
        }
        url.searchParams.set('subcategory', subCategoryId);
        window.history.replaceState({}, '', url);

        filterProducts();
    }

    async function loadCategories() {
        if (isFetchingCategories) return;
        isFetchingCategories = true;

        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            const documents = Array.isArray(payload?.data?.documents)
                ? payload.data.documents
                : Array.isArray(payload?.data)
                    ? payload.data
                    : Array.isArray(payload)
                        ? payload
                        : [];

            categoriesFromApi = documents
                .map((category, index) => normalizeCategory(category, index))
                .filter(Boolean);
        } catch (error) {
            console.error('Failed to load categories', error);
            categoriesFromApi = [];
        } finally {
            isFetchingCategories = false;
            buildCategoryFilters();
        }
    }

    async function loadProducts(params = {}) {
        if (isFetchingProducts) return;
        isFetchingProducts = true;

        try {
            const response = await fetch(`${API_BASE_URL}/products`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            const products = Array.isArray(payload?.data?.products)
                ? payload.data.products
                : Array.isArray(payload?.data?.documents)
                    ? payload.data.documents
                    : [];

            allProducts = products.map(product => {
                const normalizedProduct = normalizeProduct(product);
                if (typeof window !== 'undefined' && typeof window.resolveProductImage === 'function') {
                    normalizedProduct.image = window.resolveProductImage(product);
                }
                return normalizedProduct;
            });
            buildCategoryFilters();
            filterProducts();
            allProducts.forEach(product => {
                if (!product || !product.id) return;
                productMetadataCache.set(product.id, {
                    name: product.name,
                    price: product.price,
                    image: product.image
                });
            });
        } catch (error) {
            console.error('Failed to load products', error);
            allProducts = [];
            buildCategoryFilters();
            filterProducts();
        } finally {
            isFetchingProducts = false;
        }
    }

    function normalizeProduct(product, index) {
        const id = product._id || product.id || `product-${index}`;
        const name = product.name || product.title || 'منتج بدون اسم';
        let category = product.category || product.mainCategory || product.main_category || product.mainCategoryId || {};
        let subCategory = product.subCategory || product.subcategory || product.subCategoryId || {};

        if (typeof category === 'string') {
            category = { _id: category, slug: category };
        }
        if (typeof subCategory === 'string') {
            subCategory = { _id: subCategory, slug: subCategory };
        }

        const rawPrice = product.price?.current ?? product.price?.value ?? product.price?.amount ?? product.price ?? product.currentPrice ?? product.salePrice ?? product.basePrice;
        const numericPrice = typeof rawPrice === 'string' ? Number(rawPrice.replace(/[^\d.]/g, '')) : Number(rawPrice);
        const price = Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : 0;

        const imageUrl = (typeof window !== 'undefined' && typeof window.resolveProductImage === 'function')
            ? window.resolveProductImage(product)
            : (product.image || FALLBACK_IMAGE);

        const categoryId = category?._id || category?.id || product.categoryId || product.category || 'uncategorized';
        const categorySlug = category?.slug || product.categorySlug || categoryId;
        const categoryName = category?.title || category?.name || product.categoryName || product.categoryLabel || 'فئة غير محددة';

        const subCategoryId = subCategory?._id || subCategory?.id || product.subCategoryId || product.subcategoryId || product.subCategory || 'all';
        const subCategorySlug = subCategory?.slug || product.subCategorySlug || subCategoryId;
        const subCategoryName = subCategory?.title || subCategory?.name || product.subCategoryName || product.subCategoryLabel || '';

        const description = product.shortDescription || product.description || 'اكتشف المزيد عن هذا المنتج عند فتح التفاصيل.';

        return {
            id,
            name,
            description,
            price,
            image: imageUrl,
            categoryId,
            categorySlug,
            categoryName,
            subCategoryId,
            subCategorySlug,
            subCategoryName,
            brandName: product.brand?.name || '',
            warrantyInfo: product.warrantyInfo || '',
            deliveryInfo: product.deliveryInfo || '',
            raw: product
        };
    }

    function buildCategoryFilters() {
        const filtersContainer = document.getElementById('categoryFilters');
        if (!filtersContainer) return;

        const categoriesMap = new Map();

        const ensureCategoryEntry = (key, data) => {
            const normalizedKey = normalizeFilterValue(key || data.slug || data.id || data.name);
            if (!normalizedKey) return null;

            if (!categoriesMap.has(normalizedKey)) {
                categoriesMap.set(normalizedKey, {
                    id: data.id,
                    slug: data.slug || data.id,
                    name: data.name || 'فئة غير محددة',
                    subCategories: new Map()
                });
            }

            return categoriesMap.get(normalizedKey);
        };

        categoriesFromApi.forEach(category => {
            if (!category) return;
            ensureCategoryEntry(category.slug || category.id, category);
        });

        allProducts.forEach(product => {
            const categoryData = {
                id: product.categoryId,
                slug: product.categorySlug || product.categoryId,
                name: product.categoryName
            };
            const categoryEntry = ensureCategoryEntry(categoryData.slug, categoryData);
            if (!categoryEntry) return;

            if (product.subCategorySlug && product.subCategorySlug !== 'all') {
                const subKey = normalizeFilterValue(product.subCategorySlug || product.subCategoryId);
                if (subKey && !categoryEntry.subCategories.has(subKey)) {
                    categoryEntry.subCategories.set(subKey, {
                        id: product.subCategoryId,
                        slug: product.subCategorySlug,
                        name: product.subCategoryName || 'قسم فرعي'
                    });
                }
            }
        });

        categoryHierarchy = categoriesMap;

        const fragment = document.createDocumentFragment();
        const normalizedCurrentCategory = normalizeFilterValue(currentCategory);
        const normalizedCurrentSubCategory = normalizeFilterValue(currentSubCategory);

        const allButton = document.createElement('button');
        allButton.className = 'filter-btn';
        allButton.dataset.category = 'all';
        allButton.textContent = 'الكل';
        fragment.appendChild(allButton);

        let hasActiveCategory = false;
        if (!normalizedCurrentCategory || normalizedCurrentCategory === 'all') {
            allButton.classList.add('active');
            hasActiveCategory = true;
        }

        categoriesMap.forEach(category => {
            const categoryButton = document.createElement('button');
            categoryButton.className = 'filter-btn' + (category.subCategories.size ? ' has-subcategory' : '');
            categoryButton.dataset.category = category.slug || category.id;
            categoryButton.textContent = category.name;

            const isActiveCategory = isFilterMatch(category.slug || category.id || category.name, currentCategory);
            if (isActiveCategory) {
                categoryButton.classList.add('active');
                hasActiveCategory = true;
            }

            fragment.appendChild(categoryButton);

            if (category.subCategories.size) {
                const subContainer = document.createElement('div');
                subContainer.className = 'sub-categories';

                let hasActiveSub = false;

                category.subCategories.forEach(subCategory => {
                    const subButton = document.createElement('button');
                    subButton.className = 'sub-filter-btn';
                    subButton.dataset.subcategory = subCategory.slug || subCategory.id;
                    subButton.textContent = subCategory.name;

                    const isActiveSub = isFilterMatch(subCategory.slug || subCategory.id || subCategory.name, currentSubCategory);
                    if (isActiveCategory && isActiveSub) {
                        subButton.classList.add('active');
                        hasActiveSub = true;
                    }

                    subContainer.appendChild(subButton);
                });

                if (isActiveCategory && hasActiveSub) {
                    subContainer.classList.add('show');
                }

                fragment.appendChild(subContainer);
            }
        });

        if (!hasActiveCategory) {
            allButton.classList.add('active');
        }

        filtersContainer.innerHTML = '';
        filtersContainer.appendChild(fragment);

        filterProducts();
    }

    function normalizeCategory(category = {}, index = 0) {
        if (!category || typeof category !== 'object') return null;

        const id = category._id || category.id || category.slug || `category-${index}`;
        const name = category.name || category.title || category.label || `فئة ${index + 1}`;
        const slugSource = category.slug || category.handle || category.permalink || name || id;
        const slug = createCategorySlug(slugSource, id);

        return {
            id,
            name,
            slug,
            description: category.description || ''
        };
    }

    function createCategorySlug(value = '', fallback = '') {
        const base = value || fallback;
        if (!base) {
            return fallback ? String(fallback) : `category-${Date.now()}`;
        }

        const slug = base
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, '-')
            .replace(/[^\w\u0600-\u06FF-]+/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        return slug || (fallback ? String(fallback) : `category-${Date.now()}`);
    }

    function formatPrice(value) {
        const number = Number(value);
        if (Number.isNaN(number)) return value;
        return number.toLocaleString('ar-EG');
    }

    function normalizeFilterValue(value) {
        if (value === undefined || value === null) return '';
        return String(value).trim().toLowerCase();
    }

    function matchesFilter(target, ...candidates) {
        const normalizedTarget = normalizeFilterValue(target);
        if (!normalizedTarget || normalizedTarget === 'all') {
            return true;
        }

        return candidates.some(candidate => normalizeFilterValue(candidate) === normalizedTarget);
    }

    function isFilterMatch(candidate, target) {
        const normalizedCandidate = normalizeFilterValue(candidate);
        const normalizedTarget = normalizeFilterValue(target);
        if (!normalizedTarget || normalizedTarget === 'all') {
            return normalizedCandidate === 'all' || normalizedCandidate === '';
        }
        return normalizedCandidate === normalizedTarget;
    }
    
})();