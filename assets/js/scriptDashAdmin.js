// ===== API Configuration =====
const ADMIN_API_BASE_URL = 'https://action-sports-api.vercel.app/api';
const CATEGORY_ENDPOINT = `${ADMIN_API_BASE_URL}/categories`;
const PRODUCT_ENDPOINT = `${ADMIN_API_BASE_URL}/products`;

// ===== Global Variables =====
let chartsLoaded = {
    overview: false,
    analytics: false
};

const chartInstances = {
    overview: {},
    analytics: {}
};

// ===== Mock Data =====
const mockData = {
    overviewMetrics: {
        revenue: 452300,
        avgOrder: 850,
        conversionRate: 3.2,
        returnRate: 1.8,
        weeklyChange: {
            revenue: 0.18,
            avgOrder: 0.05,
            conversionRate: -0.005,
            returnRate: -0.003
        }
    },
    overviewOrders: [
        { id: 'ORD-1042', customer: 'محمد أحمد', total: 8690, status: 'processing', date: '2025-10-25', payment: 'cash' }
    ],
    products: [],
    categories: [],
    collections: [
        { id: 'COL-1', name: 'حملة العودة للنادي', status: 'active', products: 12, schedule: '2025-10-01 — 2025-10-31', image: 'https://via.placeholder.com/400x200?text=Collection' }
    ],
    promotions: [
        { id: 'PR-1', title: 'خصم 20% على كل الأجهزة', type: 'percentage', value: '20%', period: '2025-10-20 — 2025-10-31', status: 'active' }
    ],
    coupons: [
        { id: 'CP-1', code: 'WELCOME20', type: 'percentage', value: 20, minSpend: null, used: 45, limit: 100, status: 'active', expiry: '2025-12-31' }
    ],
    banners: [
        { id: 'BN-1', title: 'عرض الصيف الكبير', placement: 'home_hero', status: 'active', image: 'https://via.placeholder.com/1200x400?text=Banner' }
    ],
    pages: [
        { id: 'PG-1', title: 'من نحن', updatedAt: '2025-10-20' }
    ],
    features: [
        { id: 'FT-1', icon: 'fas fa-shipping-fast', title: 'توصيل خلال 24 ساعة', description: 'شحن سريع لجميع المحافظات', status: 'active' }
    ],
    payments: [
        { id: 'cod', name: 'الدفع عند الاستلام', fee: '10 ريال', note: '', enabled: true }
    ],
    orders: [
        { id: 'ORD-1042', customer: 'محمد أحمد', total: 8690, status: 'processing', payment: 'cash', date: '2025-10-25', items: 3 }
    ],
    customers: [
        { id: 'CUS-778', name: 'محمد أحمد', email: 'm.ahmed@example.com', segment: 'vip', orders: 12, spend: 98000, status: 'active', lastOrder: '2025-10-25' }
    ],
    analyticsRangeOptions: [
        { value: '7d', label: 'آخر 7 أيام' },
        { value: '30d', label: 'آخر 30 يوم' },
        { value: '90d', label: 'آخر 3 أشهر' },
        { value: 'ytd', label: 'منذ بداية العام' }
    ],
    auditLogs: [
        { id: 1, createdAt: '2025-10-25 14:32:15', user: 'أحمد محمد', action: 'create', message: 'إضافة منتج جديد: "جهاز المشي"', ip: '192.168.1.1' }
    ],
    users: [
        { id: 'USR-1', name: 'أحمد محمد', email: 'ahmed@admin.com', role: 'admin', status: 'active', lastActive: '2025-10-25 14:32' }
    ],
    orderDetails: {
        'ORD-1042': {
            customer: { name: 'محمد أحمد', email: 'm.ahmed@example.com', phone: '01012345678' },
            shipping: { line: '15 شارع الجامعة', city: 'المنصورة، الدقهلية', country: 'مصر - 35516' },
            paymentMethod: 'الدفع عند الاستلام',
            date: '2025-10-25 14:30',
            items: [
                { name: 'جهاز المشي الكهربائي', quantity: 1, price: 8500 },
                { name: 'حبل القفز الرياضي', quantity: 2, price: 120 }
            ],
            summary: { subtotal: 8740, shipping: 50, discount: 100, total: 8690 },
            status: 'processing',
            notes: ''
        }
    }
};

const state = {
    filters: {
        productSearch: '',
        productCategory: 'all',
        productStatus: 'all',
        orderSearch: '',
        orderStatus: 'all',
        orderDate: '',
        customerSearch: '',
        customerSegment: 'all',
        auditSearch: '',
        auditAction: 'all',
        auditDate: '',
        analyticsRange: '7d'
    },
    categories: [],
    categoriesLoading: false,
    categoriesError: null,
    categoryExtras: {},
    products: [],
    productsLoading: false,
    productsError: null,
    productExtras: {},
    currentSection: 'overview'
};

const STATUS_META = {
    active: { label: 'نشط', class: 'status-active' },
    inactive: { label: 'غير نشط', class: 'status-inactive' },
    scheduled: { label: 'مجدول', class: 'status-scheduled' },
    paused: { label: 'متوقف', class: 'status-paused' },
    completed: { label: 'مكتمل', class: 'status-completed' },
    shipped: { label: 'تم الشحن', class: 'status-shipped' },
    processing: { label: 'قيد المعالجة', class: 'status-processing' },
    new: { label: 'جديد', class: 'status-new' },
    cancelled: { label: 'ملغي', class: 'status-cancelled' },
    low_stock: { label: 'مخزون منخفض', class: 'status-warning' },
    login: { label: 'تسجيل دخول', class: 'action-login' },
    create: { label: 'إضافة', class: 'action-create' },
    update: { label: 'تعديل', class: 'action-update' },
    delete: { label: 'حذف', class: 'action-delete' }
};

// ===== Session Management =====
// حفظ القسم الحالي في sessionStorage لاستعادته عند إعادة تحميل الصفحة
function saveCurrentSection(section) {
    state.currentSection = section;
    try {
        sessionStorage.setItem('currentSection', section);
    } catch (error) {
        console.warn('Failed to save current section', error);
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.dataset.entity !== 'product') return;

    console.log('📝 Submitting product form...');

    const formData = new FormData(form);
    const mode = form.dataset.mode || 'create';
    const id = formData.get('id');

    const payload = buildProductPayload(formData);

    if (!payload.name) {
        showToast('error', 'حفظ المنتج', 'يرجى إدخال اسم المنتج');
        return;
    }

    if (!payload.price) {
        showToast('error', 'حفظ المنتج', 'يرجى إدخال سعر المنتج');
        return;
    }

    const imageInput = form.querySelector('#productImage');
    const imageFile = imageInput?.files?.[0] || null;

    if (mode === 'edit' && id) {
        await updateProduct(id, payload, imageFile);
    } else {
        await createProduct(payload, imageFile);
    }
}

// تحميل القسم المحفوظ أو الافتراضي عند بدء التطبيق
function loadCurrentSection() {
    try {
        return sessionStorage.getItem('currentSection') || 'overview';
    } catch (error) {
        console.warn('Failed to load current section', error);
        return 'overview';
    }
}

// ===== Utility Helpers =====
function escapeHtml(value = '') {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveAssetUrl(path = '') {
    if (!path || typeof path !== 'string') return '';
    const trimmed = path.trim();

    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
        return trimmed;
    }

    try {
        const base = new URL(ADMIN_API_BASE_URL);
        const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        base.pathname = normalizedPath;
        base.search = '';
        base.hash = '';
        return base.toString();
    } catch (error) {
        console.warn('Failed to resolve asset url:', path, error);
        return trimmed;
    }
}

function extractCategoryImage(rawCategory = {}) {
    const candidates = [];

    const addCandidate = (value) => {
        if (!value) return;
        if (typeof value === 'string') {
            candidates.push(value);
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(addCandidate);
            return;
        }

        if (typeof value === 'object') {
            const candidate = value.secure_url
                || value.url
                || value.src
                || value.path
                || value.href;
            if (candidate) {
                candidates.push(candidate);
            }
        }
    };

    addCandidate(rawCategory.image);
    addCandidate(rawCategory.thumbnail);
    addCandidate(rawCategory.cover);
    addCandidate(rawCategory.media);
    if (Array.isArray(rawCategory.images)) {
        rawCategory.images.forEach(addCandidate);
    }

    const resolved = candidates
        .map(candidate => resolveAssetUrl(candidate))
        .find(candidate => typeof candidate === 'string' && candidate.trim().length > 0);

    return resolved || '';
}

const PRODUCT_PLACEHOLDER_IMAGE = 'https://via.placeholder.com/320x200?text=Product';

function extractProductImage(rawProduct = {}) {
    const candidates = [];

    const addCandidate = (value) => {
        if (!value) return;
        if (typeof value === 'string') {
            candidates.push(value);
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(addCandidate);
            return;
        }

        if (typeof value === 'object') {
            const candidate = value.secure_url
                || value.url
                || value.src
                || value.path
                || value.href
                || value.preview;
            if (candidate) {
                candidates.push(candidate);
            }
        }
    };

    addCandidate(rawProduct.image);
    addCandidate(rawProduct.thumbnail);
    addCandidate(rawProduct.mainImage);
    addCandidate(rawProduct.cover);
    addCandidate(rawProduct.featuredImage);

    if (Array.isArray(rawProduct.images)) {
        rawProduct.images.forEach(addCandidate);
    }

    const resolved = candidates
        .map(candidate => resolveAssetUrl(candidate))
        .find(candidate => typeof candidate === 'string' && candidate.trim().length > 0);

    return resolved || PRODUCT_PLACEHOLDER_IMAGE;
}

function slugifyProduct(value = '') {
    return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || `product-${Date.now()}`;
}

function normalizeProduct(rawProduct = {}, index = 0) {
    if (!rawProduct || typeof rawProduct !== 'object') return null;

    const id = rawProduct._id || rawProduct.id || rawProduct.slug || `product-${index}`;
    const name = rawProduct.name || rawProduct.title || 'منتج بدون اسم';
    const title = rawProduct.name || rawProduct.title || name;
    const slug = rawProduct.slug || rawProduct.handle || slugifyProduct(title || name);
    const sku = rawProduct.sku || rawProduct.code || '';
    const priceSource = rawProduct.price?.current
        ?? rawProduct.price?.value
        ?? rawProduct.price?.amount
        ?? rawProduct.price
        ?? rawProduct.currentPrice
        ?? rawProduct.salePrice;
    const price = Number(priceSource) && Number(priceSource) > 0 ? Number(priceSource) : 0;

    const quantitySource = rawProduct.quantity
        ?? rawProduct.stock
        ?? rawProduct.availableQuantity
        ?? rawProduct.inventory
        ?? 0;
    const quantity = Number.isFinite(Number(quantitySource)) ? Number(quantitySource) : 0;

    const status = rawProduct.status || (quantity > 0 ? 'active' : 'inactive');

    const categoryField = rawProduct.category ?? rawProduct.mainCategory;
    let categoryId = 'uncategorized';
    let categorySlug = 'uncategorized';
    let categoryName = 'فئة غير محددة';

    if (typeof categoryField === 'string') {
        categoryId = categoryField;
        categorySlug = categoryField;
    } else if (categoryField && typeof categoryField === 'object') {
        categoryId = categoryField._id || categoryField.id || categoryField.slug || categoryId;
        categorySlug = categoryField.slug || categoryField._id || categorySlug;
        categoryName = categoryField.name || categoryField.title || categoryName;
    }

    const subCategoryField = rawProduct.subCategory || rawProduct.subcategory || rawProduct.subCategoryId;
    let subCategoryId = 'all';
    let subCategorySlug = 'all';
    let subCategoryName = '';

    if (typeof subCategoryField === 'string') {
        subCategoryId = subCategoryField;
        subCategorySlug = subCategoryField;
    } else if (subCategoryField && typeof subCategoryField === 'object') {
        subCategoryId = subCategoryField._id || subCategoryField.id || subCategoryField.slug || subCategoryId;
        subCategorySlug = subCategoryField.slug || subCategoryField._id || subCategorySlug;
        subCategoryName = subCategoryField.name || subCategoryField.title || subCategoryName;
    }

    const description = rawProduct.description || rawProduct.summary || rawProduct.shortDescription || '';
    const image = extractProductImage(rawProduct);
    const sold = rawProduct.sold ?? rawProduct.sales ?? 0;
    const rating = rawProduct.rating?.average ?? rawProduct.ratingAverage ?? rawProduct.averageRating ?? rawProduct.rating ?? 0;
    const colors = Array.isArray(rawProduct.colors)
        ? rawProduct.colors.map(color => String(color).trim()).filter(Boolean)
        : [];
    const brandId = rawProduct.brand?._id || rawProduct.brand?.id || '';
    const brandName = rawProduct.brand?.name || rawProduct.brand || '';

    return {
        id,
        name,
        title,
        slug,
        sku,
        price,
        stock: quantity,
        category: categoryId,
        categoryId,
        categorySlug,
        categoryName,
        subCategoryId,
        subCategorySlug,
        subCategoryName,
        status,
        image,
        images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
        description,
        brand: rawProduct.brand?.name || rawProduct.brand || '',
        brandId,
        brandName,
        colors,
        sold,
        rating,
        raw: rawProduct
    };
}

