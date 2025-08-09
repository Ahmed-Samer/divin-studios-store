// --- Cart and notifications functions ---

let appliedCoupon = null; // Variable to store the applied coupon

// Toast notification function
export function showToast(message, isError = false) { 
    const toastContainer = document.getElementById('toast-container'); 
    if (!toastContainer) return; 
    const toast = document.createElement('div'); 
    toast.classList.add('toast'); 
    if (isError) {
        toast.style.backgroundColor = '#e74c3c';
        toast.style.color = '#ffffff';
    }
    toast.innerHTML = message; 
    toastContainer.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 4000); 
}

// Update cart icon function
export function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCountElements = document.querySelectorAll('.cart-count');
    let totalItems = 0;
    cart.forEach(item => totalItems += item.quantity);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// Sync cart with localStorage
async function syncCart(newCart) {
    localStorage.setItem('cart', JSON.stringify(newCart));
    updateCartIcon();
}

// Add product to cart function
export function addToCart(productId, quantity, size, allProducts) {
    if (!size) {
        showToast('Please select a size first.', true);
        return false; // <-- Failed to add
    }

    const product = allProducts.find(p => p.id == productId);
    if (!product) return false;

    const sizeVariant = product.sizes.find(s => s.name === size);
    if (!sizeVariant) {
        showToast('Error: Size not available for this product.', true);
        return false; // <-- Failed to add
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
            showToast(`Sorry, only ${remainingStock} piece(s) available in stock.`, true);
        } else {
            showToast(`Sorry, all available quantity for this size is already in your cart.`, true);
        }
        return false; // <-- Failed to add
    }

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity, size: size });
    }
    
    syncCart(cart);
    showToast(`${quantity} piece(s) added to cart successfully ✔️`);
    return true; // <-- Successfully added
}

// Remove product from cart function
function removeFromCart(cartItemId, allProducts) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => (item.id + '-' + item.size) !== cartItemId);
    
    syncCart(cart);
    displayCartItems(allProducts);
}

// Change quantity of a cart item function
function changeCartItemQuantity(cartItemId, change, allProducts) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => (item.id + '-' + item.size) === cartItemId);
    
    if (itemIndex > -1) {
        const itemInCart = cart[itemIndex];

        if (change < 0 && itemInCart.quantity <= 1) {
            return;
        }

        const product = allProducts.find(p => p.id == itemInCart.id);
        const sizeVariant = product.sizes.find(s => s.name === itemInCart.size);

        if (change > 0 && (itemInCart.quantity + change > sizeVariant.stock)) {
            showToast(`Available quantity for this size is ${sizeVariant.stock} piece(s) only.`, true);
            return;
        }

        itemInCart.quantity += change;
    }

    syncCart(cart);
    displayCartItems(allProducts);
}

// Display cart items function
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
                const cartItemHTML = `<div class="cart-item"> <img src="${product.images[0]}" alt="${product.name}" class="cart-item-image"> <div class="cart-item-details"> <h3>${product.name}</h3> <p>Size: ${cartItem.size}</p> <div class="cart-item-quantity"> <button class="quantity-btn minus-btn" data-id="${cartItemId}">-</button> <span class="quantity-text">${cartItem.quantity}</span> <button class="quantity-btn plus-btn" data-id="${cartItemId}">+</button> </div> </div> <p class="cart-item-price">${product.price * cartItem.quantity} EGP</p> <button class="remove-from-cart-btn" data-id="${cartItemId}">🗑️</button> </div>`;
                cartItemsContainer.innerHTML += cartItemHTML;
            }
        });
        document.getElementById('cart-total-price').textContent = `${totalPrice} EGP`;
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => { button.addEventListener('click', (event) => { removeFromCart(event.target.dataset.id, allProducts); }); });
        document.querySelectorAll('.plus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, 1, allProducts); }); });
        document.querySelectorAll('.minus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, -1, allProducts); }); });
    }
    updateCartIcon();
}

// Display checkout summary function
export function displayCheckoutSummary(allProducts) {
    const summaryContainer = document.getElementById('summary-items-container');
    if (!summaryContainer) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    summaryContainer.innerHTML = '';
    
    if (cart.length === 0) {
        summaryContainer.innerHTML = '<p>No products in the cart.</p>';
        const confirmBtn = document.querySelector('.confirm-order-btn');
        if (confirmBtn) confirmBtn.disabled = true;
        updatePriceSummary(0);
        return;
    }

    let subtotal = 0;
    cart.forEach(cartItem => {
        const product = allProducts.find(p => p.id == cartItem.id);
        if (product) {
            subtotal += product.price * cartItem.quantity;
            const summaryItemHTML = `<div class="summary-item"> <span>${product.name} (x${cartItem.quantity}) - Size ${cartItem.size}</span> <span>${product.price * cartItem.quantity} EGP</span> </div>`;
            summaryContainer.innerHTML += summaryItemHTML;
        }
    });

    updatePriceSummary(subtotal);

    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', () => handleApplyCoupon(allProducts));
    }
}

