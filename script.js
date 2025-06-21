// --- الجزء الخاص بفتح وإغلاق القائمة والبحث ---
const toggleBtn = document.querySelector('.menu-toggle-btn');
const header = document.querySelector('.main-header');
const searchToggleBtn = document.querySelector('.search-toggle-btn');

if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        header.classList.toggle('menu-is-open');
        if (header.classList.contains('search-active')) {
            header.classList.remove('search-active');
        }
    });
}

if(searchToggleBtn){
    searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        header.classList.toggle('search-active');
        if (header.classList.contains('menu-is-open')) {
            header.classList.remove('menu-is-open');
        }
        if(header.classList.contains('search-active')){
            document.getElementById('mobile-search-bar').focus();
        }
    });
}

window.addEventListener('click', () => {
    if (header && header.classList.contains('menu-is-open')) {
        header.classList.remove('menu-is-open');
    }
    if (header && header.classList.contains('search-active')) {
        header.classList.remove('search-active');
    }
});

if(header){
    header.addEventListener('click', (e) => {
        if (e.target.closest('.expanded-links') || e.target.closest('.search-overlay')) {
             e.stopPropagation();
        }
    });
}


// --- متغيرات عالمية لتخزين البيانات ---
let allProducts = [];
let allOrders = [];


// --- دوال سلة المشتريات ---
function showToast(message, isError = false) { 
    const toastContainer = document.getElementById('toast-container'); 
    if (!toastContainer) return; 
    const toast = document.createElement('div'); 
    toast.classList.add('toast'); 
    if (isError) {
        toast.style.backgroundColor = '#e74c3c';
        toast.style.color = '#ffffff';
    }
    toast.textContent = message; 
    toastContainer.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 4000); 
}
function updateCartIcon() { const cart = JSON.parse(localStorage.getItem('cart')) || []; const cartCountElements = document.querySelectorAll('.cart-count'); let totalItems = 0; cart.forEach(item => totalItems += item.quantity); cartCountElements.forEach(el => { el.textContent = totalItems; }); }

function addToCart(productId, quantity, size) {
    if (!size) {
        showToast('من فضلك اختر المقاس أولاً.', true);
        return;
    }

    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    const sizeVariant = product.sizes.find(s => s.name === size);
    if (!sizeVariant) {
        showToast('حدث خطأ: المقاس غير موجود لهذا المنتج.', true);
        return;
    }

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingProductIndex = cart.findIndex(item => item.id == productId && item.size == size);
    
    let quantityInCart = 0;
    if(existingProductIndex > -1) {
        quantityInCart = cart[existingProductIndex].quantity;
    }

    if ((quantityInCart + quantity) > sizeVariant.stock) {
        showToast(`الكمية المتاحة لهذا المقاس هي ${sizeVariant.stock} قطعة فقط.`, true);
        return;
    }

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity, size: size });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
    showToast(`تمت إضافة ${quantity} قطعة للسلة بنجاح ✔️`);
}

function removeFromCart(cartItemId) { let cart = JSON.parse(localStorage.getItem('cart')) || []; cart = cart.filter(item => (item.id + '-' + item.size) !== cartItemId); localStorage.setItem('cart', JSON.stringify(cart)); displayCartItems(); }