function syncProductExtras(products = []) {
    state.productExtras = products.reduce((acc, product) => {
        acc[product.id] = {
            image: product.image,
            description: product.description
        };
        return acc;
    }, {});
}

function upsertProductExtras(productId, extras = {}) {
    if (!productId) return;
    state.productExtras[productId] = {
        ...(state.productExtras[productId] || {}),
        ...extras
    };
}

function getProductsSource() {
    if (Array.isArray(state.products) && state.products.length) {
        return state.products;
    }
    return Array.isArray(mockData.products) ? mockData.products : [];
}

function slugify(value = '') {
    return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || `category-${Date.now()}`;
}

function normalizeCategory(rawCategory = {}, index = 0) {
    if (!rawCategory || typeof rawCategory !== 'object') return null;

    const id = rawCategory._id || rawCategory.id || rawCategory.slug || `category-${index}`;
    const name = rawCategory.name || rawCategory.title || 'فئة بدون اسم';
    const slug = rawCategory.slug || slugify(name);

    return {
        id,
        name,
        slug,
        image: extractCategoryImage(rawCategory),
        status: rawCategory.status || 'active',
        productsCount: rawCategory.productsCount
            ?? rawCategory.productsNumber
            ?? rawCategory.products?.length
            ?? rawCategory.count
            ?? 0,
        createdAt: rawCategory.createdAt,
        updatedAt: rawCategory.updatedAt,
        description: rawCategory.description || rawCategory.summary || rawCategory.details || ''
    };
}

function normalizeOrderId(orderId) {
    if (!orderId) return '';
    return String(orderId).trim().toUpperCase();
}

function getDefaultCategoryExtras() {
    return {
        image: '',
        description: ''
    };
}

function upsertCategoryExtras(categoryId, extras = {}) {
    if (!categoryId) return;

    const current = state.categoryExtras[categoryId] || getDefaultCategoryExtras();

    const next = {
        image: extras.image ?? current.image ?? '',
        description: extras.description ?? current.description ?? ''
    };

    state.categoryExtras[categoryId] = next;

    const index = state.categories.findIndex(category => category.id === categoryId);
    if (index !== -1) {
        const existing = state.categories[index];
        state.categories[index] = {
            ...existing,
            image: next.image,
            description: next.description || existing.description || ''
        };
    }

    syncCategoriesCache(state.categories);
}

function syncCategoryExtras(categories = []) {
    state.categoryExtras = categories.reduce((acc, category) => {
        const base = getDefaultCategoryExtras();
        acc[category.id] = {
            image: category.image ?? base.image,
            description: category.description ?? base.description
        };
        return acc;
    }, {});
}

function syncCategoriesCache(categories = []) {
    // لا نقوم باستبدال البيانات الوهمية عند جلب بيانات حقيقية من الـ API
}

function getCategorySource() {
    return state.categories.length > 0 ? state.categories : mockData.categories;
}

function getCategoryById(categoryId) {
    const source = getCategorySource();
    return source.find(category => category.id === categoryId);
}

// ===== API Functions =====
async function fetchCategories() {
    console.log('🔄 Fetching categories...');
    state.categoriesLoading = true;
    state.categoriesError = null;
    renderCategories();

    try {
        const response = await fetch(CATEGORY_ENDPOINT);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        console.log('📦 Raw API response:', payload);

        const documents = Array.isArray(payload?.data?.documents)
            ? payload.data.documents
            : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : [];

        console.log('📋 Extracted documents:', documents);

        const previousExtras = { ...state.categoryExtras };
        const normalized = documents
            .map((doc, index) => normalizeCategory(doc, index))
            .filter(Boolean)
            .map(category => {
                const extras = previousExtras[category.id];
                const image = category.image || extras?.image || '';
                const description = category.description || extras?.description || '';
                return {
                    ...category,
                    image,
                    description
                };
            });

        console.log('✅ Normalized categories:', normalized);

        state.categories = normalized;
        syncCategoriesCache(normalized);
        syncCategoryExtras(normalized);
        hydrateProductCategoryOptions();
    } catch (error) {
        console.error('❌ Failed to fetch categories:', error);
        state.categoriesError = 'تعذر تحميل الفئات. يرجى المحاولة مرة أخرى.';
    } finally {
        state.categoriesLoading = false;
        renderCategories();
    }
}

async function fetchProducts() {
    console.log('🔄 Fetching products...');
    state.productsLoading = true;
    state.productsError = null;
    renderProducts();

    try {
        const response = await fetch(PRODUCT_ENDPOINT);
        console.log('📡 Products response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        console.log('📦 Raw products response:', payload);

        const documents = Array.isArray(payload?.data?.products)
            ? payload.data.products
            : Array.isArray(payload?.data?.documents)
                ? payload.data.documents
                : Array.isArray(payload?.data)
                    ? payload.data
                    : Array.isArray(payload)
                        ? payload
                        : [];

        const previousExtras = { ...state.productExtras };
        const normalized = documents
            .map((product, index) => normalizeProduct(product, index))
            .filter(Boolean)
            .map(product => {
                const extras = previousExtras[product.id];
                return {
                    ...product,
                    image: extras?.image || product.image,
                    description: extras?.description || product.description
                };
            });

        console.log('✅ Normalized products:', normalized);

        state.products = normalized;
        syncProductExtras(normalized);
    } catch (error) {
        console.error('❌ Failed to fetch products:', error);
        state.productsError = error.message || 'تعذر تحميل المنتجات. يرجى المحاولة مرة أخرى.';
        state.products = [];
    } finally {
        state.productsLoading = false;
        hydrateFilters();
        renderProducts();
        renderTopProducts();
    }
}

function mergeProductWithExtras(product) {
    if (!product) return product;
    const extras = state.productExtras[product.id];
    if (!extras) return product;
    return {
        ...product,
        image: extras.image || product.image,
        description: extras.description || product.description
    };
}

function buildProductPayload(formData) {
    const name = getFormValue(formData, 'name');
    const title = getFormValue(formData, 'title');
    const normalizedTitle = title || name;
    const providedSlug = getFormValue(formData, 'slug');
    const slug = providedSlug || slugifyProduct(normalizedTitle);
    const description = getFormValue(formData, 'description');
    const price = getNumericValue(formData, 'price', 0);
    const stock = getNumericValue(formData, 'quantity', 0);
    const categoryId = getFormValue(formData, 'category');
    const subCategory = getFormValue(formData, 'subCategory');
    const status = getFormValue(formData, 'status', 'active');
    const brand = getFormValue(formData, 'brand');
    const colorsRaw = getFormValue(formData, 'colors');
    const colors = colorsRaw
        ? colorsRaw.split(',').map(color => color.trim()).filter(Boolean)
        : [];

    const payload = {
        name,
        title: normalizedTitle,
        slug,
        description,
        price,
        quantity: stock,
        status,
        category: categoryId || null,
        subCategory: subCategory || undefined,
        brand: brand || undefined,
        colors: colors.length ? colors : undefined
    };

    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
            delete payload[key];
        }
    });

    return payload;
}

function buildProductRequestOptions(payload = {}, imageFile = null) {
    const dataPayload = { ...payload };

    if (imageFile instanceof File) {
        const formData = new FormData();
        Object.entries(dataPayload).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                formData.append(key, value);
            }
        });
        formData.append('image', imageFile);

        console.log('📦 Product FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
        }

        return { body: formData, headers: null };
    }

    console.log('📦 Product JSON payload:', dataPayload);

    return {
        body: JSON.stringify(dataPayload),
        headers: { 'Content-Type': 'application/json' }
    };
}

async function createProduct(payload, imageFile = null) {
    console.log('➕ Creating product:', { payload, hasFile: !!imageFile });

    try {
        const { body, headers } = buildProductRequestOptions(payload, imageFile);

        const response = await fetch(PRODUCT_ENDPOINT, {
            method: 'POST',
            headers: headers || undefined,
            body
        });

        console.log('📡 Create product status:', response.status);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('❌ Create product error:', errorBody);
            const message = errorBody?.message || `HTTP ${response.status}`;
            throw new Error(message);
        }

        await fetchProducts();
        showToast('success', 'إضافة المنتج', 'تمت إضافة المنتج بنجاح');
        closeModal('addProductModal');
    } catch (error) {
        console.error('❌ Failed to create product:', error);
        showToast('error', 'إضافة المنتج', error.message || 'حدث خطأ غير متوقع');
    }
}

async function updateProduct(productId, payload, imageFile = null) {
    console.log('✏️ Updating product:', { productId, payload, hasFile: !!imageFile });

    if (!productId) return;

    try {
        const normalizedPayload = { ...payload };
        if (!imageFile) {
            delete normalizedPayload.image;
        }

        const { body, headers } = buildProductRequestOptions(normalizedPayload, imageFile);

        const response = await fetch(`${PRODUCT_ENDPOINT}/${encodeURIComponent(productId)}`, {
            method: 'PATCH',
            headers: headers || undefined,
            body
        });

        console.log('📡 Update product status:', response.status);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('❌ Update product error:', errorBody);
            const message = errorBody?.message || `HTTP ${response.status}`;
            throw new Error(message);
        }

        await fetchProducts();

        const updated = getProductById(productId);
        if (updated) {
            upsertProductExtras(productId, {
                image: updated.image,
                description: updated.description
            });
        }

        showToast('success', 'تحديث المنتج', 'تم تحديث المنتج بنجاح');
        closeModal('addProductModal');
    } catch (error) {
        console.error('❌ Failed to update product:', error);
        showToast('error', 'تحديث المنتج', error.message || 'حدث خطأ غير متوقع');
    }
}

async function deleteProduct(productId) {
    console.log('🗑️ Deleting product:', productId);

    if (!productId) return;

    try {
        const response = await fetch(`${PRODUCT_ENDPOINT}/${encodeURIComponent(productId)}`, {
            method: 'DELETE'
        });

        console.log('📡 Delete product status:', response.status);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('❌ Delete product error:', errorBody);
            const message = errorBody?.message || `HTTP ${response.status}`;
            throw new Error(message);
        }

        await fetchProducts();
        showToast('success', 'حذف المنتج', 'تم حذف المنتج بنجاح');
    } catch (error) {
        console.error('❌ Failed to delete product:', error);
        showToast('error', 'حذف المنتج', error.message || 'حدث خطأ غير متوقع');
    }
}

