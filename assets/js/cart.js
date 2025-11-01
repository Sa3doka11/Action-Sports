/* ===================================================================
8. Cart Page Functionality payment methods
=================================================================== */

(function () {
    'use strict';

    const FALLBACK_IMAGE = 'assets/images/product1.png';
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

        const subtotal = state.totals.subtotal || 0;
        const shipping = state.totals.shipping != null ? state.totals.shipping : 50;
        const total = state.totals.total || (subtotal + shipping);

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
                    <div class="cart-item-price">${formatCartPrice(item.price)} <img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;"></img></div>
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
                        <span>${formatCartPrice(subtotal)} <img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;"></img></span>
                    </div>
                    <div class="summary-row">
                        <span>الشحن:</span>
                        <span>${formatCartPrice(shipping)} <img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;"></img></span>
                    </div>
                    <div class="summary-row total">
                        <span>الإجمالي:</span>
                        <span class="price">${formatCartPrice(total)} <img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;"></img></span>
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
                                    <option value="instapay">انستاباي (InstaPay)</option>
                                    <option value="installment">برنامج التقسيط</option>
                                    <option value="card">بطاقة ائتمان</option>
                                </select>
                            </div>

                            <div class="form-group payment-field" id="instaPayField" style="display: none;">
                                <div class="payment-info-alert">
                                    <i class="fa fa-info-circle"></i>
                                    <p>
                                        <strong>الدفع عبر انستاباي:</strong><br>
                                        سيتم التواصل معك لإتمام عملية الدفع عبر انستاباي. تأكد من إدخال رقم المحفظة الصحيح.
                                    </p>
                                </div>
                                <label>
                                    <i class="fa fa-mobile-alt"></i> رقم المحفظة (InstaPay) *
                                </label>
                                <input type="text" name="instapay_number" placeholder="01234567890" pattern="[0-9]{11}" maxlength="11">
                                <small style="color: #7a7a7a; display: block; margin-top: 5px;">
                                    <i class="fa fa-check-circle" style="color: #28a745;"></i> أدخل رقم محفظة انستاباي المسجل باسمك
                                </small>
                            </div>

                            <div id="cardFields" class="payment-field" style="display: none;">
                                <div class="form-group">
                                    <label>
                                        <i class="fa fa-credit-card"></i> رقم البطاقة *
                                    </label>
                                    <input type="text" name="card_number" placeholder="1234 5678 9012 3456" maxlength="19">
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>تاريخ الانتهاء *</label>
                                        <input type="text" name="card_expiry" placeholder="MM/YY" maxlength="5">
                                    </div>
                                    <div class="form-group">
                                        <label>CVV *</label>
                                        <input type="text" name="card_cvv" placeholder="123" maxlength="3">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>اسم حامل البطاقة *</label>
                                    <input type="text" name="card_holder" placeholder="الاسم كما يظهر على البطاقة">
                                </div>
                            </div>

                            <div id="installmentMessage" class="payment-field" style="display: none;">
                                <div class="payment-info-alert">
                                    <i class="fa fa-info-circle"></i>
                                    <p>
                                        <strong>برنامج التقسيط:</strong><br>
                                        خدمة التقسيط غير متاحة حالياً، لكننا نعمل على توفيرها قريباً.
                                        سنقوم بإبلاغك فور تفعيلها.
                                    </p>
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
            checkoutButton.addEventListener('click', function(event) {
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
        const instaPayField = document.getElementById('instaPayField');
        const cardFields = document.getElementById('cardFields');
        const cashMessage = document.getElementById('cashMessage');
        const installmentMessage = document.getElementById('installmentMessage');

        if (!paymentMethod || !instaPayField || !cardFields || !cashMessage || !installmentMessage) {
            return;
        }

        instaPayField.style.display = 'none';
        cardFields.style.display = 'none';
        cashMessage.style.display = 'none';
        installmentMessage.style.display = 'none';

        document.querySelectorAll('.payment-field input').forEach(input => {
            input.removeAttribute('required');
        });

        switch (paymentMethod.value) {
            case 'instapay': {
                instaPayField.style.display = 'block';
                const instaPayInput = instaPayField.querySelector('input');
                if (instaPayInput) instaPayInput.setAttribute('required', 'required');
                break;
            }
            case 'card': {
                cardFields.style.display = 'block';
                cardFields.querySelectorAll('input').forEach(input => {
                    input.setAttribute('required', 'required');
                });
                break;
            }
            case 'installment': {
                installmentMessage.style.display = 'block';
                break;
            }
            case 'cash': {
                cashMessage.style.display = 'block';
                break;
            }
            default:
                break;
        }
    }

    function submitOrder(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const orderData = {};

        for (const [key, value] of formData.entries()) {
            orderData[key] = value;
        }

        const state = getCartStateSafe();
        orderData.items = state.items;
        orderData.total = state.totals.total;

        console.log('Order Data:', orderData);
        showToast('تم إرسال طلبك بنجاح! سيتم التواصل معك للتأكيد.', 'success');

        ensureCartStateLoaded()
            .then(() => clearCartContents())
            .catch(error => console.error('❌ Failed to clear cart after order:', error));

        const modal = document.getElementById('successModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount && typeof getCartItemCount === 'function') {
            cartCount.textContent = getCartItemCount().toString();
        }
    }

    window.addEventListener('load', () => {
        ensureCartStateLoaded()
            .catch(error => {
                console.warn('⚠️ Failed to load cart on cart page:', error);
            })
            .finally(() => {
                renderCart();
                updateCartCount();
            });
    });

    document.addEventListener('cart:updated', () => {
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

    document.addEventListener('DOMContentLoaded', function () {
        const cardNumberInput = document.querySelector('input[name="card_number"]');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\s/g, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Format expiry date (MM/YY)
        const expiryInput = document.querySelector('input[name="card_expiry"]');
        if (expiryInput) {
            expiryInput.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // Only numbers for CVV
        const cvvInput = document.querySelector('input[name="card_cvv"]');
        if (cvvInput) {
            cvvInput.addEventListener('input', function (e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }

        // Only numbers for InstaPay
        const instaPayInput = document.querySelector('input[name="instapay_number"]');
        if (instaPayInput) {
            instaPayInput.addEventListener('input', function (e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }

        // Only numbers for phone
        const phoneInput = document.querySelector('input[name="phone"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function (e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    });

})();