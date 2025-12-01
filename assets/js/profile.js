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

        overlay.querySelector('.custom-alert-btn').onclick = function () {
            overlay.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(true);
            }, 300);
        };

        overlay.onclick = function (e) {
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

function formatProfileShippingDisplay(cost) {
    const numeric = Number(cost);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return '—';
    }
    if (numeric === 0) {
        return 'مجاني';
    }
    if (typeof renderCurrencyWithIcon === 'function') {
        return renderCurrencyWithIcon(numeric);
    }
    const label = formatProfileShippingCost(numeric);
    return label || '—';
}

function buildShippingAddressDisplay(shipping, order, recipientName = '') {
    const addressObject = shipping && typeof shipping === 'object' ? shipping : {};
    const lines = [];

    const resolveAddressText = (value) => {
        if (value == null) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return String(value);
        if (Array.isArray(value)) {
            return value.map(resolveAddressText).filter(Boolean).join(' - ');
        }

        if (typeof value === 'object') {
            const zoneIdCandidate = value._id || value.id || value.zoneId || value.regionId || value.shippingZoneId;
            if (zoneIdCandidate) {
                const helper = getProfileShippingZonesHelper();
                const zone = helper?.getById?.(zoneIdCandidate);
                if (zone && typeof zone === 'object') {
                    const zoneName = zone.name || zone.displayName || zone.arName || zone.enName;
                    if (zoneName) {
                        return String(zoneName).trim();
                    }
                }
            }

            const candidates = [
                value.name,
                value.label,
                value.title,
                value.displayName,
                value.arName,
                value.nameAr,
                value.nameAR,
                value.enName,
                value.nameEn,
                value.nameEN,
                value.cityName,
                value.regionName,
                value.value
            ];
            const resolved = candidates.find(item => item != null && item !== '') || '';
            return resolveAddressText(resolved);
        }

        return '';
    };

    const detailCandidates = [
        resolveAddressText(addressObject.details),
        resolveAddressText(addressObject.addressLine1),
        resolveAddressText(addressObject.address),
        resolveAddressText(addressObject.line1),
        resolveAddressText(addressObject.street),
        resolveAddressText(addressObject.addressLine),
        resolveAddressText(order?.shippingAddress?.details),
        resolveAddressText(order?.shippingAddress?.addressLine1),
        resolveAddressText(order?.shippingAddress?.address),
        resolveAddressText(order?.shippingAddress?.line1)
    ];
    const detail = detailCandidates.find(value => value && value.trim());
    if (detail) lines.push(detail);

    const cityCandidates = [
        addressObject.city,
        order?.shippingCity,
        order?.shippingAddress?.city,
        order?.shippingAddress?.shippingCity
    ];
    const city = cityCandidates
        .map(resolveAddressText)
        .find(value => value && value.trim()) || '';

    const regionCandidates = [
        addressObject.regionName,
        order?.shippingAddress?.regionName,
        addressObject.region,
        addressObject.state,
        order?.shippingRegion,
        order?.shippingState
    ];
    const region = regionCandidates
        .map(resolveAddressText)
        .find(value => value && value.trim()) || '';

    if (city) {
        lines.push(city);
    }

    if (region && region !== city) {
        lines.push(region);
    }

    const postal = resolveAddressText(addressObject.postalCode) || resolveAddressText(addressObject.zip) || resolveAddressText(order?.shippingPostalCode) || resolveAddressText(order?.postalCode);
    if (postal) {
        lines.push(`الرمز البريدي: ${postal}`);
    }

    const phone = resolveAddressText(addressObject.phone) || resolveAddressText(order?.customerPhone) || resolveAddressText(order?.userPhone);
    if (phone) {
        lines.push(`الهاتف: ${phone}`);
    }

    const typeLabel = translateAddressType(addressObject.type || order?.shippingAddress?.type || '');

    return {
        recipient: recipientName,
        typeLabel: typeLabel && typeLabel !== '—' ? typeLabel : '',
        lines
    };
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

// ===================================================================
// ADDRESSES MANAGEMENT
// ===================================================================

const profileShippingZonesHelper = typeof window !== 'undefined' ? window.actionSportsShippingZones : null;
let profileShippingZonesLoadPromise = null;

function getProfileShippingZonesHelper() {
    return profileShippingZonesHelper && typeof profileShippingZonesHelper === 'object'
        ? profileShippingZonesHelper
        : null;
}

function ensureProfileShippingZonesLoaded(force = false) {
    const helper = getProfileShippingZonesHelper();
    if (!helper || typeof helper.load !== 'function') {
        return Promise.resolve([]);
    }

    if (force) {
        profileShippingZonesLoadPromise = null;
    }

    if (!profileShippingZonesLoadPromise) {
        profileShippingZonesLoadPromise = helper.load(force).catch(error => {
            profileShippingZonesLoadPromise = null;
            throw error;
        });
    }

    return profileShippingZonesLoadPromise.then(() => {
        if (typeof helper.getAll === 'function') {
            return helper.getAll();
        }
        return [];
    }).catch(error => {
        console.error('❌ Failed to load profile shipping zones:', error);
        throw error;
    });
}

function getProfileShippingZoneById(zoneId) {
    const helper = getProfileShippingZonesHelper();
    if (!helper || typeof helper.getById !== 'function' || !zoneId) {
        return null;
    }
    return helper.getById(zoneId) || null;
}

function formatProfileShippingCost(cost) {
    const numeric = Number(cost);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return '';
    }
    if (numeric === 0) {
        return 'مجاني';
    }
    return typeof formatPrice === 'function' ? `${formatPrice(numeric)} ريال` : `${numeric} ريال`;
}