async function createCategory(payload, extras = {}, imageFile = null) {
    console.log('➕ Creating category:', { payload, extras, hasFile: !!imageFile });
    
    try {
        const { body, headers } = buildCategoryRequestOptions(payload, {
            description: extras.description
        }, imageFile);

        console.log('📤 Request body type:', body instanceof FormData ? 'FormData' : 'JSON');

        const response = await fetch(CATEGORY_ENDPOINT, {
            method: 'POST',
            headers: headers || undefined,
            body
        });

        console.log('📡 Create response status:', response.status);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('❌ Create error:', errorBody);
            const message = errorBody?.message || `HTTP ${response.status}`;
            throw new Error(message);
        }

        const responseData = await response.json();
        console.log('✅ Create response:', responseData);

        const newCategoryId = responseData?.data?._id || responseData?._id;
        
        await fetchCategories();

        if (newCategoryId) {
            const mergedExtras = {
                image: extras.image || '',
                description: extras.description || ''
            };
            upsertCategoryExtras(newCategoryId, mergedExtras);
        }

        renderCategories();
        showToast('success', 'إضافة الفئة', 'تمت إضافة الفئة بنجاح');
        closeModal('categoryModal');
    } catch (error) {
        console.error('❌ Failed to create category:', error);
        showToast('error', 'إضافة الفئة', error.message || 'حدث خطأ غير متوقع');
    }
}

async function updateCategory(categoryId, payload, extras = {}, imageFile = null) {
    console.log('✏️ Updating category:', { categoryId, payload, extras, hasFile: !!imageFile });
    
    if (!categoryId) return;
    
    try {
        const { body, headers } = buildCategoryRequestOptions(payload, {
            description: extras.description
        }, imageFile);

        console.log('📤 Update request body type:', body instanceof FormData ? 'FormData' : 'JSON');

        const response = await fetch(`${CATEGORY_ENDPOINT}/${encodeURIComponent(categoryId)}`, {
            method: 'PATCH',
            headers: headers || undefined,
            body
        });

        console.log('📡 Update response status:', response.status);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('❌ Update error:', errorBody);
            const message = errorBody?.message || `HTTP ${response.status}`;
            throw new Error(message);
        }

        const responseData = await response.json();
        console.log('✅ Update response:', responseData);

        await fetchCategories();
        
        const updatedCategory = state.categories.find(category => category.id === categoryId);
        const mergedExtras = {
            image: updatedCategory?.image || extras.image || '',
            description: extras.description || updatedCategory?.description || ''
        };
        upsertCategoryExtras(categoryId, mergedExtras);
        
        renderCategories();
        showToast('success', 'تحديث الفئة', 'تم تحديث الفئة بنجاح');
        closeModal('categoryModal');
    } catch (error) {
        console.error('❌ Failed to update category:', error);
        showToast('error', 'تحديث الفئة', error.message || 'حدث خطأ غير متوقع');
    }
}

async function deleteCategory(categoryId) {
    console.log('🗑️ Deleting category:', categoryId);
    
    if (!categoryId) return;
    
    try {
        const response = await fetch(`${CATEGORY_ENDPOINT}/${encodeURIComponent(categoryId)}`, {
            method: 'DELETE'
        });

        console.log('📡 Delete response status:', response.status);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('❌ Delete error:', errorBody);
            const message = errorBody?.message || `HTTP ${response.status}`;
            throw new Error(message);
        }

        console.log('✅ Category deleted successfully');

        await fetchCategories();
        showToast('success', 'حذف الفئة', 'تم حذف الفئة بنجاح');
    } catch (error) {
        console.error('❌ Failed to delete category:', error);
        showToast('error', 'حذف الفئة', error.message || 'حدث خطأ غير متوقع');
    }
}

function buildCategoryRequestOptions(payload, meta = {}, file = null) {
    const dataPayload = { ...payload };

    if (meta.description) {
        dataPayload.description = meta.description;
    }

    if (file instanceof File) {
        delete dataPayload.image;
        const formData = new FormData();
        Object.entries(dataPayload).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                formData.append(key, value);
            }
        });
        formData.append('image', file);
        
        console.log('📦 FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
        }
        
        return { body: formData, headers: null };
    }

    console.log('📦 JSON payload:', dataPayload);
    
    return {
        body: JSON.stringify(dataPayload),
        headers: { 'Content-Type': 'application/json' }
    };
}

// ===== Image Handling =====
function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

function updateCategoryImagePreview(image) {
    const preview = document.getElementById('categoryImagePreview');
    if (!preview) return;

    if (image) {
        preview.innerHTML = `<img src="${image}" alt="صورة الفئة">`;
        preview.classList.add('has-image');
    } else {
        preview.innerHTML = '<span class="image-preview__placeholder">لم يتم اختيار صورة</span>';
        preview.classList.remove('has-image');
    }
}

async function handleCategoryImageChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;

    const file = input.files?.[0];
    if (!file) {
        input.dataset.previewImage = '';
        updateCategoryImagePreview(input.dataset.originalImage || '');
        return;
    }

    console.log('🖼️ Selected image:', file.name, file.type, file.size);

    try {
        const dataUrl = await readFileAsDataUrl(file);
        input.dataset.previewImage = dataUrl;
        updateCategoryImagePreview(dataUrl);
        console.log('✅ Image preview updated');
    } catch (error) {
        console.error('❌ Failed to preview category image:', error);
        showToast('error', 'صورة الفئة', 'تعذر معاينة ملف الصورة المحدد');
    }
}

function updateProductImagePreview(image) {
    const preview = document.getElementById('productImagePreview');
    if (!preview) return;

    if (image) {
        preview.innerHTML = `<img src="${image}" alt="صورة المنتج">`;
        preview.classList.add('has-image');
    } else {
        preview.innerHTML = '<span class="image-preview__placeholder">لم يتم اختيار صورة</span>';
        preview.classList.remove('has-image');
    }
}

async function handleProductImageChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;

    const file = input.files?.[0];
    if (!file) {
        input.dataset.previewImage = '';
        updateProductImagePreview(input.dataset.originalImage || '');
        return;
    }

    console.log('🖼️ Selected product image:', file.name, file.type, file.size);

    try {
        const dataUrl = await readFileAsDataUrl(file);
        input.dataset.previewImage = dataUrl;
        updateProductImagePreview(dataUrl);
        console.log('✅ Product image preview updated');
    } catch (error) {
        console.error('❌ Failed to preview product image:', error);
        showToast('error', 'صورة المنتج', 'تعذر معاينة ملف الصورة المحدد');
    }
}

// ===== Form Handlers =====
async function handleCategoryFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    if (!form || form.dataset.entity !== 'category') return;

    console.log('📝 Submitting category form...');

    const formData = new FormData(form);
    const mode = form.dataset.mode || 'create';
    const id = formData.get('id');

    const name = getFormValue(formData, 'name');
    const slug = getFormValue(formData, 'slug') || slugify(name);
    const description = getFormValue(formData, 'description');
    const imageInput = form.querySelector('#categoryImage');
    const imageFile = imageInput?.files?.[0];

    console.log('📋 Form data:', { mode, id, name, slug, hasFile: !!imageFile });

    const existingCategory = id ? getCategoryById(id) : null;
    const existingExtras = existingCategory ? state.categoryExtras[existingCategory.id] : null;
    const existingImage = existingExtras?.image || existingCategory?.image || '';

    let image = imageInput?.dataset.previewImage || existingImage;

    if (imageFile) {
        try {
            image = await readFileAsDataUrl(imageFile);
            if (imageInput) {
                imageInput.dataset.previewImage = image;
            }
            console.log('✅ Image converted to base64');
        } catch (error) {
            console.error('❌ Failed to read category image:', error);
            showToast('error', 'صورة الفئة', 'تعذر قراءة ملف الصورة المحدد');
            return;
        }
    }

    if (!name) {
        showToast('error', 'حفظ الفئة', 'يرجى إدخال اسم الفئة');
        return;
    }

    if (!image && mode === 'create') {
        showToast('error', 'حفظ الفئة', 'يرجى اختيار صورة للفئة');
        return;
    }

    const payload = { name, slug };
    if (image) {
        payload.image = image;
    }
    
    const extras = {
        image: image || '',
        description: description || ''
    };

    if (mode === 'edit' && id) {
        await updateCategory(id, payload, extras, imageFile);
    } else {
        await createCategory(payload, extras, imageFile);
    }
}

// ===== Modal Population =====
function populateCategoryModal(categoryId) {
    const form = document.getElementById('categoryForm');
    if (!form) return;

    const category = categoryId ? getCategoryById(categoryId) : null;
    const extras = category ? state.categoryExtras[category.id] : null;

    console.log('📝 Populating category form:', { category, extras });

    setFieldValue(form, 'id', category?.id || '');
    setFieldValue(form, 'name', category?.name || '');
    setFieldValue(form, 'slug', category?.slug || '');
    const targetImage = extras?.image ?? category?.image ?? '';
    const imageInput = form.querySelector('#categoryImage');
    if (imageInput) {
        imageInput.value = '';
        imageInput.dataset.originalImage = targetImage;
        imageInput.dataset.previewImage = '';
        imageInput.required = !targetImage;
    }
    updateCategoryImagePreview(targetImage);
    setFieldValue(form, 'description', extras?.description || category?.description || '');

    form.querySelector('[type="submit"]').textContent = category ? 'حفظ التعديلات' : 'حفظ الفئة';
}

function populateProductModal(productId) {
    // ... (rest of the code remains the same)
    const form = document.getElementById('productForm');
    if (!form) return;

    const product = productId ? getProductById(productId) : null;

    hydrateProductCategoryOptions();

    const categories = state.categories;
    const fallbackCategoryId = categories[0]?.id || '';
    const resolvedCategoryId = product?.categoryId
        || (product?.categorySlug ? categories.find(cat => normalizeFilterValue(cat.slug) === normalizeFilterValue(product.categorySlug))?.id : '')
        || fallbackCategoryId;

    setFieldValue(form, 'id', product?.id || '');
    setFieldValue(form, 'name', product?.name || '');
    setFieldValue(form, 'title', product?.title || '');
    setFieldValue(form, 'slug', product?.slug || '');
    setFieldValue(form, 'price', product?.price ?? '');
    setFieldValue(form, 'quantity', product?.stock ?? product?.quantity ?? '');
    setFieldValue(form, 'category', resolvedCategoryId);
    setFieldValue(form, 'status', product?.status || 'active');
    setFieldValue(form, 'subCategory', product?.subCategoryId || product?.subCategorySlug || '');
    setFieldValue(form, 'brand', product?.brandId || product?.brandName || '');
    setFieldValue(form, 'colors', Array.isArray(product?.colors) ? product.colors.join(', ') : '');
    setFieldValue(form, 'description', product?.description || '');

    const imageInput = form.querySelector('#productImage');
    if (imageInput) {
        imageInput.value = '';
        imageInput.dataset.originalImage = product?.image || '';
        imageInput.dataset.previewImage = '';
    }
    updateProductImagePreview(product?.image || '');

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = product ? 'حفظ التعديلات' : 'حفظ المنتج';
    }
}

function populateOrderDetailsModal(orderId) {
    const modal = document.getElementById('orderDetailsModal');
    if (!modal) return;

    const normalized = normalizeOrderId(orderId);
    const order = getOrderById(normalized);
    const details = getOrderDetails(normalized);

    if (!details) {
        showToast('error', 'تفاصيل الطلب', 'لا توجد بيانات متاحة لهذا الطلب');
        return;
    }

    modal.dataset.orderId = normalized;

    const titleEl = modal.querySelector('[data-modal-title]');
    if (titleEl) {
        titleEl.textContent = `تفاصيل الطلب ${normalized}`;
    }

    const setText = (selector, value) => {
        const el = modal.querySelector(selector);
        if (el) el.textContent = value ?? '-';
    };

    setText('#orderCustomerName', details.customer?.name || order?.customer || '-');
    setText('#orderCustomerEmail', details.customer?.email || '-');
    setText('#orderCustomerPhone', details.customer?.phone || '-');
    setText('#orderShippingAddressLine', details.shipping?.line || '-');
    setText('#orderShippingAddressCity', details.shipping?.city || '-');
    setText('#orderShippingAddressCountry', details.shipping?.country || '-');

    const itemsBody = modal.querySelector('#orderItemsBody');
    if (itemsBody) {
        const items = details.items || [];
        itemsBody.innerHTML = items.length ? items.map(item => {
            const quantity = item.quantity ?? 1;
            const price = item.price ?? 0;
            const total = quantity * price;
            return `
                <tr>
                    <td>${item.name}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(price)}</td>
                    <td>${formatCurrency(total)}</td>
                </tr>
            `;
        }).join('') : '<tr><td colspan="4">لا توجد منتجات لهذا الطلب</td></tr>';
    }

    const summary = details.summary || {
        subtotal: order?.total || 0,
        shipping: 0,
        discount: 0,
        total: order?.total || 0
    };

    setText('#orderSubtotal', formatCurrency(summary.subtotal || 0));
    setText('#orderShipping', formatCurrency(summary.shipping || 0));
    setText('#orderDiscount', formatCurrency(summary.discount || 0));
    setText('#orderTotal', formatCurrency(summary.total || 0));

    const statusSelect = modal.querySelector('#orderStatusSelect');
    if (statusSelect) statusSelect.value = details.status || order?.status || 'processing';

    const notesField = modal.querySelector('#orderNotes');
    if (notesField) notesField.value = details.notes || '';

    const printBtn = modal.querySelector('[data-action="print-order"]');
    if (printBtn) printBtn.setAttribute('data-order-id', normalized);
}

