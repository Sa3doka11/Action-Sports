
/**
 * ===================================================================
 * Product-Details.js - وظائف خاصة بصفحة تفاصيل المنتج
 * ===================================================================
 * يحتوي على: Load Product Data, Add to Cart, Read More Toggle
 * الصفحة المستخدمة: productDetails.html
 */

(function () {
    "use strict";

    const API_BASE_URL = 'https://action-sports-api.vercel.app/api';
    const FALLBACK_IMAGE = 'assets/images/product1.png';
    const IMAGE_VALUE_KEYS = [
        'image', 'imageCover', 'image_cover', 'imageUrl', 'image_url', 'imageURL',
        'defaultImage', 'default_image', 'primaryImage', 'mainImage', 'thumbnail',
        'thumb', 'thumbUrl', 'cover', 'media', 'photo', 'picture', 'previewImage',
        'preview', 'gallery', 'productImage', 'images', 'assets'
    ];
    const IMAGE_OBJECT_KEYS = ['secure_url', 'url', 'src', 'path', 'href', 'image', 'imageUrl'];

    function normalizeImageUrl(url) {
        if (!url) return '';
        if (typeof url === 'string') {
            const trimmed = url.trim();
            if (!trimmed) return '';
            if (typeof ensureAbsoluteUrl === 'function') {
                return ensureAbsoluteUrl(trimmed) || trimmed;
            }
            return trimmed;
        }
        return '';
    }

    function collectProductImages(rawProduct = {}) {
        const urls = [];
        const seen = new Set();

        const pushUrl = (value) => {
            if (!value) return;

            if (Array.isArray(value)) {
                value.forEach(item => pushUrl(item));
                return;
            }

            if (typeof value === 'string') {
                const normalized = normalizeImageUrl(value);
                if (normalized && !seen.has(normalized)) {
                    seen.add(normalized);
                    urls.push(normalized);
                }
                return;
            }

            if (typeof value === 'object') {
                IMAGE_OBJECT_KEYS.forEach(key => {
                    if (value && typeof value[key] === 'string') {
                        pushUrl(value[key]);
                    }
                });
            }
        };

        IMAGE_VALUE_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(rawProduct, key)) {
                pushUrl(rawProduct[key]);
            }
        });

        if (Array.isArray(rawProduct.images)) {
            rawProduct.images.forEach(img => pushUrl(img));
        }

        const resolver = (typeof window !== 'undefined' && typeof window.resolveProductImage === 'function')
            ? window.resolveProductImage
            : null;
        const primary = resolver ? resolver(rawProduct) : normalizeImageUrl(rawProduct.image) || FALLBACK_IMAGE;
        pushUrl(primary);

        if (!urls.length) {
            urls.push(FALLBACK_IMAGE);
        }

        return urls;
    }
    let currentProduct = null;

    function getCartStateSafe() {
        if (typeof window.getCartStateSafe === 'function') {
            return window.getCartStateSafe();
        }
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
        if (typeof window.ensureCartStateLoaded === 'function') {
            return window.ensureCartStateLoaded(force);
        }
        if (typeof refreshCartState === 'function') {
            return refreshCartState(force);
        }
        return Promise.resolve(getCartStateSafe());
    }

    function addProductToCartShared(productId, quantity, payload) {
        if (typeof window.addProductToCartById === 'function') {
            return window.addProductToCartById(productId, quantity, payload);
        }
        if (typeof addProductToCartById === 'function') {
            return addProductToCartById(productId, quantity, payload);
        }
        return Promise.reject(new Error('addProductToCartById is not available'));
    }

    // ================================================================
    // 1. Load Product Data from URL
    // ================================================================
    // Populate product details from API based on id or slug
    async function loadProductData() {
        const productImg = document.getElementById('productImg');
        const productNotFound = document.getElementById('productNotFound');
        const detailsContainer = document.getElementById('productDetailsContainer');
        if (!productImg || !productNotFound || !detailsContainer) return null;

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            productNotFound.hidden = false;
            detailsContainer.hidden = true;
            return null;
        }

        const product = await fetchProductById(productId)
            || await fetchProductFromList(productId);

        if (!product) {
            productNotFound.hidden = false;
            detailsContainer.hidden = true;
            return null;
        }

        currentProduct = product;
        renderProduct(product);
        productNotFound.hidden = true;
        detailsContainer.hidden = false;
        return product;
    }

    // ================================================================
    // 2. Cart Functions
    // ================================================================
    // Add the current product to shared session cart
    async function addToCart(product) {
        if (!product || !product.id) {
            showToast('تعذر إضافة هذا المنتج للسلة.', 'error');
            return;
        }

        try {
            await ensureCartStateLoaded();
            await addProductToCartShared(product.id, 1, {
                name: product.name,
                price: product.price,
                image: product.image,
                installationPrice: Number(product.installationPrice) || 0
            });

            if (typeof window.__actionSportsProductMetadata__?.set === 'function') {
                window.__actionSportsProductMetadata__.set(product.id, {
                    name: product.name,
                    price: product.price,
                    image: product.image
                });
            }

            showToast(`تمت إضافة "${product.name}" إلى السلة!`, 'success');
        } catch (error) {
            console.error('❌ addToCart failed on details page:', error);
            showToast(error.message || 'تعذر إضافة المنتج للسلة.', 'error');
        }
    }

    // Reflect cart item count in header badge
    function updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            let total = 0;
            if (typeof window.getCartItemCount === 'function') {
                total = window.getCartItemCount();
            } else if (typeof getCartItemCount === 'function') {
                total = getCartItemCount();
            } else {
                const state = getCartStateSafe();
                if (Array.isArray(state.items)) {
                    total = state.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                }
            }
            cartCount.textContent = total.toString();
        }
    }

    // Delegate to global toast helper or fallback alert
    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // ================================================================
    // 3. Read More Toggle
    // ================================================================
    // Toggle the "additional details" accordion content
    function setupReadMore() {
        const readMoreBtn = document.getElementById('readMoreBtn');
        const additionalDetails = document.getElementById('additionalDetails');

        if (!readMoreBtn || !additionalDetails) {
            console.warn('Read More elements not found!');
            return;
        }

        readMoreBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const isShown = additionalDetails.classList.contains('show');

            if (isShown) {
                additionalDetails.classList.remove('show');
                readMoreBtn.innerHTML = '<i class="fa fa-chevron-down"></i> قراءة المزيد من التفاصيل';
            } else {
                additionalDetails.classList.add('show');
                readMoreBtn.innerHTML = '<i class="fa fa-chevron-up"></i> إخفاء التفاصيل';
                setTimeout(() => {
                    additionalDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        });
    }

    // ================================================================
    // 4. Setup Add to Cart Button
    // ================================================================
    // Wire     add-to-cart button within details page
    function setupAddToCartButton() {
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (!addToCartBtn) return;

        addToCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (currentProduct) {
                addToCart(currentProduct);
            }
        });
    }

    // ================================================================
    // 5. Initialize on Page Load
    // ================================================================
    function initProductDetailsPage() {
        loadProductData();
        ensureCartStateLoaded()
            .catch(error => console.warn('⚠️ Failed to preload cart on details page:', error))
            .finally(() => {
                updateCartCount();
            });
        setupReadMore();
        setupAddToCartButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProductDetailsPage, { once: true });
    } else {
        initProductDetailsPage();
    }

    function renderProduct(product) {
        const productImg = document.getElementById('productImg');
        const productName = document.getElementById('productName');
        const productCategory = document.getElementById('productCategory');
        const productPrice = document.getElementById('productPrice');
        const productDescription = document.getElementById('productDescription');
        const priceValue = productPrice?.querySelector('.price-value');
        const brandDetailSection = document.getElementById('brandDetailSection');
        const productBrandDetail = document.getElementById('productBrandDetail');
        const specsGrid = document.getElementById('specsGrid');
        const usageList = document.getElementById('usageList');
        const deliveryInfo = document.getElementById('deliveryInfo');
        const warrantyInfo = document.getElementById('warrantyInfo');

        const galleryContainer = document.getElementById('productGallery');
        const productImages = Array.isArray(product.images) && product.images.length
            ? product.images
            : [product.image || FALLBACK_IMAGE];
        const primaryImage = productImages[0] || FALLBACK_IMAGE;

        if (productImg) {
            productImg.src = primaryImage;
            productImg.alt = product.name;
            productImg.dataset.activeIndex = '0';
        }

        if (galleryContainer) {
            galleryContainer.innerHTML = '';
            if (productImages.length > 1) {
                galleryContainer.style.display = 'flex';
            } else {
                galleryContainer.style.display = 'none';
            }

            productImages.forEach((src, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'product-thumbnail';
                if (index === 0) {
                    button.classList.add('active');
                }
                button.innerHTML = `<img src="${src}" alt="${product.name} - صورة ${index + 1}">`;
                button.addEventListener('click', () => {
                    if (productImg) {
                        productImg.src = src;
                        productImg.dataset.activeIndex = String(index);
                    }
                    galleryContainer.querySelectorAll('.product-thumbnail').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                });
                galleryContainer.appendChild(button);
            });
        }

        if (productName) productName.textContent = product.name;
        if (productCategory) productCategory.textContent = product.categoryName || 'فئة غير محددة';
        if (priceValue) priceValue.textContent = formatPrice(product.price);
        if (productDescription) productDescription.textContent = product.description;

        if (brandDetailSection) {
            const brandName = product.brand?.name || product.brand?.title || product.brandName || product.manufacturer || product.vendor || '';
            if (productBrandDetail) {
                productBrandDetail.textContent = brandName || 'غير متوفر';
            }
            brandDetailSection.hidden = !brandName;
        }

        if (specsGrid) {
            const specsSection = specsGrid.closest('.detail-section');
            if (specsSection) {
                specsSection.style.display = 'none';
            } else {
                specsGrid.innerHTML = '';
            }
        }

        if (usageList) {
            usageList.innerHTML = '';
            const normalizedSpecs = Array.isArray(product.specs)
                ? product.specs.map(formatSpec).filter(Boolean)
                : [];

            if (normalizedSpecs.length) {
                normalizedSpecs.forEach(spec => {
                    const li = document.createElement('li');
                    li.className = 'usage-spec-item';
                    li.textContent = `${spec.label}: ${spec.value}`;
                    usageList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'لا توجد مواصفات تقنية متاحة.';
                li.classList.add('usage-specs-empty');
                usageList.appendChild(li);
            }
        }

        if (deliveryInfo) {
            deliveryInfo.textContent = 'التوصيل والتركيب يتم خلال ٣ إلى ٥ أيام.';
        }

        if (warrantyInfo) {
            warrantyInfo.innerHTML = `
                <p>ضمان سنة</p>
                <p>
                    للتواصل مع خدمة العملاء، تفضل بزيارة
                    <a href="./index.html#contact-us" class="contact-link">قسم تواصل معنا</a>.
                </p>
            `;
        }
    }

    function formatPrice(value) {
        const number = Number(value);
        if (Number.isNaN(number)) return value;
        return number.toLocaleString('ar-EG');
    }

    function normalizeProduct(rawProduct = {}) {
        if (!rawProduct || typeof rawProduct !== 'object') return null;

        const id = rawProduct._id || rawProduct.id;
        if (!id) return null;

        const category = rawProduct.category || rawProduct.mainCategory || {};
        const subCategory = rawProduct.subCategory || rawProduct.subcategory || {};
        const rawPrice = rawProduct.price?.current ?? rawProduct.price?.value ?? rawProduct.price?.amount ?? rawProduct.price ?? rawProduct.currentPrice ?? rawProduct.salePrice ?? rawProduct.basePrice;
        const sanitizedPrice = (typeof window !== 'undefined' && typeof window.sanitizePrice === 'function')
            ? window.sanitizePrice(rawPrice)
            : Number(rawPrice);
        const price = Number.isFinite(sanitizedPrice) ? sanitizedPrice : 0;

        const images = collectProductImages(rawProduct);
        const imageUrl = images[0] || FALLBACK_IMAGE;

        const description = extractPrimaryDescription(rawProduct);

        const features = mergeStringLists(
            rawProduct.features,
            rawProduct.keyFeatures,
            rawProduct.productFeatures,
            rawProduct.highlights,
            rawProduct.details?.features,
            rawProduct.details?.keyFeatures,
            rawProduct.details?.highlights
        );

        const specs = mergeSpecLists(
            rawProduct.specifications,
            rawProduct.specs,
            rawProduct.technicalSpecifications,
            rawProduct.techSpecs,
            rawProduct.details?.specifications,
            rawProduct.details?.technicalSpecifications,
            rawProduct.details?.specs
        );

        const usage = mergeStringLists(
            rawProduct.usage,
            rawProduct.benefits,
            rawProduct.details?.usage,
            rawProduct.details?.benefits,
            rawProduct.useCases,
            rawProduct.recommendedUse
        );

        const rawInstallation =
            rawProduct.installationPrice ??
            rawProduct.installation_price ??
            rawProduct.installationFee ??
            rawProduct.details?.installationPrice ??
            rawProduct.details?.installation_fee;
        const installationPrice = Number.isFinite(Number(rawInstallation)) ? Number(rawInstallation) : 0;

        const warrantyInfo = mergeStringLists(
            rawProduct.warranty,
            rawProduct.warrantyInfo,
            rawProduct.warrantyDetails,
            rawProduct.details?.warranty,
            rawProduct.details?.warrantyInfo
        );

        const deliveryInfo = mergeStringLists(
            rawProduct.deliveryInfo,
            rawProduct.deliveryDetails,
            rawProduct.shippingInfo,
            rawProduct.shippingDetails,
            rawProduct.details?.delivery,
            rawProduct.details?.shipping
        );

        return {
            id,
            name: rawProduct.name || rawProduct.title || 'منتج بدون اسم',
            categoryName: category?.name || rawProduct.categoryName || 'فئة غير محددة',
            price,
            image: imageUrl,
            images,
            description,
            features,
            specs,
            usage,
            warrantyInfo,
            deliveryInfo,
            installationPrice,
            brand: normalizeBrand(rawProduct)
        };
    }

    function formatSpec(spec) {
        if (!spec) return null;
        if (typeof spec === 'string') {
            const [label, ...rest] = spec.split(':');
            return { label: label || 'معلومة', value: rest.join(':') || spec };
        }

        return {
            label: spec.label || spec.name || 'معلومة',
            value: spec.value || spec.detail || '-'
        };
    }

    async function fetchProductById(productId) {
        const encodedId = encodeURIComponent(productId);
        const endpoints = [
            `${API_BASE_URL}/products/${encodedId}`,
            `${API_BASE_URL}/products?id=${encodedId}`,
            `${API_BASE_URL}/products?_id=${encodedId}`,
            `${API_BASE_URL}/products?slug=${encodedId}`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) {
                    if (response.status === 404) {
                        return null;
                    }
                    // Try next endpoint shape on client-side errors
                    if (response.status >= 400 && response.status < 500) {
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const payload = await response.json();
                console.log('Product API response:', {
                    endpoint,
                    payload
                });
                const raw = payload?.data?.product || payload?.data || payload;
                const product = normalizeProduct(raw);
                if (product) {
                    if (typeof window !== 'undefined' && window.__actionSportsProductMetadata__?.set) {
                        window.__actionSportsProductMetadata__.set(product.id, {
                            name: product.name,
                            price: product.price,
                            image: product.image,
                            installationPrice: Number(product.installationPrice) || 0
                        });
                    }
                    return product;
                }
            } catch (error) {
                console.warn(`Product fetch via ${endpoint} failed`, error);
            }
        }

        return null;
    }

    function mergeStringLists(...sources) {
        const items = [];
        sources.forEach(source => {
            extractStringItems(source).forEach(item => {
                if (!items.includes(item)) {
                    items.push(item);
                }
            });
        });
        return items;
    }

    function mergeSpecLists(...sources) {
        const specs = [];
        const seen = new Set();
        sources.forEach(source => {
            extractSpecItems(source).forEach(item => {
                const key = `${item.label}|${item.value}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    specs.push(item);
                }
            });
        });
        return specs;
    }

    function extractPrimaryDescription(rawProduct) {
        const candidates = [
            rawProduct.description,
            rawProduct.shortDescription,
            rawProduct.summary,
            rawProduct.details?.description,
            rawProduct.details?.summary
        ];

        const description = candidates.find(text => typeof text === 'string' && text.trim().length > 0);
        return description ? description.trim() : 'لا توجد تفاصيل متاحة لهذا المنتج حالياً.';
    }

    function extractStringItems(source) {
        if (!source) return [];
        if (Array.isArray(source)) {
            return source.flatMap(extractStringItems);
        }

        if (typeof source === 'string') {
            const cleaned = source.replace(/\r/g, '').trim();
            if (!cleaned) return [];

            const parts = cleaned.split(/[\n•\u2022\-]+/).map(part => part.trim()).filter(Boolean);
            if (parts.length > 1) return parts;
            return [cleaned];
        }

        if (typeof source === 'object') {
            const label = source.label || source.name || source.title || source.key || '';
            const value = source.value || source.detail || source.text || source.description || '';
            const combined = `${label}${label && value ? ': ' : ''}${value}`.trim();
            return combined ? [combined] : [];
        }

        return [];
    }

    function extractSpecItems(source) {
        if (!source) return [];
        if (Array.isArray(source)) {
            return source.flatMap(extractSpecItems);
        }

        if (typeof source === 'string') {
            const cleaned = source.trim();
            if (!cleaned) return [];

            if (cleaned.includes(':')) {
                const [label, ...rest] = cleaned.split(':');
                return [{ label: prettifyLabel(label), value: rest.join(':').trim() || '-' }];
            }

            return [{ label: 'معلومة', value: cleaned }];
        }

        if (typeof source === 'object') {
            if ('label' in source || 'name' in source || 'title' in source || 'key' in source) {
                const label = prettifyLabel(source.label || source.name || source.title || source.key || 'معلومة');
                const value = source.value || source.detail || source.text || source.description || '-';
                return [{ label, value }];
            }

            return Object.entries(source).map(([key, value]) => ({
                label: prettifyLabel(key),
                value: typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : JSON.stringify(value)
            }));
        }

        return [];
    }

    function prettifyLabel(label) {
        if (!label) return 'معلومة';
        return label
            .toString()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeBrand(rawProduct) {
        if (!rawProduct) return null;

        const brandSources = [
            rawProduct.brand,
            rawProduct.brandInfo,
            rawProduct.manufacturer,
            rawProduct.vendor,
            rawProduct.brandName,
            rawProduct.details?.brand
        ];

        for (const source of brandSources) {
            if (!source) continue;

            if (typeof source === 'string' && source.trim()) {
                return { name: source.trim() };
            }

            if (typeof source === 'object') {
                const name = source.name || source.title || source.label || source.brand || source.manufacturer || '';
                if (name && typeof name === 'string') {
                    return { name: name.trim() };
                }
            }
        }

        return null;
    }

    async function fetchProductFromList(productId) {
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

            const lowerId = productId.toLowerCase();
            const match = products.find(p => {
                const rawId = p._id || p.id;
                const rawSlug = typeof p.slug === 'string' ? p.slug : (typeof p.handle === 'string' ? p.handle : '');
                return rawId === productId || (typeof rawId === 'string' && rawId.toLowerCase() === lowerId) || (rawSlug && rawSlug.toLowerCase() === lowerId);
            });
            return normalizeProduct(match || null);
        } catch (error) {
            console.error('Fallback list fetch failed', error);
            return null;
        }
    }

})();
