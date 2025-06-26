import { showToast } from './cart.js';

let allProducts = [];
let allOrders = [];
let allCoupons = [];
let currentAdminCategoryFilter = 'all';
let authToken = '';

function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    }
}


// الدالة الرئيسية اللي بتشغل كل حاجة في صفحة الأدمن
export function initializeAdminPage(products) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token || !userInfo.isAdmin) {
        showToast('غير مصرح لك بالدخول لهذه الصفحة.', true);
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px; color: #ff6b6b;">غير مصرح لك بالدخول</h1>';
        setTimeout(() => { window.location.href = 'index.html'; }, 2500);
        return;
    }
    authToken = userInfo.token;

    allProducts = products;
    setupAdminEventListeners();
    setupAccordion();
    resetAdminForm();
    displayAdminOrders();
    displayDeletedProducts();
    displayAdminCoupons();
    applyAdminFiltersAndSearch();
}

function setupAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;

            const currentlyActiveHeader = document.querySelector('.accordion-header.active');
            if (currentlyActiveHeader && currentlyActiveHeader !== header) {
                currentlyActiveHeader.classList.remove('active');
                const activeContent = currentlyActiveHeader.nextElementSibling;
                activeContent.style.maxHeight = null;
                activeContent.classList.remove('active');
            }

            header.classList.toggle('active');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.classList.remove('active');
            } else {
                content.classList.add('active');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    const firstHeader = document.querySelector('.accordion-header');
    if (firstHeader) {
        firstHeader.click();
    }
}

function setupAdminEventListeners() {
    const adminForm = document.getElementById('add-product-form');
    if(adminForm) adminForm.addEventListener('submit', handleProductFormSubmit);
    
    const couponForm = document.getElementById('add-coupon-form');
    if(couponForm) couponForm.addEventListener('submit', handleCouponFormSubmit);
    
    const cancelCouponEditBtn = document.getElementById('cancel-coupon-edit-btn');
    if(cancelCouponEditBtn) cancelCouponEditBtn.addEventListener('click', resetCouponForm);


    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentActive = document.querySelector('.filter-btn.active');
            if(currentActive) currentActive.classList.remove('active');
            btn.classList.add('active');
            currentAdminCategoryFilter = btn.dataset.category;
            applyAdminFiltersAndSearch();
        });
    });
    
    const adminSearchBar = document.getElementById('admin-search-bar');
    if(adminSearchBar) adminSearchBar.addEventListener('input', applyAdminFiltersAndSearch);

    const cancelBtn = document.getElementById('cancel-edit-btn');
    if(cancelBtn) cancelBtn.addEventListener('click', resetAdminForm);

    const addSizeBtn = document.getElementById('add-size-btn');
    if(addSizeBtn) addSizeBtn.addEventListener('click', () => addSizeStockRow());

    // Event Delegation for coupon buttons
    const couponListContainer = document.getElementById('manage-coupons-list');
    if(couponListContainer) {
        couponListContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-edit-coupon')) {
                handleEditCoupon(event.target.dataset.id);
            }
            if (event.target.classList.contains('btn-delete-coupon')) {
                handleDeleteCoupon(event.target.dataset.id);
            }
        });
    }
}

