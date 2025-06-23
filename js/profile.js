import { showToast } from './cart.js'; // لإظهار أي رسائل خطأ

// الدالة الرئيسية اللي هيتم استدعاؤها من main.js
export function initializeProfilePage() {
    // أولاً، التحقق من أن المستخدم مسجل دخوله
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) {
        // إذا لم يكن مسجلاً، يتم توجيهه لصفحة الدخول فورًا
        window.location.href = 'login.html';
        return;
    }

    // ثانيًا، عرض بيانات المستخدم
    const profileNameEl = document.getElementById('profile-name');
    const profileEmailEl = document.getElementById('profile-email');
    if (profileNameEl && profileEmailEl) {
        profileNameEl.textContent = userInfo.name;
        profileEmailEl.textContent = userInfo.email;
    }
    
    // ثالثًا، جلب وعرض طلبات المستخدم
    fetchMyOrders(userInfo.token);
}

// دالة جلب الطلبات من السيرفر
async function fetchMyOrders(token) {
    const ordersListContainer = document.getElementById('my-orders-list');
    if (!ordersListContainer) return;

    try {
        const response = await fetch('/api/users/myorders', {
            headers: {
                'Authorization': `Bearer ${token}` // إرسال التوكن للتأكد من هوية المستخدم
            }
        });

        // لو السيرفر رجع خطأ "غير مصرح"، معناه التوكن منتهي الصلاحية
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
        ordersListContainer.innerHTML = '<p>حدث خطأ أثناء جلب طلباتك. يرجى المحاولة مرة أخرى.</p>';
        showToast(error.message, true);
    }
}

// دالة عرض الطلبات في الصفحة
function renderOrders(orders, container) {
    container.innerHTML = '';
    if (orders.length === 0) {
        container.innerHTML = '<p>لم تقم بأي طلبات بعد.</p>';
        return;
    }

    orders.forEach(order => {
        // استخدام نفس تنسيق الطلبات في صفحة الأدمن للحفاظ على التصميم
        const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // عرض آخر 6 أرقام من كود الطلب لسهولة القراءة
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