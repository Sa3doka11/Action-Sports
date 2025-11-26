(function () {
    'use strict';
    const API_BASE_HOST = "https://action-sports-api.vercel.app/api";
    const FALLBACK_IMAGE = 'assets/images/product1.png';
    const CASH_PAYMENT_METHOD = 'cash';
    const CURRENCY_ICON_HTML = '<img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;">';

    const CHECKOUT_FALLBACK_ADDRESS_ID = 'checkout-fallback-address';

    const ORDER_ENDPOINTS = {
        create: () => `${API_BASE_HOST}/orders`,
        getAll: () => `${API_BASE_HOST}/orders`,
        getById: (id) => `${API_BASE_HOST}/orders/${id}`,
        getMyOrders: () => `${API_BASE_HOST}/orders/me`,
        deliver: (id) => `${API_BASE_HOST}/orders/${id}/deliver`,
        cancel: (id) => `${API_BASE_HOST}/orders/${id}/cancel`,
        payWithPayTabs: () => `${API_BASE_HOST}/orders/pay-with-paytabs`
    };

    const PAYMENT_SETTINGS_ENDPOINT = `${API_BASE_HOST}/payment-settings`;
    const PAYMENT_METHODS_CONFIG = [
        {
            key: 'payOnDelivery',
            value: 'cash',
            label: 'الدفع عند الاستلام'
        },
        {
            key: 'installments',
            value: 'installment',
            label: 'برنامج التقسيط'
        },
        {
            key: 'payWithCard',
            value: 'card',
            label: 'بطاقة ائتمان'
        }
    ];
    let paymentSettingsCache = null;

    const productMetadataCache = (() => {
        if (typeof window !== 'undefined' && window.__actionSportsProductMetadata__ instanceof Map) {
            return window.__actionSportsProductMetadata__;
        }
        return new Map();
    })();

    async function fetchPaymentSettings(force = false) {
        if (!force && paymentSettingsCache) {
            return paymentSettingsCache;
        }

        try {
            const token = getAuthTokenSafe();
            const headers = {
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['token'] = token;
            }

            const response = await fetch(PAYMENT_SETTINGS_ENDPOINT, { headers });

            if (!response.ok) {
                const error = new Error(`Failed to load payment settings: ${response.status}`);
                error.status = response.status;
                throw error;
            }

            const result = await response.json();
            const data = result?.data || {};

            paymentSettingsCache = {
                payOnDelivery: Boolean(data.payOnDelivery),
                payWithCard: Boolean(data.payWithCard),
                installments: Boolean(data.installments)
            };

            return paymentSettingsCache;
        } catch (error) {
            if (error?.status === 401) {
                console.warn('⚠️ Payment settings require authentication; falling back to defaults.');
            } else {
                console.error('❌ Unable to fetch payment settings:', error);
            }
            paymentSettingsCache = {
                payOnDelivery: true,
                payWithCard: true,
                installments: false
            };
            return paymentSettingsCache;
        }
    }

    function populatePaymentMethodOptions(selectElement, settings) {
        if (!selectElement) return;

        selectElement.innerHTML = '';

        const available = PAYMENT_METHODS_CONFIG.filter(({ key }) => settings[key]);

        if (!available.length) {
            const fallbackOption = document.createElement('option');
            fallbackOption.value = CASH_PAYMENT_METHOD;
            fallbackOption.textContent = 'الدفع عند الاستلام';
            selectElement.appendChild(fallbackOption);
            selectElement.value = CASH_PAYMENT_METHOD;
            selectElement.setAttribute('data-only-method', 'true');
            // We'll rely on caller to trigger change after listeners attach
            return;
        }

        available.forEach(({ value, label }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            selectElement.appendChild(option);
        });

        const defaultMethod = available[0]?.value || CASH_PAYMENT_METHOD;
        selectElement.value = defaultMethod;
    }

    async function preloadPaymentMethods(selectElement) {
        const settings = await fetchPaymentSettings();
        populatePaymentMethodOptions(selectElement, settings);
        return selectElement;
    }

    function translateAddressType(type) {
        switch ((type || '').toLowerCase()) {
            case 'home':
                return 'منزل';
            case 'work':
                return 'عمل';
            case 'other':
                return 'آخر';
            default:
                return type || '—';
        }
    }

    function redirectToProfileOrders() {
        const targetUrl = 'profile.html#orders';
        let hasNavigated = false;

        const navigate = () => {
            if (hasNavigated) return;
            hasNavigated = true;
            window.location.href = targetUrl;
        };

        try {
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.style.display = 'flex';
                setTimeout(navigate, 1800);
                return;
            }
        } catch (error) {
            console.warn('⚠️ Could not show success modal before redirecting:', error);
        }

        setTimeout(navigate, 1200);
    }

    function extractCheckoutPrimaryAddress(source) {
        if (!source || typeof source !== 'object') return null;

        const directAddress = source.address || source.shippingAddress;
        const addressArray = Array.isArray(source.addresses) ? source.addresses : null;
        let candidate = directAddress;

        if (!candidate && addressArray && addressArray.length) {
            candidate = addressArray.find(item => item?.isDefault) || addressArray[0];
        }

        if (!candidate) return null;

        if (typeof candidate === 'string') {
            return {
                _id: CHECKOUT_FALLBACK_ADDRESS_ID,
                type: 'home',
                details: candidate,
                city: source.city || '',
                postalCode: source.postalCode || '',
                phone: source.phone || ''
            };
        }

        if (typeof candidate !== 'object') return null;

        const details = candidate.details || candidate.line1 || candidate.street || candidate.address || '';
        const city = candidate.city || source.city || '';
        const postalCode = candidate.postalCode || candidate.zip || candidate.postcode || source.postalCode || '';
        const phone = candidate.phone || source.phone || '';

        if (!details && !city && !postalCode && !phone) {
            return null;
        }

        return {
            _id: candidate._id || candidate.id || CHECKOUT_FALLBACK_ADDRESS_ID,
            type: candidate.type || 'home',
            details,
            city,
            postalCode,
            phone
        };
    }

    function normalizeCheckoutAddress(address) {
        if (!address) return null;
        const raw = address;
        const regionObject = address && address.region && typeof address.region === 'object' && address.region !== null ? address.region : null;
        const shippingZoneObject = address && address.shippingZone && typeof address.shippingZone === 'object' && address.shippingZone !== null ? address.shippingZone : null;
        const cityCandidate = typeof address.city === 'string' ? address.city.trim() : '';

        let regionId = address.regionId
            || address.shippingRegionId
            || address.shippingZoneId
            || address.zoneId
            || (regionObject ? (regionObject._id || regionObject.id) : null)
            || (shippingZoneObject ? (shippingZoneObject._id || shippingZoneObject.id) : null);

        if (!regionId && cityCandidate && /^[a-f0-9]{8,}$/i.test(cityCandidate)) {
            regionId = cityCandidate;
        }

        const zoneFromCache = regionId ? getShippingZoneByIdSafe(regionId) : null;

        const regionName = address.regionName
            || address.shippingRegionName
            || (typeof address.region === 'string' ? address.region : null)
            || (typeof address.shippingRegion === 'string' ? address.shippingRegion : null)
            || (shippingZoneObject ? shippingZoneObject.name : null)
            || (regionObject ? regionObject.name : null)
            || zoneFromCache?.name
            || '';

        const shippingCostCandidates = [
            address.shippingPrice,
            address.shippingCost,
            address.deliveryFee,
            address.shippingFee,
            address.region?.shippingPrice,
            regionObject?.shippingCost,
            regionObject?.shippingPrice,
            shippingZoneObject?.shippingPrice,
            shippingZoneObject?.shippingCost,
            shippingZoneObject?.price,
            shippingZoneObject?.cost,
            zoneFromCache?.shippingPrice,
            zoneFromCache?.shippingCost,
            zoneFromCache?.shippingRate,
            zoneFromCache?.price,
            zoneFromCache?.cost
        ];

        let shippingCost = 0;
        for (const candidate of shippingCostCandidates) {
            const numeric = Number(candidate);
            if (Number.isFinite(numeric) && numeric >= 0) {
                shippingCost = numeric;
                break;
            }
        }

        return {
            _id: address._id || address.id || CHECKOUT_FALLBACK_ADDRESS_ID,
            id: address._id || address.id || CHECKOUT_FALLBACK_ADDRESS_ID,
            type: address.type || 'home',
            details: address.details || address.line1 || address.street || '',
            city: (address.city && typeof address.city === 'string' && address.city.trim() && !/^[a-f0-9]{8,}$/i.test(address.city) ? address.city : regionName || ''),
            postalCode: address.postalCode || address.zip || '',
            phone: address.phone || '',
            regionId: regionId || null,
            region: typeof address.region === 'string' ? address.region : (regionObject?.name || ''),
            regionName,
            shippingPrice: shippingCost,
            shippingCost,
            shippingZone: shippingZoneObject || regionObject || zoneFromCache || null,
            raw
        };
    }

    function populateCheckoutAddressesFallbackFromUser(userData) {
        const primary = extractCheckoutPrimaryAddress(userData);
        if (!primary) return false;

        const normalized = normalizeCheckoutAddress(primary);
        if (!normalized) return false;

        checkoutAddressesCache = [normalized];
        checkoutAddressesLoaded = true;
        selectedCheckoutAddressId = normalized._id || normalized.id || CHECKOUT_FALLBACK_ADDRESS_ID;
        renderCheckoutAddresses(checkoutAddressesCache);
        return true;
    }

    function populateCheckoutAddressesFallbackFromStoredUser() {
        if (typeof getAuthUser !== 'function') return false;
        const storedUser = getAuthUser();
        if (!storedUser) return false;
        const source = storedUser.raw || storedUser;
        return populateCheckoutAddressesFallbackFromUser(source);
    }

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

    function formatCartPrice(value) {
        if (typeof formatPrice === 'function') {
            return formatPrice(value);
        }
        const number = Number(value);
        return Number.isFinite(number) ? number.toLocaleString('ar-EG') : value;
    }

    function renderCurrencyWithIcon(value) {
        return `${formatCartPrice(value)} ${CURRENCY_ICON_HTML}`;
    }

    function computeInstallationTotalFromItems(items = []) {
        if (!Array.isArray(items) || !items.length) {
            return 0;
        }

        return items.reduce((sum, item) => {
            const unitInstallation = Number(item?.installationPrice);
            const quantity = Number(item?.quantity) || 0;

            if (!Number.isFinite(unitInstallation) || unitInstallation <= 0 || quantity <= 0) {
                return sum;
            }

            return sum + (unitInstallation * quantity);
        }, 0);
    }

    const shippingZonesHelper = typeof window !== 'undefined' ? window.actionSportsShippingZones : null;
    let shippingZonesLoadPromise = null;
    let selectedShippingDetails = { cost: 0, zoneId: null, zone: null, regionName: '', installationAvailable: false };

    function resetSelectedShippingDetails() {
        selectedShippingDetails = { cost: 0, zoneId: null, zone: null, regionName: '', installationAvailable: false };
    }

    function getShippingZonesHelper() {
        return shippingZonesHelper && typeof shippingZonesHelper === 'object' ? shippingZonesHelper : null;
    }

    function ensureShippingZonesLoaded(force = false) {
        const helper = getShippingZonesHelper();
        if (!helper || typeof helper.load !== 'function') {
            return Promise.resolve([]);
        }

        if (force) {
            shippingZonesLoadPromise = null;
        }

        if (!shippingZonesLoadPromise) {
            shippingZonesLoadPromise = helper.load(force).catch(error => {
                shippingZonesLoadPromise = null;
                throw error;
            });
        }

        return shippingZonesLoadPromise.then(() => {
            if (typeof helper.getAll === 'function') {
                return helper.getAll();
            }
            return [];
        }).catch(error => {
            console.error('❌ Failed to load shipping zones:', error);
            throw error;
        });
    }

    function getShippingZoneByIdSafe(zoneId) {
        const helper = getShippingZonesHelper();
        if (!helper || typeof helper.getById !== 'function' || !zoneId) {
            return null;
        }
        return helper.getById(zoneId) || null;
    }

    function resolveShippingDetails(address) {
        if (!address || typeof address !== 'object') {
            return { cost: 0, zoneId: null, zone: null, regionName: '' };
        }

        const helper = getShippingZonesHelper();
        const zoneCandidate = address.shippingZone || address.region || address.shippingRegion || address.zone;
        let zoneObject = (zoneCandidate && typeof zoneCandidate === 'object') ? zoneCandidate : null;

        const zoneIdCandidates = [
            address.regionId,
            address.shippingRegionId,
            address.shippingZoneId,
            address.zoneId,
            zoneObject?._id,
            zoneObject?.id,
            typeof zoneCandidate === 'string' ? zoneCandidate : null
        ];

        let zoneId = zoneIdCandidates.find(value => value != null && value !== '') || null;

        if (!zoneObject && zoneId) {
            zoneObject = getShippingZoneByIdSafe(zoneId);
            if (zoneObject) {
                zoneId = zoneObject._id || zoneObject.id || zoneId;
            }
        }

        const zoneNameCandidates = [
            address.regionName,
            address.shippingRegionName,
            typeof address.region === 'string' ? address.region : null,
            typeof address.shippingRegion === 'string' ? address.shippingRegion : null,
            typeof zoneCandidate === 'string' ? zoneCandidate : null,
            zoneObject?.name
        ];

        const regionName = zoneNameCandidates.find(value => typeof value === 'string' && value.trim()) || '';

        const costCandidates = [
            address.shippingCost,
            address.shippingPrice,
            address.deliveryFee,
            address.shippingFee,
            address.region?.shippingCost,
            address.region?.shippingPrice,
            zoneObject?.shippingCost,
            zoneObject?.shippingPrice,
            zoneObject?.shippingRate,
            zoneObject?.price,
            zoneObject?.cost
        ];

        let shippingCost = 0;
        for (const candidate of costCandidates) {
            const numeric = Number(candidate);
            if (Number.isFinite(numeric) && numeric >= 0) {
                shippingCost = numeric;
                break;
            }
        }

        const installationAvailabilityCandidates = [
            address.isInstallationAvailable,
            address.installationAvailable,
            address.supportsInstallation,
            address.raw?.isInstallationAvailable,
            address.raw?.installationAvailable,
            zoneObject?.isInstallationAvailable,
            zoneObject?.installationAvailable,
            zoneObject?.supportsInstallation,
            zoneObject?.installation
        ];

        const installationAvailable = installationAvailabilityCandidates.some(value => value === true);

        return {
            cost: shippingCost,
            zoneId,
            zone: zoneObject,
            regionName: regionName || (zoneObject?.name || ''),
            installationAvailable
        };
    }

    function getZoneDisplayName(zone) {
        if (!zone || typeof zone !== 'object') {
            return 'مدينة';
        }
        const candidates = [
            zone.name,
            zone.nameAr,
            zone.nameAR,
            zone.nameEn,
            zone.nameEN,
            zone.city,
            zone.title,
            zone.label,
            zone.regionName,
            zone.district,
            zone.area,
            zone.governorate
        ];
        const name = candidates.find(value => typeof value === 'string' && value.trim());
        return name ? name.trim() : 'مدينة';
    }

    function resolveZoneNameById(zoneId) {
        if (!zoneId) return '';
        const helper = getShippingZonesHelper();
        if (!helper || typeof helper.getById !== 'function') return '';
        const zone = helper.getById(zoneId);
        return zone ? getZoneDisplayName(zone) : '';
    }

    function formatShippingOptionCost(cost) {
        const numeric = Number(cost);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return '';
        }
        if (numeric === 0) {
            return 'مجاني';
        }
        if (typeof formatPrice === 'function') {
            return `${formatPrice(numeric)} ريال`;
        }
        return `${numeric} ريال`;
    }

    async function populateCheckoutRegionSelect(selectElement, selectedId = '') {
        if (!selectElement) return;

        selectElement.disabled = true;
        selectElement.innerHTML = '<option value="">جاري تحميل المدن...</option>';

        try {
            const zones = await ensureShippingZonesLoaded();
            const list = Array.isArray(zones) && zones.length ? zones : (getShippingZonesHelper()?.getAll?.() || []);

            if (!Array.isArray(list) || !list.length) {
                selectElement.innerHTML = '<option value="">لا توجد مدن متاحة حالياً</option>';
                return;
            }

            const options = ['<option value="">اختر المدينة</option>'];
            list.forEach(zone => {
                const id = zone?._id || zone?.id;
                if (!id) return;
                const displayName = getZoneDisplayName(zone);
                options.push(`<option value="${id}">${displayName}</option>`);
            });

            selectElement.innerHTML = options.join('');
            if (selectedId) {
                selectElement.value = selectedId;
            }
        } catch (error) {
            console.error('❌ Failed to populate shipping regions select:', error);
            selectElement.innerHTML = '<option value="">تعذر تحميل المدن</option>';
            if (typeof showToast === 'function') {
                showToast('تعذر تحميل مدن الشحن. يرجى المحاولة لاحقاً.', 'error');
            }
        } finally {
            selectElement.disabled = false;
        }
    }

    function renderCart() {
        const container = document.getElementById('cartContainer');
        if (!container) return;

        const state = getCartStateSafe();

        if (state.isLoading && !state.isLoaded) {
            container.innerHTML = `
                <div class="empty-cart" style="width: 100%; text-align: center; padding: 40px 0;">
                    <i class="fa fa-spinner fa-spin" style="font-size: 36px; margin-bottom: 15px;"></i>
                    <h3>جاري تحميل السلة...</h3>
                </div>
            `;
            return;
        }

        if (!state.items.length) {
            container.innerHTML = `
                <div class="empty-cart" style="width: 100%;">
                    <i class="fa fa-shopping-cart"></i>
                    <h3>سلة المشتريات فارغة</h3>
                    <p>لم تقم بإضافة أي منتجات بعد</p>
                    <div class="main-button">
                        <a href="./products.html">تصفح المنتجات</a>
                    </div>
                </div>
            `;
            return;
        }

        const subtotal = Number(state.totals?.subtotal) || state.items.reduce((sum, item) => {
            const price = Number(item?.price) || 0;
            const quantity = Number(item?.quantity) || 0;
            return sum + (price * quantity);
        }, 0);

        const shipping = 0;

        const total = (() => {
            const declared = Number(state.totals?.total);
            if (Number.isFinite(declared) && declared > 0) return declared;
            return subtotal;
        })();

        const itemsHTML = state.items.map(item => {
            const metadata = item?.productId ? productMetadataCache.get(item.productId) : null;
            let image = item?.image;
            if (!image && metadata?.image) {
                image = metadata.image;
            }
            if (!image && typeof resolveProductImage === 'function') {
                image = resolveProductImage(item?.raw || {});
            }
            if (!image) {
                image = FALLBACK_IMAGE;
            }

            return `
            <div class="cart-item-row" data-id="${item.id}" data-product-id="${item.productId || ''}">
                <div class="cart-item-image">
                    <img src="${image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <div class="cart-item-price">${renderCurrencyWithIcon(item.price)}</div>
                    <div class="cart-item-actions">
                        <div class="quantity-control">
                            <button class="quantity-btn" data-action="decrease" data-id="${item.id}">
                                <i class="fa fa-minus"></i>
                            </button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" data-action="increase" data-id="${item.id}">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-btn" data-action="remove" data-id="${item.id}">
                            <i class="fa fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        container.innerHTML = `
            <div class="cart-items-section">
                <h2>المنتجات (${state.items.length})</h2>
                ${itemsHTML}
            </div>

            <div class="cart-summary-section">
                <div class="cart-summary">
                    <h2>ملخص الطلب</h2>
                    <div class="summary-row">
                        <span>المجموع الفرعي:</span>
                        <span>${renderCurrencyWithIcon(subtotal)}</span>
                    </div>
                    <div class="summary-row" id="orderShippingRow" style="display: none;">
                        <span id="orderShippingLabel">مصاريف الشحن:</span>
                        <span class="price" id="orderShippingValue"></span>
                    </div>
                    <div class="summary-row" id="orderInstallationRow" style="display: none;">
                        <span id="orderInstallationLabel">رسوم التركيب:</span>
                        <span class="price" id="orderInstallationValue"></span>
                    </div>
                    <div class="summary-alert" id="orderInstallationAlert" style="display: none;">
                        <i class="fa fa-info-circle"></i>
                        <span>خدمة التركيب غير متاحة للمدينة المختارة. سيتم إكمال الطلب بدون تركيب.</span>
                    </div>
                    <div class="summary-row total">
                        <span>الإجمالي:</span>
                        <span class="price" id="orderTotalValue">${renderCurrencyWithIcon(total)}</span>
                    </div>
                    <button class="checkout-btn" id="checkoutButton">
                        <i class="fa fa-credit-card"></i> تأكيد الطلب
                    </button>

                    <div class="address-selection" id="addressSelection">
                        <div class="address-selection-header">
                            <h3>اختر عنوان الشحن</h3>
                            <p>حدد أحد العناوين المسجلة أو أضف عنواناً جديداً لإتمام الطلب.</p>
                        </div>
                        <div class="checkout-addresses" id="checkoutAddressList">
                            <div class="addresses-loading"><i class="fa fa-spinner fa-spin"></i> جاري تحميل العناوين...</div>
                        </div>
                        <div class="addresses-empty" id="checkoutAddressesEmpty" style="display: none;">
                            لا توجد عناوين محفوظة بعد. يرجى إضافة عنوان جديد للمتابعة.
                        </div>
                        <div class="checkout-shipping-info" id="checkoutShippingInfo" style="display: none;">
                            <i class="fa fa-truck"></i>
                            <span id="checkoutShippingInfoText"></span>
                        </div>
                        <div class="address-selection-actions">
                            <button type="button" class="action-btn primary" id="addCheckoutAddressBtn">
                                <i class="fa fa-plus"></i> إضافة عنوان جديد
                            </button>
                        </div>

                        <div class="checkout-payment" id="checkoutPaymentSection">
                            <div class="form-group">
                                <label for="checkoutPaymentMethod">طريقة الدفع *</label>
                                <select name="payment_method" id="checkoutPaymentMethod" required>
                                    <option value="">اختر طريقة الدفع</option>
                                </select>
                            </div>

                            <div id="checkoutInstallmentProviders" class="payment-field" style="display: none;">
                                <div class="payment-info-alert">
                                    <i class="fa fa-hand-holding-usd"></i>
                                    <p>
                                        اختر مقدم خدمة التقسيط المفضل لديك.
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label>مقدم خدمة التقسيط *</label>
                                    <select name="installment_provider" id="checkoutInstallmentProvider">
                                        <option value="">اختر البرنامج</option>
                                        <option value="tabby">Tabby</option>
                                        <option value="tamara">Tamara</option>
                                    </select>
                                </div>
                            </div>

                            <div id="checkoutCashMessage" class="payment-field" style="display: none;">
                                <div class="cash-payment-info">
                                    <i class="fa fa-check-circle"></i>
                                    <div>
                                        <strong>الدفع عند الاستلام</strong>
                                        <p>سيتم تحصيل قيمة الطلب عند استلام المنتج. يرجى تجهيز المبلغ المطلوب.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button class="submit-order-btn" id="confirmOrderButton" disabled>
                            <i class="fa fa-check"></i> تأكيد وإرسال الطلب
                        </button>
                    </div>
                </div>
            </div>
        `;

        bindCartInteractions(container);
        updateSummaryTotals();
    }

    function bindCartInteractions(container) {
        const checkoutButton = container.querySelector('#checkoutButton');
        const confirmOrderButton = container.querySelector('#confirmOrderButton');
        const addAddressButton = container.querySelector('#addCheckoutAddressBtn');
        const paymentMethod = container.querySelector('#checkoutPaymentMethod');

        if (paymentMethod) {
            preloadPaymentMethods(paymentMethod).then(() => {
                paymentMethod.addEventListener('change', handleCheckoutPaymentChange);
                handleCheckoutPaymentChange();
            });
        }

        if (checkoutButton) {
            checkoutButton.addEventListener('click', function (event) {
                if (typeof requireAuth === 'function' && !requireAuth(event, 'cart.html')) {
                    if (typeof showToast === 'function') {
                        showToast('يجب تسجيل الدخول قبل إتمام الشراء.', 'warning');
                    }
                    return;
                }
                showAddressSelection();
            });
        }

        container.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', handleQuantityChange);
        });

        container.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', handleRemoveItem);
        });

        if (confirmOrderButton) {
            confirmOrderButton.addEventListener('click', submitOrderWithSelectedAddress);
        }

        if (addAddressButton) {
            addAddressButton.addEventListener('click', openCheckoutAddressModal);
        }
    }

    let checkoutAddressesCache = [];
    let checkoutAddressesLoaded = false;
    let selectedCheckoutAddressId = null;

    function showAddressSelection() {
        const selection = document.getElementById('addressSelection');
        const checkoutButton = document.getElementById('checkoutButton');
        if (!selection) return;

        selection.classList.add('show');
        if (checkoutButton) {
            checkoutButton.style.display = 'none';
        }

        ensureShippingZonesLoaded().catch(error => {
            console.warn('⚠️ Unable to preload shipping zones:', error);
        });

        if (!checkoutAddressesLoaded) {
            loadCheckoutAddresses();
        }
    }

    async function loadCheckoutAddresses(forceRefresh = false) {
        if (checkoutAddressesLoaded && !forceRefresh) {
            renderCheckoutAddresses(checkoutAddressesCache);
            return;
        }

        const list = document.getElementById('checkoutAddressList');
        const emptyState = document.getElementById('checkoutAddressesEmpty');
        if (!list || !emptyState) return;

        list.innerHTML = '<div class="addresses-loading"><i class="fa fa-spinner fa-spin"></i> جاري تحميل العناوين...</div>';
        emptyState.style.display = 'none';
        resetSelectedShippingDetails();

        const token = getAuthTokenSafe();
        if (!token) {
            list.innerHTML = '';
            emptyState.textContent = 'يرجى تسجيل الدخول لعرض عناوينك المسجلة.';
            emptyState.style.display = 'block';
            return;
        }

        try {
            try {
                await ensureShippingZonesLoaded(forceRefresh);
            } catch (zoneError) {
                console.warn('⚠️ Failed to refresh shipping zones:', zoneError);
            }

            const response = await getJson(USER_ENDPOINTS.addresses, token);
            const addresses = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
            const normalized = addresses
                .map(normalizeCheckoutAddress)
                .filter(Boolean);

            checkoutAddressesCache = normalized;
            checkoutAddressesLoaded = true;
            renderCheckoutAddresses(normalized);
        } catch (error) {
            console.error('❌ Failed to load checkout addresses:', error);
            const hydrated = populateCheckoutAddressesFallbackFromStoredUser();
            if (!hydrated) {
                list.innerHTML = '';
                emptyState.textContent = error.message || 'حدث خطأ أثناء تحميل العناوين. يرجى المحاولة مرة أخرى.';
                emptyState.style.display = 'block';
                resetSelectedShippingDetails();
                updateSummaryTotals();
            }
        }
    }

    function renderCheckoutAddresses(addresses) {
        const list = document.getElementById('checkoutAddressList');
        const emptyState = document.getElementById('checkoutAddressesEmpty');
        const confirmBtn = document.getElementById('confirmOrderButton');
        if (!list || !emptyState) return;

        const previousSelectedId = selectedCheckoutAddressId;
        const normalized = Array.isArray(addresses)
            ? addresses.map(address => (address && address.shippingDetails ? address : normalizeCheckoutAddress(address))).filter(Boolean)
            : [];

        checkoutAddressesCache = normalized;

        if (!normalized.length) {
            const hydrated = populateCheckoutAddressesFallbackFromStoredUser();
            if (!hydrated) {
                list.innerHTML = '';
                emptyState.style.display = 'block';
                selectedCheckoutAddressId = null;
                if (confirmBtn) confirmBtn.disabled = true;
                resetSelectedShippingDetails();
                updateSummaryTotals();
            }
            return;
        }

        emptyState.style.display = 'none';

        if (!previousSelectedId || !normalized.some(address => isSameAddress(address, previousSelectedId))) {
            selectedCheckoutAddressId = normalized[0]?._id || normalized[0]?.id || null;
        }

        list.innerHTML = normalized.map(address => renderCheckoutAddressCard(address, isSameAddress(address, selectedCheckoutAddressId))).join('');

        list.querySelectorAll('input[name="selectedAddress"]').forEach(radio => {
            radio.addEventListener('change', () => {
                selectedCheckoutAddressId = radio.value;
                highlightSelectedAddress();
            });
        });

        highlightSelectedAddress();
        if (confirmBtn) confirmBtn.disabled = !selectedCheckoutAddressId;
    }

    function renderCheckoutAddressCard(address, selected) {
        const id = address?._id || address?.id || '';
        const typeLabel = translateAddressType(address?.type || 'home');
        const details = address?.details || address?.line1 || address?.street || '—';
        const postal = address?.postalCode || address?.zip || '—';
        const phone = address?.phone || '—';
        const regionIdForDisplay = address?.regionId
            || (typeof address?.city === 'string' && /^[a-f0-9]{8,}$/i.test(address.city) ? address.city : null)
            || (typeof address?.region === 'string' && /^[a-f0-9]{8,}$/i.test(address.region) ? address.region : null);
        const resolvedRegionName = resolveZoneNameById(regionIdForDisplay);
        const region = resolvedRegionName || address?.regionName || address?.region || address?.city || '—';
        const cityRaw = (address?.city || '').trim();
        const cityDisplay = cityRaw && cityRaw !== region ? cityRaw : '';
        const shippingSource = address?.shippingDetails || resolveShippingDetails(address);
        const shippingCostValue = Number(
            (shippingSource && shippingSource.cost != null ? shippingSource.cost : undefined)
            ?? address?.shippingCost
            ?? address?.shippingPrice
        );
        let shippingDisplay = '—';
        if (Number.isFinite(shippingCostValue)) {
            shippingDisplay = shippingCostValue === 0 ? 'مجاني' : renderCurrencyWithIcon(shippingCostValue);
        }

        return `
            <label class="checkout-address-card ${selected ? 'selected' : ''}" data-address-id="${id}">
                <input type="radio" name="selectedAddress" value="${id}" ${selected ? 'checked' : ''}>
                <div class="checkout-address-content">
                    <div class="checkout-address-type">
                        <span class="address-type-pill">${typeLabel}</span>
                    </div>
                    <div class="checkout-address-lines">
                        <div class="address-line"><i class="fa fa-map-marker-alt"></i><span>${details}</span></div>
                        ${cityDisplay ? `<div class="address-line"><i class="fa fa-city"></i><span>${cityDisplay}</span></div>` : ''}
                        <div class="address-line"><i class="fa fa-map"></i><span>${region}</span></div>
                        <div class="address-line"><i class="fa fa-truck"></i><span>${shippingDisplay}</span></div>
                        <div class="address-line"><i class="fa fa-mail-bulk"></i><span>${postal}</span></div>
                        <div class="address-line"><i class="fa fa-phone"></i><span>${phone}</span></div>
                    </div>
                </div>
            </label>
        `;
    }

    function isSameAddress(address, id) {
        const addressId = address?._id || address?.id || '';
        return addressId && id && String(addressId) === String(id);
    }

    function getSelectedCheckoutAddress() {
        if (!selectedCheckoutAddressId) {
            return null;
        }
        return checkoutAddressesCache.find(address => isSameAddress(address, selectedCheckoutAddressId)) || null;
    }

    function updateCheckoutShippingInfoUI(address, shippingCost) {
        const infoContainer = document.getElementById('checkoutShippingInfo');
        const infoText = document.getElementById('checkoutShippingInfoText');

        if (!infoContainer || !infoText) {
            return;
        }

        if (!address) {
            infoText.textContent = '';
            infoContainer.style.display = 'none';
            return;
        }

        let cost = Number(shippingCost);
        if (!Number.isFinite(cost) || cost < 0) {
            cost = Number(selectedShippingDetails?.cost);
        }

        const effectiveRegionName = selectedShippingDetails?.regionName
            || address.regionName
            || address.region
            || resolveZoneNameById(selectedShippingDetails?.zoneId || address.regionId)
            || '';

        let costLabel = '—';
        if (Number.isFinite(cost)) {
            if (cost === 0) {
                costLabel = 'مجاني';
            } else if (cost > 0) {
                costLabel = renderCurrencyWithIcon(cost);
            }
        }

        const regionSuffix = effectiveRegionName ? ` (${effectiveRegionName})` : '';
        infoText.innerHTML = `تكلفة الشحن${regionSuffix}: ${costLabel}`;
        infoContainer.style.display = 'flex';
    }

    function highlightSelectedAddress() {
        const cards = document.querySelectorAll('.checkout-address-card');
        const confirmBtn = document.getElementById('confirmOrderButton');
        let activeAddress = null;
        cards.forEach(card => {
            const id = card.dataset.addressId;
            if (id && String(id) === String(selectedCheckoutAddressId)) {
                card.classList.add('selected');
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                activeAddress = checkoutAddressesCache.find(address => isSameAddress(address, id)) || null;
            } else {
                card.classList.remove('selected');
            }
        });

        if (confirmBtn) {
            confirmBtn.disabled = !selectedCheckoutAddressId;
        }

        if (activeAddress) {
            const shippingDetails = activeAddress.shippingDetails || resolveShippingDetails(activeAddress);
            activeAddress.shippingDetails = shippingDetails;
            selectedShippingDetails = {
                cost: Number(shippingDetails?.cost ?? activeAddress.shippingCost ?? activeAddress.shippingPrice) || 0,
                zoneId: shippingDetails?.zoneId || activeAddress.regionId || selectedShippingDetails.zoneId,
                zone: shippingDetails?.zone || activeAddress.shippingZone || null,
                regionName: shippingDetails?.regionName || activeAddress.regionName || activeAddress.region || selectedShippingDetails.regionName || '',
                installationAvailable: Boolean(
                    shippingDetails?.installationAvailable ??
                    activeAddress.installationAvailable ??
                    activeAddress.isInstallationAvailable ??
                    selectedShippingDetails.installationAvailable
                )
            };
        } else {
            resetSelectedShippingDetails();
        }

        updateSummaryTotals();
    }

    function openCheckoutAddressModal() {
        const modal = document.createElement('div');
        modal.className = 'address-modal-overlay';
        modal.innerHTML = `
            <div class="address-modal">
                <div class="address-modal-header">
                    <h3>إضافة عنوان جديد</h3>
                    <button type="button" class="address-modal-close" aria-label="إغلاق">&times;</button>
                </div>
                <form id="checkoutAddressForm">
                    <div class="address-form-group">
                        <label>نوع العنوان</label>
                        <select name="type" required>
                            <option value="home">المنزل</option>
                            <option value="work">العمل</option>
                            <option value="other">آخر</option>
                        </select>
                    </div>
                    <div class="address-form-group">
                        <label>المدينة</label>
                        <select name="regionId" id="checkoutRegionSelect" required>
                            <option value="">اختر المدينة</option>
                        </select>
                        <small class="field-hint" id="checkoutRegionHint">اختر المدينة لحساب تكلفة الشحن.</small>
                    </div>
                    <div class="address-form-group">
                        <label>تفاصيل العنوان</label>
                        <textarea name="details" rows="3" required placeholder="مثل: الشارع، رقم المنزل، العلامات المميزة"></textarea>
                    </div>
                    <div class="address-form-group">
                        <label>الرمز البريدي</label>
                        <input type="text" name="postalCode" placeholder="12345">
                    </div>
                    <div class="address-form-group">
                        <label>رقم الهاتف</label>
                        <input type="tel" name="phone" required placeholder="مثال: 01000000000">
                    </div>
                    <div class="address-modal-actions">
                        <button type="submit" class="action-btn primary"><i class="fa fa-save"></i> حفظ العنوان</button>
                        <button type="button" class="action-btn secondary address-modal-close">إلغاء</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('visible'), 10);

        modal.addEventListener('click', (event) => {
            if (event.target.classList.contains('address-modal-overlay') || event.target.classList.contains('address-modal-close')) {
                closeCheckoutAddressModal(modal);
            }
        });

        const form = modal.querySelector('#checkoutAddressForm');
        const regionSelect = modal.querySelector('#checkoutRegionSelect');
        const regionHint = modal.querySelector('#checkoutRegionHint');

        const updateRegionHint = (zoneId) => {
            if (!regionHint) return;
            if (!zoneId) {
                regionHint.textContent = 'اختر المدينة لحساب تكلفة الشحن.';
                return;
            }

            const zone = getShippingZoneByIdSafe(zoneId);
            if (!zone) {
                regionHint.textContent = 'تعذر تحديد تكلفة الشحن لهذه المنطقة حالياً.';
                return;
            }

            const costLabel = formatShippingOptionCost(zone?.shippingCost ?? zone?.shippingPrice ?? zone?.shippingRate ?? zone?.price ?? zone?.cost);
            regionHint.textContent = costLabel
                ? `تكلفة شحن هذه المنطقة (${costLabel})`
                : 'لا توجد تكلفة شحن لهذه المنطقة.';
        };

        if (regionSelect) {
            populateCheckoutRegionSelect(regionSelect)
                .then(() => {
                    updateRegionHint(regionSelect.value);
                })
                .catch(error => {
                    console.error('❌ Failed to populate regions in checkout modal:', error);
                    updateRegionHint('');
                });

            regionSelect.addEventListener('change', () => {
                updateRegionHint(regionSelect.value);
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const payload = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));

            if (!payload.regionId || !payload.details || !payload.phone) {
                showToast('يرجى ملء كافة الحقول المطلوبة.', 'warning');
                return;
            }

            try {
                await saveCheckoutAddress(payload);
                closeCheckoutAddressModal(modal);
                await loadCheckoutAddresses(true);
            } catch (error) {
                console.error('❌ Failed to add checkout address:', error);
                showToast(error.message || 'تعذر إضافة العنوان. حاول مرة أخرى.', 'error');
            }
        });
    }

    function closeCheckoutAddressModal(modal) {
        if (!modal) return;
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 200);
    }

    async function saveCheckoutAddress(payload) {
        const token = getAuthTokenSafe();
        if (!token) {
            showToast('يجب تسجيل الدخول لإضافة عنوان.', 'warning');
            return;
        }

        const zoneId = payload.regionId || '';

        const body = {
            type: payload.type || 'home',
            details: payload.details,
            city: zoneId || '', // backend expects region ID here
            postalCode: payload.postalCode || '',
            phone: payload.phone,
            token
        };

        await postJson(USER_ENDPOINTS.addresses, body, token);
        showToast('تم إضافة العنوان بنجاح!', 'success');
    }

    function handleQuantityChange(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        const itemId = button.dataset.id;

        if (!action || !itemId) return;

        ensureCartStateLoaded()
            .then(() => {
                const current = getCartStateSafe().items.find(item => item.id === itemId);
                if (!current) return;

                const nextQuantity = action === 'increase' ? current.quantity + 1 : current.quantity - 1;
                return updateCartItemQuantity(itemId, nextQuantity);
            })
            .catch(error => {
                console.error('❌ Failed to update quantity:', error);
                showToast(error.message || 'تعذر تحديث الكمية.', 'error');
            });
    }

    function handleRemoveItem(event) {
        const button = event.currentTarget;
        const itemId = button.dataset.id;
        if (!itemId) return;

        ensureCartStateLoaded()
            .then(() => removeCartItem(itemId))
            .catch(error => {
                console.error('❌ Failed to remove item:', error);
                showToast(error.message || 'تعذر حذف المنتج من السلة.', 'error');
            });
    }

    function handleCheckoutPaymentChange() {
        const paymentMethod = document.getElementById('checkoutPaymentMethod');
        const cashMessage = document.getElementById('checkoutCashMessage');
        const installmentProviders = document.getElementById('checkoutInstallmentProviders');

        if (!paymentMethod || !cashMessage || !installmentProviders) {
            return;
        }

        cashMessage.style.display = 'none';
        installmentProviders.style.display = 'none';

        const providerSelect = document.getElementById('checkoutInstallmentProvider');
        if (providerSelect) {
            providerSelect.removeAttribute('required');
            providerSelect.selectedIndex = 0;
        }

        switch (paymentMethod.value) {
            case 'card': {
                break;
            }
            case 'installment': {
                installmentProviders.style.display = 'block';
                if (providerSelect) {
                    providerSelect.setAttribute('required', 'required');
                }
                break;
            }
            case CASH_PAYMENT_METHOD: {
                cashMessage.style.display = 'block';
                break;
            }
            default:
                break;
        }

        updateSummaryTotals();
    }

    function updateSummaryTotals() {
        const totalValue = document.getElementById('orderTotalValue');
        const shippingRow = document.getElementById('orderShippingRow');
        const shippingValue = document.getElementById('orderShippingValue');
        const installationRow = document.getElementById('orderInstallationRow');
        const installationValue = document.getElementById('orderInstallationValue');
        const installationAlert = document.getElementById('orderInstallationAlert');

        const state = getCartStateSafe();
        const items = Array.isArray(state.items) ? state.items : [];

        let subtotal = Number(state.totals?.subtotal);
        if (!Number.isFinite(subtotal) || subtotal < 0) {
            subtotal = items.reduce((sum, item) => {
                const price = Number(item?.price) || 0;
                const quantity = Number(item?.quantity) || 0;
                return sum + (price * quantity);
            }, 0);
        }

        const selectedAddress = getSelectedCheckoutAddress();
        const selectedShippingCost = Number(selectedShippingDetails?.cost);
        const stateShipping = Number(
            state.totals?.shippingPrice ??
            state.totals?.shipping ??
            state.totals?.shippingCost ??
            state.shippingPrice
        );

        let shipping = 0;
        if (selectedAddress && Number.isFinite(selectedShippingCost) && selectedShippingCost >= 0) {
            shipping = selectedShippingCost;
        } else if (Number.isFinite(stateShipping) && stateShipping >= 0) {
            shipping = stateShipping;
        }

        const shouldShowShipping = Boolean(selectedAddress) || (Number.isFinite(shipping) && shipping > 0);

        if (shippingRow) {
            shippingRow.style.display = shouldShowShipping ? 'flex' : 'none';
        }

        if (shouldShowShipping && shippingValue) {
            if (shipping === 0) {
                shippingValue.textContent = 'مجاني';
            } else if (Number.isFinite(shipping) && shipping > 0) {
                shippingValue.innerHTML = renderCurrencyWithIcon(shipping);
            } else {
                shippingValue.textContent = '—';
            }
        } else if (shippingValue) {
            shippingValue.textContent = '';
        }

        const rawInstallation = Number(state.totals?.installationPrice);
        let installation = Number.isFinite(rawInstallation) && rawInstallation >= 0 ? rawInstallation : computeInstallationTotalFromItems(items);
        const hasInstallationItems = installation > 0;
        const installationSupported = Boolean(selectedShippingDetails?.installationAvailable);

        if (!installationSupported) {
            installation = 0;
            if (installationAlert) {
                installationAlert.style.display = hasInstallationItems && Boolean(selectedAddress) ? 'flex' : 'none';
            }
        } else if (installationAlert) {
            installationAlert.style.display = 'none';
        }

        if (installationRow) {
            const showInstallation = installationSupported && installation > 0;
            installationRow.style.display = showInstallation ? 'flex' : 'none';
            if (showInstallation && installationValue) {
                installationValue.innerHTML = installation === 0
                    ? 'مجاني'
                    : renderCurrencyWithIcon(installation);
            } else if (installationValue) {
                installationValue.textContent = '';
            }
        }

        const declaredTotal = Number(state.totals?.total);
        let total = subtotal + (Number.isFinite(shipping) && shipping > 0 ? shipping : 0) + installation;

        if (!selectedAddress && (!Number.isFinite(shipping) || shipping < 0) && Number.isFinite(declaredTotal) && declaredTotal > 0) {
            total = declaredTotal;
        }

        if (totalValue) {
            totalValue.innerHTML = renderCurrencyWithIcon(total);
        }

        updateCheckoutShippingInfoUI(selectedAddress, shipping);
    }

    function getAuthTokenSafe() {
        return typeof getAuthToken === 'function' ? getAuthToken() : null;
    }

    function getCurrentUserSafe() {
        return typeof getAuthUser === 'function' ? getAuthUser() : null;
    }

    function ensureAuthenticated(event) {
        const token = getAuthTokenSafe();
        if (token) {
            return token;
        }

        if (typeof requireAuth === 'function') {
            requireAuth(event, 'cart.html');
        }

        showToast('يجب تسجيل الدخول لإتمام الطلب.', 'warning');
        return null;
    }

    function getCartIdSafe() {
        const state = getCartStateSafe();

        // Try multiple possible sources for cart ID
        if (state?.id) return state.id;
        if (state?._id) return state._id;
        if (typeof cartState !== 'undefined' && cartState?.id) return cartState.id;
        if (typeof cartState !== 'undefined' && cartState?._id) return cartState._id;

        // Try from localStorage
        try {
            const savedCart = localStorage.getItem('cart');
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (parsed?.id) return parsed.id;
                if (parsed?._id) return parsed._id;
            }
        } catch (e) {
            console.warn('Failed to parse cart from localStorage:', e);
        }

        console.warn('⚠️ Cart ID not found in state');
        return null;
    }

    function buildOrderPayload(selectedAddress, selectedPaymentMethod, state, user, installmentProvider) {
        const subtotal = Number(state.totals?.subtotal) || 0;
        const addressShippingDetails = selectedAddress?.shippingDetails || resolveShippingDetails(selectedAddress);
        const effectiveShippingDetails = {
            cost: Number(addressShippingDetails?.cost ?? selectedShippingDetails.cost) || 0,
            zoneId: addressShippingDetails?.zoneId || selectedShippingDetails.zoneId || selectedAddress?.regionId || null,
            zone: addressShippingDetails?.zone || selectedShippingDetails.zone || null,
            regionName: addressShippingDetails?.regionName || selectedShippingDetails.regionName || selectedAddress?.regionName || selectedAddress?.region || '',
            installationAvailable: Boolean(addressShippingDetails?.installationAvailable ?? selectedShippingDetails.installationAvailable)
        };

        const regionIdForBackend =
            effectiveShippingDetails.zoneId ||
            selectedAddress?.regionId ||
            selectedAddress?.raw?.regionId ||
            selectedAddress?.raw?.shippingRegionId ||
            selectedAddress?.raw?.shippingZoneId ||
            selectedAddress?.raw?.zoneId ||
            (typeof selectedAddress?.raw?.city === 'string' ? selectedAddress.raw.city : null) ||
            (typeof selectedAddress?.city === 'string' && /^[a-f0-9]{8,}$/i.test(selectedAddress.city) ? selectedAddress.city : null) ||
            null;

        const installationBase = Number(state.totals?.installationPrice);
        const installationFallback = computeInstallationTotalFromItems(state.items);
        const installationSupported = Boolean(effectiveShippingDetails.installationAvailable);
        const installationPrice = installationSupported
            ? (Number.isFinite(installationBase) && installationBase >= 0 ? installationBase : installationFallback)
            : 0;

        const payload = {
            paymentMethod: selectedPaymentMethod || CASH_PAYMENT_METHOD,
            shippingPrice: effectiveShippingDetails.cost,
            taxPrice: 0,
            installationPrice,
            totalOrderPrice: subtotal + effectiveShippingDetails.cost + installationPrice,
            cartItems: state.items.map(item => ({
                productId: item.productId || item.id,
                quantity: item.quantity,
                price: item.price,
                name: item.name || 'منتج'
            }))
        };

        // DON'T include cartId in payload - it goes in URL
        // Add user ID if available
        if (user?.id) {
            payload.userId = user.id;
        } else if (user?._id) {
            payload.userId = user._id;
        }

        // Customer name
        const customerName = (user?.name || '').trim();
        payload.customerName = customerName || 'عميل';

        // Customer email/account
        if (user?.email) {
            payload.customerAccount = user.email;
        }

        // Shipping address
        if (selectedAddress) {
            const addressDetails = selectedAddress.details || selectedAddress.line1 || selectedAddress.street || selectedAddress.address || '';
            payload.shippingAddress = {
                addressId: selectedAddress._id || selectedAddress.id || undefined,
                type: selectedAddress.type || 'home',
                details: addressDetails,
                addressLine1: addressDetails,
                address: addressDetails,
                line1: addressDetails,
                city: regionIdForBackend || '',
                region: effectiveShippingDetails.regionName || selectedAddress.region || selectedAddress.state || '',
                regionId: effectiveShippingDetails.zoneId || selectedAddress.regionId || null,
                regionName: effectiveShippingDetails.regionName || selectedAddress.regionName || '',
                postalCode: selectedAddress.postalCode || selectedAddress.zip || '',
                phone: selectedAddress.phone || user?.phone || '',
                recipientName: payload.customerName,
                name: payload.customerName,
                shippingZoneId: effectiveShippingDetails.zoneId || null,
                shippingPrice: payload.shippingPrice,
                shippingCost: payload.shippingPrice
            };
        }

        if (effectiveShippingDetails.zoneId) {
            payload.shippingRegionId = effectiveShippingDetails.zoneId;
            payload.shippingZoneId = effectiveShippingDetails.zoneId;
        }

        if (effectiveShippingDetails.regionName) {
            payload.shippingRegionName = effectiveShippingDetails.regionName;
        }

        if (payload.paymentMethod === 'installment' && installmentProvider) {
            payload.paymentDetails = {
                provider: installmentProvider
            };
        }

        console.log('📦 Order Payload:', payload);
        return payload;
    }

    async function postOrderRequest(payload, token) {
        const endpoint = ORDER_ENDPOINTS.create();

        console.log('🚀 Sending order to backend...');
        console.log('📍 Endpoint:', endpoint);
        console.log('🔑 Token:', token ? 'Present' : 'Missing');
        console.log('📦 Payload:', payload);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            // Try both authorization formats
            headers['Authorization'] = `Bearer ${token}`;
            headers['token'] = token; // Some backends use this
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        console.log('📡 Response status:', response.status);
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('❌ Backend error:', result);

            // Special handling for authorization errors
            if (response.status === 401 || response.status === 403) {
                console.error('🚫 Authorization failed - Token might be invalid or expired');
                console.error('Current token:', token);
            }

            const message = result?.message || result?.error || 'تعذر إنشاء الطلب. حاول مرة أخرى.';
            const error = new Error(message);
            error.status = response.status;
            error.details = result;
            throw error;
        }

        console.log('✅ Order created successfully:', result);
        return result;
    }

    async function processOrderSubmission({ paymentMethod, payload, token, cartId }) {
        if (paymentMethod === 'card') {
            return initiatePayTabsPayment({ payload, token, cartId });
        }

        const orderResponse = await postOrderRequest(payload, token);
        return {
            message: orderResponse?.message || orderResponse?.data?.message,
            data: orderResponse
        };
    }

    async function initiatePayTabsPayment({ payload, token, cartId }) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['token'] = token;
        }

        const normalizedCartItems = Array.isArray(payload.cartItems) ? payload.cartItems.map((item, index) => {
            const productSource = item?.product || item?.productId || item?.rawProduct || {};
            const productIdValue = typeof item?.productId === 'object'
                ? (item.productId._id || item.productId.id || item.productId.value)
                : (item.productId || item.id);

            const resolvedName = item?.name || productSource?.name || `منتج ${index + 1}`;
            const resolvedPrice = Number(item?.price ?? productSource?.price ?? productSource?.unitPrice ?? 0);
            const resolvedQuantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;

            return {
                productId: productIdValue,
                quantity: resolvedQuantity,
                price: resolvedPrice,
                name: resolvedName,
                productName: resolvedName,
                product: {
                    _id: productIdValue,
                    name: resolvedName,
                    price: resolvedPrice,
                    images: productSource?.images || []
                }
            };
        }) : [];

        const customerPayload = {
            name: payload.customerName,
            email: payload.customerAccount || undefined,
            phone: payload.shippingAddress?.phone || undefined
        };

        const payTabsPayload = {
            cartId,
            paymentMethod: payload.paymentMethod,
            totalOrderPrice: payload.totalOrderPrice,
            shippingPrice: payload.shippingPrice,
            taxPrice: payload.taxPrice,
            shippingAddress: {
                ...payload.shippingAddress,
                name: payload.shippingAddress?.name || payload.customerName
            },
            cartItems: normalizedCartItems,
            customerName: payload.customerName,
            customerAccount: payload.customerAccount,
            customer: customerPayload
        };

        console.log('🚀 Initiating PayTabs payment...');
        console.log('📍 Endpoint:', ORDER_ENDPOINTS.payWithPayTabs());
        console.log('📦 Payload:', payTabsPayload);

        const response = await fetch(ORDER_ENDPOINTS.payWithPayTabs(), {
            method: 'POST',
            headers,
            body: JSON.stringify(payTabsPayload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('❌ PayTabs API error:', result);
            const message = result?.message || result?.error || 'تعذر بدء عملية الدفع عبر البطاقات.';
            const error = new Error(message);
            error.status = response.status;
            error.details = result;
            throw error;
        }

        const redirectUrl =
            result?.data?.redirectUrl ||
            result?.data?.redirect_url ||
            result?.redirectUrl ||
            result?.redirect_url ||
            result?.data?.paymentUrl ||
            result?.paymentUrl;

        if (!redirectUrl) {
            console.error('⚠️ PayTabs response missing redirect URL:', result);
            const error = new Error('لم يتم استلام رابط الدفع من بوابة PayTabs.');
            error.status = response.status;
            error.details = result;
            throw error;
        }

        console.log('🔗 PayTabs redirect URL:', redirectUrl);

        return {
            redirectUrl,
            message: result?.message || 'جاري تحويلك إلى بوابة الدفع...'
        };
    }

    function toggleSubmitButton(submitBtn, isLoading, originalContent) {
        if (!submitBtn) return;

        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> جاري المعالجة...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    }

    async function submitOrderWithSelectedAddress(event) {
        event.preventDefault();

        const confirmBtn = event.currentTarget;
        const originalContent = confirmBtn.innerHTML;

        if (!selectedCheckoutAddressId) {
            showToast('يرجى اختيار عنوان الشحن أولاً.', 'info');
            return;
        }

        const selectedAddress = checkoutAddressesCache.find(address => isSameAddress(address, selectedCheckoutAddressId));
        if (!selectedAddress) {
            showToast('لم يتم العثور على العنوان المحدد.', 'error');
            return;
        }

        if (!selectedAddress.shippingDetails) {
            selectedAddress.shippingDetails = resolveShippingDetails(selectedAddress);
        }
        const refreshedShipping = selectedAddress.shippingDetails || resolveShippingDetails(selectedAddress);
        selectedShippingDetails = {
            cost: Number(refreshedShipping?.cost ?? selectedShippingDetails.cost) || 0,
            zoneId: refreshedShipping?.zoneId || selectedAddress.regionId || selectedShippingDetails.zoneId,
            zone: refreshedShipping?.zone || selectedAddress.shippingZone || selectedShippingDetails.zone,
            regionName: refreshedShipping?.regionName || selectedAddress.regionName || selectedAddress.region || selectedShippingDetails.regionName || '',
            installationAvailable: Boolean(refreshedShipping?.installationAvailable ?? selectedAddress.installationAvailable ?? selectedShippingDetails.installationAvailable)
        };
        updateSummaryTotals();

        const paymentSelect = document.getElementById('checkoutPaymentMethod');
        if (!paymentSelect) {
            showToast('يرجى اختيار طريقة الدفع.', 'info');
            return;
        }

        const selectedPaymentMethod = paymentSelect.value;
        if (!selectedPaymentMethod) {
            showToast('يرجى اختيار طريقة الدفع.', 'info');
            return;
        }

        const installmentProviderSelect = document.getElementById('checkoutInstallmentProvider');
        const installmentProvider = installmentProviderSelect ? (installmentProviderSelect.value || '').trim() : '';

        if (selectedPaymentMethod === 'installment' && !installmentProvider) {
            showToast('يرجى اختيار مقدم خدمة التقسيط.', 'info');
            return;
        }

        const token = ensureAuthenticated(event);
        if (!token) {
            return;
        }

        console.log('🔄 Refreshing cart state...');
        await ensureCartStateLoaded(true);

        const state = getCartStateSafe();
        if (!Array.isArray(state.items) || !state.items.length) {
            showToast('سلة المشتريات فارغة.', 'warning');
            return;
        }

        const cartId = getCartIdSafe();
        if (!cartId) {
            showToast('خطأ في معرف السلة. يرجى تحديث الصفحة والمحاولة مرة أخرى.', 'error');
            console.error('❌ Cannot proceed without cart ID');
            return;
        }

        const user = getCurrentUserSafe();

        if (state.userId && user?.id && state.userId !== user.id) {
            console.error('❌ Cart user mismatch!');
            console.error('Cart userId:', state.userId);
            console.error('Current user id:', user.id);
            showToast('هذه السلة لا تنتمي لحسابك. يرجى تحديث الصفحة.', 'error');
            return;
        }

        const payload = buildOrderPayload(selectedAddress, selectedPaymentMethod, state, user, installmentProvider);

        toggleSubmitButton(confirmBtn, true, originalContent);

        try {
            const handlingResult = await processOrderSubmission({
                paymentMethod: selectedPaymentMethod,
                payload,
                token,
                cartId
            });

            if (handlingResult?.redirectUrl) {
                window.location.href = handlingResult.redirectUrl;
                return;
            }

            if (handlingResult?.message) {
                showToast(handlingResult.message, 'success');
            } else {
                showToast('تم إنشاء الطلب بنجاح! سيتم التواصل معك قريباً.', 'success');
            }

            await finalizeSuccessfulOrder();
        } catch (error) {
            console.error('❌ Order submission failed:', error);

            let errorMessage = 'تعذر إنشاء الطلب. حاول مرة أخرى.';

            if (error.status === 400) {
                errorMessage = error.message || 'بيانات الطلب غير صحيحة.';
            } else if (error.status === 401) {
                errorMessage = 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.';
            } else if (error.status === 403) {
                errorMessage = 'هذه السلة لا تنتمي لحسابك.';
            } else if (error.status === 404) {
                errorMessage = 'السلة غير موجودة. يرجى تحديث الصفحة.';
            } else if (error.status === 500) {
                errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
            }

            showToast(errorMessage, 'error');
        } finally {
            toggleSubmitButton(confirmBtn, false, originalContent);
        }
    }

    async function finalizeSuccessfulOrder() {
        try {
            if (typeof clearCartContents === 'function') {
                await clearCartContents();
            }
        } catch (clearError) {
            console.error('❌ Failed to clear cart after order:', clearError);
        }

        try {
            updateCartCount();
            renderCart();
        } catch (uiError) {
            console.warn('⚠️ Failed to update cart UI after order:', uiError);
        }

        redirectToProfileOrders();
    }

    function updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount && typeof getCartItemCount === 'function') {
            cartCount.textContent = getCartItemCount().toString();
        }
    }

    // Initialize on page load
    window.addEventListener('load', () => {
        console.log('🛒 Cart page loaded');
        ensureCartStateLoaded(true)
            .then(() => {
                const cartId = getCartIdSafe();
                if (cartId) {
                    console.log('✅ Cart loaded with ID:', cartId);
                } else {
                    console.warn('⚠️ Cart loaded but no ID found');
                }
            })
            .catch(error => {
                console.error('❌ Failed to load cart on page load:', error);
            })
            .finally(() => {
                renderCart();
                updateCartCount();
            });
    });

    // Listen for cart updates
    document.addEventListener('cart:updated', () => {
        console.log('🔄 Cart updated event received');
        renderCart();
        updateCartCount();
    });

    document.addEventListener('cart:loading', ({ detail }) => {
        if (!detail?.loading) return;
        const container = document.getElementById('cartContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-cart" style="width: 100%; text-align: center; padding: 40px 0;">
                    <i class="fa fa-spinner fa-spin" style="font-size: 36px; margin-bottom: 15px;"></i>
                    <h3>جاري تحميل السلة...</h3>
                </div>
            `;
        }
    });

    // Input formatting
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof setupLazyImageLoading === 'function') {
            setupLazyImageLoading();
        }

        // Only numbers for phone
        const phoneInput = document.querySelector('input[name="phone"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function (e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    });

    // Export functions for external use
    function submitOrder(event) {
        return submitOrderWithSelectedAddress(event);
    }

    window.actionSportsOrders = {
        getCartIdSafe,
        submitOrder,
        buildOrderPayload
    };

})();