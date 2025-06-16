// --- الجزء الخاص بفتح وإغلاق القائمة ---
const toggleBtn = document.querySelector('.menu-toggle-btn');
const header = document.querySelector('.main-header');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        header.classList.toggle('menu-is-open');
    });
}

// --- متغير عالمي لتخزين كل المنتجات بعد جلبها ---
let allProducts = [];

// --- دوال سلة المشتريات ---
function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCountElements = document.querySelectorAll('.cart-count');
    let totalItems = 0;
    cart.forEach(item => totalItems += item.quantity);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

function addToCart(productId, quantity, size) {
    if (!size) {
        alert('من فضلك اختر المقاس أولاً.');
        return;
    }
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingProductIndex = cart.findIndex(item => item.id == productId && item.size == size);
    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity, size: size });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartIcon();
    showToast(`تمت إضافة ${quantity} قطعة للسلة بنجاح ✔️`);
}

function removeFromCart(cartItemId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => (item.id + '-' + item.size) !== cartItemId);
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems();
}

function changeCartItemQuantity(cartItemId, change) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => (item.id + '-' + item.size) === cartItemId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems();
}

// --- دالة لرسم كروت المنتجات في الصفحة الرئيسية ---
function renderProducts(productsToRender) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    productGrid.innerHTML = '';
    if (productsToRender.length === 0) {
        productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>لا توجد منتجات تطابق بحثك.</h2><p>حاول استخدام كلمات بحث مختلفة.</p></div>`;
        return;
    }
    productsToRender.forEach(product => {
        const cardHTML = `
            <div class="product-card">
                <div class="card-image"> <img src="${product.images[0]}" alt="${product.name}"> </div>
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
                const cartItemHTML = `
                    <div class="cart-item">
                        <img src="${product.images[0]}" alt="${product.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h3>${product.name}</h3>
                            <p>المقاس: ${cartItem.size}</p>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn minus-btn" data-id="${cartItemId}">-</button>
                                <span class="quantity-text">${cartItem.quantity}</span>
                                <button class="quantity-btn plus-btn" data-id="${cartItemId}">+</button>
                            </div>
                        </div>
                        <p class="cart-item-price">${product.price * cartItem.quantity} ج.م</p>
                        <button class="remove-from-cart-btn" data-id="${cartItemId}">🗑️</button>
                    </div>`;
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
function showFieldError(inputElement, message) { const formGroup = inputElement.parentElement; const errorElement = formGroup.querySelector('.error-message'); inputElement.classList.add('invalid'); errorElement.textContent = message; errorElement.style.display = 'block'; }
function clearFieldError(inputElement) { const formGroup = inputElement.parentElement; const errorElement = formGroup.querySelector('.error-message'); inputElement.classList.remove('invalid'); errorElement.style.display = 'none'; }
function validateForm() { let isValid = true; const fullName = document.getElementById('full-name'); const phone = document.getElementById('phone'); const address = document.getElementById('address'); const governorate = document.getElementById('governorate'); const city = document.getElementById('city'); clearFieldError(fullName); clearFieldError(phone); clearFieldError(address); clearFieldError(governorate); clearFieldError(city); if (fullName.value.trim() === '') { showFieldError(fullName, 'هذا الحقل مطلوب.'); isValid = false; } if (phone.value.trim() === '') { showFieldError(phone, 'هذا الحقل مطلوب.'); isValid = false; } else if (!/^\d{11}$/.test(phone.value.trim())) { showFieldError(phone, 'يجب أن يكون رقم الهاتف 11 رقماً صحيحاً.'); isValid = false; } if (address.value.trim() === '') { showFieldError(address, 'هذا الحقل مطلوب.'); isValid = false; } if (governorate.value.trim() === '') { showFieldError(governorate, 'هذا الحقل مطلوب.'); isValid = false; } if (city.value.trim() === '') { showFieldError(city, 'هذا الحقل مطلوب.'); isValid = false; } return isValid; }

// --- الدالة الرئيسية التي تشغل كل شيء ---
async function initializeStore() {
    try {
        // التعديل هنا: اللينك بقى نسبي للـ API عشان يشتغل على أي استضافة
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

// --- دالة لتشغيل الكود المناسب لكل صفحة ---
function runPageSpecificLogic() {
    const urlParams = new URLSearchParams(window.location.search);
    const productDetailLayout = document.querySelector('.product-detail-layout');
    const productGrid = document.querySelector('.product-grid');
    const cartPageContainer = document.querySelector('.cart-page-container');
    const checkoutPageContainer = document.querySelector('.checkout-page-container');

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
            if (product.sizes && product.sizes.length > 0) { product.sizes.forEach(size => { const sizeBtn = document.createElement('button'); sizeBtn.className = 'size-btn'; sizeBtn.textContent = size; sizeBtn.dataset.size = size; sizeSelector.appendChild(sizeBtn); }); } else { sizeSelector.innerHTML = '<p>لا توجد مقاسات متاحة حالياً</p>'; }
            let selectedSize = null;
            const sizeButtons = document.querySelectorAll('.size-btn');
            sizeButtons.forEach(button => { button.addEventListener('click', () => { sizeButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); selectedSize = button.dataset.size; }); });
            const quantityInput = document.getElementById('quantity-input');
            const plusBtn = document.getElementById('plus-btn');
            const minusBtn = document.getElementById('minus-btn');
            plusBtn.addEventListener('click', () => { quantityInput.value = parseInt(quantityInput.value) + 1; });
            minusBtn.addEventListener('click', () => { if (parseInt(quantityInput.value) > 1) { quantityInput.value = parseInt(quantityInput.value) - 1; } });
            const addToCartButton = document.querySelector('.add-to-cart-btn');
            addToCartButton.addEventListener('click', () => { const quantity = parseInt(quantityInput.value); addToCart(product.id, quantity, selectedSize); });
            let currentIndex = 0;
            const slides = sliderWrapper.children;
            const nextBtn = document.querySelector('.slider-btn.next');
            const prevBtn = document.querySelector('.slider-btn.prev');
            if (slides.length > 1) {
                nextBtn.style.display = 'block'; prevBtn.style.display = 'block';
                const totalSlides = slides.length;
                function showSlide(index) { sliderWrapper.style.transform = `translateX(-${index * 100}%)`; }
                nextBtn.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalSlides; showSlide(currentIndex); });
                prevBtn.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; showSlide(currentIndex); });
            } else {
                nextBtn.style.display = 'none'; prevBtn.style.display = 'none';
            }
        } else { productDetailLayout.innerHTML = '<h1>خطأ: المنتج غير موجود</h1>'; }
    }
    
    if (productGrid) {
        const category = urlParams.get('category');
        let currentProducts = category ? allProducts.filter(p => p.category === category) : allProducts;
        renderProducts(currentProducts);
        const searchBar = document.getElementById('search-bar');
        searchBar.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase().trim();
            const filteredBySearch = currentProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
            renderProducts(filteredBySearch);
        });
    }
    
    if (cartPageContainer) {
        displayCartItems();
    }

    if (checkoutPageContainer) {
        displayCheckoutSummary();
        const checkoutForm = document.getElementById('checkout-form');
        if(checkoutForm) {
            checkoutForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const isFormValid = validateForm();
                if (isFormValid) {
                    alert('تم تأكيد طلبك بنجاح! سيتم التواصل معك قريباً.');
                    localStorage.removeItem('cart');
                    setTimeout(() => { window.location.href = 'index.html'; }, 500);
                }
            });
        }
    }
    
    updateCartIcon();
}

// --- نشغل كل شيء عند تحميل الصفحة ---
document.addEventListener('DOMContentLoaded', initializeStore);