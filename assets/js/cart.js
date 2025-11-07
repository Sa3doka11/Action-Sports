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

                    <div class="payment-form" id="paymentForm">
                        <h3>معلومات الدفع والشحن</h3>
                        <form id="orderForm">
                            <div class="form-group">
                                <label>الاسم الكامل *</label>
                                <input type="text" name="fullname" required placeholder="أدخل اسمك الكامل">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>رقم الهاتف *</label>
                                    <input type="tel" name="phone" required placeholder="01234567890" pattern="[0-9]{11}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>العنوان *</label>
                                <textarea name="address" rows="3" required placeholder="أدخل عنوان الشحن بالتفصيل"></textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>المدينة *</label>
                                    <input type="text" name="city" required placeholder="القاهرة">
                                </div>
                                <div class="form-group">
                                    <label>الرمز البريدي</label>
                                    <input type="text" name="postal" placeholder="12345">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>طريقة الدفع *</label>
                                <select name="payment_method" id="paymentMethod" required>
                                    <option value="">اختر طريقة الدفع</option>
                                    <option value="cash">الدفع عند الاستلام</option>
                                    <option value="installment">برنامج التقسيط</option>
                                    <option value="card">بطاقة ائتمان</option>
                                </select>
                            </div>

                            <div id="installmentProviders" class="payment-field" style="display: none;">
                                <div class="payment-info-alert">
                                    <i class="fa fa-hand-holding-usd"></i>
                                    <p>
                                        اختر مقدم خدمة التقسيط المفضل لديك.
                                    </p>
                                </div>
                                <div class="form-group">
                                    <label>مقدم خدمة التقسيط *</label>
                                    <select name="installment_provider">
                                        <option value="">اختر البرنامج</option>
                                        <option value="tabby">Tabby</option>
                                        <option value="tamara">Tamara</option>
                                    </select>
                                </div>
                            </div>

                            <div id="cashMessage" class="payment-field" style="display: none;">
                                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-right: 4px solid #4caf50; margin-bottom: 20px;">
                                    <i class="fa fa-check-circle" style="color: #4caf50; margin-left: 10px;"></i>
                                    <strong>الدفع عند الاستلام</strong>
                                    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                                        سيتم تحصيل قيمة الطلب عند استلام المنتج. يرجى تجهيز المبلغ المطلوب.
                                    </p>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>ملاحظات إضافية</label>
                                <textarea name="notes" rows="2" placeholder="أي ملاحظات خاصة بالطلب"></textarea>
                            </div>
                            <button type="submit" class="submit-order-btn">
                                <i class="fa fa-check"></i> تأكيد وإرسال الطلب
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        bindCartInteractions(container);
    }

    function bindCartInteractions(container) {
        const paymentForm = container.querySelector('#paymentForm');
        const paymentMethod = container.querySelector('#paymentMethod');
        const checkoutButton = container.querySelector('#checkoutButton');

        if (checkoutButton) {
            checkoutButton.addEventListener('click', function (event) {
                if (typeof requireAuth === 'function' && !requireAuth(event, 'cart.html')) {
                    if (typeof showToast === 'function') {
                        showToast('يجب تسجيل الدخول قبل إتمام الشراء.', 'warning');
                    }
                    return;
                }
                showPaymentForm(event);
            });
        }

        if (paymentMethod) {
            paymentMethod.addEventListener('change', handlePaymentMethodChange);
            updateSummaryTotals(paymentMethod.value);
        }

        container.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', handleQuantityChange);
        });

        container.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', handleRemoveItem);
        });

        if (paymentForm) {
            paymentForm.addEventListener('submit', submitOrder);
        }
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

    function showPaymentForm() {
        const form = document.getElementById('paymentForm');
        if (form) {
            form.classList.toggle('show');
        }
    }

    function handlePaymentMethodChange() {
        const paymentMethod = document.getElementById('paymentMethod');
        const cashMessage = document.getElementById('cashMessage');
        const installmentProviders = document.getElementById('installmentProviders');

        if (!paymentMethod || !cashMessage || !installmentProviders) {
            return;
        }

        cashMessage.style.display = 'none';
        installmentProviders.style.display = 'none';

        const providerSelect = installmentProviders.querySelector('select');
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

        updateSummaryTotals(paymentMethod.value);
    }

    function updateSummaryTotals(selectedMethod) {
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

    function isCashPayment(formData) {
        const selectedMethod = formData.get('payment_method');
        if (selectedMethod === CASH_PAYMENT_METHOD) {
            return true;
        }

        if (selectedMethod === 'installment') {
            const provider = (formData.get('installment_provider') || '').trim();
            if (!provider) {
                showToast('يرجى اختيار مقدم خدمة التقسيط.', 'info');
                return false;
            }
            return true;
        }

        showToast('سيتم تحويلك لصفحة الدفع بالبطاقة.', 'info');
        return false;
    }

    function buildShippingAddress(formData) {
        const addressEntries = {
            details: (formData.get('address') || '').trim(),
            phone: (formData.get('phone') || '').trim(),
            city: (formData.get('city') || '').trim(),
            postalCode: (formData.get('postal') || '').trim()
        };

        return Object.fromEntries(Object.entries(addressEntries).filter(([, value]) => Boolean(value)));
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

    function buildOrderPayload(formData, state, user) {
        const subtotal = Number(state.totals?.subtotal) || 0;

        const payload = {
            paymentMethod: formData.get('payment_method') || CASH_PAYMENT_METHOD,
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
        const customerName = (formData.get('fullname') || user?.name || '').trim();
        payload.customerName = customerName || 'عميل';

        // Customer email/account
        if (user?.email) {
            payload.customerAccount = user.email;
        }

        // Notes
        const notes = (formData.get('notes') || '').trim();
        if (notes) {
            payload.notes = notes;
        }

        // Shipping address
        const shippingAddress = buildShippingAddress(formData);
        if (Object.keys(shippingAddress).length) {
            payload.shippingAddress = shippingAddress;
        }

        const paymentMethod = payload.paymentMethod;
        const installmentProvider = (formData.get('installment_provider') || '').trim();

        if (paymentMethod === 'installment' && installmentProvider) {
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

    async function submitOrder(event) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = form.querySelector('[type="submit"]');
        const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';

        const formData = new FormData(form);
        const token = ensureAuthenticated(event);
        if (!token) {
            return;
        }

        const paymentMethod = formData.get('payment_method');
        if (paymentMethod === 'card') {
            window.location.href = 'card-payment.html';
            return;
        }

        if (!isCashPayment(formData)) {
            return;
        }

        // Ensure cart is loaded and fresh
        console.log('🔄 Refreshing cart state...');
        await ensureCartStateLoaded(true);

        const state = getCartStateSafe();
        if (!Array.isArray(state.items) || !state.items.length) {
            showToast('سلة المشتريات فارغة.', 'warning');
            return;
        }

        // Validate cart ID
        const cartId = getCartIdSafe();
        if (!cartId) {
            showToast('خطأ في معرف السلة. يرجى تحديث الصفحة والمحاولة مرة أخرى.', 'error');
            console.error('❌ Cannot proceed without cart ID');
            return;
        }

        const user = getCurrentUserSafe();

        // Debug logs
        console.log('👤 Current User:', user);
        console.log('🛒 Cart ID:', cartId);
        console.log('🛒 Full Cart State:', state);
        console.log('🔑 Token:', token);

        // Check if cart belongs to user (if userId is available in cart)
        if (state.userId && user?.id && state.userId !== user.id) {
            console.error('❌ Cart user mismatch!');
            console.error('Cart userId:', state.userId);
            console.error('Current user id:', user.id);
            showToast('هذه السلة لا تنتمي لحسابك. يرجى تحديث الصفحة.', 'error');
            return;
        }

        const payload = buildOrderPayload(formData, state, user);

        toggleSubmitButton(submitBtn, true, originalBtnContent);

        try {
            const orderResult = await postOrderRequest(payload, token, cartId);

            showToast('تم إنشاء الطلب بنجاح! سيتم التواصل معك قريباً.', 'success');

            // Clear cart after successful order
            try {
                if (typeof clearCartContents === 'function') {
                    await clearCartContents();
                }
            } catch (clearError) {
                console.error('❌ Failed to clear cart after order:', clearError);
            }

            // Keep user on the same page and show success modal if available
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.style.display = 'flex';
            }

            renderCart();
            updateCartCount();

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
            toggleSubmitButton(submitBtn, false, originalBtnContent);
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