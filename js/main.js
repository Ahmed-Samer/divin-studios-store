// استدعاء كل الدوال اللازمة من باقي الملفات
import { initializeAdminPage } from './admin.js';
import { showToast, updateCartIcon, addToCart, displayCartItems, displayCheckoutSummary, handleOrderSubmission } from './cart.js';

// متغيرات عامة
let allProducts = [];

// --- بداية: دالة الهيدر عند السكرول ---
function handleHeaderScroll() {
    const header = document.querySelector('.main-header');
    if (!header || !document.body.classList.contains('homepage')) {
        return;
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });
}
// --- نهاية: دالة الهيدر عند السكرول ---


function handleAdminLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!password) {
            showToast('من فضلك أدخل كلمة السر.', true);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري التحقق...';

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('adminToken', JSON.stringify(data.token));
                showToast('تم تسجيل الدخول بنجاح! جاري تحويلك للوحة التحكم.');
                window.location.href = '/admin.html';
            } else {
                throw new Error(data.message || 'حدث خطأ غير متوقع.');
            }
        } catch (error) {
            showToast(error.message, true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'تسجيل الدخول';
        }
    });
}


function setupUserUI() {
    const adminToken = JSON.parse(localStorage.getItem('adminToken'));
    const userActionsContainer = document.querySelector('.nav-section.left');
    
    if (adminToken && userActionsContainer) {
        const logoutBtn = document.createElement('a');
        logoutBtn.href = '#';
        logoutBtn.textContent = 'خروج';
        logoutBtn.style.color = '#ff6b6b';
        logoutBtn.style.fontWeight = 'bold';
        logoutBtn.style.textDecoration = 'none';
        logoutBtn.style.marginRight = '15px';
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('adminToken');
            showToast('تم تسجيل الخروج.');
            setTimeout(() => window.location.href = '/index.html', 1000);
        });
        userActionsContainer.insertBefore(logoutBtn, userActionsContainer.querySelector('.cart-link'));
    }
}


function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    }
}


// --- بداية تشغيل التطبيق ---
document.addEventListener('DOMContentLoaded', () => {
    setupCommonEventListeners();
    initializeApp();
    setupUserUI();
    handleHeaderScroll();
});


// دالة لإضافة الـ event listeners العامة (زي القائمة والبحث)
function setupCommonEventListeners() {
    const header = document.querySelector('.main-header');
    if (!header) return;

    const toggleBtn = header.querySelector('.menu-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            header.classList.toggle('menu-is-open');
            header.classList.remove('search-active');
        });
    }

    const searchToggleBtn = header.querySelector('.search-toggle-btn');
    if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            header.classList.toggle('search-active');
            header.classList.remove('menu-is-open');
            if (header.classList.contains('search-active')) {
                document.getElementById('mobile-search-bar')?.focus();
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (header.classList.contains('menu-is-open')) {
            header.classList.remove('menu-is-open');
        }
        if (header.classList.contains('search-active')) {
            header.classList.remove('search-active');
        }
    });

    header.addEventListener('click', (e) => {
        if (e.target.closest('.expanded-links') || e.target.closest('.search-overlay')) {
            e.stopPropagation();
        }
    });
}