function getProfileZoneDisplayName(zone) {
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

async function populateProfileRegionSelect(selectElement, selectedId = '') {
    if (!selectElement) return;

    selectElement.disabled = true;
    selectElement.innerHTML = '<option value="">جاري تحميل المدن...</option>';

    try {
        const zones = await ensureProfileShippingZonesLoaded();
        const list = Array.isArray(zones) && zones.length ? zones : (getProfileShippingZonesHelper()?.getAll?.() || []);

        if (!Array.isArray(list) || !list.length) {
            selectElement.innerHTML = '<option value="">لا توجد مدن متاحة حالياً</option>';
            return;
        }

        const options = ['<option value="">اختر المدينة</option>'];
        list.forEach(zone => {
            const id = zone?._id || zone?.id;
            if (!id) return;
            const displayName = getProfileZoneDisplayName(zone);
            options.push(`<option value="${id}">${displayName}</option>`);
        });

        selectElement.innerHTML = options.join('');
        if (selectedId) {
            selectElement.value = selectedId;
        }
    } catch (error) {
        console.error('❌ Failed to populate profile shipping regions:', error);
        selectElement.innerHTML = '<option value="">تعذر تحميل المدن</option>';
    } finally {
        selectElement.disabled = false;
    }
}

function resolveProfileZoneNameById(zoneId) {
    if (!zoneId) return '';
    const helper = getProfileShippingZonesHelper();
    if (!helper || typeof helper.getById !== 'function') return '';
    const zone = helper.getById(zoneId);
    return zone ? getProfileZoneDisplayName(zone) : '';
}

function normalizeProfileAddress(address) {
    if (!address || typeof address !== 'object') {
        return null;
    }

    const raw = { ...address };
    const zoneCandidate = raw.shippingZone || raw.region || raw.shippingRegion || raw.zone;
    let zoneObject = (zoneCandidate && typeof zoneCandidate === 'object') ? zoneCandidate : null;
    const cityCandidate = typeof raw.city === 'string' ? raw.city.trim() : '';

    const zoneIdCandidates = [
        raw.regionId,
        raw.shippingRegionId,
        raw.shippingZoneId,
        raw.zoneId,
        zoneObject?._id,
        zoneObject?.id,
        typeof zoneCandidate === 'string' ? zoneCandidate : null
    ];

    let regionId = zoneIdCandidates.find(value => value != null && value !== '') || null;

    if (!regionId && cityCandidate && /^[a-f0-9]{8,}$/i.test(cityCandidate)) {
        regionId = cityCandidate;
    }

    if (!zoneObject && regionId) {
        zoneObject = getProfileShippingZoneById(regionId);
        if (zoneObject) {
            regionId = zoneObject._id || zoneObject.id || regionId;
        }
    }

    const zoneFromCache = regionId ? getProfileShippingZoneById(regionId) : null;

    const regionNameCandidates = [
        raw.regionName,
        raw.shippingRegionName,
        typeof raw.region === 'string' ? raw.region : null,
        typeof raw.shippingRegion === 'string' ? raw.shippingRegion : null,
        typeof zoneCandidate === 'string' ? zoneCandidate : null,
        zoneObject?.name,
        zoneFromCache?.name
    ];

    const regionName = regionNameCandidates.find(value => typeof value === 'string' && value.trim()) || '';

    const cityDisplayName = cityCandidate && !/^[a-f0-9]{8,}$/i.test(cityCandidate)
        ? cityCandidate
        : regionName || zoneFromCache?.name || zoneObject?.name || '';

    const shippingCostCandidates = [
        raw.shippingCost,
        raw.shippingPrice,
        raw.deliveryFee,
        raw.shippingFee,
        raw.region?.shippingCost,
        raw.region?.shippingPrice,
        raw.shippingRegion?.shippingCost,
        raw.shippingRegion?.shippingPrice,
        zoneObject?.shippingCost,
        zoneObject?.shippingPrice,
        zoneObject?.price,
        zoneObject?.cost,
        zoneFromCache?.shippingCost,
        zoneFromCache?.shippingPrice,
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
        ...raw,
        regionId: regionId || raw.regionId || null,
        regionName,
        region: typeof raw.region === 'string' ? raw.region : (zoneObject?.name || raw.region?.name || regionName || ''),
        city: cityDisplayName,
        shippingZone: zoneObject || raw.shippingZone || raw.region || zoneFromCache || null,
        shippingCost,
        shippingPrice: shippingCost
    };
}

async function loadUserAddresses() {
    const listContainer = document.getElementById('addressesList');
    const emptyState = document.getElementById('addressesEmptyState');
    if (!listContainer || !emptyState) return;

    listContainer.innerHTML = '<div class="addresses-loading"><i class="fa fa-spinner fa-spin"></i> جاري تحميل العناوين...</div>';
    emptyState.style.display = 'none';

    const token = getAuthTokenSafe();
    if (!token) {
        listContainer.innerHTML = '';
        emptyState.textContent = 'يرجى تسجيل الدخول لعرض العناوين.';
        emptyState.style.display = 'block';
        return;
    }

    try {
        try {
            await ensureProfileShippingZonesLoaded();
        } catch (zoneError) {
            console.warn('⚠️ Unable to preload shipping zones for profile:', zoneError);
        }

        const response = await getJson(USER_ENDPOINTS.addresses, token);
        const addresses = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

        if (!addresses.length) {
            const hydrated = populateAddressesFallbackFromStoredUser();
            if (!hydrated) {
                listContainer.innerHTML = '';
                emptyState.textContent = 'لا توجد عناوين محفوظة بعد.';
                emptyState.style.display = 'block';
            }
            return;
        }

        const normalized = addresses.map(normalizeProfileAddress).filter(Boolean);
        listContainer.innerHTML = normalized.map(renderAddressCard).join('');
        emptyState.style.display = 'none';
    } catch (error) {
        console.error('❌ Failed to load addresses:', error);
        const hydrated = populateAddressesFallbackFromStoredUser();
        if (!hydrated) {
            listContainer.innerHTML = '';
            emptyState.textContent = error.message || 'حدث خطأ أثناء تحميل العناوين.';
            emptyState.style.display = 'block';
        }
    }
}

function renderAddressCard(address) {
    const id = address._id || address.id;
    const type = address.type || 'home';
    const heading = translateAddressType(type);
    const details = address.details || address.line1 || address.street || '';
    const phone = address.phone || '';
    const cityIdCandidate = typeof address.city === 'string' && /^[a-f0-9]{8,}$/i.test(address.city) ? address.city : null;
    const resolvedCityName = cityIdCandidate ? resolveProfileZoneNameById(cityIdCandidate) : '';
    const cityRaw = (resolvedCityName || address.city || '').trim();
    const postalCode = address.postalCode || '';
    const regionIdForDisplay = address.regionId
        || cityIdCandidate
        || (typeof address.region === 'string' && /^[a-f0-9]{8,}$/i.test(address.region) ? address.region : null)
        || (typeof address.shippingRegion === 'string' && /^[a-f0-9]{8,}$/i.test(address.shippingRegion) ? address.shippingRegion : null);
    const resolvedRegionName = regionIdForDisplay ? resolveProfileZoneNameById(regionIdForDisplay) : '';
    const regionName = resolvedRegionName
        || address.regionName
        || (typeof address.region === 'string' ? address.region : address.region?.name)
        || (typeof address.shippingRegion === 'string' ? address.shippingRegion : address.shippingRegion?.name)
        || cityRaw
        || '';
    const cityDisplay = cityRaw && cityRaw !== regionName ? cityRaw : '';
    const shippingCost = Number(
        address.shippingCost ?? address.shippingPrice ??
        address.region?.shippingCost ?? address.region?.shippingPrice ??
        address.shippingRegion?.shippingCost ?? address.shippingRegion?.shippingPrice ??
        address.shippingZone?.shippingCost ?? address.shippingZone?.shippingPrice ??
        address.shippingZone?.price ?? address.shippingZone?.cost
    );

    const placeholders = {
        details: details || '—',
        postalCode: postalCode || '—',
        phone: phone || '—',
        region: regionName || '—',
        shipping: formatProfileShippingDisplay(shippingCost)
    };

    return `
        <div class="address-card" data-address-id="${id || ''}">
            <div class="address-card-header">
                <span class="address-type-pill">${heading}</span>
                <button class="address-delete-btn" data-action="delete" ${id ? '' : 'disabled'} title="حذف">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
            <div class="address-card-body">
                <div class="address-line">
                    <i class="fa fa-map-marker-alt"></i>
                    <span>${placeholders.details}</span>
                </div>
                ${cityDisplay ? `<div class="address-line"><i class="fa fa-city"></i><span>${cityDisplay}</span></div>` : ''}
                <div class="address-line">
                    <i class="fa fa-map"></i>
                    <span>${placeholders.region}</span>
                </div>
                <div class="address-line">
                    <i class="fa fa-truck"></i>
                    <span>${placeholders.shipping}</span>
                </div>
                <div class="address-line">
                    <i class="fa fa-mail-bulk"></i>
                    <span>${placeholders.postalCode}</span>
                </div>
                <div class="address-line">
                    <i class="fa fa-phone"></i>
                    <span>${placeholders.phone}</span>
                </div>
            </div>
        </div>
    `;
}

function extractPrimaryAddress(addressSource) {
    if (!addressSource || typeof addressSource !== 'object') {
        return null;
    }

    const directAddress = addressSource.address || addressSource.shippingAddress;
    const addressArray = Array.isArray(addressSource.addresses) ? addressSource.addresses : null;
    let candidate = directAddress;

    if (!candidate && addressArray && addressArray.length) {
        candidate = addressArray.find(item => item?.isDefault) || addressArray[0];
    }

    if (!candidate) {
        return null;
    }

    if (typeof candidate === 'string') {
        return {
            _id: '',
            name: 'العنوان الرئيسي',
            details: candidate,
            city: addressSource.city || '',
            postalCode: addressSource.postalCode || '',
            phone: addressSource.phone || ''
        };
    }

    if (typeof candidate !== 'object') {
        return null;
    }

    const details = candidate.details || candidate.line1 || candidate.street || candidate.address || '';
    const city = candidate.city || addressSource.city || '';
    const postalCode = candidate.postalCode || candidate.zip || candidate.postcode || addressSource.postalCode || '';
    const phone = candidate.phone || addressSource.phone || '';

    if (!details && !city && !postalCode && !phone) {
        return null;
    }

    return {
        _id: candidate._id || candidate.id || '',
        type: candidate.type || 'home',
        details,
        city,
        postalCode,
        phone
    };
}

function populateAddressesFallbackFromUser(userData) {
    const listContainer = document.getElementById('addressesList');
    const emptyState = document.getElementById('addressesEmptyState');
    if (!listContainer || !emptyState) return false;

    const address = normalizeProfileAddress(extractPrimaryAddress(userData));
    if (!address) return false;

    listContainer.innerHTML = renderAddressCard(address);
    emptyState.style.display = 'none';
    return true;
}

function populateAddressesFallbackFromStoredUser() {
    if (typeof getAuthUser !== 'function') return false;
    const storedUser = getAuthUser();
    if (!storedUser) return false;
    const source = storedUser.raw || storedUser;
    return populateAddressesFallbackFromUser(source);
}

function bindAddressActions() {
    const addBtn = document.getElementById('addAddressBtn');
    const listContainer = document.getElementById('addressesList');

    if (addBtn) {
        addBtn.addEventListener('click', () => showAddressModal());
    }

    if (listContainer) {
        listContainer.addEventListener('click', async (event) => {
            const deleteBtn = event.target.closest('.address-delete-btn');
            if (!deleteBtn) return;

            const card = deleteBtn.closest('.address-card');
            const addressId = card?.dataset.addressId;
            if (!addressId) {
                showCustomAlert('لا يمكن حذف هذا العنوان.');
                return;
            }

            const confirmDelete = await showCustomConfirm('هل أنت متأكد من حذف هذا العنوان؟');
            if (!confirmDelete) return;

            await deleteAddress(addressId);
        });
    }
}

function showAddressModal() {
    const modal = document.createElement('div');
    modal.className = 'address-modal-overlay';
    modal.innerHTML = `
        <div class="address-modal">
            <div class="address-modal-header">
                <h3>إضافة عنوان جديد</h3>
                <button class="address-modal-close">&times;</button>
            </div>
            <form id="addressForm">
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
                    <select name="regionId" id="profileRegionSelect" required>
                        <option value="">اختر المدينة</option>
                    </select>
                    <small class="field-hint" id="profileRegionHint">اختر المدينة لحساب تكلفة الشحن.</small>
                </div>
                <div class="address-form-group">
                    <label>التفاصيل</label>
                    <textarea name="details" required></textarea>
                </div>
                <div class="address-form-group">
                    <label>الرمز البريدي</label>
                    <input type="text" name="postalCode" required>
                </div>
                <div class="address-form-group">
                    <label>رقم الهاتف</label>
                    <input type="tel" name="phone" required>
                </div>
                <div class="address-modal-actions">
                    <button type="submit" class="action-btn primary"><i class="fa fa-save"></i> حفظ</button>
                    <button type="button" class="action-btn secondary address-modal-close">إلغاء</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);

    modal.addEventListener('click', (event) => {
        if (event.target.classList.contains('address-modal-overlay') || event.target.classList.contains('address-modal-close')) {
            closeAddressModal(modal);
        }
    });

    const form = modal.querySelector('#addressForm');
    const regionSelect = modal.querySelector('#profileRegionSelect');
    const regionHint = modal.querySelector('#profileRegionHint');

    const updateRegionHint = (zoneId) => {
        if (!regionHint) return;
        if (!zoneId) {
            regionHint.textContent = 'اختر المدينة لحساب تكلفة الشحن.';
            return;
        }

        const zone = getProfileShippingZoneById(zoneId);
        if (!zone) {
            regionHint.textContent = 'تعذر تحديد تكلفة الشحن لهذه المدينة حالياً.';
            return;
        }

        const label = formatProfileShippingCost(zone?.shippingCost ?? zone?.shippingPrice ?? zone?.shippingRate ?? zone?.price ?? zone?.cost);
        regionHint.textContent = label ? `تكلفة شحن هذه المنطقة (${label})` : 'لا توجد تكلفة شحن لهذه المدينة.';
    };

    ensureProfileShippingZonesLoaded().then(() => populateProfileRegionSelect(regionSelect)).catch(() => populateProfileRegionSelect(regionSelect));

    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            updateRegionHint(regionSelect.value);
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));

        if (Object.values(payload).some(value => !value)) {
            showCustomAlert('يرجى ملء جميع الحقول');
            return;
        }

        updateRegionHint(payload.regionId);

        try {
            await addAddress(payload);
            closeAddressModal(modal);
        } catch (error) {
            console.error('❌ Failed to add address:', error);
            showCustomAlert(error.message || 'تعذر إضافة العنوان.');
        }
    });
}

function closeAddressModal(modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 200);
}

async function addAddress(payload) {
    const token = getAuthTokenSafe();
    if (!token) {
        showCustomAlert('يجب تسجيل الدخول لإضافة عنوان.');
        return;
    }

    try {
        const body = {
            type: payload.type || 'home',
            details: payload.details,
            phone: payload.phone,
            postalCode: payload.postalCode,
            token
        };

        if (payload.regionId) {
            try {
                await ensureProfileShippingZonesLoaded();
            } catch (zoneError) {
                console.warn('⚠️ Unable to refresh shipping zones before saving profile address:', zoneError);
            }

            body.regionId = payload.regionId;
            body.shippingRegionId = payload.regionId;
            body.shippingZoneId = payload.regionId;

            const zone = getProfileShippingZoneById(payload.regionId);
            if (zone) {
                const shippingCost = Number(zone.shippingCost ?? zone.shippingPrice ?? zone.price ?? zone.cost) || 0;
                body.regionName = zone.name;
                body.shippingRegionName = zone.name;
                body.shippingZoneName = zone.name;
                body.region = zone.name;
                body.city = payload.regionId;
                body.shippingPrice = shippingCost;
                body.shippingCost = shippingCost;
            } else {
                body.city = payload.regionId;
            }
        }

        await postJson(USER_ENDPOINTS.addresses, body, token);
        showCustomAlert('تم إضافة العنوان بنجاح!');
        await loadUserAddresses();
    } catch (error) {
        throw error;
    }
}

async function deleteAddress(addressId) {
    const token = getAuthTokenSafe();
    if (!token) {
        showCustomAlert('يجب تسجيل الدخول لحذف العنوان.');
        return;
    }

    try {
        await deleteJson(USER_ENDPOINTS.addressById(addressId), token);
        showCustomAlert('تم حذف العنوان بنجاح.');
        await loadUserAddresses();
    } catch (error) {
        console.error('❌ Failed to delete address:', error);
        showCustomAlert(error.message || 'تعذر حذف العنوان.');
    }
}

// ===================================================================
// ACCOUNT SETTINGS ACTIONS
// ===================================================================

function bindAccountSettingsActions() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const updateAccountBtn = document.getElementById('updateAccountBtn');

    if (changePasswordBtn) changePasswordBtn.addEventListener('click', showChangePasswordModal);
    if (updateAccountBtn) updateAccountBtn.addEventListener('click', editProfile);
}

function showChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'change-password-modal-overlay';
    modal.innerHTML = `
        <div class="change-password-modal">
            <div class="modal-header">
                <h3>تغيير كلمة المرور</h3>
                <button class="modal-close">&times;</button>
            </div>
            <form id="changePasswordForm">
                <div class="form-group">
                    <label>كلمة المرور الحالية</label>
                    <input type="password" name="currentPassword" required>
                </div>
                <div class="form-group">
                    <label>كلمة المرور الجديدة</label>
                    <input type="password" name="newPassword" required>
                </div>
                <div class="form-group">
                    <label>تأكيد كلمة المرور الجديدة</label>
                    <input type="password" name="confirmPassword" required>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="action-btn primary">حفظ</button>
                    <button type="button" class="action-btn secondary modal-close">إلغاء</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);

    modal.addEventListener('click', (event) => {
        if (event.target.classList.contains('change-password-modal-overlay') || event.target.classList.contains('modal-close')) {
            closeModal(modal);
        }
    });

    const form = modal.querySelector('#changePasswordForm');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const currentPassword = formData.get('currentPassword').trim();
        const newPassword = formData.get('newPassword').trim();
        const confirmPassword = formData.get('confirmPassword').trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            showCustomAlert('يرجى ملء جميع الحقول');
            return;
        }

        if (newPassword !== confirmPassword) {
            showCustomAlert('كلمات المرور الجديدة غير متطابقة.');
            return;
        }

        try {
            await changePassword({ currentPassword, newPassword, confirmPassword });
            closeModal(modal);
        } catch (error) {
            console.error('❌ Failed to change password:', error);
            showCustomAlert(error.message || 'تعذر تغيير كلمة المرور.');
        }
    });
}