function changeCartItemQuantity(cartItemId, change) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => (item.id + '-' + item.size) === cartItemId);
    if (itemIndex > -1) {
        const itemInCart = cart[itemIndex];
        const product = allProducts.find(p => p.id == itemInCart.id);
        const sizeVariant = product.sizes.find(s => s.name === itemInCart.size);

        if (change > 0 && (itemInCart.quantity + change > sizeVariant.stock)) {
            showToast(`الكمية المتاحة لهذا المقاس هي ${sizeVariant.stock} قطعة فقط.`, true);
            return;
        }

        itemInCart.quantity += change;
        if (itemInCart.quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems();
}

// --- دالة لرسم كروت المنتجات ---
function renderProducts(productsToRender) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    productGrid.innerHTML = '';
    if (productsToRender.length === 0) {
        productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>لا توجد منتجات تطابق بحثك.</h2><p>حاول استخدام كلمات بحث مختلفة.</p></div>`;
        return;
    }
    productsToRender.forEach(product => {
        const totalStock = product.sizes.reduce((acc, size) => acc + size.stock, 0);
        const outOfStockBadge = totalStock === 0 ? '<div class="out-of-stock-badge">نفذت الكمية</div>' : '';
        const cardHTML = `
            <div class="product-card ${totalStock === 0 ? 'out-of-stock' : ''}">
                <div class="card-image">
                    ${outOfStockBadge}
                    <img src="${product.images[0]}" alt="${product.name}">
                </div>
                <div class="card-content">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">${product.price} ج.م</p>
                    <a href="product.html?id=${product.id}" class="btn">عرض التفاصيل</a>
                </div>
            </div>
        `;
        productGrid.innerHTML += cardHTML;
    });
}


// --- دالة لعرض المنتجات في صفحة السلة ---
function displayCartItems() {
    const cartPageContainer = document.querySelector('.cart-page-container');
    if (!cartPageContainer) return;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        cartPageContainer.classList.add('cart-is-empty');
    } else {
        cartPageContainer.classList.remove('cart-is-empty');
        const cartItemsContainer = document.querySelector('.cart-items-list');
        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;
        cart.forEach(cartItem => {
            const product = allProducts.find(p => p.id == cartItem.id);
            if (product) {
                totalPrice += product.price * cartItem.quantity;
                const cartItemId = `${product.id}-${cartItem.size}`;
                const cartItemHTML = `<div class="cart-item"> <img src="${product.images[0]}" alt="${product.name}" class="cart-item-image"> <div class="cart-item-details"> <h3>${product.name}</h3> <p>المقاس: ${cartItem.size}</p> <div class="cart-item-quantity"> <button class="quantity-btn minus-btn" data-id="${cartItemId}">-</button> <span class="quantity-text">${cartItem.quantity}</span> <button class="quantity-btn plus-btn" data-id="${cartItemId}">+</button> </div> </div> <p class="cart-item-price">${product.price * cartItem.quantity} ج.م</p> <button class="remove-from-cart-btn" data-id="${cartItemId}">🗑️</button> </div>`;
                cartItemsContainer.innerHTML += cartItemHTML;
            }
        });
        document.getElementById('cart-total-price').textContent = `${totalPrice} ج.م`;
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => { button.addEventListener('click', (event) => { removeFromCart(event.target.dataset.id); }); });
        document.querySelectorAll('.plus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, 1); }); });
        document.querySelectorAll('.minus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, -1); }); });
    }
    updateCartIcon();
}

// --- دالة لعرض ملخص الطلب في صفحة الدفع ---
function displayCheckoutSummary() {
    const summaryContainer = document.getElementById('summary-items-container');
    const totalElement = document.getElementById('summary-total-price');
    if (!summaryContainer) return;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    summaryContainer.innerHTML = '';
    if (cart.length === 0) {
        summaryContainer.innerHTML = '<p>لا توجد منتجات في السلة.</p>';
        totalElement.textContent = '0 ج.م';
        const confirmBtn = document.querySelector('.confirm-order-btn');
        if(confirmBtn) confirmBtn.disabled = true;
        return;
    }
    let totalPrice = 0;
    cart.forEach(cartItem => {
        const product = allProducts.find(p => p.id == cartItem.id);
        if (product) {
            totalPrice += product.price * cartItem.quantity;
            const summaryItemHTML = `<div class="summary-item"> <span>${product.name} (x${cartItem.quantity}) - مقاس ${cartItem.size}</span> <span>${product.price * cartItem.quantity} ج.م</span> </div>`;
            summaryContainer.innerHTML += summaryItemHTML;
        }
    });
    totalElement.textContent = `${totalPrice} ج.م`;
}

// --- دوال التحقق من الفورم ---
function showFieldError(inputElement, message) { const formGroup = inputElement.closest('.form-group'); if (!formGroup) return; const errorElement = formGroup.querySelector('.error-message'); if (inputElement) inputElement.classList.add('invalid'); if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; } }
function clearFieldError(inputElement) { const formGroup = inputElement.closest('.form-group'); if (!formGroup) return; const errorElement = formGroup.querySelector('.error-message'); if (inputElement) inputElement.classList.remove('invalid'); if(errorElement) errorElement.style.display = 'none'; }
function validateForm() { let isValid = true; const fields = ['full-name', 'phone', 'address', 'governorate', 'city']; fields.forEach(id => { const field = document.getElementById(id); if (field) clearFieldError(field); }); const fullName = document.getElementById('full-name'); const phone = document.getElementById('phone'); const address = document.getElementById('address'); const governorate = document.getElementById('governorate'); const city = document.getElementById('city'); if (fullName.value.trim() === '') { showFieldError(fullName, 'هذا الحقل مطلوب.'); isValid = false; } if (phone.value.trim() === '') { showFieldError(phone, 'هذا الحقل مطلوب.'); isValid = false; } else if (!/^\d{11}$/.test(phone.value.trim())) { showFieldError(phone, 'يجب أن يكون رقم الهاتف 11 رقماً صحيحاً.'); isValid = false; } if (address.value.trim() === '') { showFieldError(address, 'هذا الحقل مطلوب.'); isValid = false; } if (governorate.value.trim() === '') { showFieldError(governorate, 'هذا الحقل مطلوب.'); isValid = false; } if (city.value.trim() === '') { showFieldError(city, 'هذا الحقل مطلوب.'); isValid = false; } return isValid; }


// --- دالة إرسال الطلب للسيرفر ---
async function handleOrderSubmission(event) {
    event.preventDefault();
    if (!validateForm()) { showToast('من فضلك املأ كل الحقول المطلوبة بشكل صحيح.', true); return; }
    const confirmBtn = document.querySelector('.confirm-order-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'جاري تأكيد الطلب...';
    const customerDetails = { fullName: document.getElementById('full-name').value, phone: document.getElementById('phone').value, address: document.getElementById('address').value, governorate: document.getElementById('governorate').value, city: document.getElementById('city').value, };
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    if (cartItems.length === 0) { showToast('سلة المشتريات فارغة!', true); confirmBtn.disabled = false; confirmBtn.textContent = 'تأكيد الطلب'; return; }
    try {
        const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerDetails, cartItems }), });
        if (response.ok) { localStorage.removeItem('cart'); updateCartIcon(); showToast('تم تأكيد طلبك بنجاح! سيتم تحويلك للصفحة الرئيسية ✔️'); confirmBtn.textContent = 'تم الطلب بنجاح!'; setTimeout(() => { window.location.href = 'index.html'; }, 3000); } else { const errorData = await response.json(); throw new Error(errorData.message || 'فشل في إرسال الطلب. حاول مرة أخرى.'); }
    } catch (error) { showToast(error.message, true); confirmBtn.disabled = false; confirmBtn.textContent = 'تأكيد الطلب'; }
}


// --- الدالة الرئيسية التي تشغل كل شيء ---
async function initializeStore() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) { throw new Error('Network response was not ok'); }
        allProducts = await response.json();
        runPageSpecificLogic();
    } catch (error) {
        console.error('فشل في جلب المنتجات:', error);
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>عفواً، حدث خطأ</h2><p>لا يمكن الاتصال بالسيرفر حالياً. تأكد أن سيرفر الباك إند يعمل وحاول مرة أخرى.</p></div>`;
    }
}