// --- دوال الكوبونات (معدلة بالكامل) ---
async function displayAdminCoupons() {
    const listContainer = document.getElementById('manage-coupons-list');
    if (!listContainer) return;
    showSpinner(listContainer);
    try {
        const response = await fetch('/api/coupons', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('فشل جلب الكوبونات');
        allCoupons = await response.json();
        
        listContainer.innerHTML = '';
        if (allCoupons.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center;">لا توجد كوبونات حاليًا.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'order-products-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>الكود</th>
                    <th>النوع</th>
                    <th>القيمة</th>
                    <th>تاريخ الإنتهاء</th>
                    <th>الحالة</th>
                    <th>التحكم</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        allCoupons.forEach(coupon => {
            const expiry = new Date(coupon.expiryDate).toLocaleDateString('ar-EG');
            const type = coupon.discountType === 'percentage' ? 'نسبة %' : 'مبلغ ثابت';
            const status = coupon.isActive && new Date(coupon.expiryDate) > new Date() ? 'فعال' : 'غير فعال';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${coupon.code}</td>
                <td>${type}</td>
                <td>${coupon.value}</td>
                <td>${expiry}</td>
                <td><span style="color: ${status === 'فعال' ? '#2ecc71' : '#e74c3c'}; font-weight: bold;">${status}</span></td>
                <td>
                    <button class="btn-edit btn-edit-coupon" data-id="${coupon._id}">تعديل</button>
                    <button class="btn-delete btn-delete-coupon" data-id="${coupon._id}">حذف</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        listContainer.appendChild(table);

    } catch (error) {
        listContainer.innerHTML = `<p style="text-align:center; color: #ff6b6b;">${error.message}</p>`;
    }
}

function handleEditCoupon(id) {
    const coupon = allCoupons.find(c => c._id === id);
    if (!coupon) return;

    document.getElementById('coupon-id').value = coupon._id;
    document.getElementById('coupon-code').value = coupon.code;
    document.getElementById('coupon-type').value = coupon.discountType;
    document.getElementById('coupon-value').value = coupon.value;
    // Format date for the date input which requires YYYY-MM-DD
    document.getElementById('coupon-expiry').value = new Date(coupon.expiryDate).toISOString().split('T')[0];

    document.getElementById('coupon-form-title').textContent = `تعديل الكوبون: ${coupon.code}`;
    document.getElementById('coupon-submit-btn').textContent = 'تحديث الكوبون';
    document.getElementById('cancel-coupon-edit-btn').style.display = 'inline-block';
}

function resetCouponForm() {
    document.getElementById('add-coupon-form').reset();
    document.getElementById('coupon-id').value = '';
    document.getElementById('coupon-form-title').textContent = 'إنشاء كوبون جديد';
    document.getElementById('coupon-submit-btn').textContent = 'إنشاء الكوبون';
    document.getElementById('cancel-coupon-edit-btn').style.display = 'none';
}

async function handleDeleteCoupon(id) {
    if (!confirm(`هل أنت متأكد من حذف هذا الكوبون؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    try {
        const response = await fetch(`/api/coupons/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message);
            displayAdminCoupons(); // Refresh the list
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleCouponFormSubmit(event) {
    event.preventDefault();

    const couponId = document.getElementById('coupon-id').value;
    const isEditMode = !!couponId;

    const couponData = {
        code: document.getElementById('coupon-code').value.toUpperCase(),
        discountType: document.getElementById('coupon-type').value,
        value: document.getElementById('coupon-value').value,
        expiryDate: document.getElementById('coupon-expiry').value
    };

    if (!couponData.code || !couponData.value || !couponData.expiryDate) {
        showToast('يرجى ملء جميع حقول الكوبون.', true);
        return;
    }

    const url = isEditMode ? `/api/coupons/${couponId}` : '/api/coupons';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(couponData)
        });
        const data = await response.json();
        if (response.ok) {
            showToast(isEditMode ? 'تم تحديث الكوبون بنجاح!' : 'تم إنشاء الكوبون بنجاح!');
            resetCouponForm();
            displayAdminCoupons(); // تحديث القائمة
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showToast(error.message, true);
    }
}
// --- نهاية دوال الكوبونات ---


function applyAdminFiltersAndSearch() { 
    const searchBar = document.getElementById('admin-search-bar');
    if (!searchBar) return;
    const searchTerm = searchBar.value.toLowerCase().trim();
    let filteredProducts = allProducts.filter(p => !p.isDeleted);
    if (currentAdminCategoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === currentAdminCategoryFilter);
    }
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    displayAdminProducts(filteredProducts); 
}

function displayAdminProducts(productsToDisplay) { 
    const listContainer = document.getElementById('manage-products-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    if (productsToDisplay.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center;">لا توجد منتجات تطابق هذا الفلتر.</p>';
        return;
    }
    productsToDisplay.forEach(product => {
        const totalStock = product.sizes.reduce((acc, size) => acc + size.stock, 0);
        const itemHTML = `<div class="managed-product-item"> <p class="managed-product-info">${product.name} - <span>إجمالي المخزون: ${totalStock}</span></p> <div class="managed-product-controls"> <button class="btn-edit" data-id="${product.id}">تعديل</button> <button class="btn-delete" data-id="${product.id}">حذف</button> </div> </div>`;
        listContainer.innerHTML += itemHTML;
    });
    document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => handleDeleteProduct(btn.dataset.id)));
    document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => handleEditProduct(btn.dataset.id)));
}

