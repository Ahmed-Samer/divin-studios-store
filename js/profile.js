import { showToast } from './cart.js';

function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    }
}

// --- بداية الدوال الجديدة الخاصة ببيانات الشحن ---

// دالة لملء فورم الشحن بالبيانات المحفوظة
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

// دالة لحفظ بيانات الشحن الجديدة
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

    // تحقق بسيط من أن الحقول ليست فارغة
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
            // تحديث بيانات المستخدم في localStorage بالبيانات الجديدة
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

// --- نهاية الدوال الجديدة ---


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

    // --- بداية الجزء الجديد: تشغيل فورم بيانات الشحن ---
    populateShippingForm(userInfo);
    const shippingForm = document.getElementById('shipping-details-form');
    if (shippingForm) {
        shippingForm.addEventListener('submit', (event) => handleSaveShippingDetails(event, userInfo.token));
    }
    // --- نهاية الجزء الجديد ---
}

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