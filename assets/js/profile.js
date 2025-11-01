// ===================================================================
// CUSTOM ALERT FUNCTIONS
// ===================================================================

// Display custom modal alert and resolve when dismissed
function showCustomAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        overlay.innerHTML = `
            <div class="custom-alert">
                <div class="custom-alert-header">
                    <h3 class="custom-alert-title">تنبيه</h3>
                </div>
                <div class="custom-alert-message">${message}</div>
                <div class="custom-alert-buttons">
                    <button class="custom-alert-btn primary">حسناً</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('show'), 10);
        
        overlay.querySelector('.custom-alert-btn').onclick = function() {
            overlay.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(true);
            }, 300);
        };
        
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(false);
                }, 300);
            }
        };
    });
}

// Show confirm dialog returning promise resolved with user choice
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        overlay.innerHTML = `
            <div class="custom-alert">
                <div class="custom-alert-header">
                    <h3 class="custom-alert-title">تأكيد</h3>
                </div>
                <div class="custom-alert-message">${message}</div>
                <div class="custom-alert-buttons">
                    <button class="custom-alert-btn primary confirm-yes">نعم</button>
                    <button class="custom-alert-btn secondary confirm-no">لا</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('show'), 10);
        
        overlay.querySelector('.confirm-yes').onclick = function() {
            overlay.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(true);
            }, 300);
        };
        
        overlay.querySelector('.confirm-no').onclick = function() {
            overlay.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(false);
            }, 300);
        };
    });
}

// ===================================================================
// EDIT PROFILE MODAL
// ===================================================================