function populatePaymentSettingsModal(paymentId) {
    const form = document.getElementById('paymentSettingsForm');
    if (!form) return;

    const method = getPaymentMethodById(paymentId);
    if (!method) {
        showToast('error', 'إعدادات الدفع', 'تعذر العثور على طريقة الدفع المطلوبة');
        return;
    }

    form.dataset.paymentId = method.id;
    setFieldValue(form, 'id', method.id);
    setFieldValue(form, 'name', method.name || '');
    setFieldValue(form, 'fee', method.fee || '');
    setFieldValue(form, 'note', method.note || '');

    const enabledField = form.elements['enabled'];
    if (enabledField) {
        enabledField.value = method.enabled ? 'true' : 'false';
    }
}

function populateCustomerProfile(customerId) {
    const container = document.getElementById('customerProfileContent');
    if (!container) return;

    const customer = getCustomerById(customerId);
    if (!customer) {
        container.innerHTML = '<p class="empty-state-text">لا توجد بيانات متاحة لهذا العميل حالياً.</p>';
        return;
    }

    container.innerHTML = `
        <div class="customer-profile">
            <div class="profile-row"><strong>الاسم:</strong> ${customer.name}</div>
            <div class="profile-row"><strong>البريد الإلكتروني:</strong> ${customer.email}</div>
            <div class="profile-row"><strong>التصنيف:</strong> ${getCustomerSegmentLabel(customer.segment)}</div>
            <div class="profile-row"><strong>الحالة:</strong> ${getStatusLabel(customer.status)}</div>
            <div class="profile-row"><strong>إجمالي الإنفاق:</strong> ${formatCurrency(customer.spend)}</div>
            <div class="profile-row"><strong>عدد الطلبات:</strong> ${customer.orders}</div>
            <div class="profile-row"><strong>آخر طلب:</strong> ${customer.lastOrder || '-'}</div>
        </div>
    `;
}

function populateCustomerOrders(customerId) {
    const container = document.getElementById('customerOrdersContent');
    if (!container) return;

    const customer = getCustomerById(customerId);
    if (!customer) {
        container.innerHTML = '<p class="empty-state-text">لا توجد بيانات متاحة لهذا العميل حالياً.</p>';
        return;
    }

    const relatedOrders = mockData.orders.filter(order => order.customer === customer.name);

    if (!relatedOrders.length) {
        container.innerHTML = '<p class="empty-state-text">لم يتم العثور على طلبات لهذا العميل.</p>';
        return;
    }

    const rows = relatedOrders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.date}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${order.payment}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>التاريخ</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>طريقة الدفع</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ===== Utility Functions =====
function formatCurrency(value) {
    return `${value.toLocaleString()} ريال`;
}

function formatNumber(value) {
    if (value === null || value === undefined) return '0';
    const number = Number(value);
    return Number.isNaN(number) ? String(value) : number.toLocaleString('ar-EG');
}

function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