function closeModal(modal) {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 200);
}

async function changePassword({ currentPassword, newPassword, confirmPassword }) {
    const token = getAuthTokenSafe();
    if (!token) {
        showCustomAlert('يجب تسجيل الدخول لتغيير كلمة المرور.');
        return;
    }

    try {
        await patchJson(USER_ENDPOINTS.changePassword, {
            currentPassword,
            newPassword,
            passwordConfirm: confirmPassword
        }, token);
        showCustomAlert('تم تغيير كلمة المرور بنجاح.');
    } catch (error) {
        throw error;
    }
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

function showEditOptionsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'profile-options-overlay';
    overlay.innerHTML = `
        <div class="profile-options-modal">
            <div class="profile-options-header">
                <h3>إجراءات الحساب</h3>
                <button class="profile-options-close" aria-label="إغلاق">&times;</button>
            </div>
            <div class="profile-options-actions">
                <button class="profile-options-btn" data-action="edit-name">
                    <i class="fa fa-user-edit"></i>
                    <span>تعديل الاسم</span>
                </button>
                <button class="profile-options-btn" data-action="change-password">
                    <i class="fa fa-lock"></i>
                    <span>تغيير كلمة المرور</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 10);

    const closeOverlay = () => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener('click', (event) => {
        if (
            event.target.classList.contains('profile-options-overlay') ||
            event.target.classList.contains('profile-options-close')
        ) {
            closeOverlay();
        }
    });

    const editBtn = overlay.querySelector('[data-action="edit-name"]');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            closeOverlay();
            showEditProfileModal();
        });
    }

    const passwordBtn = overlay.querySelector('[data-action="change-password"]');
    if (passwordBtn) {
        passwordBtn.addEventListener('click', () => {
            closeOverlay();
            showChangePasswordModal();
        });
    }
}

// ===================================================================
// EDIT PROFILE MODAL
// ===================================================================

// Build and present editable modal populated with current profile info
function showEditProfileModal() {
    const authUser = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const currentName = authUser?.name || document.getElementById('userName')?.textContent.trim() || '';

    const modal = document.createElement('div');
    modal.className = 'edit-profile-modal';
    modal.id = 'editProfileModal';

    modal.innerHTML = `
        <div class="edit-profile-content">
            <div class="edit-modal-header">
                <h3 class="edit-modal-title">تعديل الاسم</h3>
                <button class="edit-modal-close" onclick="closeEditModal()">&times;</button>
            </div>

            <div class="edit-form-group">
                <label class="edit-form-label">الاسم الكامل</label>
                <input type="text" class="edit-form-input" id="editName" value="${currentName}">
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

// Validate and persist profile edits through API
async function saveProfileChanges() {
    const newName = document.getElementById('editName').value.trim();
    if (!newName) {
        showCustomAlert('يرجى إدخال الاسم الجديد');
        return;
    }

    const token = getAuthTokenSafe();
    if (!token) {
        showCustomAlert('يجب تسجيل الدخول لتحديث البيانات.');
        return;
    }

    try {
        console.log('📤 Updating display name payload:', { name: newName });
        const response = await patchJson(USER_ENDPOINTS.updateAccount, { name: newName }, token);
        console.log('✅ Account update response:', response);
        const updatedUser = extractAuthUser(response) || {
            name: newName
        };

        // Persist back to auth cache and UI
        setAuthUser(updatedUser);
        populateProfileFromAuthUser(updatedUser);

        closeEditModal();
        showCustomAlert('تم تحديث المعلومات بنجاح!');
    } catch (error) {
        console.error('❌ Failed to update account:', error);
        const message = error.errors?.email || error.errors?.name || error.message || 'تعذر تحديث البيانات. حاول مرة أخرى.';
        showCustomAlert(message, 'error');
    }
}

// ===================================================================
// MAIN FUNCTIONS
// ===================================================================

// Entry point: prepare profile page interactions once DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initProfile();
    setupEventListeners();
    loadUserOrders();
});