async function displayDeletedProducts() { 
    const listContainer = document.getElementById('deleted-products-list');
    if (!listContainer) return;
    showSpinner(listContainer); 
    try {
        const response = await fetch('/api/products/deleted', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'فشل جلب المنتجات المحذوفة');
        }
        const deletedProducts = await response.json();
        listContainer.innerHTML = '';
        if (deletedProducts.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center;">سلة المحذوفات فارغة.</p>';
            return;
        }
        deletedProducts.forEach(product => {
            const itemHTML = `<div class="managed-product-item"> <p class="managed-product-info">${product.name}</p> <div class="managed-product-controls"> <button class="btn-restore" data-id="${product.id}">استرجاع</button> </div> </div>`;
            listContainer.innerHTML += itemHTML;
        });
        document.querySelectorAll('.btn-restore').forEach(btn => btn.addEventListener('click', () => handleRestoreProduct(btn.dataset.id)));
    } catch (error) {
        listContainer.innerHTML = `<p style="text-align:center; color: #ff6b6b;">${error.message}</p>`;
        showToast(error.message, true);
        console.error(error);
    }
}

async function displayAdminOrders() { 
    const listContainer = document.getElementById('manage-orders-list');
    if (!listContainer) return;
    showSpinner(listContainer); 
    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'فشل جلب الطلبات');
        }
        allOrders = await response.json();
        listContainer.innerHTML = '';
        if (allOrders.length === 0) { 
            listContainer.innerHTML = '<p style="text-align:center;">لا توجد أي طلبات حاليًا.</p>'; 
            return; 
        }
        allOrders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const customerName = order.user 
                ? `${order.user.name} (${order.user.email})` 
                : `${order.customerDetails.fullName} (ضيف)`;

            const orderItemHTML = `
                <div class="managed-order-item" id="order-${order._id}">
                    <div class="managed-order-info">
                        <p><strong>العميل:</strong> <span>${customerName}</span></p>
                        <p><strong>الإجمالي:</strong> <span>${order.totalPrice.toFixed(2)} ج.م</span></p>
                        <p><strong>تاريخ الطلب:</strong> <span>${orderDate}</span></p>
                        <p><strong>الحالة:</strong> <span class="status">${order.status}</span></p>
                    </div>
                    <div class="managed-order-controls">
                        <button class="btn btn-secondary btn-view-details" data-order-id="${order._id}">عرض التفاصيل</button>
                    </div>
                </div>`;
            listContainer.innerHTML += orderItemHTML;
        });
        document.querySelectorAll('.btn-view-details').forEach(button => { 
            button.addEventListener('click', (event) => { createOrderDetailsModal(event.target.dataset.orderId); }); 
        });
    } catch (error) { 
        listContainer.innerHTML = `<p style="text-align:center; color: #ff6b6b;">${error.message}</p>`; 
        console.error(error); 
    }
}