function formatChange(value) {
    return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function normalizeFilterValue(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim().toLowerCase();
}

function setFieldValue(form, name, value) {
    if (!form) return;
    const field = form.elements[name];
    if (!field) return;
    field.value = value ?? '';
}

function getFormValue(formData, name, fallback = '') {
    if (!formData) return fallback;
    const value = formData.get(name);
    return value !== null ? value.trim() : fallback;
}

function getNumericValue(formData, name, fallback = 0) {
    const value = formData.get(name);
    if (value === null || value === '') return fallback;
    const number = Number(value);
    return Number.isNaN(number) ? fallback : number;
}

function getStatusLabel(status) {
    return STATUS_META[status]?.label || status;
}

function getStatusBadge(status) {
    const entry = STATUS_META[status] || { label: status, class: 'status-default' };
    return `<span class="status-badge ${entry.class}">${entry.label}</span>`;
}

function getRoleBadge(role) {
    const map = {
        admin: { label: 'مدير', class: 'role-admin' },
        editor: { label: 'محرر', class: 'role-editor' },
        support: { label: 'دعم', class: 'role-support' },
        viewer: { label: 'مشاهد', class: 'role-viewer' }
    };
    const entry = map[role] || { label: role, class: 'role-default' };
    return `<span class="role-badge ${entry.class}">${entry.label}</span>`;
}

function getCategoryLabel(slug) {
    const category = state.categories.find(cat => cat.slug === slug);
    if (category) {
        return category.name;
    }
    return slug;
}

function getCustomerSegmentLabel(segment) {
    const map = {
        vip: 'عميل مميز',
        loyal: 'عميل وفي',
        new: 'عميل جديد',
        churn: 'مهدد بالمغادرة'
    };
    return map[segment] || segment || '-';
}

function getPaymentLabel(method) {
    const map = {
        cash: 'الدفع عند الاستلام',
        card: 'بطاقة ائتمان',
        instapay: 'InstaPay',
        installment: 'التقسيط',
        bank: 'تحويل بنكي'
    };
    return map[method] || method || '-';
}

function getProductById(productId) {
    if (!productId) return null;
    return getProductsSource().find(product => String(product.id) === String(productId)) || null;
}

function getOrderById(orderId) {
    const normalized = normalizeOrderId(orderId);
    return mockData.orders.find(order => normalizeOrderId(order.id) === normalized) || null;
}

function getOrderDetails(orderId) {
    const normalized = normalizeOrderId(orderId);
    const details = mockData.orderDetails[normalized];
    if (details) return details;

    const order = getOrderById(normalized);
    if (!order) return null;

    const quantity = order.items && order.items > 0 ? order.items : 1;
    const unitPrice = quantity > 0 ? order.total / quantity : order.total;

    return {
        customer: { name: order.customer, email: '-', phone: '-' },
        shipping: { line: '-', city: '-', country: '-' },
        paymentMethod: order.payment,
        date: order.date,
        items: [{ name: 'تفاصيل المنتجات غير متاحة', quantity, price: unitPrice }],
        summary: {
            subtotal: unitPrice * quantity,
            shipping: 0,
            discount: 0,
            total: order.total
        },
        status: order.status,
        notes: ''
    };
}

function getCustomerById(customerId) {
    return mockData.customers.find(customer => customer.id === customerId);
}

function getPaymentMethodById(paymentId) {
    return mockData.payments.find(method => method.id === paymentId) || null;
}

function updatePaymentMethodCard(payment) {
    const card = document.querySelector(`.payment-method-card[data-payment-id="${payment.id}"]`);
    if (!card) return;

    const descriptionEl = card.querySelector('[data-payment-description]');
    if (descriptionEl) {
        const feeText = payment.fee ? `رسوم إضافية: ${payment.fee}` : 'لا توجد رسوم إضافية';
        descriptionEl.textContent = feeText;
    }

    let noteEl = card.querySelector('[data-payment-note]');
    if (payment.note) {
        if (!noteEl) {
            noteEl = document.createElement('p');
            noteEl.setAttribute('data-payment-note', 'true');
            noteEl.className = 'payment-note';
            if (descriptionEl) {
                descriptionEl.insertAdjacentElement('afterend', noteEl);
            } else {
                card.querySelector('.payment-method-details')?.appendChild(noteEl);
            }
        }
        noteEl.textContent = payment.note;
    } else if (noteEl) {
        noteEl.remove();
    }

    const toggle = card.querySelector('.toggle-switch input');
    if (toggle) {
        toggle.checked = !!payment.enabled;
    }
}

// ===== Filter Helpers =====
function filterBySearch(value, fields = []) {
    if (!value) return () => true;
    const needle = value.toLowerCase();
    return item => fields.some(field => String(item[field] || '').toLowerCase().includes(needle));
}

function applyFilters(dataset, filters = []) {
    return filters.reduce((acc, filterFn) => acc.filter(filterFn), dataset);
}

// ===== Print & Export Functions =====
function buildPrintItemsRows(items = []) {
    if (!items.length) {
        return '<tr><td colspan="4">لا توجد منتجات مضافة</td></tr>';
    }

    return items.map(item => {
        const quantity = item.quantity ?? 1;
        const price = item.price ?? 0;
        const total = quantity * price;
        return `
            <tr>
                <td>${item.name}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(price)}</td>
                <td>${formatCurrency(total)}</td>
            </tr>
        `;
    }).join('');
}

function printOrder(orderId) {
    const normalized = normalizeOrderId(orderId);
    const details = getOrderDetails(normalized);
    const order = getOrderById(normalized);

    if (!details) {
        showToast('error', 'طباعة الفاتورة', 'تعذر العثور على بيانات الطلب للطباعة');
        return;
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        showToast('error', 'طباعة الفاتورة', 'يبدو أن النوافذ المنبثقة محظورة');
        return;
    }

    const summary = details.summary || {
        subtotal: order?.total || 0,
        shipping: 0,
        discount: 0,
        total: order?.total || 0
    };

    win.document.write(`
        <!doctype html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="utf-8" />
            <title>فاتورة طلب ${normalized}</title>
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 24px; color: #2d3436; }
                h1 { margin-bottom: 8px; }
                .meta { margin-bottom: 20px; }
                .meta span { display: inline-block; min-width: 140px; }
                table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                th, td { border: 1px solid #dfe6e9; padding: 10px 12px; text-align: right; }
                th { background: #fafafa; }
                .summary { margin-top: 24px; width: 320px; }
                .summary div { display: flex; justify-content: space-between; padding: 6px 0; }
                .summary div.total { font-weight: 700; border-top: 1px solid #dfe6e9; margin-top: 6px; padding-top: 12px; }
            </style>
        </head>
        <body>
            <h1>فاتورة طلب ${normalized}</h1>
            <div class="meta">
                <p><span>العميل:</span> ${details.customer?.name || order?.customer || '-'}</p>
                <p><span>البريد:</span> ${details.customer?.email || '-'}</p>
                <p><span>الهاتف:</span> ${details.customer?.phone || '-'}</p>
                <p><span>تاريخ الطلب:</span> ${details.date || order?.date || '-'}</p>
                <p><span>طريقة الدفع:</span> ${details.paymentMethod || order?.payment || '-'}</p>
            </div>
            <h2>قائمة المنتجات</h2>
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${buildPrintItemsRows(details.items)}
                </tbody>
            </table>
            <div class="summary">
                <div><span>المجموع الفرعي:</span><span>${formatCurrency(summary.subtotal || 0)}</span></div>
                <div><span>الشحن:</span><span>${formatCurrency(summary.shipping || 0)}</span></div>
                <div><span>الخصم:</span><span>${formatCurrency(summary.discount || 0)}</span></div>
                <div class="total"><span>الإجمالي:</span><span>${formatCurrency(summary.total || 0)}</span></div>
            </div>
        </body>
        </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 100);

    showToast('success', 'طباعة الفاتورة', `تم إرسال طلب ${normalized} للطباعة`);
}

function buildReportTemplate(title, sections = [], options = {}) {
    const generatedAt = options.generatedAt || new Date().toLocaleString('ar-EG');
    const {
        footerNote = 'تم توليد هذا التقرير من لوحة التحكم التجريبية لـ Action Sports.',
        includePrintButton = true,
        extraStyles = ''
    } = options;

    const baseStyles = `
        body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; background: #f5f6fa; color: #2c3e50; margin: 0; }
        .container { max-width: 960px; margin: 0 auto; padding: 32px; background: #ffffff; }
        .report-header { text-align: center; margin-bottom: 32px; }
        .report-header h1 { margin-bottom: 8px; }
        .meta { color: #7f8c8d; margin: 0; }
        .section { margin-bottom: 32px; }
        .section h2 { margin-bottom: 16px; font-size: 1.4rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { border: 1px solid #ecf0f1; padding: 12px; text-align: right; }
        .data-table thead { background: #f9fafb; }
        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .chart-card { background: #f9fafb; border: 1px solid #ecf0f1; border-radius: 12px; padding: 16px; text-align: center; }
        .chart-card img { max-width: 100%; height: auto; margin-top: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .empty-state { color: #7f8c8d; margin: 0; }
        .report-footer { text-align: center; margin-top: 24px; }
        .report-footer button { background: #e74c3c; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; }
        .report-footer button:hover { background: #c44133; }
    `;

    const styles = `${baseStyles}${extraStyles}`;
    const buttonHtml = includePrintButton ? `<button onclick="window.print()">طباعة التقرير</button>` : '';

    const sectionsHtml = sections.map(section => `
        <section class="section">
            ${section.title ? `<h2>${section.title}</h2>` : ''}
            ${section.content || ''}
        </section>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
            <head>
                <meta charset="utf-8" />
                <title>${title}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="container">
                    <header class="report-header">
                        <h1>${title}</h1>
                        <p class="meta">تم الإنشاء بتاريخ ${generatedAt}</p>
                    </header>
                    ${sectionsHtml}
                    <footer class="report-footer">
                        ${buttonHtml}
                        <p class="meta">${footerNote}</p>
                    </footer>
                </div>
            </body>
        </html>
    `;
}

function openReportWindow(html) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
        return false;
    }

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    return true;
}

function exportOrders() {
    const orders = mockData.orders.slice();

    if (!orders.length) {
        showToast('info', 'تصدير الطلبات', 'لا توجد طلبات متاحة للتقرير حالياً.');
        return;
    }

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalItems = orders.reduce((sum, order) => sum + (order.items || 0), 0);

    const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {});

    const paymentCounts = orders.reduce((acc, order) => {
        acc[order.payment] = (acc[order.payment] || 0) + 1;
        return acc;
    }, {});

    const summaryContent = `
        <table class="data-table">
            <tbody>
                <tr><th>عدد الطلبات</th><td>${formatNumber(orders.length)}</td></tr>
                <tr><th>إجمالي الإيرادات</th><td>${formatCurrency(totalRevenue)}</td></tr>
                <tr><th>متوسط قيمة الطلب</th><td>${orders.length ? formatCurrency(totalRevenue / orders.length) : '0 ريال'}</td></tr>
                <tr><th>إجمالي عدد المنتجات</th><td>${formatNumber(totalItems)}</td></tr>
            </tbody>
        </table>
    `;

    const statusTable = Object.keys(statusCounts).length
        ? `
            <table class="data-table">
                <thead>
                    <tr><th>الحالة</th><th>عدد الطلبات</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(statusCounts).map(([status, count]) => `
                        <tr><td>${getStatusLabel(status)}</td><td>${formatNumber(count)}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `
        : '<p class="empty-state">لا تتوفر بيانات للحالات.</p>';

    const paymentTable = Object.keys(paymentCounts).length
        ? `
            <table class="data-table">
                <thead>
                    <tr><th>طريقة الدفع</th><th>عدد الطلبات</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(paymentCounts).map(([payment, count]) => `
                        <tr><td>${getPaymentLabel(payment)}</td><td>${formatNumber(count)}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `
        : '<p class="empty-state">لا تتوفر بيانات لطرق الدفع.</p>';

    const ordersRows = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>${formatNumber(order.items)}</td>
            <td>${getPaymentLabel(order.payment)}</td>
            <td>${getStatusLabel(order.status)}</td>
            <td>${order.date}</td>
        </tr>
    `).join('');

    const ordersTable = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>قيمة الطلب</th>
                    <th>عدد المنتجات</th>
                    <th>طريقة الدفع</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                </tr>
            </thead>
            <tbody>${ordersRows}</tbody>
        </table>
    `;

    const sections = [
        { title: 'ملخص سريع', content: summaryContent },
        {
            title: 'تفاصيل الحالة وطرق الدفع',
            content: `<div class="grid-2">${statusTable}${paymentTable}</div>`
        },
        { title: 'قائمة الطلبات', content: ordersTable }
    ];

    const reportHtml = buildReportTemplate('تقرير الطلبات', sections, {
        extraStyles: '.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }'
    });

    if (!openReportWindow(reportHtml)) {
        showToast('error', 'تصدير الطلبات', 'تعذر فتح التقرير. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.');
        return;
    }

    showToast('success', 'تصدير الطلبات', 'تم فتح تقرير الطلبات في نافذة جديدة. يمكنك طباعته أو حفظه كملف PDF.');
}

function exportCustomers() {
    const customers = mockData.customers.slice();

    if (!customers.length) {
        showToast('info', 'تصدير العملاء', 'لا توجد بيانات عملاء متاحة للتقرير حالياً.');
        return;
    }

    const totalOrders = customers.reduce((sum, customer) => sum + (customer.orders || 0), 0);
    const totalSpend = customers.reduce((sum, customer) => sum + (customer.spend || 0), 0);

    const statusCounts = customers.reduce((acc, customer) => {
        acc[customer.status] = (acc[customer.status] || 0) + 1;
        return acc;
    }, {});

    const segmentCounts = customers.reduce((acc, customer) => {
        acc[customer.segment] = (acc[customer.segment] || 0) + 1;
        return acc;
    }, {});

    const summaryContent = `
        <table class="data-table">
            <tbody>
                <tr><th>عدد العملاء</th><td>${formatNumber(customers.length)}</td></tr>
                <tr><th>إجمالي عدد الطلبات</th><td>${formatNumber(totalOrders)}</td></tr>
                <tr><th>إجمالي الإنفاق</th><td>${formatCurrency(totalSpend)}</td></tr>
                <tr><th>متوسط إنفاق العميل</th><td>${customers.length ? formatCurrency(totalSpend / customers.length) : '0 ريال'}</td></tr>
            </tbody>
        </table>
    `;

    const statusTable = Object.keys(statusCounts).length
        ? `
            <table class="data-table">
                <thead>
                    <tr><th>الحالة</th><th>عدد العملاء</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(statusCounts).map(([status, count]) => `
                        <tr><td>${getStatusLabel(status)}</td><td>${formatNumber(count)}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `
        : '<p class="empty-state">لا تتوفر بيانات للحالات.</p>';

    const segmentTable = Object.keys(segmentCounts).length
        ? `
            <table class="data-table">
                <thead>
                    <tr><th>التصنيف</th><th>عدد العملاء</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(segmentCounts).map(([segment, count]) => `
                        <tr><td>${getCustomerSegmentLabel(segment)}</td><td>${formatNumber(count)}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        `
        : '<p class="empty-state">لا تتوفر بيانات للتصنيفات.</p>';

    const customersRows = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${getCustomerSegmentLabel(customer.segment)}</td>
            <td>${formatNumber(customer.orders)}</td>
            <td>${formatCurrency(customer.spend)}</td>
            <td>${getStatusLabel(customer.status)}</td>
            <td>${customer.lastOrder || '-'}</td>
        </tr>
    `).join('');

    const customersTable = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>التصنيف</th>
                    <th>عدد الطلبات</th>
                    <th>إجمالي الإنفاق</th>
                    <th>الحالة</th>
                    <th>آخر طلب</th>
                </tr>
            </thead>
            <tbody>${customersRows}</tbody>
        </table>
    `;

    const sections = [
        { title: 'ملخص سريع', content: summaryContent },
        {
            title: 'الحالات والتصنيفات',
            content: `<div class="grid-2">${statusTable}${segmentTable}</div>`
        },
        { title: 'قائمة العملاء', content: customersTable }
    ];

    const reportHtml = buildReportTemplate('تقرير العملاء', sections, {
        extraStyles: '.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }'
    });

    if (!openReportWindow(reportHtml)) {
        showToast('error', 'تصدير العملاء', 'تعذر فتح التقرير. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.');
        return;
    }

    showToast('success', 'تصدير العملاء', 'تم فتح تقرير العملاء في نافذة جديدة. يمكنك طباعته أو حفظه كملف PDF.');
}

function exportAuditLogs() {
    const logs = mockData.auditLogs.slice();

    if (!logs.length) {
        showToast('info', 'تصدير سجل النشاط', 'لا توجد سجلات نشاط متاحة حالياً.');
        return;
    }

    const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
    }, {});

    const uniqueUsers = new Set(logs.map(log => log.user)).size;
    const latestLog = logs[0];

    const summaryContent = `
        <table class="data-table">
            <tbody>
                <tr><th>إجمالي السجلات</th><td>${formatNumber(logs.length)}</td></tr>
                <tr><th>عدد المستخدمين</th><td>${formatNumber(uniqueUsers)}</td></tr>
                <tr><th>أحدث حدث</th><td>${latestLog?.createdAt || '-'}</td></tr>
            </tbody>
        </table>
    `;

    const actionTable = `
        <table class="data-table">
            <thead>
                <tr><th>نوع الإجراء</th><th>عدد المرات</th></tr>
            </thead>
            <tbody>
                ${Object.entries(actionCounts).map(([action, count]) => `
                    <tr><td>${getStatusLabel(action)}</td><td>${formatNumber(count)}</td></tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const logsRows = logs.map(log => `
        <tr>
            <td>${log.createdAt}</td>
            <td>${log.user}</td>
            <td>${getStatusLabel(log.action)}</td>
            <td>${log.message}</td>
            <td>${log.ip}</td>
        </tr>
    `).join('');

    const logsTable = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>التاريخ والوقت</th>
                    <th>المستخدم</th>
                    <th>الإجراء</th>
                    <th>الوصف</th>
                    <th>عنوان IP</th>
                </tr>
            </thead>
            <tbody>${logsRows}</tbody>
        </table>
    `;

    const sections = [
        { title: 'ملخص سريع', content: summaryContent },
        { title: 'توزيع الإجراءات', content: actionTable },
        { title: 'السجل التفصيلي', content: logsTable }
    ];

    const reportHtml = buildReportTemplate('تقرير سجل النشاط', sections);

    if (!openReportWindow(reportHtml)) {
        showToast('error', 'تصدير سجل النشاط', 'تعذر فتح التقرير. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.');
        return;
    }

    showToast('success', 'تصدير سجل النشاط', 'تم فتح تقرير السجل في نافذة جديدة. يمكنك طباعته أو حفظه كملف PDF.');
}

async function exportAnalyticsReport() {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    if (!chartsLoaded.overview) {
        loadOverviewCharts();
        chartsLoaded.overview = true;
    }

    if (!chartsLoaded.analytics) {
        loadAnalyticsCharts();
        chartsLoaded.analytics = true;
    }

    await wait(200);

    const chartDefinitions = [
        { scope: 'overview', key: 'sales', title: 'المبيعات الشهرية', description: 'أداء المبيعات خلال آخر ستة أشهر.' },
        { scope: 'overview', key: 'products', title: 'توزيع أفضل المنتجات', description: 'نسبة المبيعات حسب نوع المنتج.' },
        { scope: 'analytics', key: 'revenue', title: 'الإيرادات مقابل التكاليف', description: 'مقارنة شهرية بين الإيرادات والتكاليف.' },
        { scope: 'analytics', key: 'traffic', title: 'مصادر الزيارات', description: 'توزيع مصادر زيارات المتجر خلال الفترة المحددة.' },
        { scope: 'analytics', key: 'performance', title: 'رادار الأداء العام', description: 'قياس مؤشرات الأداء الرئيسية الحالية.' }
    ];

    const chartCards = chartDefinitions.map(def => {
        const chart = chartInstances[def.scope]?.[def.key];
        if (!chart || !chart.canvas) {
            return '';
        }

        let dataUrl = '';
        try {
            dataUrl = chart.canvas.toDataURL('image/png');
        } catch (error) {
            console.warn('Failed to export chart image', error);
        }

        if (!dataUrl) {
            return '';
        }

        return `
            <div class="chart-card">
                <h3>${def.title}</h3>
                <p>${def.description}</p>
                <img src="${dataUrl}" alt="${def.title}" />
            </div>
        `;
    }).filter(Boolean).join('');

    const metrics = mockData.overviewMetrics;
    const topProducts = mockData.products
        .slice()
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

    const topCustomers = mockData.customers
        .slice()
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5);

    const metricsRows = `
        <tr><th>إجمالي الإيرادات</th><td>${formatCurrency(metrics.revenue)}</td></tr>
        <tr><th>متوسط قيمة الطلب</th><td>${formatCurrency(metrics.avgOrder)}</td></tr>
        <tr><th>معدل التحويل</th><td>${formatPercent(metrics.conversionRate)}</td></tr>
        <tr><th>معدل الإرجاع</th><td>${formatPercent(metrics.returnRate)}</td></tr>
        <tr><th>التغير الأسبوعي في الإيرادات</th><td>${formatChange(metrics.weeklyChange.revenue)}</td></tr>
        <tr><th>التغير الأسبوعي في متوسط الطلب</th><td>${formatChange(metrics.weeklyChange.avgOrder)}</td></tr>
        <tr><th>التغير الأسبوعي في معدل التحويل</th><td>${formatChange(metrics.weeklyChange.conversionRate)}</td></tr>
        <tr><th>التغير الأسبوعي في معدل الإرجاع</th><td>${formatChange(metrics.weeklyChange.returnRate)}</td></tr>
    `;

    const topProductsRows = topProducts.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${formatNumber(product.sales)}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${formatCurrency(product.sales * product.price)}</td>
        </tr>
    `).join('');

    const topCustomersRows = topCustomers.map((customer, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${customer.name}</td>
            <td>${formatNumber(customer.orders)}</td>
            <td>${formatCurrency(customer.spend)}</td>
            <td>${customer.lastOrder || '-'}</td>
        </tr>
    `).join('');

    const chartsMarkup = chartCards || '<p class="empty-state">لا تتوفر رسوم بيانية حالياً.</p>';
    const productsMarkup = topProductsRows
        ? `<table class="data-table"><thead><tr><th>#</th><th>المنتج</th><th>عدد المبيعات</th><th>سعر الوحدة</th><th>إجمالي الإيراد</th></tr></thead><tbody>${topProductsRows}</tbody></table>`
        : '<p class="empty-state">لا توجد بيانات منتجات للعرض.</p>';
    const customersMarkup = topCustomersRows
        ? `<table class="data-table"><thead><tr><th>#</th><th>العميل</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>آخر طلب</th></tr></thead><tbody>${topCustomersRows}</tbody></table>`
        : '<p class="empty-state">لا توجد بيانات عملاء للعرض.</p>';

    const sections = [
        {
            title: 'المؤشرات الرئيسية',
            content: `<table class="data-table"><tbody>${metricsRows}</tbody></table>`
        },
        {
            title: 'الرسوم البيانية',
            content: `<div class="charts-grid">${chartsMarkup}</div>`
        },
        {
            title: 'أفضل المنتجات أداءً',
            content: productsMarkup
        },
        {
            title: 'أعلى العملاء إنفاقاً',
            content: customersMarkup
        }
    ];

    const reportHtml = buildReportTemplate('تقرير التحليلات', sections);

    if (!openReportWindow(reportHtml)) {
        showToast('error', 'تصدير التقرير', 'فشل فتح نافذة جديدة. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.');
        return;
    }

    showToast('success', 'تصدير التقرير', 'تم فتح التقرير في نافذة جديدة للطباعة أو الحفظ.');
}

// ===== Rendering Functions =====
function renderOverview() {
    const body = document.getElementById('overviewOrdersBody');
    if (!body) return;
    body.innerHTML = mockData.overviewOrders.map(order => `
        <tr data-id="${order.id}">
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${order.date}</td>
            <td>
                <button class="action-btn view-order" data-order-id="${order.id}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                <button class="action-btn print-order" data-order-id="${order.id}" title="طباعة الفاتورة"><i class="fas fa-print"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (state.productsLoading) {
        grid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل المنتجات...</p>
            </div>
        `;
        return;
    }

    if (state.productsError) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>حدث خطأ أثناء تحميل المنتجات</h3>
                <p>${state.productsError}</p>
                <button class="btn-primary" data-action="refresh-products">إعادة المحاولة</button>
            </div>
        `;
        return;
    }

    const source = getProductsSource();

    if (!source.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>لا توجد منتجات حالياً</h3>
                <p>استخدم زر "إضافة منتج جديد" لإنشاء أول منتج.</p>
            </div>
        `;
        return;
    }

    const filterFns = [
        filterBySearch(state.filters.productSearch, ['name', 'sku']),
        state.filters.productCategory !== 'all' ? item => normalizeFilterValue(item.categoryId || item.categorySlug) === normalizeFilterValue(state.filters.productCategory) : () => true,
        state.filters.productStatus !== 'all' ? item => item.status === state.filters.productStatus : () => true
    ];

    const filtered = applyFilters(source, filterFns);
    if (!filtered.length) {
        grid.innerHTML = `<div class="empty-state">
            <i class="fas fa-box-open"></i>
            <h3>لا توجد منتجات مطابقة</h3>
            <p>حاول تعديل البحث أو الفلاتر</p>
        </div>`;
        return;
    }

    grid.innerHTML = filtered.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-thumb">
                <img src="${product.image || PRODUCT_PLACEHOLDER_IMAGE}" alt="${product.name}">
                <div class="product-status">${getStatusBadge(product.status)}</div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-category">${product.categoryName || getCategoryLabel(product.categorySlug)}</p>
                <div class="product-meta">
                    <span class="meta-item"><i class="fas fa-coins"></i> ${formatCurrency(product.price)}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-secondary" title="تعديل المنتج" data-open-modal="addProductModal" data-modal-mode="edit" data-entity="product" data-entity-id="${product.id}"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn-danger" title="حذف المنتج" data-action="delete-product" data-entity-id="${product.id}"><i class="fas fa-trash"></i> حذف</button>
                <button class="btn-secondary" title="عرض التفاصيل" data-action="preview-product" data-entity-id="${product.id}"><i class="fas fa-eye"></i></button>
            </div>
        </div>
    `).join('');
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;

    if (state.categoriesLoading) {
        list.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل الفئات...</p>
            </div>
        `;
        return;
    }

    if (state.categoriesError) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>حدث خطأ أثناء تحميل الفئات</h3>
                <p>${state.categoriesError}</p>
                <button class="btn-primary" data-action="refresh-categories">إعادة المحاولة</button>
            </div>
        `;
        return;
    }

    const categories = getCategorySource();

    if (!categories.length) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>لا توجد فئات حالياً</h3>
                <p>استخدم زر "إضافة فئة جديدة" لإنشاء أول فئة.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = categories.map(category => `
        <div class="category-card" data-id="${category.id}">
            <div class="category-icon ${category.image ? 'has-image' : ''}">
                ${category.image ? `<img src="${category.image}" alt="${escapeHtml(category.name)}">` : '<i class="fas fa-tag"></i>'}
            </div>
            <div class="category-info">
                <h3>${escapeHtml(category.name)}</h3>
                <p class="category-description">${escapeHtml(category.description || 'لا يوجد وصف متاح لهذه الفئة حالياً.')}</p>
                <div class="category-meta">
                    <span class="meta-item"><i class="fas fa-box"></i> ${formatNumber(category.productsCount)} منتج</span>
                    ${getStatusBadge(category.status)}
                </div>
            </div>
            <div class="category-actions">
                <button class="btn-danger btn-sm" data-action="delete-category" data-entity-id="${category.id}" title="حذف"><i class="fas fa-trash"></i></button>
                <button class="btn-secondary btn-sm" data-open-modal="categoryModal" data-modal-mode="edit" data-entity="category" data-entity-id="${category.id}" title="تعديل"><i class="fas fa-edit"></i> تعديل</button>
            </div>
        </div>
    `).join('');
}

function renderCollections() {
    const grid = document.getElementById('collectionsGrid');
    if (!grid) return;

    grid.innerHTML = mockData.collections.map(collection => `
        <div class="collection-card" data-id="${collection.id}">
            <div class="collection-cover">
                <img src="${collection.image}" alt="${collection.name}">
                ${getStatusBadge(collection.status)}
            </div>
            <div class="collection-info">
                <h3>${collection.name}</h3>
                <p>${collection.products} منتج • ${collection.schedule}</p>
            </div>
            <div class="collection-actions">
                <button class="btn-secondary" data-open-modal="collectionModal" data-modal-mode="edit" data-entity="collection" data-entity-id="${collection.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-secondary" data-action="view-collection" data-entity="collection" data-entity-id="${collection.id}"><i class="fas fa-eye"></i></button>
            </div>
        </div>
    `).join('');
}

function renderPromotions() {
    const grid = document.getElementById('promotionsGrid');
    if (!grid) return;

    grid.innerHTML = mockData.promotions.map(promotion => `
        <div class="promotion-card" data-id="${promotion.id}">
            <div class="promotion-header">
                <h3>${promotion.title}</h3>
                ${getStatusBadge(promotion.status)}
            </div>
            <div class="promotion-details">
                <p><strong>النوع:</strong> ${promotion.type}</p>
                <p><strong>القيمة:</strong> ${promotion.value}</p>
                <p><strong>الفترة:</strong> ${promotion.period}</p>
            </div>
            <div class="promotion-actions">
                <button class="btn-secondary btn-sm" data-open-modal="promotionModal" data-modal-mode="edit" data-entity="promotion" data-entity-id="${promotion.id}"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn-danger btn-sm" data-action="pause" data-entity="promotion" data-entity-id="${promotion.id}"><i class="fas fa-pause"></i> إيقاف</button>
            </div>
        </div>
    `).join('');
}

function renderCoupons() {
    const body = document.getElementById('couponsTableBody');
    if (!body) return;

    body.innerHTML = mockData.coupons.map(coupon => `
        <tr data-id="${coupon.id}">
            <td><code>${coupon.code}</code></td>
            <td>${coupon.type}</td>
            <td>${coupon.type === 'amount' ? coupon.value + ' ريال' : coupon.type === 'percentage' ? coupon.value + '%' : 'شحن مجاني'}</td>
            <td>${coupon.minSpend ? formatCurrency(coupon.minSpend) : 'لا يوجد'}</td>
            <td>${coupon.used} / ${coupon.limit}</td>
            <td>${getStatusBadge(coupon.status)}</td>
            <td>${coupon.expiry}</td>
            <td>
                <button class="action-btn" data-open-modal="couponModal" data-modal-mode="edit" data-entity="coupon" data-entity-id="${coupon.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn" data-action="delete" data-entity="coupon" data-entity-id="${coupon.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderBanners() {
    const grid = document.getElementById('bannersGrid');
    if (!grid) return;

    grid.innerHTML = mockData.banners.map(banner => `
        <div class="banner-card" data-id="${banner.id}">
            <div class="banner-preview">
                <img src="${banner.image}" alt="${banner.title}">
            </div>
            <div class="banner-info">
                <h3>${banner.title}</h3>
                <p>${banner.placement}</p>
                <div class="banner-actions">
                    <button class="btn-secondary btn-sm" data-open-modal="bannerModal" data-modal-mode="edit" data-entity="banner" data-entity-id="${banner.id}"><i class="fas fa-edit"></i> تعديل</button>
                    <button class="btn-danger btn-sm" data-action="delete" data-entity="banner" data-entity-id="${banner.id}"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPages() {
    const list = document.getElementById('pagesList');
    if (!list) return;

    list.innerHTML = mockData.pages.map(page => `
        <div class="page-item" data-id="${page.id}">
            <i class="fas fa-file-alt"></i>
            <div class="page-info">
                <h3>${page.title}</h3>
                <p>آخر تحديث: ${page.updatedAt}</p>
            </div>
            <button class="btn-secondary btn-sm" data-action="edit-page" data-entity="page" data-entity-id="${page.id}"><i class="fas fa-edit"></i> تعديل</button>
        </div>
    `).join('');
}

function renderFeatures() {
    const grid = document.getElementById('featuresGrid');
    if (!grid) return;

    grid.innerHTML = mockData.features.map(feature => `
        <div class="feature-card" data-id="${feature.id}">
            <i class="${feature.icon}"></i>
            <h3>${feature.title}</h3>
            <p>${feature.description}</p>
            <div class="feature-actions">
                <button class="btn-secondary btn-sm" data-open-modal="featureModal" data-modal-mode="edit" data-entity="feature" data-entity-id="${feature.id}"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn-danger btn-sm" data-action="delete" data-entity="feature" data-entity-id="${feature.id}"><i class="fas fa-trash"></i> حذف</button>
            </div>
        </div>
    `).join('');
}

function renderOrders() {
    const body = document.getElementById('ordersTableBody');
    if (!body) return;

    const filterFns = [
        filterBySearch(state.filters.orderSearch, ['id', 'customer']),
        state.filters.orderStatus !== 'all' ? item => item.status === state.filters.orderStatus : () => true,
        state.filters.orderDate ? item => item.date === state.filters.orderDate : () => true
    ];

    const filtered = applyFilters(mockData.orders, filterFns);
    body.innerHTML = filtered.map(order => `
        <tr data-id="${order.id}">
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.items}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>${order.payment}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${order.date}</td>
            <td>
                <button class="action-btn view-order" data-order-id="${order.id}" data-entity="order" data-entity-id="${order.id}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                <button class="action-btn print-order" data-order-id="${order.id}" title="طباعة الفاتورة"><i class="fas fa-print"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderCustomers() {
    const body = document.getElementById('customersTableBody');
    if (!body) return;

    const filterFns = [
        filterBySearch(state.filters.customerSearch, ['name', 'email']),
        state.filters.customerSegment !== 'all' ? item => item.segment === state.filters.customerSegment : () => true
    ];

    const filtered = applyFilters(mockData.customers, filterFns);
    body.innerHTML = filtered.map(customer => `
        <tr data-id="${customer.id}">
            <td>${customer.name} ${getStatusBadge(customer.status)}</td>
            <td>${customer.email}</td>
            <td>${getCustomerSegmentLabel(customer.segment)}</td>
            <td>${customer.orders}</td>
            <td>${formatCurrency(customer.spend)}</td>
            <td>${customer.lastOrder}</td>
            <td>
                <button class="action-btn" title="عرض الملف" data-open-modal="customerProfileModal" data-customer-id="${customer.id}"><i class="fas fa-user"></i></button>
                <button class="action-btn" title="عرض الطلبات" data-open-modal="customerOrdersModal" data-customer-id="${customer.id}"><i class="fas fa-shopping-cart"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderTopProducts() {
    const body = document.getElementById('topProductsTableBody');
    if (!body) return;

    const topProducts = mockData.products
        .slice()
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

    body.innerHTML = topProducts.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.sales}</td>
            <td>${formatCurrency(product.sales * product.price)}</td>
            <td>${formatCurrency(product.sales * (product.price * 0.25))}</td>
        </tr>
    `).join('');
}

function renderAnalyticsFilters() {
    const select = document.getElementById('analyticsRangeFilter');
    if (!select) return;

    select.innerHTML = mockData.analyticsRangeOptions.map(option => `
        <option value="${option.value}" ${state.filters.analyticsRange === option.value ? 'selected' : ''}>${option.label}</option>
    `).join('');
}

function renderAuditLogs() {
    const body = document.getElementById('auditLogTableBody');
    if (!body) return;

    const actionFilter = state.filters.auditAction !== 'all'
        ? item => item.action === state.filters.auditAction
        : () => true;

    const dateFilter = state.filters.auditDate
        ? item => item.createdAt.startsWith(state.filters.auditDate)
        : () => true;

    const searchFilter = filterBySearch(state.filters.auditSearch, ['user', 'message']);

    const filtered = applyFilters(mockData.auditLogs, [actionFilter, dateFilter, searchFilter]);

    body.innerHTML = filtered.map(log => `
        <tr data-id="${log.id}">
            <td>${log.createdAt}</td>
            <td>${log.user}</td>
            <td>${getStatusBadge(log.action)}</td>
            <td>${log.message}</td>
            <td>${log.ip}</td>
        </tr>
    `).join('');
}

function renderUsers() {
    const body = document.getElementById('usersTableBody');
    if (!body) return;

    body.innerHTML = mockData.users.map(user => `
        <tr data-id="${user.id}">
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user.status)}</td>
            <td>${user.lastActive}</td>
            <td>
                <button class="action-btn" data-open-modal="userModal" data-modal-mode="edit" data-entity="user" data-entity-id="${user.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn" data-action="permissions" data-entity="user" data-entity-id="${user.id}"><i class="fas fa-key"></i></button>
            </td>
        </tr>
    `).join('');
}

function hydrateProductCategoryOptions() {
    const select = document.getElementById('productCategory');
    if (!select) return;

    const categories = state.categories;
    const existingValue = select.value;

    if (!categories.length) {
        select.innerHTML = '<option value="">لا توجد فئات متاحة حالياً</option>';
        select.value = '';
        return;
    }

    select.innerHTML = categories.map(category => `
        <option value="${category.id}">${category.name}</option>
    `).join('');

    if (existingValue && categories.some(cat => cat.id === existingValue)) {
        select.value = existingValue;
    } else {
        select.value = categories[0].id;
    }
}

function hydrateFilters() {
    const productCategoryFilter = document.getElementById('productCategoryFilter');
    if (productCategoryFilter) {
        const products = getProductsSource();
        const categorySet = new Map();
        products.forEach(product => {
            const key = product.categoryId || product.categorySlug;
            if (!key) return;
            if (!categorySet.has(key)) {
                categorySet.set(key, {
                    value: key,
                    label: product.categoryName || getCategoryLabel(key)
                });
            }
        });

        const categoryOptions = [
            { value: 'all', label: 'كل الفئات' },
            ...Array.from(categorySet.values())
        ];

        productCategoryFilter.innerHTML = categoryOptions.map(option => `
            <option value="${option.value}">${option.label}</option>
        `).join('');

        const hasSelectedCategory = categoryOptions.some(option => option.value === state.filters.productCategory);
        productCategoryFilter.value = hasSelectedCategory ? state.filters.productCategory : 'all';
        state.filters.productCategory = productCategoryFilter.value;
    }

    const productStatusFilter = document.getElementById('productStatusFilter');
    if (productStatusFilter) {
        const statuses = [
            { value: 'all', label: 'كل الحالات' },
            { value: 'active', label: 'نشط' },
            { value: 'inactive', label: 'غير نشط' },
            { value: 'low_stock', label: 'مخزون منخفض' }
        ];

        productStatusFilter.innerHTML = statuses.map(status => `
            <option value="${status.value}">${status.label}</option>
        `).join('');

        const hasSelectedStatus = statuses.some(status => status.value === state.filters.productStatus);
        productStatusFilter.value = hasSelectedStatus ? state.filters.productStatus : 'all';
        state.filters.productStatus = productStatusFilter.value;
    }

    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.innerHTML = `
            <option value="all">كل الحالات</option>
            <option value="new">جديد</option>
            <option value="processing">قيد المعالجة</option>
            <option value="shipped">تم الشحن</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
        `;
    }

    const customerSegmentFilter = document.getElementById('customerSegmentFilter');
    if (customerSegmentFilter) {
        const segments = [...new Set(mockData.customers.map(c => c.segment))];
        customerSegmentFilter.innerHTML = `
            <option value="all">كل الشرائح</option>
            ${segments.map(segment => `<option value="${segment}">${getCustomerSegmentLabel(segment)
                }</option>`).join('')}
        `;
    }

    const auditActionFilter = document.getElementById('auditActionFilter');
    if (auditActionFilter) {
        auditActionFilter.innerHTML = `
            <option value="all">كل الإجراءات</option>
            <option value="create">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
            <option value="login">تسجيل الدخول</option>
        `;
    }
}

function setupProductFilters() {
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.value = state.filters.productSearch;
        productSearchInput.addEventListener('input', event => {
            state.filters.productSearch = event.target.value;
            renderProducts();
        });
    }

    const productCategoryFilter = document.getElementById('productCategoryFilter');
    if (productCategoryFilter) {
        productCategoryFilter.addEventListener('change', event => {
            state.filters.productCategory = event.target.value;
            renderProducts();
        });
    }

    const productStatusFilter = document.getElementById('productStatusFilter');
    if (productStatusFilter) {
        productStatusFilter.addEventListener('change', event => {
            state.filters.productStatus = event.target.value;
            renderProducts();
        });
    }
}

function renderDashboard() {
    renderOverview();
    renderProducts();
    renderCategories();
    renderCollections();
    renderPromotions();
    renderCoupons();
    renderBanners();
    renderPages();
    renderFeatures();
    renderOrders();
    renderCustomers();
    renderTopProducts();
    renderAnalyticsFilters();
    renderAuditLogs();
    renderUsers();
}

// ===== Theme Toggle =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    updateThemeIcon();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    updateThemeIcon();
    showToast('success', 'تم تغيير الوضع', `تم التبديل إلى الوضع ${theme === 'dark' ? 'الداكن' : 'الفاتح'}`);
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            if (document.body.classList.contains('dark-mode')) {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
    }
}

// ===== Navigation =====
// تفعيل القسم المطلوب في التنقل الجانبي وإعداد الرسوم البيانية عند الحاجة
function switchSection(targetSection) {
    console.log('🔀 Switching to section:', targetSection);
    
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => item.classList.remove('active'));
    contentSections.forEach(section => section.classList.remove('active'));

    const clickedNav = document.querySelector(`[data-section="${targetSection}"]`);
    if (clickedNav) {
        clickedNav.classList.add('active');
    }

    const targetSectionEl = document.getElementById(targetSection);
    if (targetSectionEl) {
        targetSectionEl.classList.add('active');

        // تحميل الرسوم البيانية بشكل lazy عند الحاجة
        if (targetSection === 'overview' && !chartsLoaded.overview) {
            setTimeout(() => {
                loadOverviewCharts();
                chartsLoaded.overview = true;
            }, 100);
        } else if (targetSection === 'analytics' && !chartsLoaded.analytics) {
            setTimeout(() => {
                loadAnalyticsCharts();
                chartsLoaded.analytics = true;
            }, 100);
        }
    }

    saveCurrentSection(targetSection);
}

// ===== Modals =====
function openModal(modalId, mode = 'create', entity = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');

    const form = modal.querySelector('form');
    if (form) {
        form.dataset.mode = mode;
        form.reset();
    }

    if (entity) {
        populateModal(modalId, entity, mode);
    }

    const title = modal.querySelector('[data-modal-title]');
    if (title) {
        const editTitle = title.getAttribute('data-modal-edit-title');
        title.textContent = mode === 'edit' && editTitle ? editTitle : title.textContent;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
}

// ===== Toast Notifications =====
function showToast(type, title, message) {
    console.log(`🔔 Toast [${type}]:`, title, '-', message);
    
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${iconMap[type]}"></i>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100px)';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ===== Charts =====
function createChartInstance(scope, key, canvas, config) {
    if (!canvas) return null;
    const store = chartInstances[scope];
    if (store && store[key]) {
        store[key].destroy();
    }
    const chart = new Chart(canvas, config);
    if (store) {
        store[key] = chart;
    }
    return chart;
}

function loadOverviewCharts() {
    console.log('📊 Loading overview charts...');
    
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        createChartInstance('overview', 'sales', salesCtx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'المبيعات',
                    data: [65000, 78000, 85000, 92000, 105000, 125000],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ريال';
                            }
                        }
                    }
                }
            }
        });
    }

    const productsCtx = document.getElementById('productsChart');
    if (productsCtx) {
        createChartInstance('overview', 'products', productsCtx, {
            type: 'doughnut',
            data: {
                labels: ['أجهزة كارديو', 'أوزان حرة', 'ملابس رياضية', 'مكملات غذائية'],
                datasets: [{
                    data: [35, 25, 25, 15],
                    backgroundColor: [
                        '#e74c3c',
                        '#3498db',
                        '#2ecc71',
                        '#f1c40f'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function loadAnalyticsCharts() {
    console.log('📊 Loading analytics charts...');
    
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        createChartInstance('analytics', 'revenue', revenueCtx, {
            type: 'bar',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس'],
                datasets: [{
                    label: 'الإيرادات',
                    data: [85000, 92000, 105000, 98000, 112000, 125000, 118000, 135000],
                    backgroundColor: '#e74c3c'
                }, {
                    label: 'التكاليف',
                    data: [45000, 48000, 52000, 50000, 55000, 58000, 56000, 62000],
                    backgroundColor: '#7a7a7a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ريال';
                            }
                        }
                    }
                }
            }
        });
    }

    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx) {
        createChartInstance('analytics', 'traffic', trafficCtx, {
            type: 'pie',
            data: {
                labels: ['بحث مباشر', 'وسائل التواصل', 'إعلانات مدفوعة', 'مواقع أخرى'],
                datasets: [{
                    data: [40, 30, 20, 10],
                    backgroundColor: [
                        '#e74c3c',
                        '#3498db',
                        '#2ecc71',
                        '#f1c40f'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const performanceCtx = document.getElementById('performanceChart');
    if (performanceCtx) {
        createChartInstance('analytics', 'performance', performanceCtx, {
            type: 'radar',
            data: {
                labels: ['المبيعات', 'الإيرادات', 'رضا العملاء', 'معدل التحويل', 'معدل الإرجاع'],
                datasets: [{
                    label: 'الأداء الحالي',
                    data: [85, 90, 78, 82, 95],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// ===== Mobile Menu =====
function createMobileMenu() {
    if (window.innerWidth <= 992) {
        let menuBtn = document.getElementById('mobileMenuBtn');
        if (!menuBtn) {
            menuBtn = document.createElement('button');
            menuBtn.id = 'mobileMenuBtn';
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            menuBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--primary);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
                z-index: 999;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            document.body.appendChild(menuBtn);
        }
    } else {
        const menuBtn = document.getElementById('mobileMenuBtn');
        if (menuBtn) {
            menuBtn.remove();
        }
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-active');
        }
    }
}

// ===== Event Delegation =====
document.addEventListener('click', function(e) {
    // Theme Toggle
    if (e.target.closest('#themeToggle')) {
        e.preventDefault();
        toggleTheme();
        return;
    }

    // Navigation Items
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
        e.preventDefault();
        const section = navItem.getAttribute('data-section');
        if (section) {
            switchSection(section);
        }
        return;
    }

    // Refresh Categories
    const refreshCategoriesBtn = e.target.closest('[data-action="refresh-categories"]');
    if (refreshCategoriesBtn) {
        e.preventDefault();
        fetchCategories();
        return;
    }

    // Modal Close Buttons
    if (e.target.closest('.modal-close')) {
        e.preventDefault();
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
        }
        return;
    }

    // Modal Overlays
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
        }
        return;
    }

    // Generic Modal Triggers
    const modalTrigger = e.target.closest('[data-open-modal]');
    if (modalTrigger) {
        e.preventDefault();
        const modalId = modalTrigger.getAttribute('data-open-modal');
        const mode = modalTrigger.getAttribute('data-modal-mode') || 'create';
        const entity = modalTrigger.getAttribute('data-entity');
        const customerId = modalTrigger.getAttribute('data-customer-id');
        const entityId = modalTrigger.getAttribute('data-entity-id');

        openModal(modalId, mode);

        if (modalId === 'categoryModal') {
            populateCategoryModal(mode === 'edit' ? entityId : null);
        } else if (modalId === 'addProductModal') {
            populateProductModal(mode === 'edit' ? entityId : null);
        } else if (modalId === 'paymentSettingsModal' && entityId) {
            populatePaymentSettingsModal(entityId);
        }

        if (entity) {
            const labels = {
                product: 'منتج',
                category: 'فئة',
                promotion: 'عرض ترويجي',
                coupon: 'قسيمة',
                banner: 'بانر',
                feature: 'ميزة',
                user: 'مستخدم',
                payment: 'طريقة دفع'
            };
            const actionLabel = mode === 'edit' ? `تعديل ${labels[entity] || 'عنصر'}` : `إضافة ${labels[entity] || 'عنصر'} جديد`;
            showToast('info', actionLabel, 'تم فتح النموذج بنجاح');
        }

        if (modalId === 'customerProfileModal' && customerId) {
            populateCustomerProfile(customerId);
            showToast('info', 'ملف العميل', 'تم عرض ملف العميل بنجاح');
        } else if (modalId === 'customerOrdersModal' && customerId) {
            populateCustomerOrders(customerId);
            showToast('info', 'طلبات العميل', 'تم تحميل طلبات العميل');
        }
        return;
    }

    // Export Buttons
    if (e.target.closest('#exportOrdersBtn')) {
        e.preventDefault();
        exportOrders();
        return;
    }

    if (e.target.closest('#exportCustomersBtn')) {
        e.preventDefault();
        exportCustomers();
        return;
    }

    if (e.target.closest('#exportReportBtn')) {
        e.preventDefault();
        exportAnalyticsReport();
        return;
    }

    if (e.target.closest('#exportAuditBtn')) {
        e.preventDefault();
        exportAuditLogs();
        return;
    }

    // View Order Details
    if (e.target.closest('.view-order')) {
        e.preventDefault();
        const btn = e.target.closest('.view-order');
        const orderIdAttr = btn?.getAttribute('data-order-id');
        const row = btn?.closest('tr');
        const fallbackId = row?.dataset.id || row?.querySelector('td:first-child')?.textContent;
        const orderId = normalizeOrderId(orderIdAttr || fallbackId);

        if (!orderId) {
            showToast('error', 'تفاصيل الطلب', 'تعذر تحديد رقم الطلب');
            return;
        }

        populateOrderDetailsModal(orderId);
        openModal('orderDetailsModal');
        showToast('info', 'تفاصيل الطلب', `عرض تفاصيل الطلب ${orderId}`);
        return;
    }

    // Print Order Invoice
    if (e.target.closest('.print-order')) {
        e.preventDefault();
        const btn = e.target.closest('.print-order');
        const orderIdAttr = btn?.getAttribute('data-order-id');
        const row = btn?.closest('tr');
        const fallbackId = row?.dataset.id || row?.querySelector('td:first-child')?.textContent;
        const orderId = normalizeOrderId(orderIdAttr || fallbackId);

        if (!orderId) {
            showToast('error', 'طباعة الفاتورة', 'تعذر تحديد رقم الطلب للطباعة');
            return;
        }

        printOrder(orderId);
        return;
    }

    // Delete Category
    const deleteCategoryBtn = e.target.closest('[data-action="delete-category"]');
    if (deleteCategoryBtn) {
        e.preventDefault();
        const categoryId = deleteCategoryBtn.getAttribute('data-entity-id');
        if (!categoryId) return;

        const category = getCategoryById(categoryId);
        if (!category) {
            showToast('error', 'حذف الفئة', 'لم يتم العثور على الفئة المحددة');
            return;
        }

        if (confirm(`هل أنت متأكد من حذف الفئة "${category.name}"؟`)) {
            deleteCategory(categoryId);
        }
        return;
    }

    // Delete Product
    const deleteProductBtn = e.target.closest('[data-action="delete-product"]');
    if (deleteProductBtn) {
        e.preventDefault();
        const productId = deleteProductBtn.getAttribute('data-entity-id');
        if (!productId) return;

        const product = getProductById(productId);
        if (!product) {
            showToast('error', 'حذف المنتج', 'لم يتم العثور على المنتج المحدد');
            return;
        }

        if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
            deleteProduct(productId);
        }
        return;
    }

    // Preview Product
    const previewProductBtn = e.target.closest('[data-action="preview-product"]');
    if (previewProductBtn) {
        e.preventDefault();
        const productId = previewProductBtn.getAttribute('data-entity-id');
        const product = getProductById(productId);
        if (!product) {
            showToast('error', 'عرض المنتج', 'لم يتم العثور على المنتج المحدد');
            return;
        }

        showToast('info', product.name, 'يمكنك تنفيذ ربط عرض التفاصيل لاحقاً');
        return;
    }

    // Mobile Menu Button
    if (e.target.closest('#mobileMenuBtn')) {
        e.preventDefault();
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.getElementById('mobileMenuBtn');
        if (sidebar && menuBtn) {
            sidebar.classList.toggle('mobile-active');
            menuBtn.innerHTML = sidebar.classList.contains('mobile-active')
                ? '<i class="fas fa-times"></i>'
                : '<i class="fas fa-bars"></i>';
        }
        return;
    }

    // Close mobile sidebar when clicking outside
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('mobile-active')) {
        if (!sidebar.contains(e.target) && !e.target.closest('#mobileMenuBtn')) {
            sidebar.classList.remove('mobile-active');
            const menuBtn = document.getElementById('mobileMenuBtn');
            if (menuBtn) {
                menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        }
    }
});

// ===== Toggle Switches =====
document.addEventListener('change', function(e) {
    if (e.target.matches('.toggle-switch input')) {
        const parent = e.target.closest('.payment-method-card');
        if (parent) {
            const methodName = parent.querySelector('h3')?.textContent || 'طريقة الدفع';
            const status = e.target.checked ? 'تفعيل' : 'إلغاء تفعيل';
            showToast('success', 'تحديث طريقة الدفع', `تم ${status} ${methodName}`);
        }
    }
});

// ===== Image Upload Areas =====
document.addEventListener('click', function(e) {
    const uploadArea = e.target.closest('.image-upload-area');
    if (uploadArea && !e.target.matches('input[type="file"]')) {
        const input = uploadArea.querySelector('input[type="file"]');
        if (input) {
            input.click();
        }
    }
});

document.addEventListener('change', function(e) {
    if (e.target.matches('.image-upload-area input[type="file"]')) {
        const files = e.target.files;
        if (files.length > 0) {
            showToast('success', 'تحميل الصور', `تم اختيار ${files.length} صورة`);
        }
    }
});

// ===== Initialize =====
// نقطة البداية الرئيسية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing dashboard...');

    // تهيئة السمة (الوضع الفاتح/الداكن)
    initTheme();

    // استعادة القسم المحفوظ أو الذهاب للنظرة العامة
    const savedSection = loadCurrentSection();
    console.log('📌 Restoring section:', savedSection);
    switchSection(savedSection);

    // تحميل الرسوم البيانية الأولية بعد تأخير قصير
    setTimeout(() => {
        if (state.currentSection === 'overview') {
            loadOverviewCharts();
            chartsLoaded.overview = true;
        }
    }, 100);

    // تهيئة الفلاتر والبيانات
    hydrateFilters();
    renderDashboard();
    setupProductFilters();

    // ربط حدث إرسال نموذج الفئة
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    }

    // ربط حدث تغيير صورة الفئة
    const categoryImageInput = document.getElementById('categoryImage');
    if (categoryImageInput) {
        categoryImageInput.addEventListener('change', handleCategoryImageChange);
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
        const productImageInput = productForm.querySelector('#productImage');
        if (productImageInput) {
            productImageInput.addEventListener('change', handleProductImageChange);
        }
    }

    // جلب الفئات من الـ API
    fetchCategories();
    fetchProducts();

    // إنشاء قائمة الهاتف المحمول إذا لزم الأمر
    createMobileMenu();

    // عرض رسالة ترحيب بعد تأخير قصير
    setTimeout(() => {
        showToast('success', 'مرحباً بك', 'تم تسجيل الدخول بنجاح إلى لوحة التحكم');
    }, 500);
});

// ===== Window Resize Handler =====
window.addEventListener('resize', createMobileMenu);