// Update price summary function
function updatePriceSummary(subtotal, discount = { amount: 0, code: null }) {
    const subtotalEl = document.getElementById('summary-subtotal-price');
    const discountRow = document.getElementById('summary-discount-row');
    const discountAmountEl = document.getElementById('summary-discount-amount');
    const totalEl = document.getElementById('summary-total-price');
    
    let finalPrice = subtotal - discount.amount;
    if (finalPrice < 0) finalPrice = 0;

    subtotalEl.textContent = `${subtotal.toFixed(2)} EGP`;
    totalEl.textContent = `${finalPrice.toFixed(2)} EGP`;

    if (discount.amount > 0) {
        discountAmountEl.textContent = `-${discount.amount.toFixed(2)} EGP`;
        discountRow.style.display = 'flex';
    } else {
        discountRow.style.display = 'none';
    }
}

// Apply coupon function
async function handleApplyCoupon(allProducts) {
    const couponInput = document.getElementById('coupon-input');
    const code = couponInput.value.trim();
    const couponMessageEl = document.getElementById('coupon-message');
    
    if (!code) {
        showToast('Please enter a discount code', true);
        return;
    }

    try {
        const response = await fetch('/api/coupons/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }
        
        appliedCoupon = data;
        couponMessageEl.textContent = `Discount applied successfully! (${data.code})`;
        couponMessageEl.style.color = '#2ecc71';
        
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        let subtotal = 0;
        cart.forEach(item => {
            const product = allProducts.find(p => p.id == item.id);
            if(product) subtotal += product.price * item.quantity;
        });

        let discountAmount = 0;
        if (appliedCoupon.discountType === 'percentage') {
            discountAmount = (subtotal * appliedCoupon.value) / 100;
        } else {
            discountAmount = appliedCoupon.value;
        }
        
        updatePriceSummary(subtotal, { amount: discountAmount, code: appliedCoupon.code });

    } catch (error) {
        appliedCoupon = null;
        couponMessageEl.textContent = error.message;
        couponMessageEl.style.color = '#e74c3c';
        displayCheckoutSummary(allProducts); 
    }
}

// Prefill checkout form function
export function prefillCheckoutForm() {
    // This function will be updated later if we add user accounts
}

// --- Start: Form validation functions ---
function showFieldError(inputElement, message) { 
    const formGroup = inputElement.closest('.form-group'); 
    if (!formGroup) return; 
    const errorElement = formGroup.querySelector('.error-message'); 
    if (inputElement) inputElement.classList.add('invalid'); 
    if (errorElement) { 
        errorElement.textContent = message; 
        errorElement.style.display = 'block'; 
    } 
}

function clearFieldError(inputElement) { 
    const formGroup = inputElement.closest('.form-group'); 
    if (!formGroup) return; 
    const errorElement = formGroup.querySelector('.error-message'); 
    if (inputElement) inputElement.classList.remove('invalid'); 
    if(errorElement) errorElement.style.display = 'none'; 
}

function validateForm() { 
    let isValid = true; 
    const fields = ['full-name', 'phone', 'address', 'governorate', 'city']; 
    fields.forEach(id => { 
        const field = document.getElementById(id); 
        if (field) clearFieldError(field); 
    }); 
    const fullName = document.getElementById('full-name'); 
    const phone = document.getElementById('phone'); 
    const address = document.getElementById('address'); 
    const governorate = document.getElementById('governorate'); 
    const city = document.getElementById('city'); 
    if (fullName.value.trim() === '') { 
        showFieldError(fullName, 'This field is required.'); 
        isValid = false; 
    } 
    if (phone.value.trim() === '') { 
        showFieldError(phone, 'This field is required.'); 
        isValid = false; 
    } else if (!/^\d{11}$/.test(phone.value.trim())) { 
        showFieldError(phone, 'Phone number must be exactly 11 digits.'); 
        isValid = false; 
    } 
    if (address.value.trim() === '') { 
        showFieldError(address, 'This field is required.'); 
        isValid = false; 
    } 
    if (governorate.value.trim() === '') { 
        showFieldError(governorate, 'This field is required.'); 
        isValid = false; 
    } 
    if (city.value.trim() === '') { 
        showFieldError(city, 'This field is required.'); 
        isValid = false; 
    } 
    return isValid; 
}
// --- End: Form validation functions ---

// Submit order to server function
export async function handleOrderSubmission(event) {
    event.preventDefault();
    if (!validateForm()) {
        showToast('Please fill in all required fields correctly.', true);
        return;
    }

    const confirmBtn = document.querySelector('.confirm-order-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Confirming your order...';

    const customerDetails = {
        fullName: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        governorate: document.getElementById('governorate').value,
        city: document.getElementById('city').value,
    };
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    if (cartItems.length === 0) {
        showToast('Your cart is empty!', true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Order';
        return;
    }
    
    const orderData = {
        customerDetails,
        cartItems,
        couponCode: appliedCoupon ? appliedCoupon.code : null
    };

    try {
        const headers = { 'Content-Type': 'application/json' };
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData),
        });

        if (response.ok) {
            syncCart([]);
            showToast('Your order has been confirmed successfully! Redirecting to home page ✔️');
            confirmBtn.textContent = 'Order Confirmed!';
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit the order. Please try again.');
        }
    } catch (error) {
        showToast(error.message, true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Order';
    }
}