// Sync cart badge and hydrate profile info
async function initProfile() {
    updateCartCount();
    await hydrateProfileFromAuth();
    await loadUserAddresses();
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
    }
}

function populateProfileFromAuthUser(user) {
    if (!user) return;
    
    const displayName = user.name || 'مستخدم';
    const email = user.email || '';

    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        const textNode = userNameEl.childNodes[0];
        if (textNode) {
            textNode.textContent = `${displayName} `;
        } else {
            userNameEl.textContent = displayName;
        }
    }

    const emailEl = document.getElementById('userEmail');
    if (emailEl && email) {
        emailEl.textContent = email;
    }
}

document.addEventListener('auth:user-updated', (event) => {
    const user = event.detail?.user || null;
    populateProfileFromAuthUser(user);
});

// Attach handlers for orders and popup forms
function setupEventListeners() {
    setupOrderActions();
    setupPopups();
    bindOrderModalEvents();
    bindAddressActions();
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

// Shortcut aliases to open profile options
function editPersonalInfo() {
    showEditOptionsModal();
}

function editProfile() {
    showEditOptionsModal();
}

// Bind click actions for order row icon shortcuts
function setupOrderActions() {
    const ordersContainer = document.getElementById('ordersTableBody');
    if (!ordersContainer) return;

    ordersContainer.onclick = async function(event) {
        const actionIcon = event.target.closest('.action-icon');
        if (!actionIcon) return;

        const action = actionIcon.dataset.action;
        const row = actionIcon.closest('tr');
        const orderId = row?.dataset.orderId;

        if (!orderId) {
            console.warn('⚠️ Missing orderId for action');
            return;
        }

        switch (action) {
            case 'view':
                await handleViewOrder(orderId);
                break;
            case 'cancel':
                await handleCancelOrder(orderId, row);
                break;
            default:
                break;
        }
    };
}

function bindOrderModalEvents() {
    const modal = document.getElementById('orderDetailsModal');
    if (!modal) return;

    const closeButtons = modal.querySelectorAll('.order-details-close, .order-details-close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => hideOrderDetailsModal());
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideOrderDetailsModal();
        }
    });
}

