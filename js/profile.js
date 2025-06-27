import { showToast } from './cart.js';

let myOrders = []; // متغير عشان نخزن فيه الطلبات اللي جبناها

function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    }
}

// --- دوال بيانات الشحن ---
function populateShippingForm(userInfo) {
    if (userInfo && userInfo.shippingDetails) {
        const details = userInfo.shippingDetails;
        document.getElementById('shipping-full-name').value = details.fullName || '';
        document.getElementById('shipping-phone').value = details.phone || '';
        document.getElementById('shipping-address').value = details.address || '';
        document.getElementById('shipping-governorate').value = details.governorate || '';
        document.getElementById('shipping-city').value = details.city || '';
    }
}

async function handleSaveShippingDetails(event, token) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button');

    const shippingDetails = {
        fullName: document.getElementById('shipping-full-name').value,
        phone: document.getElementById('shipping-phone').value,
        address: document.getElementById('shipping-address').value,
        governorate: document.getElementById('shipping-governorate').value,
        city: document.getElementById('shipping-city').value,
    };

    if (!shippingDetails.fullName || !shippingDetails.phone || !shippingDetails.address || !shippingDetails.governorate || !shippingDetails.city) {
        showToast('يرجى ملء جميع حقول بيانات الشحن.', true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';

    try {
        const response = await fetch('/api/users/profile/shipping', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(shippingDetails)
        });

        const data = await response.json();
        if (response.ok) {
            showToast(data.message);
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const updatedUserInfo = { ...userInfo, shippingDetails: data.shippingDetails };
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showToast(error.message || 'حدث خطأ ما.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ بيانات الشحن';
    }
}


// --- دوال كلمة المرور ---
async function handleChangePassword(event, token) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const submitBtn = event.target.querySelector('button');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showToast('يرجى ملء جميع الحقول.', true);
        return;
    }
    if (newPassword !== confirmNewPassword) {
        showToast('كلمتا السر الجديدتان غير متطابقتين!', true);
        return;
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        showToast('كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على أرقام وحروف.', true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري التحديث...';

    try {
        const response = await fetch('/api/users/profile/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, false);
            event.target.reset(); 
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showToast(error.message || 'حدث خطأ ما.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تحديث كلمة المرور';
    }
}


// --- الدالة الرئيسية للصفحة ---
export function initializeProfilePage() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) {
        window.location.href = 'login.html';
        return;
    }

    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    if (profileNameEl && profileEmailEl) {
        profileNameEl.textContent = userInfo.name;
        profileEmailEl.textContent = userInfo.email;
    }
    
    fetchMyOrders(userInfo.token);

    // --- ربط الأحداث ---
    const changePasswordSection = document.getElementById('change-password-section');
    const googleUserMessage = document.getElementById('google-user-message');

    if (userInfo.hasPassword) {
        if(changePasswordSection) changePasswordSection.style.display = 'block';
        if(googleUserMessage) googleUserMessage.style.display = 'none';
        
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (event) => handleChangePassword(event, userInfo.token));
        }
    } else {
        if(changePasswordSection) changePasswordSection.style.display = 'none';
        if(googleUserMessage) googleUserMessage.style.display = 'block';
    }

    populateShippingForm(userInfo);
    const shippingForm = document.getElementById('shipping-details-form');
    if (shippingForm) {
        shippingForm.addEventListener('submit', (event) => handleSaveShippingDetails(event, userInfo.token));
    }
    
    const ordersListContainer = document.getElementById('my-orders-list');
    if(ordersListContainer) {
        ordersListContainer.addEventListener('click', (event) => {
            const target = event.target.closest('button'); 
            if(!target) return;

            const orderId = target.dataset.orderId;
            if(!orderId) return;

            if(target.classList.contains('btn-view-details')) {
                createOrderDetailsModal(orderId);
            }
            if(target.classList.contains('btn-cancel-order')) {
                handleCancelOrder(orderId, userInfo.token);
            }
        });
    }
}

// --- دوال جلب وعرض الطلبات ---
async function fetchMyOrders(token) {
    const ordersListContainer = document.getElementById('my-orders-list');
    if (!ordersListContainer) return;

    showSpinner(ordersListContainer);

    try {
        const response = await fetch('/api/users/myorders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('فشل في جلب الطلبات.');
        }

        myOrders = await response.json();
        
        renderOrders(myOrders, ordersListContainer);

    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersListContainer.innerHTML = '<p style="text-align: center; color: #ff6b6b;">حدث خطأ أثناء جلب طلباتك. يرجى المحاولة مرة أخرى.</p>';
        showToast(error.message, true);
    }
}

