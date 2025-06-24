// --- دوال سلة المشتريات والإشعارات ---

// --- بداية الجزء المعدل ---
// دالة الإشعارات (معدلة لتقبل HTML)
export function showToast(message, isError = false) { 
    const toastContainer = document.getElementById('toast-container'); 
    if (!toastContainer) return; 
    const toast = document.createElement('div'); 
    toast.classList.add('toast'); 
    if (isError) {
        toast.style.backgroundColor = '#e74c3c';
        toast.style.color = '#ffffff';
    }
    toast.innerHTML = message; // تم تغييرها من textContent إلى innerHTML
    toastContainer.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 4000); 
}
// --- نهاية الجزء المعدل ---


// دالة تحديث أيقونة السلة
export function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCountElements = document.querySelectorAll('.cart-count');
    let totalItems = 0;
    cart.forEach(item => totalItems += item.quantity);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// دالة لتحديث السلة في الـ localStorage وقاعدة البيانات (إذا كان المستخدم مسجلاً)
async function syncCart(newCart) {
    // تحديث الـ localStorage دائمًا
    localStorage.setItem('cart', JSON.stringify(newCart));
    updateCartIcon();

    // إذا كان المستخدم مسجلاً، قم بمزامنة السلة مع قاعدة البيانات
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo && userInfo.token) {
        try {
            await fetch('/api/users/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userInfo.token}`
                },
                body: JSON.stringify({ cart: newCart })
            });
        } catch (error) {
            console.error('Failed to sync cart with DB:', error);
            showToast('حدث خطأ أثناء مزامنة السلة مع حسابك.', true);
        }
    }
}


// دالة إضافة منتج للسلة (معدلة برسالة خطأ أدق)
export function addToCart(productId, quantity, size, allProducts) {
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

    const remainingStock = sizeVariant.stock - quantityInCart;

    if (quantity > remainingStock) {
        if (remainingStock > 0) {
            showToast(`عفواً، المتاح في المخزون هو ${remainingStock} قطعة فقط. لا يمكنك إضافة المزيد.`, true);
        } else {
            showToast(`عفواً، كل الكمية المتاحة من هذا المقاس موجودة بالفعل في سلتك.`, true);
        }
        return;
    }

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity, size: size });
    }
    
    syncCart(cart);
    showToast(`تمت إضافة ${quantity} قطعة للسلة بنجاح ✔️`);
}

// دالة حذف منتج من السلة
function removeFromCart(cartItemId, allProducts) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => (item.id + '-' + item.size) !== cartItemId);
    
    syncCart(cart);
    displayCartItems(allProducts);
}


// دالة تغيير كمية منتج في السلة (معدلة لمنع الكمية من أن تقل عن 1)
function changeCartItemQuantity(cartItemId, change, allProducts) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => (item.id + '-' + item.size) === cartItemId);
    
    if (itemIndex > -1) {
        const itemInCart = cart[itemIndex];

        // لو المستخدم بيحاول ينقص الكمية وهي أصلاً 1، منعملش أي حاجة ونخرج
        if (change < 0 && itemInCart.quantity <= 1) {
            return;
        }

        const product = allProducts.find(p => p.id == itemInCart.id);
        const sizeVariant = product.sizes.find(s => s.name === itemInCart.size);

        if (change > 0 && (itemInCart.quantity + change > sizeVariant.stock)) {
            showToast(`الكمية المتاحة لهذا المقاس هي ${sizeVariant.stock} قطعة فقط.`, true);
            return;
        }

        // تحديث الكمية
        itemInCart.quantity += change;
    }

    syncCart(cart);
    displayCartItems(allProducts);
}


// دالة عرض المنتجات في صفحة السلة
export function displayCartItems(allProducts) {
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
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => { button.addEventListener('click', (event) => { removeFromCart(event.target.dataset.id, allProducts); }); });
        document.querySelectorAll('.plus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, 1, allProducts); }); });
        document.querySelectorAll('.minus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, -1, allProducts); }); });
    }
    updateCartIcon();
}

// دالة عرض ملخص الطلب في صفحة الدفع
export function displayCheckoutSummary(allProducts) {
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

// دوال التحقق من الفورم
function showFieldError(inputElement, message) { const formGroup = inputElement.closest('.form-group'); if (!formGroup) return; const errorElement = formGroup.querySelector('.error-message'); if (inputElement) inputElement.classList.add('invalid'); if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; } }
function clearFieldError(inputElement) { const formGroup = inputElement.closest('.form-group'); if (!formGroup) return; const errorElement = formGroup.querySelector('.error-message'); if (inputElement) inputElement.classList.remove('invalid'); if(errorElement) errorElement.style.display = 'none'; }
function validateForm() { let isValid = true; const fields = ['full-name', 'phone', 'address', 'governorate', 'city']; fields.forEach(id => { const field = document.getElementById(id); if (field) clearFieldError(field); }); const fullName = document.getElementById('full-name'); const phone = document.getElementById('phone'); const address = document.getElementById('address'); const governorate = document.getElementById('governorate'); const city = document.getElementById('city'); if (fullName.value.trim() === '') { showFieldError(fullName, 'هذا الحقل مطلوب.'); isValid = false; } if (phone.value.trim() === '') { showFieldError(phone, 'هذا الحقل مطلوب.'); isValid = false; } else if (!/^\d{11}$/.test(phone.value.trim())) { showFieldError(phone, 'يجب أن يكون رقم الهاتف 11 رقماً صحيحاً.'); isValid = false; } if (address.value.trim() === '') { showFieldError(address, 'هذا الحقل مطلوب.'); isValid = false; } if (governorate.value.trim() === '') { showFieldError(governorate, 'هذا الحقل مطلوب.'); isValid = false; } if (city.value.trim() === '') { showFieldError(city, 'هذا الحقل مطلوب.'); isValid = false; } return isValid; }


// دالة إرسال الطلب للسيرفر
export async function handleOrderSubmission(event) {
    event.preventDefault();
    if (!validateForm()) {
        showToast('من فضلك املأ كل الحقول المطلوبة بشكل صحيح.', true);
        return;
    }

    const confirmBtn = document.querySelector('.confirm-order-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'جاري تأكيد الطلب...';

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const customerDetails = {
        fullName: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        governorate: document.getElementById('governorate').value,
        city: document.getElementById('city').value,
    };
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    if (cartItems.length === 0) {
        showToast('سلة المشتريات فارغة!', true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الطلب';
        return;
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (userInfo && userInfo.token) {
            headers['Authorization'] = `Bearer ${userInfo.token}`;
        }

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ customerDetails, cartItems }),
        });

        if (response.ok) {
            // مسح السلة بعد إتمام الطلب بنجاح
            syncCart([]);
            showToast('تم تأكيد طلبك بنجاح! سيتم تحويلك للصفحة الرئيسية ✔️');
            confirmBtn.textContent = 'تم الطلب بنجاح!';
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في إرسال الطلب. حاول مرة أخرى.');
        }
    } catch (error) {
        showToast(error.message, true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الطلب';
    }
}