async function initializeApp() {
    const productGrid = document.querySelector('.product-grid');

    if(productGrid) {
        showSpinner(productGrid);
    }

    try {
        const response = await fetch('/api/products/search?keyword=');
        if (!response.ok) throw new Error('فشل الاتصال بالسيرفر لجلب المنتجات');
        allProducts = await response.json();
        
        const localCart = JSON.parse(localStorage.getItem('cart')) || [];
        localStorage.setItem('cart', JSON.stringify(localCart));

        runPageSpecificLogic();

    } catch (error) {
        console.error('فشل في جلب البيانات الأولية:', error);
        showToast(error.message, true);
        if (productGrid) {
            productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>عفواً، حدث خطأ</h2><p>لا يمكن الاتصال بالسيرفر حالياً. حاول مرة أخرى.</p></div>`;
        }
    }
}


// دالة تعمل كـ "راوتر" لتشغيل الكود المناسب لكل صفحة
function runPageSpecificLogic() {
    updateCartIcon();

    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (document.querySelector('.product-grid') && (path === '/' || path.endsWith('index.html'))) {
        initializeHomePage(urlParams);
    }
    if (document.querySelector('.product-detail-layout')) {
        const productId = urlParams.get('id');
        initializeProductDetailPage(productId);
    }
    if (document.querySelector('.cart-page-container')) {
        displayCartItems(allProducts);
    }
    if (document.querySelector('.checkout-page-container')) {
        displayCheckoutSummary(allProducts);
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleOrderSubmission);
        }
    }
    if (path.endsWith('admin.html')) {
           initializeAdminPage(allProducts);
    }
    if (document.getElementById('contact-form')) {
        initializeContactForm();
    }
    if (path.endsWith('login.html')) {
        handleAdminLogin();
    }
}


async function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    try {
        const response = await fetch('/api/emailjs-keys');
        if (!response.ok) {
            throw new Error('فشل في تحميل إعدادات الإرسال من السيرفر.');
        }
        const keys = await response.json();

        emailjs.init({
            publicKey: keys.publicKey,
        });

        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const submitBtn = document.getElementById('contact-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'جاري الإرسال...';

            emailjs.sendForm(keys.serviceId, keys.templateId, this)
                .then(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'إرسال الرسالة';
                    showToast('تم إرسال رسالتك بنجاح! ✔️');
                    contactForm.reset();
                }, (err) => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'إرسال الرسالة';
                    showToast('حدث خطأ أثناء الإرسال. حاول مرة أخرى.', true);
                    console.error('EmailJS Error:', JSON.stringify(err));
                });
        });

    } catch (error) {
        showToast(error.message, true);
        console.error(error);
        contactForm.innerHTML = '<p style="color: #e74c3c; text-align: center;">خدمة إرسال الرسائل غير متاحة حاليًا.</p>';
    }
}

function renderProducts(productsToRender, containerSelector = '.product-grid') {
    const productGrid = document.querySelector(containerSelector);
    if (!productGrid) return;
    productGrid.innerHTML = '';

    if (productsToRender.length === 0) {
        productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>لا توجد منتجات لعرضها.</h2></div>`;
        return;
    }

    productsToRender.forEach(product => {
        const totalStock = product.sizes.reduce((acc, size) => acc + size.stock, 0);
        const outOfStockBadge = totalStock === 0 ? '<div class="out-of-stock-badge">نفذت الكمية</div>' : '';

        const cardHTML = `
            <div class="product-card ${totalStock === 0 ? 'out-of-stock' : ''}">
                <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                    <div class="card-image">
                        ${outOfStockBadge}
                        <img src="${product.images[0]}" alt="${product.name}">
                    </div>
                </a>
                <div class="card-content">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">${product.price} EGP</p>
                    <a href="product.html?id=${product.id}" class="btn">Shop Now</a>
                </div>
            </div>
        `;
        productGrid.innerHTML += cardHTML;
    });
}


function initializeHomePage(urlParams) {
    const category = urlParams.get('category');
    let initialProducts = category ? allProducts.filter(p => p.category === category && !p.isDeleted) : allProducts.filter(p => !p.isDeleted);
    renderProducts(initialProducts);

    const searchBars = [document.getElementById('search-bar'), document.getElementById('mobile-search-bar')];
    
    const handleSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        let filteredBySearch = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
        const finalResults = category ? filteredBySearch.filter(p => p.category === category) : filteredBySearch;
        renderProducts(finalResults);
    };

    searchBars.forEach(bar => {
        if (bar) bar.addEventListener('input', handleSearch);
    });
}

