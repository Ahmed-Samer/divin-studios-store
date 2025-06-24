import { showToast } from './cart.js';

// --- بداية الجزء الجديد: إضافة دالة الـ Spinner ---
function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
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
}

// دالة جلب الطلبات من السيرفر
async function fetchMyOrders(token) {
    const ordersListContainer = document.getElementById('my-orders-list');
    if (!ordersListContainer) return;

    showSpinner(ordersListContainer); // إظهار الـ Spinner قبل جلب البيانات

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