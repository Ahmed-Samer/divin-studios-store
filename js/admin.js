import { showToast } from './cart.js';

let allProducts = [];
let allOrders = [];
let currentAdminCategoryFilter = 'all';
let authToken = ''; // متغير لتخزين توكن الأدمن

// --- بداية الجزء الجديد: دالة تشغيل الأكورديون ---
function setupAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;

            // إغلاق أي قسم آخر مفتوح (اختياري، لكنه يحسن التجربة)
            const currentlyActiveHeader = document.querySelector('.accordion-header.active');
            if (currentlyActiveHeader && currentlyActiveHeader !== header) {
                currentlyActiveHeader.classList.remove('active');
                const activeContent = currentlyActiveHeader.nextElementSibling;
                activeContent.style.maxHeight = null;
                activeContent.classList.remove('active');
            }

            // فتح أو إغلاق القسم الذي تم الضغط عليه
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

    // فتح القسم الأول (إضافة منتج) بشكل افتراضي عند تحميل الصفحة
    const firstHeader = document.querySelector('.accordion-header');
    if (firstHeader) {
        firstHeader.click();
    }
}
// --- نهاية الجزء الجديد ---


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
    setupAccordion(); // استدعاء دالة تشغيل الأكورديون
    resetAdminForm();
    displayAdminOrders();
    displayDeletedProducts();
    applyAdminFiltersAndSearch();
}

function setupAdminEventListeners() {
    const adminForm = document.getElementById('add-product-form');
    if (!adminForm) return;

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
        showToast(error.message, true);
        console.error(error);
    }
}

async function displayAdminOrders() { 
    const listContainer = document.getElementById('manage-orders-list');
    if (!listContainer) return;
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
        if (allOrders.length === 0) { listContainer.innerHTML = '<p style="text-align:center;">لا توجد أي طلبات حاليًا.</p>'; return; }
        allOrders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const orderItemHTML = `<div class="managed-order-item" id="order-${order._id}"><div class="managed-order-info"><p><strong>العميل:</strong> <span>${order.customerDetails.fullName}</span></p><p><strong>الإجمالي:</strong> <span>${order.totalPrice} ج.م</span></p><p><strong>تاريخ الطلب:</strong> <span>${orderDate}</span></p><p><strong>الحالة:</strong> <span class="status">${order.status}</span></p></div><div class="managed-order-controls"><button class="btn btn-secondary btn-view-details" data-order-id="${order._id}">عرض التفاصيل</button></div></div>`;
            listContainer.innerHTML += orderItemHTML;
        });
        document.querySelectorAll('.btn-view-details').forEach(button => { button.addEventListener('click', (event) => { createOrderDetailsModal(event.target.dataset.orderId); }); });
    } catch (error) { listContainer.innerHTML = `<p style="text-align:center; color: #ff6b6b;">${error.message}</p>`; console.error(error); }
}

function createOrderDetailsModal(orderId) { 
    const order = allOrders.find(o => o._id === orderId);
    if (!order) return;
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    const statuses = ['قيد المراجعة', 'تم التأكيد', 'تم الشحن', 'تم التوصيل', 'ملغي'];
    const statusOptions = statuses.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('');
    const productsRows = order.products.map(p => `<tr><td>${p.name}</td><td>${p.size}</td><td>${p.quantity}</td><td>${p.price} ج.م</td></tr>`).join('');
    modalOverlay.innerHTML = ` <div class="modal-content"> <button class="modal-close-btn">&times;</button> <h3>تفاصيل الطلب (رقم: ${order._id})</h3> <h4>بيانات العميل</h4> <div class="order-details-grid"> <p><strong>الاسم:</strong> ${order.customerDetails.fullName}</p> <p><strong>الهاتف:</strong> ${order.customerDetails.phone}</p> <p><strong>المحافظة:</strong> ${order.customerDetails.governorate}</p> <p><strong>المدينة:</strong> ${order.customerDetails.city}</p> <p><strong>العنوان بالتفصيل:</strong> ${order.customerDetails.address}</p> </div> <h4>المنتجات المطلوبة</h4> <table class="order-products-table"> <thead><tr><th>المنتج</th><th>المقاس</th><th>الكمية</th><th>السعر</th></tr></thead> <tbody>${productsRows}</tbody> </table> <form class="status-update-form"> <label for="status-select">تغيير حالة الطلب:</label> <select id="status-select">${statusOptions}</select> <button type="submit" class="btn">حفظ التغييرات</button> </form> </div> `;
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
    
    // --- بداية الجزء المعدل: تحديث selector الخاص بعنوان الفورم ---
    document.getElementById('form-title-accordion').textContent = `تعديل المنتج: ${product.name}`;
    // --- نهاية الجزء المعدل ---

    document.getElementById('submit-btn').textContent = 'تحديث المنتج';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    
    // فتح قسم الفورم عند الضغط على تعديل
    const formHeader = document.getElementById('form-section-header');
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
    
    // --- بداية الجزء المعدل: تحديث selector الخاص بعنوان الفورم ---
    document.getElementById('form-title-accordion').textContent = 'إضافة منتج جديد';
    // --- نهاية الجزء المعدل ---

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