// Build and present editable modal populated with current profile info
function showEditProfileModal() {
    const currentName = document.getElementById('fullName').textContent.trim();
    const currentEmail = document.getElementById('userEmail').textContent.trim();
    const currentPhone = document.getElementById('phone').textContent.trim();
    const currentAddress = document.getElementById('address').textContent.trim();
    const currentCity = document.getElementById('city')?.textContent.trim() || '';
    const currentPostalCode = document.getElementById('postalCode')?.textContent.trim() || '';
    
    const modal = document.createElement('div');
    modal.className = 'edit-profile-modal';
    modal.id = 'editProfileModal';
    
    modal.innerHTML = `
        <div class="edit-profile-content">
            <div class="edit-modal-header">
                <h3 class="edit-modal-title">تعديل المعلومات الشخصية</h3>
                <button class="edit-modal-close" onclick="closeEditModal()">&times;</button>
            </div>
            
            <div class="edit-form-group">
                <label class="edit-form-label">الاسم الكامل</label>
                <input type="text" class="edit-form-input" id="editName" value="${currentName}">
            </div>
            
            <div class="edit-form-group">
                <label class="edit-form-label">البريد الإلكتروني</label>
                <input type="email" class="edit-form-input" id="editEmail" value="${currentEmail}">
            </div>
            
            <div class="edit-form-group">
                <label class="edit-form-label">رقم الهاتف</label>
                <input type="tel" class="edit-form-input" id="editPhone" value="${currentPhone}">
            </div>
            
            <div class="edit-form-group">
                <label class="edit-form-label">العنوان</label>
                <input type="text" class="edit-form-input" id="editAddress" value="${currentAddress}">
            </div>

            <div class="edit-form-group">
                <label class="edit-form-label">المدينة</label>
                <input type="text" class="edit-form-input" id="editCity" value="${currentCity}">
            </div>

            <div class="edit-form-group">
                <label class="edit-form-label">الرمز البريدي</label>
                <input type="text" class="edit-form-input" id="editPostalCode" value="${currentPostalCode}">
            </div>
            
            <div class="edit-modal-buttons">
                <button class="edit-modal-btn save" onclick="saveProfileChanges()">حفظ التغييرات</button>
                <button class="edit-modal-btn cancel" onclick="closeEditModal()">إلغاء</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Hide edit modal with fade animation and remove from DOM
function closeEditModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    }
}

// Validate and persist profile edits back into page fields
function saveProfileChanges() {
    const newName = document.getElementById('editName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newPhone = document.getElementById('editPhone').value.trim();
    const newAddress = document.getElementById('editAddress').value.trim();
    const newCity = document.getElementById('editCity').value.trim();
    const newPostalCode = document.getElementById('editPostalCode').value.trim();

    if (!newName || !newEmail || !newPhone || !newAddress || !newCity || !newPostalCode) {
        showCustomAlert('يرجى ملء جميع الحقول');
        return;
    }
    
    // Update name in all places
    const userNameElements = document.querySelectorAll('#userName, #fullName');
    userNameElements.forEach(element => {
        const verifiedBadge = element.querySelector('.verified-badge');
        if (verifiedBadge) {
            element.childNodes[0].textContent = newName + ' ';
        } else {
            element.textContent = newName;
        }
    });
    
    // Update other fields
    document.getElementById('userEmail').textContent = newEmail;
    document.getElementById('phone').textContent = newPhone;
    document.getElementById('address').textContent = newAddress;
    const cityElement = document.getElementById('city');
    if (cityElement) {
        cityElement.textContent = newCity;
    }
    const postalCodeElement = document.getElementById('postalCode');
    if (postalCodeElement) {
        postalCodeElement.textContent = newPostalCode;
    }
    
    closeEditModal();
    showCustomAlert('تم تحديث المعلومات بنجاح!');
}

// ===================================================================
// MAIN FUNCTIONS
// ===================================================================

// Entry point: prepare profile page interactions once DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initProfile();
    setupEventListeners();
});

// Sync cart badge and hydrate profile info
async function initProfile() {
    updateCartCount();
    await hydrateProfileFromAuth();
}

async function hydrateProfileFromAuth() {
    try {
        const user = await ensureAuthUserLoaded();
        if (!user) {
            if (typeof setRedirectAfterLogin === 'function') {
                setRedirectAfterLogin(window.location.href);
            }
            window.location.href = 'index.html';
            return;
        }
        populateProfileFromAuthUser(user);
    } catch (error) {
        console.error('❌ Unable to load authenticated user for profile:', error);
        if (typeof setRedirectAfterLogin === 'function') {
            setRedirectAfterLogin(window.location.href);
        }
        window.location.href = 'index.html';
    }
}

function populateProfileFromAuthUser(user) {
    if (!user) return;
    const displayName = user.name || 'مستخدم';
    const email = user.email || '';

    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        const verifiedBadge = userNameEl.querySelector('.verified-badge');
        if (verifiedBadge) {
            const textNode = userNameEl.childNodes[0];
            if (textNode) {
                textNode.textContent = `${displayName} `;
            }
        } else {
            userNameEl.textContent = displayName;
        }
    }

    const fullNameEl = document.getElementById('fullName');
    if (fullNameEl) {
        fullNameEl.textContent = displayName;
    }

    const emailEl = document.getElementById('userEmail');
    if (emailEl && email) {
        emailEl.textContent = email;
    }
}

document.addEventListener('auth:user-updated', (event) => {
    populateProfileFromAuthUser(event.detail?.user || null);
});

// Attach handlers for orders and popup forms
function setupEventListeners() {
    setupOrderActions();
    setupPopups();
}

// Wire login/signup popups with custom handlers
function setupPopups() {
    const loginForm = document.querySelector('#loginPopup form');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            handleLogin();
        };
    }

    const signupForm = document.querySelector('#signupPopup form');
    if (signupForm) {
        signupForm.onsubmit = function(e) {
            e.preventDefault();
            handleSignup();
        };
    }

    const closeBtns = document.querySelectorAll('.close-btn');
    closeBtns.forEach(btn => {
        btn.onclick = function() {
            const popup = this.closest('.popup');
            if (popup) popup.style.display = 'none';
        };
    });

    const signupLink = document.querySelector('.signup-link');
    if (signupLink) {
        signupLink.onclick = function() {
            hidePopup('login');
            showPopup('signup');
        };
    }
}

// Display specified popup modal while hiding others
function showPopup(type) {
    const popupId = type === 'login' ? 'loginPopup' : 'signupPopup';
    const popup = document.getElementById(popupId);
    
    if (popup) {
        document.querySelectorAll('.popup').forEach(p => p.style.display = 'none');
        popup.style.display = 'flex';
    }
}

// Hide popup by type if visible
function hidePopup(type) {
    const popupId = type === 'login' ? 'loginPopup' : 'signupPopup';
    const popup = document.getElementById(popupId);
    if (popup) popup.style.display = 'none';
}

// Validate login form and show fake success alert
function handleLogin() {
    const emailInput = document.querySelector('#loginPopup #email');
    const passwordInput = document.querySelector('#loginPopup #password');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value;
    const password = passwordInput.value;

    if (email && password) {
        showCustomAlert('تم تسجيل الدخول بنجاح!');
        hidePopup('login');
    } else {
        showCustomAlert('يرجى ملء جميع الحقول');
    }
}

// Validate signup form and simulate account creation
function handleSignup() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email-signup').value;
    const password = document.getElementById('password-signup').value;

    if (username && email && password) {
        showCustomAlert('تم إنشاء الحساب بنجاح!');
        hidePopup('signup');
        showPopup('login');
    } else {
        showCustomAlert('يرجى ملء جميع الحقول');
    }
}

// Shortcut to launch edit profile modal
function editProfile() {
    showEditProfileModal();
}

// Confirm logout using global auth handler when متاح
async function logout() {
    if (typeof handleLogout === 'function') {
        handleLogout();
        return;
    }

    const confirmed = await showCustomConfirm('هل أنت متأكد من تسجيل الخروج؟');
    if (confirmed) {
        showCustomAlert('تم تسجيل الخروج بنجاح');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Shortcut alias to edit profile modal
function editPersonalInfo() {
    showEditProfileModal();
}

// Bind click actions for order row icon shortcuts
function setupOrderActions() {
    const orderActions = document.querySelectorAll('.order-actions .action-icon');
    
    orderActions.forEach(icon => {
        icon.onclick = function() {
            const title = this.getAttribute('title');
            const row = this.closest('tr');
            const orderNumber = row.querySelector('td:first-child').textContent;
            
            if (title.includes('عرض')) {
                viewOrderDetails(orderNumber);
            } else if (title.includes('إعادة')) {
                reorderItem(orderNumber);
            } else if (title.includes('تتبع')) {
                trackOrder(orderNumber);
            } else if (title.includes('إلغاء')) {
                cancelOrder(orderNumber, row);
            }
        };
    });
}

// Show placeholder details for selected order
function viewOrderDetails(orderNumber) {
    showCustomAlert(`عرض تفاصيل الطلب ${orderNumber}<br><br>هذه الوظيفة ستعرض تفاصيل الطلب الكاملة.`);
}

// Confirm reorder action and mimic adding to cart
async function reorderItem(orderNumber) {
    const confirmed = await showCustomConfirm(`هل تريد إعادة طلب ${orderNumber}؟`);
    if (confirmed) {
        showCustomAlert('تم إضافة الطلب إلى السلة بنجاح!');
        updateCartCount();
    }
}

// Display mock tracking information for order
function trackOrder(orderNumber) {
    showCustomAlert(`تتبع الطلب ${orderNumber}<br><br>الحالة: في الطريق<br>الموقع الحالي: مركز التوزيع`);
}

// Confirm cancellation then update status cell styling
async function cancelOrder(orderNumber, row) {
    const confirmed = await showCustomConfirm(`هل أنت متأكد من إلغاء الطلب ${orderNumber}؟`);
    if (confirmed) {
        showCustomAlert('تم إلغاء الطلب بنجاح');
        if (row) {
            const statusCell = row.querySelector('.order-status');
            if (statusCell) {
                statusCell.textContent = 'ملغي';
                statusCell.className = 'order-status status-cancelled';
            }
        }
    }
}

// Update global cart badge with session data count
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems || '0';
    }
}