function renderOrders(orders, container) {
    container.innerHTML = '';
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center;">لم تقم بأي طلبات بعد.</p>';
        return;
    }

    orders.forEach(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const orderIdShort = order._id.substring(order._id.length - 6).toUpperCase();

        const buttonsHTML = `
            <div class="managed-product-controls">
                <button class="btn btn-secondary btn-view-details" data-order-id="${order._id}">عرض التفاصيل</button>
                ${order.status === 'قيد المراجعة' ? `<button class="btn btn-delete btn-cancel-order" data-order-id="${order._id}">إلغاء الطلب</button>` : ''}
            </div>
        `;

        const orderItemHTML = `
            <div class="managed-order-item" id="order-item-${order._id}">
                <div class="managed-order-info">
                    <p><strong>رقم الطلب:</strong> <span>#${orderIdShort}</span></p>
                    <p><strong>التاريخ:</strong> <span>${orderDate}</span></p>
                    <p><strong>الإجمالي:</strong> <span>${order.totalPrice.toFixed(2)} ج.م</span></p>
                    <p><strong>الحالة:</strong> <span class="status">${order.status}</span></p>
                </div>
                ${buttonsHTML}
            </div>
        `;
        container.innerHTML += orderItemHTML;
    });
}

// --- دوال عرض التفاصيل والإلغاء ---

async function handleCancelOrder(orderId, token) {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }

    try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('تم إلغاء طلبك بنجاح.');
            const orderItem = document.getElementById(`order-item-${orderId}`);
            if (orderItem) {
                orderItem.querySelector('.status').textContent = 'ملغي';
                const cancelButton = orderItem.querySelector('.btn-cancel-order');
                if (cancelButton) cancelButton.remove();
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء محاولة إلغاء الطلب.', true);
    }
}


function createOrderDetailsModal(orderId) {
    const order = myOrders.find(o => o._id === orderId);
    if (!order) return;
    
    const oldModal = document.getElementById('user-order-details-modal');
    if (oldModal) oldModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'user-order-details-modal';
    modalOverlay.className = 'modal-overlay';
    
    // --- بداية الجزء المعدل ---
    const productsRows = order.products.map(p => 
        `<tr>
            <td>${p.name}</td>
            <td>${p.size}</td>
            <td>${p.quantity}</td>
            <td>${p.price.toFixed(2)} ج.م</td>
            <td><a class="product-link-in-modal" href="product.html?id=${p.productId}" target="_blank">عرض المنتج</a></td>
        </tr>`
    ).join('');
    
    const tableHeaders = `<thead><tr><th>المنتج</th><th>المقاس</th><th>الكمية</th><th>السعر</th><th></th></tr></thead>`;
    // --- نهاية الجزء المعدل ---
    
    const discountHTML = (order.discount && order.discount.amount > 0)
        ? `<div class="summary-row">
               <span>الخصم (${order.discount.code})</span>
               <span style="color: #2ecc71;">-${order.discount.amount.toFixed(2)} ج.م</span>
           </div>`
        : '';

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h3>تفاصيل الطلب (رقم: ${order._id.substring(order._id.length - 6).toUpperCase()})</h3>
            
            <h4>المنتجات المطلوبة</h4>
            <table class="order-products-table">
                ${tableHeaders}
                <tbody>${productsRows}</tbody>
            </table>

            <div class="summary-details" style="border-top: 1px solid #3a5b8e; padding-top: 15px; margin-top: 15px;">
                <div class="summary-row">
                    <span>الإجمالي الفرعي</span>
                    <span>${order.subtotal ? order.subtotal.toFixed(2) : 'N/A'} ج.م</span>
                </div>
                ${discountHTML}
                <div class="summary-total">
                    <span>الإجمالي النهائي</span>
                    <span>${order.totalPrice.toFixed(2)} ج.م</span>
                </div>
            </div>
        </div>`;
    
    document.body.appendChild(modalOverlay);
    setTimeout(() => modalOverlay.classList.add('active'), 10); 
    
    const closeModal = () => {
        modalOverlay.classList.remove('active');
        setTimeout(() => modalOverlay.remove(), 300);
    };

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
}