function createOrderDetailsModal(orderId) { 
    const order = allOrders.find(o => o._id === orderId);
    if (!order) return;
    
    const oldModal = document.getElementById('order-details-modal');
    if (oldModal) oldModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'order-details-modal';
    modalOverlay.className = 'modal-overlay';
    
    const statuses = ['قيد المراجعة', 'تم التأكيد', 'تم الشحن', 'تم التوصيل', 'ملغي'];
    const statusOptions = statuses.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('');
    const productsRows = order.products.map(p => `<tr><td>${p.name}</td><td>${p.size}</td><td>${p.quantity}</td><td>${p.price.toFixed(2)} ج.م</td></tr>`).join('');
    
    const customerName = order.user ? order.user.name : order.customerDetails.fullName;
    const customerIdentifier = order.user ? `(${order.user.email})` : '(ضيف)';

    const subtotal = order.subtotal !== undefined ? order.subtotal : order.totalPrice;
    const finalPrice = order.totalPrice;
    
    const discountHTML = (order.discount && order.discount.amount > 0)
        ? `<div class="summary-row">
               <span>الخصم (${order.discount.code})</span>
               <span style="color: #2ecc71;">-${order.discount.amount.toFixed(2)} ج.م</span>
           </div>`
        : '';

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h3>تفاصيل الطلب (رقم: ${order._id})</h3>
            <h4>بيانات العميل</h4>
            <div class="order-details-grid">
                <p><strong>الاسم:</strong> ${customerName} <em>${customerIdentifier}</em></p>
                <p><strong>الهاتف:</strong> ${order.customerDetails.phone}</p>
                <p><strong>المحافظة:</strong> ${order.customerDetails.governorate}</p>
                <p><strong>المدينة:</strong> ${order.customerDetails.city}</p>
                <p><strong>العنوان بالتفصيل:</strong> ${order.customerDetails.address}</p>
            </div>
            <h4>المنتجات المطلوبة</h4>
            <table class="order-products-table">
                <thead><tr><th>المنتج</th><th>المقاس</th><th>الكمية</th><th>السعر</th></tr></thead>
                <tbody>${productsRows}</tbody>
            </table>
            <div class="summary-details" style="border-top: 1px solid #3a5b8e; padding-top: 15px; margin-top: 15px;">
                <div class="summary-row">
                    <span>الإجمالي الفرعي</span>
                    <span>${subtotal.toFixed(2)} ج.م</span>
                </div>
                ${discountHTML}
                <div class="summary-total">
                    <span>الإجمالي النهائي</span>
                    <span>${finalPrice.toFixed(2)} ج.م</span>
                </div>
            </div>
            <form class="status-update-form">
                <label for="status-select">تغيير حالة الطلب:</label>
                <select id="status-select">${statusOptions}</select>
                <button type="submit" class="btn">حفظ التغييرات</button>
            </form>
        </div>`;
    
    document.body.appendChild(modalOverlay);
    setTimeout(() => modalOverlay.classList.add('active'), 10);
    const closeModal = () => { modalOverlay.classList.remove('active'); setTimeout(() => modalOverlay.remove(), 300); };
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modalOverlay.querySelector('.status-update-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newStatus = modalOverlay.querySelector('#status-select').value;
        const submitBtn = e.target.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الحفظ...';
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, 
                body: JSON.stringify({ status: newStatus }) 
            });
            if (response.ok) {
                showToast('تم تحديث حالة الطلب بنجاح ✔️');
                closeModal();
                await displayAdminOrders();
            } else { const errorData = await response.json(); throw new Error(errorData.message || 'فشل تحديث الحالة'); }
        } catch (error) { showToast(error.message, true); } finally { submitBtn.disabled = false; submitBtn.textContent = 'حفظ التغييرات'; }
    });
}

async function refreshAllAdminLists() { 
    try { 
        const response = await fetch('/api/products/search?keyword='); 
        if (!response.ok) throw new Error('Failed to fetch latest products'); 
        allProducts = await response.json();
        applyAdminFiltersAndSearch(); 
        await displayDeletedProducts(); 
        await displayAdminOrders(); 
    } catch (error) { 
        showToast('فشل في تحديث قوائم المنتجات.', true); 
    } 
}

async function handleRestoreProduct(id) { 
    try { 
        const response = await fetch(`/api/products/${id}/restore`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        }); 
        if (response.ok) { 
            showToast('تم استرجاع المنتج بنجاح ✔️'); 
            await refreshAllAdminLists(); 
        } else { 
            throw new Error('فشل استرجاع المنتج'); 
        } 
    } catch (error) { 
        showToast(error.message, true); 
        console.error('Error restoring product:', error); 
    } 
}

async function handleDeleteProduct(id) { 
    if (!confirm('هل أنت متأكد من نقل هذا المنتج إلى سلة المحذوفات؟')) return;
    try { 
        const response = await fetch(`/api/products/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        }); 
        if (response.ok) { 
            showToast('تم نقل المنتج إلى سلة المحذوفات ✔️'); 
            await refreshAllAdminLists(); 
        } else { 
            const error = await response.json(); 
            throw new Error(error.message || 'فشل حذف المنتج'); 
        } 
    } catch (error) { 
        showToast(error.message, true); 
        console.error('Error deleting product:', error); 
    } 
}

