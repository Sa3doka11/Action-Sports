/* ===================================================================
8. Cart Page Functionality with Backend Integration
=================================================================== */

(function () {
    'use strict';
    const API_BASE_HOST = "https://action-sports-api.vercel.app/api";
    const FALLBACK_IMAGE = 'assets/images/product1.png';
    const SHIPPING_FEE = 50;
    const CASH_PAYMENT_METHOD = 'cash';
    const CURRENCY_ICON_HTML = '<img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;">';

    const CHECKOUT_FALLBACK_ADDRESS_ID = 'checkout-fallback-address';

    const ORDER_ENDPOINTS = {
        create: (cartId) => `${API_BASE_HOST}/orders${cartId ? `/${cartId}` : ''}`,
        getAll: () => `${API_BASE_HOST}/orders`,
        getById: (id) => `${API_BASE_HOST}/orders/${id}`,
        getMyOrders: () => `${API_BASE_HOST}/orders/me`,
        deliver: (id) => `${API_BASE_HOST}/orders/${id}/deliver`,
        cancel: (id) => `${API_BASE_HOST}/orders/${id}/cancel`
    };

    const productMetadataCache = (() => {
        if (typeof window !== 'undefined' && window.__actionSportsProductMetadata__ instanceof Map) {
            return window.__actionSportsProductMetadata__;
        }
        return new Map();
    })();

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
        return {
            _id: address._id || address.id || CHECKOUT_FALLBACK_ADDRESS_ID,
            id: address._id || address.id || CHECKOUT_FALLBACK_ADDRESS_ID,
            type: address.type || 'home',
            details: address.details || address.line1 || address.street || '',
            city: address.city || '',
            postalCode: address.postalCode || address.zip || '',
            phone: address.phone || ''
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

        const shipping = (() => {
            const declared = Number(state.totals?.shipping);
            if (Number.isFinite(declared) && declared > 0) return declared;
            return state.items.length ? SHIPPING_FEE : 0;
        })();

        const total = (() => {
            const declared = Number(state.totals?.total);
            if (Number.isFinite(declared) && declared > 0) return declared;
            return subtotal + shipping;
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
                    <div class="summary-row">
                        <span>الشحن:</span>
                        <span>${renderCurrencyWithIcon(shipping)}</span>
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
                        <div class="address-selection-actions">
                            <button type="button" class="action-btn primary" id="addCheckoutAddressBtn">
                                <i class="fa fa-plus"></i> إضافة عنوان جديد
                            </button>
                        </div>

                        <div class="checkout-payment" id="checkoutPaymentSection">
                            <div class="form-group">
                                <label for="checkoutPaymentMethod">طريقة الدفع *</label>
                                <select name="payment_method" id="checkoutPaymentMethod" required>
                                    <option value="cash">الدفع عند الاستلام</option>
                                    <option value="installment">برنامج التقسيط</option>
                                    <option value="card">بطاقة ائتمان</option>
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
    }

    function bindCartInteractions(container) {
        const checkoutButton = container.querySelector('#checkoutButton');
        const confirmOrderButton = container.querySelector('#confirmOrderButton');
        const addAddressButton = container.querySelector('#addCheckoutAddressBtn');
        const paymentMethod = container.querySelector('#checkoutPaymentMethod');

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

        if (paymentMethod) {
            paymentMethod.addEventListener('change', handleCheckoutPaymentChange);
            handleCheckoutPaymentChange();
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

        const token = getAuthTokenSafe();
        if (!token) {
            list.innerHTML = '';
            emptyState.textContent = 'يرجى تسجيل الدخول لعرض عناوينك المسجلة.';
            emptyState.style.display = 'block';
            return;
        }

        try {
            const response = await getJson(USER_ENDPOINTS.addresses, token);
            const addresses = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

            checkoutAddressesCache = addresses;
            checkoutAddressesLoaded = true;
            renderCheckoutAddresses(addresses);
        } catch (error) {
            console.error('❌ Failed to load checkout addresses:', error);
            const hydrated = populateCheckoutAddressesFallbackFromStoredUser();
            if (!hydrated) {
                list.innerHTML = '';
                emptyState.textContent = error.message || 'حدث خطأ أثناء تحميل العناوين. يرجى المحاولة مرة أخرى.';
                emptyState.style.display = 'block';
            }
        }
    }

    function renderCheckoutAddresses(addresses) {
        const list = document.getElementById('checkoutAddressList');
        const emptyState = document.getElementById('checkoutAddressesEmpty');
        const confirmBtn = document.getElementById('confirmOrderButton');
        if (!list || !emptyState) return;

        if (!Array.isArray(addresses) || !addresses.length) {
            const hydrated = populateCheckoutAddressesFallbackFromStoredUser();
            if (!hydrated) {
                list.innerHTML = '';
                emptyState.style.display = 'block';
                selectedCheckoutAddressId = null;
                if (confirmBtn) confirmBtn.disabled = true;
            }
            return;
        }

        emptyState.style.display = 'none';

        if (!selectedCheckoutAddressId) {
            selectedCheckoutAddressId = addresses[0]?._id || addresses[0]?.id || null;
        }

        list.innerHTML = addresses.map(address => renderCheckoutAddressCard(address, isSameAddress(address, selectedCheckoutAddressId))).join('');

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
        const city = address?.city || '—';
        const postal = address?.postalCode || address?.zip || '—';
        const phone = address?.phone || '—';

        return `
            <label class="checkout-address-card ${selected ? 'selected' : ''}" data-address-id="${id}">
                <input type="radio" name="selectedAddress" value="${id}" ${selected ? 'checked' : ''}>
                <div class="checkout-address-content">
                    <div class="checkout-address-type">
                        <span class="address-type-pill">${typeLabel}</span>
                    </div>
                    <div class="checkout-address-lines">
                        <div class="address-line"><i class="fa fa-map-marker-alt"></i><span>${details}</span></div>
                        <div class="address-line"><i class="fa fa-city"></i><span>${city}</span></div>
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

    function highlightSelectedAddress() {
        const cards = document.querySelectorAll('.checkout-address-card');
        const confirmBtn = document.getElementById('confirmOrderButton');
        cards.forEach(card => {
            const id = card.dataset.addressId;
            if (id && String(id) === String(selectedCheckoutAddressId)) {
                card.classList.add('selected');
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            } else {
                card.classList.remove('selected');
            }
        });

        if (confirmBtn) {
            confirmBtn.disabled = !selectedCheckoutAddressId;
        }
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
                        <label>تفاصيل العنوان</label>
                        <textarea name="details" rows="3" required placeholder="مثل: الشارع، رقم المنزل، العلامات المميزة"></textarea>
                    </div>
                    <div class="address-form-group">
                        <label>المدينة</label>
                        <input type="text" name="city" required placeholder="القاهرة">
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
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const payload = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));

            if (!payload.details || !payload.city || !payload.phone) {
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

        const body = {
            type: payload.type || 'home',
            details: payload.details,
            city: payload.city,
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
                window.location.href = 'card-payment.html';
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

        const state = getCartStateSafe();
        const subtotal = Number(state.totals?.subtotal) || 0;
        const shipping = state.totals?.shipping != null ? state.totals.shipping : SHIPPING_FEE;
        const total = state.totals?.total || (subtotal + shipping);

        if (totalValue) {
            totalValue.innerHTML = renderCurrencyWithIcon(total);
        }
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

        const payload = {
            paymentMethod: selectedPaymentMethod || CASH_PAYMENT_METHOD,
            shippingPrice: SHIPPING_FEE,
            taxPrice: 0,
            totalOrderPrice: subtotal + SHIPPING_FEE,
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
                city: selectedAddress.city || '',
                region: selectedAddress.region || selectedAddress.state || '',
                postalCode: selectedAddress.postalCode || selectedAddress.zip || '',
                phone: selectedAddress.phone || user?.phone || '',
                recipientName: payload.customerName,
                name: payload.customerName
            };
        }

        if (payload.paymentMethod === 'installment' && installmentProvider) {
            payload.paymentDetails = {
                provider: installmentProvider
            };
        }

        console.log('📦 Order Payload:', payload);
        return payload;
    }

    async function postOrderRequest(payload, token, cartId) {
        if (!cartId) {
            throw new Error('Cart ID is required to create an order');
        }

        console.log('🚀 Sending order to backend...');
        console.log('📍 Endpoint:', ORDER_ENDPOINTS.create(cartId));
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

        const response = await fetch(ORDER_ENDPOINTS.create(cartId), {
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

        if (selectedPaymentMethod === 'card') {
            window.location.href = 'card-payment.html';
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
            const orderResult = await postOrderRequest(payload, token, cartId);

            showToast('تم إنشاء الطلب بنجاح! سيتم التواصل معك قريباً.', 'success');

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
    window.actionSportsOrders = {
        getCartIdSafe,
        submitOrder,
        buildOrderPayload
    };

})();