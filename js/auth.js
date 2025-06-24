import { showToast } from './cart.js';
import { updateCartIcon } from './cart.js';

// --- دوال مساعدة للسلة ---
function mergeCarts(guestCart, userCart) {
    if (!guestCart || guestCart.length === 0) {
        return userCart || [];
    }
    if (!userCart || userCart.length === 0) {
        return guestCart || [];
    }
    const mergedCart = [...userCart];
    guestCart.forEach(guestItem => {
        const existingItemIndex = mergedCart.findIndex(
            userItem => userItem.id === guestItem.id && userItem.size === guestItem.size
        );
        if (existingItemIndex > -1) {
            mergedCart[existingItemIndex].quantity += guestItem.quantity;
        } else {
            mergedCart.push(guestItem);
        }
    });
    return mergedCart;
}

async function saveCartToDb(cart, token) {
    try {
        await fetch('/api/users/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cart: cart })
        });
    } catch (error) {
        console.error('Failed to save cart to DB', error);
        showToast('حدث خطأ أثناء مزامنة السلة.', true);
    }
}

// --- منطق التحقق الفوري للإيميل ---
export function initializeRegisterPageListeners() {
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error-message');

    if (!emailInput || !emailError) return;

    emailInput.addEventListener('blur', async () => {
        const email = emailInput.value.trim();
        const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailFormatRegex.test(email)) {
            emailError.textContent = '';
            emailError.style.display = 'none';
            return;
        }

        try {
            const response = await fetch('/api/users/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.exists) {
                emailError.textContent = 'هذا البريد الإلكتروني مسجل بالفعل.';
                emailError.style.display = 'block';
            } else {
                emailError.textContent = '';
                emailError.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking email:', error);
        }
    });
}

// --- دالة إظهار/إخفاء كلمة المرور ---
export function setupPasswordToggle(container) {
    const passwordInput = container.querySelector('input');
    const toggleIcon = container.querySelector('.password-toggle-icon');

    if (passwordInput && toggleIcon) {
        toggleIcon.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                toggleIcon.textContent = '👁️';
            }
        });
    }
}


// --- منطق المستخدمين ---
export async function handleRegisterForm(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
        showToast('كلمة السر يجب أن تكون 8 أحرف على الأقل وتحتوي على أرقام وحروف.', true);
        return;
    }

    if (password !== confirmPassword) {
        showToast('كلمتا السر غير متطابقتين!', true);
        return;
    }

    const emailError = document.getElementById('email-error-message');
    if (emailError && emailError.style.display === 'block') {
        showToast('يرجى استخدام بريد إلكتروني آخر لإنه مسجل بالفعل.', true);
        return;
    }
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('تم إنشاء الحساب بنجاح! جاري مزامنة السلة...');
            const guestCart = JSON.parse(localStorage.getItem('cart')) || [];
            
            if (guestCart.length > 0) {
                await saveCartToDb(guestCart, data.token);
            }
            
            localStorage.setItem('userInfo', JSON.stringify(data));
            updateUserNav();
            updateCartIcon();
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } else {
            throw new Error(data.message || 'حدث خطأ غير معروف');
        }
    } catch (error) {
        showToast(error.message, true);
    }
}

export async function handleLoginForm(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('تم تسجيل الدخول بنجاح! جاري دمج السلة...');
            
            const guestCart = JSON.parse(localStorage.getItem('cart')) || [];
            const userCart = data.cart || [];
            const mergedCart = mergeCarts(guestCart, userCart);

            await saveCartToDb(mergedCart, data.token);
            localStorage.setItem('cart', JSON.stringify(mergedCart));
            localStorage.setItem('userInfo', JSON.stringify(data));
            
            updateUserNav();
            updateCartIcon();
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } else {
            throw new Error(data.message || 'حدث خطأ غير معروف');
        }
    } catch (error) {
        showToast(error.message, true);
    }
}

function handleLogout() {
    localStorage.removeItem('userInfo');
    localStorage.setItem('cart', JSON.stringify([])); 
    window.location.href = 'login.html';
}

// --- بداية الجزء المعدل ---
export function updateUserNav() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const userActionsContainer = document.getElementById('user-actions');
    const userNavMobileContainer = document.getElementById('user-navigation-links-mobile');

    if (!userActionsContainer || !userNavMobileContainer) return;

    const currentContent = userActionsContainer.innerHTML;
    let newContent;

    if (userInfo) {
        newContent = `
            <button class="user-dropdown-button">
                <span>${userInfo.name.split(' ')[0]}</span>
            </button>
            <ul class="user-dropdown-menu">
                <li><a href="profile.html">حسابي</a></li>
                <li><a href="favorites.html">المفضلة</a></li>
                <li class="separator"></li>
                <li><a href="#" id="logout-link">تسجيل الخروج</a></li>
            </ul>
        `;
        userNavMobileContainer.innerHTML = `
            <li><a href="profile.html">حسابي</a></li>
            <li><a href="favorites.html">المفضلة</a></li>
            <li class="separator"></li>
            <li><a href="#" id="logout-link-mobile">تسجيل الخروج</a></li>
        `;
    } else {
        newContent = `
            <a href="login.html" class="btn btn-secondary">دخول</a>
            <a href="register.html" class="btn">حساب جديد</a>
        `;
        userNavMobileContainer.innerHTML = `
            <li><a href="login.html">تسجيل الدخول</a></li>
            <li><a href="register.html">إنشاء حساب</a></li>
        `;
    }

    // يتم التحديث فقط إذا تغير المحتوى لتجنب إعادة ربط الأحداث بدون داعي
    if (currentContent.trim() !== newContent.trim()) {
        userActionsContainer.innerHTML = newContent;

        if (userInfo) {
            const dropdownButton = userActionsContainer.querySelector('.user-dropdown-button');
            dropdownButton.addEventListener('click', (e) => {
                e.stopPropagation();
                userActionsContainer.classList.toggle('open');
            });
            document.getElementById('logout-link').addEventListener('click', handleLogout);
            document.getElementById('logout-link-mobile').addEventListener('click', handleLogout);
        }
    }
}
// --- نهاية الجزء المعدل ---


export async function handleForgotPasswordForm(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const submitBtn = event.target.querySelector('button');

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإرسال...';

    try {
        const response = await fetch('/api/users/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        showToast(data.message);
    } catch (error) {
        showToast('حدث خطأ. يرجى المحاولة مرة أخرى.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إرسال رابط إعادة التعيين';
    }
}

export async function handleResetPasswordForm(event) {
    event.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const submitBtn = event.target.querySelector('button');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showToast('رابط إعادة التعيين غير صالح أو مفقود.', true);
        return;
    }
    
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        showToast('كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على أرقام وحروف.', true);
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showToast('كلمتا السر غير متطابقتين!', true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري التحديث...';

    try {
        const response = await fetch(`/api/users/reset-password/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, false);
            submitBtn.textContent = 'تم التحديث بنجاح';
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showToast(error.message || 'حدث خطأ ما.', true);
        submitBtn.disabled = false;
        submitBtn.textContent = 'تحديث كلمة المرور';
    }
}