function addSizeStockRow(name = '', stock = '') {
    const container = document.getElementById('sizes-stock-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'size-stock-row';
    row.innerHTML = `
        <input type="text" placeholder="اسم المقاس (e.g., S, M, 32)" class="size-name-input" value="${name}" required>
        <input type="number" placeholder="الكمية" class="size-stock-input" min="0" value="${stock}" required>
        <button type="button" class="remove-size-btn">&times;</button>
    `;
    container.appendChild(row);
    row.querySelector('.remove-size-btn').addEventListener('click', () => {
        row.remove();
    });
}

function handleEditProduct(id) {
    const product = allProducts.find(p => p.id == id);
    if (!product) return;
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('price').value = product.price;
    document.getElementById('category').value = product.category;
    document.getElementById('description').value = product.description.replace(/<br\s*\/?>/gi, "\n");
    document.getElementById('images').value = product.images.join(', ');
    
    const sizesContainer = document.getElementById('sizes-stock-container');
    sizesContainer.innerHTML = '';
    if(product.sizes && product.sizes.length > 0){
        product.sizes.forEach(size => {
            addSizeStockRow(size.name, size.stock);
        });
    } else {
        addSizeStockRow();
    }
    
    document.getElementById('form-title-accordion').textContent = `تعديل المنتج: ${product.name}`;

    document.getElementById('submit-btn').textContent = 'تحديث المنتج';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    
    const formHeader = document.querySelector('.accordion-header');
    if(formHeader && !formHeader.classList.contains('active')) {
        formHeader.click();
    }

    formHeader.scrollIntoView({ behavior: 'smooth' });
}

function resetAdminForm() { 
    const form = document.getElementById('add-product-form');
    if(!form) return;
    form.reset();
    document.getElementById('sizes-stock-container').innerHTML = '';
    addSizeStockRow(); 
    document.getElementById('product-id').value = '';
    
    document.getElementById('form-title-accordion').textContent = 'إضافة/تعديل منتج';

    document.getElementById('submit-btn').textContent = 'إضافة المنتج';
    document.getElementById('cancel-edit-btn').style.display = 'none';
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    const productId = document.getElementById('product-id').value;
    const isEditMode = productId !== '';
    
    const sizes = [];
    document.querySelectorAll('.size-stock-row').forEach(row => {
        const name = row.querySelector('.size-name-input').value.trim();
        const stock = row.querySelector('.size-stock-input').value;
        if (name && stock !== '') {
            sizes.push({ name, stock: parseInt(stock, 10) });
        }
    });

    if (sizes.length === 0) {
        showToast('يجب إضافة مقاس واحد على الأقل للمنتج.', true);
        return;
    }
    
    const images_text = document.getElementById('images').value;
    const initial_array = images_text
        .split(/[\s,]+/)
        .map(item => item.trim())
        .filter(Boolean);
    const images_array = [...new Set(initial_array)];

    const productData = {
        name: document.getElementById('name').value,
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.replace(/\n/g, '<br>'),
        images: images_array,
        sizes: sizes,
    };

    if (isEditMode) { productData.id = productId; }
    const url = isEditMode ? `/api/products/${productData.id}` : '/api/products';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { 
            method: method, 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, 
            body: JSON.stringify(productData) 
        });
        if (response.ok) {
            const successMessage = isEditMode ? 'تم تحديث المنتج بنجاح!' : 'تمت إضافة المنتج بنجاح!';
            showToast(successMessage);
            resetAdminForm();
            await refreshAllAdminLists();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في تنفيذ العملية');
        }
    } catch (error) {
        showToast(error.message, true);
        console.error('Error submitting product:', error);
    }
}