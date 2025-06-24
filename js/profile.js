import { showToast } from './cart.js';

function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    }
}

// --- بداية الجزء الجديد: دالة التعامل مع تغيير كلمة المرور ---
async function handleChangePassword(event, token) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const submitBtn = event.target.querySelector('button');

    // التحقق من البيانات في الواجهة الأمامية أولاً
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
            event.target.reset(); // مسح حقول النموذج بعد النجاح
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
// --- نهاية الجزء الجديد ---

// الدالة الرئيسية اللي بيتم استدعاؤها من main.js
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

    // --- بداية الجزء الجديد: ربط دالة تغيير كلمة المرور بالنموذج ---
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (event) => handleChangePassword(event, userInfo.token));
    }
    // --- نهاية الجزء الجديد ---
}

// دالة جلب الطلبات من السيرفر
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

        const orders = await response.json();
        
        renderOrders(orders, ordersListContainer);

    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersListContainer.innerHTML = '<p style="text-align: center; color: #ff6b6b;">حدث خطأ أثناء جلب طلباتك. يرجى المحاولة مرة أخرى.</p>';
        showToast(error.message, true);
    }
}

// دالة عرض الطلبات في الصفحة
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

        const orderItemHTML = `
            <div class="managed-order-item">
                <div class="managed-order-info">
                    <p><strong>رقم الطلب:</strong> <span>#${orderIdShort}</span></p>
                    <p><strong>التاريخ:</strong> <span>${orderDate}</span></p>
                    <p><strong>الإجمالي:</strong> <span>${order.totalPrice} ج.م</span></p>
                    <p><strong>الحالة:</strong> <span class="status">${order.status}</span></p>
                </div>
            </div>
        `;
        container.innerHTML += orderItemHTML;
    });
}