import { showToast } from './cart.js';
import { updateCartIcon } from './cart.js'; // سنحتاج هذه الدالة هنا

// --- بداية الجزء الجديد: دوال مساعدة للسلة ---

// دالة لدمج سلة الزائر مع سلة المستخدم
function mergeCarts(guestCart, userCart) {
    if (!guestCart || guestCart.length === 0) {
        return userCart || [];
    }
    if (!userCart || userCart.length === 0) {
        return guestCart || [];
    }

    const mergedCart = [...userCart]; // ابدأ بسلة المستخدم
    guestCart.forEach(guestItem => {
        const existingItemIndex = mergedCart.findIndex(
            userItem => userItem.id === guestItem.id && userItem.size === guestItem.size
        );

        if (existingItemIndex > -1) {
            // إذا كان المنتج موجودًا بالفعل، قم بزيادة الكمية
            mergedCart[existingItemIndex].quantity += guestItem.quantity;
        } else {
            // إذا كان المنتج جديدًا، أضفه إلى السلة
            mergedCart.push(guestItem);
        }
    });
    return mergedCart;
}

// دالة لحفظ السلة في قاعدة البيانات
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

// --- نهاية الجزء الجديد ---


// --- منطق المستخدمين المعدل ---

export async function handleRegisterForm(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        showToast('كلمتا السر غير متطابقتين!', true);
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
            
            // لو كان هناك منتجات في سلة الزائر، احفظها في حسابه الجديد
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
            
            // منطق دمج السلال
            const guestCart = JSON.parse(localStorage.getItem('cart')) || [];
            const userCart = data.cart || [];
            const mergedCart = mergeCarts(guestCart, userCart);

            // احفظ السلة المدمجة في قاعدة البيانات ثم في الـ localStorage
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
    // مسح بيانات المستخدم والسلة من الـ localStorage عند تسجيل الخروج
    localStorage.removeItem('userInfo');
    localStorage.setItem('cart', JSON.stringify([])); 
    window.location.href = 'login.html';
}

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
                <li><a href="#" id="logout-link">تسجيل الخروج</a></li>
            </ul>
        `;
        userNavMobileContainer.innerHTML = `
            <li><a href="profile.html">حسابي</a></li>
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

    // لتجنب إعادة إضافة event listeners بدون داعي، نحدث الـ HTML فقط لو تغير
    if (currentContent !== newContent) {
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