// --- بداية منطق صفحة الأدمن (مُعاد هيكلته بالكامل) ---
let currentAdminCategoryFilter = 'all';

function setupAdminEventListeners() {
    const adminForm = document.getElementById('add-product-form');
    if (!adminForm) return;

    // Event listeners for product filters and search
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

    // Event listeners for form controls
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if(cancelBtn) cancelBtn.addEventListener('click', resetAdminForm);

    const addSizeBtn = document.getElementById('add-size-btn');
    if(addSizeBtn) addSizeBtn.addEventListener('click', addSizeStockRow);

    adminForm.addEventListener('submit', handleProductFormSubmit);
}

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
    try {
        const response = await fetch('/api/products/deleted');
        if (!response.ok) throw new Error('Failed to fetch deleted products');
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
        showToast('فشل في جلب المنتجات المحذوفة.', true);
        console.error(error);
    }
}

function createOrderDetailsModal(orderId) { 
    const order = allOrders.find(o => o._id === orderId);
    if (!order) return;
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    const statuses = ['قيد المراجعة', 'تم التأكيد', 'تم الشحن', 'تم التوصيل', 'ملغي'];
    const statusOptions = statuses.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('');
    const productsRows = order.products.map(p => `<tr><td>${p.name}</td><td>${p.size}</td><td>${p.quantity}</td><td>${p.price} ج.م</td></tr>`).join('');
    modalOverlay.innerHTML = ` <div class="modal-content"> <button class="modal-close-btn">&times;</button> <h3>تفاصيل الطلب (رقم: ${order._id})</h3> <h3>بيانات العميل</h3> <div class="order-details-grid"> <p><strong>الاسم:</strong> ${order.customerDetails.fullName}</p> <p><strong>الهاتف:</strong> ${order.customerDetails.phone}</p> <p><strong>المحافظة:</strong> ${order.customerDetails.governorate}</p> <p><strong>المدينة:</strong> ${order.customerDetails.city}</p> <p><strong>العنوان بالتفصيل:</strong> ${order.customerDetails.address}</p> </div> <h3>المنتجات المطلوبة</h3> <table class="order-products-table"> <thead><tr><th>المنتج</th><th>المقاس</th><th>الكمية</th><th>السعر</th></tr></thead> <tbody>${productsRows}</tbody> </table> <form class="status-update-form"> <label for="status-select">تغيير حالة الطلب:</label> <select id="status-select">${statusOptions}</select> <button type="submit" class="btn">حفظ التغييرات</button> </form> </div> `;
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
            const response = await fetch(`/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
            if (response.ok) {
                showToast('تم تحديث حالة الطلب بنجاح ✔️');
                closeModal();
                await displayAdminOrders();
            } else { const errorData = await response.json(); throw new Error(errorData.message || 'فشل تحديث الحالة'); }
        } catch (error) { showToast(error.message, true); } finally { submitBtn.disabled = false; submitBtn.textContent = 'حفظ التغييرات'; }
    });
}

async function displayAdminOrders() { 
    const listContainer = document.getElementById('manage-orders-list');
    if (!listContainer) return;
    try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('فشل في جلب الطلبات من السيرفر');
        allOrders = await response.json();
        listContainer.innerHTML = '';
        if (allOrders.length === 0) { listContainer.innerHTML = '<p style="text-align:center;">لا توجد أي طلبات حاليًا.</p>'; return; }
        allOrders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const orderItemHTML = `<div class="managed-order-item" id="order-${order._id}"><div class="managed-order-info"><p><strong>العميل:</strong> <span>${order.customerDetails.fullName}</span></p><p><strong>الإجمالي:</strong> <span>${order.totalPrice} ج.م</span></p><p><strong>تاريخ الطلب:</strong> <span>${orderDate}</span></p><p><strong>الحالة:</strong> <span class="status">${order.status}</span></p></div><div class="managed-order-controls"><button class="btn btn-secondary btn-view-details" data-order-id="${order._id}">عرض التفاصيل</button></div></div>`;
            listContainer.innerHTML += orderItemHTML;
        });
        document.querySelectorAll('.btn-view-details').forEach(button => { button.addEventListener('click', (event) => { createOrderDetailsModal(event.target.dataset.orderId); }); });
    } catch (error) { listContainer.innerHTML = `<p style="text-align:center; color: #ff6b6b;">${error.message}</p>`; console.error(error); }
}

async function handleRestoreProduct(id) { try { const response = await fetch(`/api/products/${id}/restore`, { method: 'POST' }); if (response.ok) { showToast('تم استرجاع المنتج بنجاح ✔️'); await refreshAllAdminLists(); } else { throw new Error('فشل استرجاع المنتج'); } } catch (error) { showToast(error.message, true); console.error('Error restoring product:', error); } }
async function refreshAllAdminLists() { try { const response = await fetch('/api/products'); if (!response.ok) throw new Error('Failed to fetch latest products'); allProducts = await response.json(); await applyAdminFiltersAndSearch(); await displayDeletedProducts(); await displayAdminOrders(); } catch (error) { showToast('فشل في تحديث قوائم المنتجات.', true); } }
async function handleDeleteProduct(id) { if (!confirm('هل أنت متأكد من نقل هذا المنتج إلى سلة المحذوفات؟')) { return; } try { const response = await fetch(`/api/products/${id}`, { method: 'DELETE' }); if (response.ok) { showToast('تم نقل المنتج إلى سلة المحذوفات ✔️'); await refreshAllAdminLists(); } else { const error = await response.json(); throw new Error(error.message || 'فشل حذف المنتج'); } } catch (error) { showToast(error.message, true); console.error('Error deleting product:', error); } }

function addSizeStockRow(name = '', stock = '') {
    const container = document.getElementById('sizes-stock-container');
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
    sizesContainer.innerHTML = ''; // Clear previous rows
    product.sizes.forEach(size => {
        addSizeStockRow(size.name, size.stock);
    });

    document.getElementById('form-title').textContent = `تعديل المنتج: ${product.name}`;
    document.getElementById('submit-btn').textContent = 'تحديث المنتج';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
}

function resetAdminForm() { 
    const form = document.getElementById('add-product-form');
    if(!form) return;
    form.reset();
    document.getElementById('sizes-stock-container').innerHTML = '';
    addSizeStockRow(); // Add one empty row to start with
    document.getElementById('product-id').value = '';
    document.getElementById('form-title').textContent = 'إضافة منتج جديد';
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

    const productData = {
        name: document.getElementById('name').value,
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.replace(/\n/g, '<br>'),
        images: document.getElementById('images').value.split(',').map(item => item.trim()).filter(Boolean),
        sizes: sizes,
    };

    if (isEditMode) { productData.id = productId; }
    const url = isEditMode ? `/api/products/${productData.id}` : '/api/products';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) });
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
// --- نهاية منطق صفحة الأدمن ---


// --- دالة لتشغيل الكود المناسب لكل صفحة ---
function runPageSpecificLogic() {
    const urlParams = new URLSearchParams(window.location.search);
    const productDetailLayout = document.querySelector('.product-detail-layout');
    const productGrid = document.querySelector('.product-grid');
    const cartPageContainer = document.querySelector('.cart-page-container');
    const checkoutPageContainer = document.querySelector('.checkout-page-container');
    const adminForm = document.getElementById('add-product-form');

    if (productDetailLayout) {
        const productId = urlParams.get('id');
        const product = allProducts.find(p => p.id == productId);
        if (product) {
            document.querySelector('.product-title-large').textContent = product.name;
            document.querySelector('.product-price-large').textContent = `${product.price} ج.م`;
            document.querySelector('.product-description').innerHTML = product.description;
            document.title = `${product.name} - Zantiva Store`;
            const sliderWrapper = document.querySelector('.slider-wrapper');
            sliderWrapper.innerHTML = '';
            product.images.forEach(imgSrc => { const img = document.createElement('img'); img.src = imgSrc; img.alt = product.name; sliderWrapper.appendChild(img); });
            
            const sizeSelector = document.querySelector('.size-selector');
            sizeSelector.innerHTML = '';
            let selectedSize = null;
            const addToCartButton = document.querySelector('.add-to-cart-btn');

            if (product.sizes && product.sizes.length > 0) {
                product.sizes.forEach(size => {
                    const sizeBtn = document.createElement('button');
                    sizeBtn.className = 'size-btn';
                    sizeBtn.textContent = size.name;
                    sizeBtn.dataset.size = size.name;
                    if(size.stock === 0) {
                        sizeBtn.classList.add('disabled');
                    }
                    sizeSelector.appendChild(sizeBtn);
                });
            } else {
                sizeSelector.innerHTML = '<p>لا توجد مقاسات متاحة حالياً</p>';
                if(addToCartButton) addToCartButton.style.display = 'none';
            }
            
            const sizeButtons = document.querySelectorAll('.size-btn');
            sizeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if(button.classList.contains('disabled')) return;
                    sizeButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    selectedSize = button.dataset.size;
                });
            });

            if(addToCartButton) {
                addToCartButton.addEventListener('click', () => {
                    const quantity = parseInt(document.getElementById('quantity-input').value);
                    addToCart(product.id, quantity, selectedSize);
                });
            }

            const quantityInput = document.getElementById('quantity-input');
            const plusBtn = document.getElementById('plus-btn');
            const minusBtn = document.getElementById('minus-btn');
            if(plusBtn) plusBtn.addEventListener('click', () => { quantityInput.value = parseInt(quantityInput.value) + 1; });
            if(minusBtn) minusBtn.addEventListener('click', () => { if (parseInt(quantityInput.value) > 1) { quantityInput.value = parseInt(quantityInput.value) - 1; } });
            
            let currentIndex = 0;
            const slides = sliderWrapper.children;
            const nextBtn = document.querySelector('.slider-btn.next');
            const prevBtn = document.querySelector('.slider-btn.prev');
            if (slides.length > 1) {
                if(nextBtn) nextBtn.style.display = 'block'; 
                if(prevBtn) prevBtn.style.display = 'block';
                const totalSlides = slides.length;
                function showSlide(index) { sliderWrapper.style.transform = `translateX(-${index * 100}%)`; }
                if(nextBtn) nextBtn.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalSlides; showSlide(currentIndex); });
                if(prevBtn) prevBtn.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; showSlide(currentIndex); });
            } else {
                if(nextBtn) nextBtn.style.display = 'none';
                if(prevBtn) prevBtn.style.display = 'none';
            }
        } else { if(productDetailLayout) productDetailLayout.innerHTML = '<h1>خطأ: المنتج غير موجود</h1>'; }
    }
    
    if (productGrid) {
        let currentProducts = urlParams.get('category') ? allProducts.filter(p => p.category === urlParams.get('category')) : allProducts;
        renderProducts(currentProducts);
        const searchBar = document.getElementById('search-bar');
        const mobileSearchBar = document.getElementById('mobile-search-bar');
        function handleSearch(event) {
            const searchTerm = event.target.value.toLowerCase().trim();
            const baseProducts = urlParams.get('category') ? allProducts.filter(p => p.category === urlParams.get('category')) : allProducts;
            const filteredBySearch = baseProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
            renderProducts(filteredBySearch);
        }
        if(searchBar) searchBar.addEventListener('input', handleSearch);
        if(mobileSearchBar) mobileSearchBar.addEventListener('input', handleSearch);
    }
    
    if (cartPageContainer) {
        displayCartItems();
    }

    if (checkoutPageContainer) {
        displayCheckoutSummary();
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleOrderSubmission);
        }
    }
    
    if (adminForm) {
        setupAdminEventListeners();
        resetAdminForm(); // Reset form and add one initial size/stock row
        displayAdminOrders();
        displayDeletedProducts();
        applyAdminFiltersAndSearch(); 
    }
    
    updateCartIcon();
}

// --- نشغل كل شيء عند تحميل الصفحة ---
document.addEventListener('DOMContentLoaded', initializeStore);