async function initializeProductDetailPage(productId) {
    const productDetailLayout = document.querySelector('.product-detail-layout');
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('المنتج غير موجود');
        const data = await response.json();
        const { product, relatedProducts } = data;

        if (product) {
            document.querySelector('.product-title-large').textContent = product.name;
            document.querySelector('.product-price-large').textContent = `${product.price} EGP`;
            document.querySelector('.product-description').innerHTML = product.description;
            document.title = `${product.name} - Divin Studios`;

            const mainImagesContainer = document.getElementById('main-product-images');
            const thumbImagesContainer = document.getElementById('thumbnail-product-images');

            let mainImagesHTML = '';
            let thumbImagesHTML = '';

            product.images.forEach(imgSrc => {
                mainImagesHTML += `
                    <div class="swiper-slide">
                        <img src="${imgSrc}" alt="${product.name}" />
                    </div>`;
                
                thumbImagesHTML += `
                    <div class="swiper-slide">
                        <img src="${imgSrc}" alt="${product.name} thumbnail" />
                    </div>`;
            });

            mainImagesContainer.innerHTML = mainImagesHTML;
            thumbImagesContainer.innerHTML = thumbImagesHTML;

            setupImageSlider();

            setupSizeSelector(product, document.querySelector('.size-selector'));
            setupQuantitySelector();

            const addToCartButton = document.querySelector('.add-to-cart-btn');
            if (addToCartButton) {
                addToCartButton.addEventListener('click', () => {
                    const selectedSize = document.querySelector('.size-btn.active')?.dataset.size;
                    const quantity = parseInt(document.getElementById('quantity-input').value);
                    addToCart(product.id, quantity, selectedSize, allProducts);
                });
            }
            
const buyNowBtn = document.getElementById('buy-now-btn');
if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
        const selectedSize = document.querySelector('.size-btn.active')?.dataset.size;
        const quantity = parseInt(document.getElementById('quantity-input').value);

        if (!selectedSize) {
            showToast('Please select a size first.', true);
            return;
        }

        // --- بداية الإضافة: كود التحقق من المخزون ---
        // 1. بنجيب تفاصيل المقاس المختار من بيانات المنتج
        const sizeVariant = product.sizes.find(s => s.name === selectedSize);

        // 2. نتأكد إن المقاس موجود (خطوة أمان إضافية)
        if (!sizeVariant) {
            showToast('An error occurred with the selected size.', true);
            return;
        }

        // 3. نقارن الكمية المطلوبة بالمخزون المتاح
        if (quantity > sizeVariant.stock) {
            showToast(`Sorry, only ${sizeVariant.stock} piece(s) available in stock.`, true);
            return; // بنوقف التنفيذ ومش بنكمل لصفحة الدفع
        }
        // --- نهاية الإضافة ---

        const itemToBuy = {
            id: product.id,
            quantity: quantity,
            size: selectedSize
        };
        
        sessionStorage.setItem('buyNowItem', JSON.stringify(itemToBuy));
        
        window.location.href = 'checkout.html';
    });
}
            setupSizeGuideModal();

            if (relatedProducts && relatedProducts.length > 0) {
                const relatedSection = document.querySelector('.related-products-section');
                if(relatedSection) relatedSection.style.display = 'block';
                renderProducts(relatedProducts, '#related-products-grid');
            } else {
                const relatedSection = document.querySelector('.related-products-section');
                if(relatedSection) relatedSection.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("فشل جلب تفاصيل المنتج:", err);
        if (productDetailLayout) productDetailLayout.innerHTML = '<h1>خطأ في تحميل المنتج. قد يكون غير موجود.</h1>';
    }
}

function setupSizeGuideModal() {
    const openBtn = document.getElementById('open-size-guide-btn');
    const modal = document.getElementById('size-guide-modal');
    if (!openBtn || !modal) return;
    
    const closeBtn = modal.querySelector('.modal-close-btn');

    openBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    const closeModal = () => {
        modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
}


function setupSizeSelector(product, container) {
    container.innerHTML = '';
    const addToCartButton = document.querySelector('.add-to-cart-btn');

    if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach(size => {
            const sizeBtn = document.createElement('button');
            sizeBtn.className = 'size-btn';
            sizeBtn.textContent = size.name;
            sizeBtn.dataset.size = size.name;
            if (size.stock === 0) {
                sizeBtn.classList.add('disabled');
            }
            container.appendChild(sizeBtn);
        });

        container.querySelectorAll('.size-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('disabled')) return;
                container.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    } else {
        container.innerHTML = '<p>No sizes available currently</p>';
        if (addToCartButton) addToCartButton.style.display = 'none';
    }
}

function setupQuantitySelector() {
    const quantityInput = document.getElementById('quantity-input');
    const plusBtn = document.getElementById('plus-btn');
    const minusBtn = document.getElementById('minus-btn');

    if (!quantityInput || !plusBtn || !minusBtn) return;

    plusBtn.addEventListener('click', () => {
        quantityInput.value = parseInt(quantityInput.value) + 1;
    });

    minusBtn.addEventListener('click', () => {
        if (parseInt(quantityInput.value) > 1) {
            quantityInput.value = parseInt(quantityInput.value) - 1;
        }
    });
}

function setupImageSlider() {
    const thumbnailSwiper = new Swiper(".thumbnail-swiper", {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
    });

    const mainImageSwiper = new Swiper(".main-image-swiper", {
        spaceBetween: 10,
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        thumbs: {
            swiper: thumbnailSwiper,
        },
    });
}