function showOrderDetailsModal(order) {
    const modal = document.getElementById('orderDetailsModal');
    if (!modal) return;

    modal.querySelector('.order-details-number').textContent = `#${order.shortId || order.displayId || order._id || ''}`;
    modal.querySelector('.order-details-body').innerHTML = renderOrderDetails(order);
    modal.classList.add('visible');
    modal.style.display = 'flex';
}

function hideOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.classList.remove('visible');
        modal.style.display = 'none';
    }
}

function renderOrderDetails(order) {
    const items = Array.isArray(order.cartItems) ? order.cartItems : [];
    const shipping = order.shippingAddress || {};
    const customer = order.customer || order.user || order.client || null;
    const recipientName = renderShippingRecipient(shipping, customer, order);
    const shippingDisplay = buildShippingAddressDisplay(shipping, order, recipientName);

    const formatPrice = (value) => {
        const number = Number(value) || 0;
        return `${number.toLocaleString('ar-EG')} <img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 16px; vertical-align: middle; margin-right: 3px;">`;
    };

    const resolveQuantity = (item) => {
        return Number(
            item.quantity ??
            item.count ??
            item.qty ??
            item.amount ??
            item.totalQuantity ??
            1
        ) || 1;
    };

    const resolveUnitPrice = (item, quantity) => {
        const candidates = [
            item.unitPrice,
            item.pricePerUnit,
            item.unit_price,
            item.price,
            item.product?.price
        ];
        const unit = candidates.find(value => value != null);
        if (unit != null) return Number(unit) || 0;
        const totalCandidate = item.totalPrice ?? item.lineTotal ?? item.total;
        if (totalCandidate != null && quantity) {
            return (Number(totalCandidate) || 0) / quantity;
        }
        return 0;
    };

    const resolveLineTotal = (item, quantity, unitPrice) => {
        const candidates = [item.totalPrice, item.lineTotal, item.total];
        const total = candidates.find(value => value != null);
        if (total != null) return Number(total) || 0;
        return (unitPrice || 0) * quantity;
    };

    const resolveUnitInstallation = (item) => {
        const candidates = [
            item.installationPrice,
            item.installation_price,
            item.installationFee,
            item.installation_fee,
            item.installation,
            item.product?.installationPrice,
            item.product?.installationFee,
            item.product?.installation
        ];
        const value = candidates.find(candidate => candidate != null);
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    };

    const resolveInstallationTotal = (item, quantity, unitInstallation) => {
        const candidates = [
            item.installationTotal,
            item.installation_total,
            item.totalInstallation,
            item.total_installation,
            item.installationFeeTotal,
            item.installation_fee_total
        ];
        const totalCandidate = candidates.find(value => value != null);
        if (totalCandidate != null) {
            const numeric = Number(totalCandidate);
            if (Number.isFinite(numeric) && numeric >= 0) {
                return numeric;
            }
        }
        return unitInstallation * quantity;
    };

    const itemsHtml = items.length
        ? items.map(item => {
            const quantity = resolveQuantity(item);
            const unitPrice = resolveUnitPrice(item, quantity);
            const lineTotal = resolveLineTotal(item, quantity, unitPrice);

            return `
                <tr>
                    <td>${item.productId?.name || item.product?.name || item.name || 'منتج'}</td>
                    <td>${quantity}</td>
                    <td>${formatPrice(unitPrice)}</td>
                    <td>${formatPrice(lineTotal)}</td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="4">لا توجد منتجات مسجلة لهذا الطلب.</td></tr>';

    const computedSubtotal = items.reduce((sum, item) => {
        const quantity = resolveQuantity(item);
        const unitPrice = resolveUnitPrice(item, quantity);
        const lineTotal = resolveLineTotal(item, quantity, unitPrice);
        return sum + lineTotal;
    }, 0);

    const computedInstallation = items.reduce((sum, item) => {
        const quantity = resolveQuantity(item);
        const unitInstallation = resolveUnitInstallation(item);
        const totalInstallation = resolveInstallationTotal(item, quantity, unitInstallation);
        return sum + totalInstallation;
    }, 0);

    const subtotal = Number(
        order.totalBeforeShipping ??
        order.totalPrice ??
        order.subtotal ??
        order.cartTotal ??
        computedSubtotal
    ) || 0;
    const shippingPrice = Number(order.shippingPrice || 0);
    const taxPrice = Number(order.taxPrice || 0);
    const installationCandidates = [
        order.installationPrice,
        order.installationFee,
        order.installation_cost,
        order.installation,
        order.fees?.installation,
        order.totals?.installationPrice
    ];
    const installationCandidate = installationCandidates.find(value => value != null);
    let installationPrice = Number(installationCandidate);
    if (!Number.isFinite(installationPrice) || installationPrice < 0) {
        installationPrice = computedInstallation;
    }
    const showInstallationRow = Number.isFinite(installationPrice) && installationPrice >= 0 && (installationPrice > 0 || computedInstallation > 0);

    const finalTotal = Number(order.totalOrderPrice || order.total || (subtotal + shippingPrice + taxPrice + (installationPrice || 0))) || 0;

    const formatInstallationPrice = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return '—';
        }
        if (numeric === 0) {
            return 'مجاني';
        }
        return formatPrice(numeric);
    };

    return `
        <section class="order-details-section">
            <div class="order-details-card order-details-meta">
                <div><strong>رقم الطلب:</strong> ${order.displayId || order.shortId || order._id || '-'}</div>
                <div><strong>اسم العميل:</strong> ${renderCustomerName(customer, order, shipping)}</div>
                <div><strong>التاريخ:</strong> ${formatOrderDate(order.createdAt || order.orderDate)}</div>
                <div><strong>الحالة:</strong> ${renderStatusBadge(order)}</div>
                <div><strong>طريقة الدفع:</strong> ${renderPaymentMethod(order.paymentMethod)}</div>
            </div>
            <div class="order-details-card order-details-shipping">
                <h4>عنوان الشحن</h4>
                <div class="shipping-address-block">
                    ${shippingDisplay.recipient ? `<div class="shipping-line recipient">${shippingDisplay.recipient}</div>` : ''}
                    ${shippingDisplay.typeLabel ? `<span class="shipping-address-pill">${shippingDisplay.typeLabel}</span>` : ''}
                    ${shippingDisplay.lines.length ? shippingDisplay.lines.map(line => `<div class="shipping-line">${line}</div>`).join('') : '<div class="shipping-line">—</div>'}
                </div>
            </div>
            <div class="order-details-card order-details-items">
                <h4>المنتجات</h4>
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
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            <div class="order-details-card order-details-summary">
                <div><span>قيمة المنتجات:</span><span>${formatPrice(subtotal)}</span></div>
                ${shippingPrice > 0 ? `<div><span>مصاريف الشحن:</span><span>${formatPrice(shippingPrice)}</span></div>` : ''}
                ${showInstallationRow ? `<div><span>رسوم التركيب:</span><span>${formatInstallationPrice(installationPrice)}</span></div>` : ''}
                ${taxPrice ? `<div><span>الضريبة:</span><span>${formatPrice(taxPrice)}</span></div>` : ''}
                <div class="order-details-total"><span>الإجمالي:</span><span>${formatPrice(finalTotal)}</span></div>
            </div>
            ${order.notes ? `<div class="order-details-card order-details-notes"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
        </section>
    `;
}

function renderStatusBadge(order) {
    const statusMap = {
        new: { label: 'جديد', className: 'status-new' },
        pending: { label: 'قيد المعالجة', className: 'status-pending' },
        processing: { label: 'قيد التجهيز', className: 'status-processing' },
        paid: { label: 'تم السداد', className: 'status-paid' },
        shipped: { label: 'تم الشحن', className: 'status-shipped' },
        'out-for-delivery': { label: 'قيد التوصيل', className: 'status-out-for-delivery' },
        delivered: { label: 'تم التوصيل', className: 'status-delivered' },
        cancelled: { label: 'ملغي', className: 'status-cancelled' }
    };

    const aliasMap = {
        new: 'new',
        'جديد': 'new',
        created: 'new',
        placed: 'new',
        pending: 'pending',
        'status-pending': 'pending',
        'status_pending': 'pending',
        'قيد-المعالجة': 'pending',
        'قيد المعالجة': 'pending',
        processing: 'processing',
        'status-processing': 'processing',
        'status_processing': 'processing',
        'processing-order': 'processing',
        'in-progress': 'processing',
        'under-processing': 'processing',
        'under-preparation': 'processing',
        'under_preparation': 'processing',
        preparing: 'processing',
        'قيد-التجهيز': 'processing',
        'قيد التجهيز': 'processing',
        paid: 'paid',
        'status-paid': 'paid',
        'status_paid': 'paid',
        'تم-السداد': 'paid',
        'تم السداد': 'paid',
        shipped: 'shipped',
        'status-shipped': 'shipped',
        'status_shipped': 'shipped',
        'تم-الشحن': 'shipped',
        'تم الشحن': 'shipped',
        'out-for-delivery': 'out-for-delivery',
        'status-out-for-delivery': 'out-for-delivery',
        'status_out_for_delivery': 'out-for-delivery',
        'out_for_delivery': 'out-for-delivery',
        'ready-for-delivery': 'out-for-delivery',
        'in-transit': 'out-for-delivery',
        'on-the-way': 'out-for-delivery',
        'قيد-التوصيل': 'out-for-delivery',
        'قيد التوصيل': 'out-for-delivery',
        delivered: 'delivered',
        'status-delivered': 'delivered',
        'status_delivered': 'delivered',
        completed: 'delivered',
        'تم-التوصيل': 'delivered',
        'تم التوصيل': 'delivered',
        cancelled: 'cancelled',
        'status-cancelled': 'cancelled',
        'status_cancelled': 'cancelled',
        canceled: 'cancelled',
        'ملغي': 'cancelled'
    };

    const statusCandidates = [
        order?.deliveryStatus,
        order?.status,
        order?.status?.current,
        order?.status?.value,
        order?.status?.status,
        order?.orderStatus,
        order?.currentStatus,
        order?.statusText,
        order?.state
    ];

    const rawStatus = statusCandidates.find(value => typeof value === 'string' && value.trim()) || '';

    const normalizeStatus = (value) => {
        if (!value) return '';
        const stringValue = String(value).trim();
        if (!stringValue) return '';
        const slug = stringValue.toLowerCase().replace(/[_\s]+/g, '-');
        return aliasMap[slug] || aliasMap[stringValue] || slug;
    };

    const fallbackStatus =
        order?.deliveryStatus ||
        (order?.isCanceled ? 'cancelled' : order?.isDelivered ? 'delivered' : order?.isPaid ? 'paid' : '');

    const normalizedStatus = normalizeStatus(rawStatus) || normalizeStatus(fallbackStatus) || 'pending';

    const result = statusMap[normalizedStatus] || statusMap.pending;
    return `<span class="order-status ${result.className}">${result.label}</span>`;
}

function renderPaymentMethod(method) {
    if (method === 'cash') return 'الدفع عند الاستلام';
    if (method === 'card') return 'بطاقة ائتمان';
    if (method === 'installment') return 'تقسيط';
    return method || 'غير محدد';
}

function getBaseCustomerName(customer, order) {
    if (typeof customer === 'string' && customer.trim()) {
        return customer.trim();
    }

    if (customer && typeof customer === 'object') {
        const nameCandidate = customer.name || customer.fullName;
        if (nameCandidate && String(nameCandidate).trim()) {
            return String(nameCandidate).trim();
        }

        const combined = [customer.firstName, customer.lastName]
            .filter(Boolean)
            .map(value => String(value).trim())
            .filter(Boolean)
            .join(' ')
            .trim();
        if (combined) {
            return combined;
        }
    }

    const fallback = order?.userName || order?.customerName || order?.shippingAddress?.name;
    if (fallback && String(fallback).trim()) {
        return String(fallback).trim();
    }

    const authUser = typeof getAuthUser === 'function' ? getAuthUser() : null;
    if (authUser?.name && String(authUser.name).trim()) {
        return String(authUser.name).trim();
    }

    return '';
}

function extractShippingName(shipping, order) {
    if (shipping && typeof shipping === 'object') {
        const direct = shipping.name || shipping.fullName || shipping.recipientName;
        if (direct && String(direct).trim()) {
            return String(direct).trim();
        }

        const combined = [shipping.firstName, shipping.lastName]
            .filter(Boolean)
            .map(value => String(value).trim())
            .filter(Boolean)
            .join(' ')
            .trim();
        if (combined) {
            return combined;
        }
    }

    const fromOrder = order?.shippingName || order?.recipientName;
    if (fromOrder && String(fromOrder).trim()) {
        return String(fromOrder).trim();
    }

    return '';
}

function renderCustomerName(customer, order, shipping) {
    const baseName = getBaseCustomerName(customer, order);
    const shippingName = extractShippingName(shipping, order);

    if (shippingName) {
        if (!baseName || shippingName !== baseName) {
            return shippingName;
        }
    }

    if (baseName) {
        return baseName;
    }

    return '—';
}

function renderShippingRecipient(shipping, customer, order) {
    const shippingName = extractShippingName(shipping, order);
    if (shippingName) {
        return shippingName;
    }

    const fallback = getBaseCustomerName(customer, order);
    if (fallback) {
        return fallback;
    }

    return '—';
}

function formatOrderDate(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG');
    } catch (error) {
        return dateString;
    }
}

function updateOrderStatsDisplay(orderCount = 0, itemsCount = 0) {
    const ordersEl = document.getElementById('ordersCount');
    if (ordersEl) {
        const safeCount = Number(orderCount) || 0;
        ordersEl.textContent = safeCount.toLocaleString('ar-EG');
    }

    const itemsEl = document.getElementById('itemsPurchasedCount');
    if (itemsEl) {
        const safeItems = Number(itemsCount) || 0;
        itemsEl.textContent = safeItems.toLocaleString('ar-EG');
    }
}

function extractOrderItems(order) {
    if (!order || typeof order !== 'object') return [];

    const candidates = [
        order.cartItems,
        order.items,
        order.products,
        order.orderItems,
        order.orderProducts,
        order.details?.items,
        order.cart?.items
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (Array.isArray(candidate)) {
            if (candidate.length) return candidate;
            continue;
        }
        if (typeof candidate === 'object') {
            const values = Object.values(candidate);
            if (values.length) return values;
        }
    }

    return [];
}

function resolveOrderItemQuantity(item) {
    if (!item || typeof item !== 'object') return 0;

    const quantityCandidates = [
        item.quantity,
        item.qty,
        item.count,
        item.amount,
        item.totalQuantity,
        item.productQuantity
    ];

    for (const candidate of quantityCandidates) {
        const value = Number(candidate);
        if (!Number.isNaN(value) && value > 0) {
            return value;
        }
    }

    return 1;
}

async function loadUserOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;

    updateOrderStatsDisplay(0, 0);

    tableBody.innerHTML = `
        <tr class="orders-loading-row">
            <td colspan="5">
                <div class="orders-loading">
                    <i class="fa fa-spinner fa-spin"></i>
                    <span>جاري تحميل الطلبات...</span>
                </div>
            </td>
        </tr>
    `;

    const token = getAuthTokenSafe();
    if (!token) {
        tableBody.innerHTML = renderOrdersEmptyState('يرجى تسجيل الدخول لعرض طلباتك.');
        return;
    }

    try {
        const headers = {
            token,
            Authorization: `Bearer ${token}`
        };

        const response = await fetch(ORDER_ENDPOINTS.getMyOrders(), {
            headers
        });

        const data = await response.json().catch(() => ({}));

        console.log(' Orders response:', data);

        if (!response.ok) {
            console.error('❌ Orders API responded with error:', {
                status: response.status,
                statusText: response.statusText,
                body: data
            });

            const messageText = (data?.message || '').toLowerCase();
            const noOrdersStatuses = [204, 404];
            const noOrdersMessages = ['no orders', "you didn't create any order", 'لم يتم العثور على طلبات', 'لا يوجد طلبات'];
            const matchesNoOrdersMessage = noOrdersMessages.some(token => messageText.includes(token));

            if (noOrdersStatuses.includes(response.status) || matchesNoOrdersMessage) {
                tableBody.innerHTML = renderOrdersEmptyState('لم تقم بأي طلبات بعد.');
                updateOrderStatsDisplay(0, 0);
                return;
            }

            throw new Error(data?.message || 'تعذر تحميل الطلبات');
        }

        const orders = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

        if (!orders.length) {
            tableBody.innerHTML = renderOrdersEmptyState('لم تقم بأي طلبات بعد.');
            updateOrderStatsDisplay(0, 0);
            return;
        }

        const totalItemsPurchased = orders.reduce((sum, order) => {
            const items = extractOrderItems(order);
            if (!items.length) return sum;
            const orderItemsCount = items.reduce((itemSum, item) => itemSum + resolveOrderItemQuantity(item), 0);
            return sum + orderItemsCount;
        }, 0);

        updateOrderStatsDisplay(orders.length, totalItemsPurchased);

        tableBody.innerHTML = orders.map((order, index) => renderOrderRow(order, index)).join('');
    } catch (error) {
        console.error('❌ Failed to load orders:', error);
        const messageText = (error.message || '').toLowerCase();
        const noOrdersMessages = ['no orders', "you didn't create any order", 'لم يتم العثور على طلبات', 'لا يوجد طلبات'];
        const isNoOrders = noOrdersMessages.some(token => messageText.includes(token));
        tableBody.innerHTML = renderOrdersEmptyState(isNoOrders ? 'لم تقم بأي طلبات بعد.' : 'حدث خطأ أثناء تحميل الطلبات. يرجى المحاولة لاحقاً.');
        updateOrderStatsDisplay(0, 0);
    }
}

function renderOrdersEmptyState(message) {
    return `
        <tr>
            <td colspan="5" class="orders-empty">${message}</td>
        </tr>
    `;
}

function renderOrderRow(order, index = 0) {
    const createdAt = formatOrderDate(order.createdAt || order.orderDate);
    const total = Number(order.totalOrderPrice || order.total || 0).toLocaleString('ar-EG');
    const statusBadge = renderStatusBadge(order);
    const currencyIcon = '<img src="./assets/images/Saudi_Riyal_Symbol.png" alt="ريال" class="saudi-riyal-symbol" style="width: 20px; vertical-align: middle; margin-right: 3px;">';
    const canCancel = !order.isCanceled && !order.isDelivered;
    const orderNumber = index + 1;

    return `
        <tr data-order-id="${order._id || order.id || ''}">
            <td>${orderNumber}</td>
            <td>${createdAt}</td>
            <td>${total} ${currencyIcon}</td>
            <td>${statusBadge}</td>
            <td class="order-actions">
                <span class="action-icon" data-action="view" title="عرض التفاصيل"><i class="fa fa-eye"></i></span>
                ${canCancel ? `<span class="action-icon" data-action="cancel" title="إلغاء الطلب"><i class="fa fa-times"></i></span>` : ''}
            </td>
        </tr>
    `;
}

async function handleViewOrder(orderId) {
    try {
        const token = getAuthTokenSafe();
        if (!token) {
            showCustomAlert('يجب تسجيل الدخول لعرض تفاصيل الطلب.');
            return;
        }

        const headers = {
            token,
            Authorization: `Bearer ${token}`
        };

        const response = await fetch(ORDER_ENDPOINTS.getById(orderId), {
            headers
        });

        const data = await response.json().catch(() => ({}));

        console.log('🔍 Order details response:', data);

        if (!response.ok) {
            console.error('❌ Order details API responded with error:', {
                status: response.status,
                statusText: response.statusText,
                body: data
            });
            throw new Error(data?.message || 'تعذر تحميل تفاصيل الطلب');
        }

        const order = data?.data || data;
        if (!order) {
            throw new Error('لم يتم العثور على الطلب');
        }

        showOrderDetailsModal(order);
    } catch (error) {
        console.error('❌ Failed to fetch order details:', error);
        showCustomAlert(error.message || 'حدث خطأ أثناء تحميل تفاصيل الطلب.');
    }
}

async function handleCancelOrder(orderId, row) {
    const confirmed = await showCustomConfirm('هل أنت متأكد من إلغاء هذا الطلب؟');
    if (!confirmed) return;

    try {
        const token = getAuthTokenSafe();
        if (!token) {
            showCustomAlert('يجب تسجيل الدخول لإلغاء الطلب.');
            return;
        }

        const headers = {
            token,
            Authorization: `Bearer ${token}`
        };

        const response = await fetch(ORDER_ENDPOINTS.cancel(orderId), {
            method: 'PATCH',
            headers
        });

        const data = await response.json().catch(() => ({}));

        console.log('❌ Cancel order response:', data);

        if (!response.ok) {
            console.error('❌ Cancel order API responded with error:', {
                status: response.status,
                statusText: response.statusText,
                body: data
            });
            throw new Error(data?.message || 'تعذر إلغاء الطلب');
        }

        showCustomAlert('تم إلغاء الطلب بنجاح');
        await loadUserOrders();
    } catch (error) {
        console.error('❌ Failed to cancel order:', error);
        showCustomAlert(error.message || 'حدث خطأ أثناء إلغاء الطلب.');
    }
}

function getAuthTokenSafe() {
    if (typeof getAuthToken === 'function') {
        return getAuthToken();
    }

    try {
        return localStorage.getItem('actionSportsAuthToken');
    } catch (error) {
        return null;
    }
}

// ===================================================================
// ACCOUNT VERIFICATION SUPPORT
// ===================================================================

function checkAccountVerificationStatus(user) {
    const unverifiedBanner = document.getElementById('unverifiedBanner');
    const verifyBtn = document.getElementById('verifyAccountBtn');
    
    if (!unverifiedBanner) return;
    
    const isUnverified = user?.isUnverified || user?.status === 'unverified' || user?.verified === false;
    
    if (isUnverified) {
        unverifiedBanner.hidden = false;
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', async () => {
                const email = user?.email || document.getElementById('userEmail')?.textContent?.trim();
                if (!email) {
                    showCustomAlert('لم يتم العثور على البريد الإلكتروني');
                    return;
                }
                
                try {
                    verifyBtn.disabled = true;
                    verifyBtn.textContent = 'جاري الإرسال...';
                    
                    await handleResendVerificationCode(email);
                    
                    showCustomAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
                    
                    // عرض popup التحقق
                    if (typeof showAccountVerificationPopup === 'function') {
                        setTimeout(() => {
                            showAccountVerificationPopup(email);
                        }, 1500);
                    }
                } catch (error) {
                    console.error('❌ Resend verification error:', error);
                    showCustomAlert(error.message || 'تعذر إرسال رمز التحقق. حاول مرة أخرى.');
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'تأكيد الحساب';
                }
            });
        }
    } else {
        unverifiedBanner.hidden = true;
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