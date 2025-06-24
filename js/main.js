// استدعاء كل الدوال اللازمة من باقي الملفات
import { initializeAdminPage } from './admin.js';
import { handleLoginForm, handleRegisterForm, updateUserNav, initializeRegisterPageListeners, handleForgotPasswordForm, handleResetPasswordForm } from './auth.js';
import { showToast, updateCartIcon, addToCart, displayCartItems, displayCheckoutSummary, handleOrderSubmission } from './cart.js';
import { initializeProfilePage } from './profile.js';

// متغير عام هيحتوي على كل المنتجات بعد ما يتم جلبها من السيرفر
let allProducts = [];


function showSpinner(containerElement) {
    if (containerElement) {
        containerElement.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    }
}

// --- بداية تشغيل التطبيق ---
document.addEventListener('DOMContentLoaded', () => {
    // تشغيل الدوال العامة أولًا
    setupCommonEventListeners();
    // بدء جلب البيانات وتشغيل منطق الصفحة
    initializeApp();
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

    window.addEventListener('click', () => {
        if (header.classList.contains('menu-is-open')) {
            header.classList.remove('menu-is-open');
        }
        if (header.classList.contains('search-active')) {
            header.classList.remove('search-active');
        }
        const userActions = document.querySelector('.user-actions.open');
        if (userActions) {
            userActions.classList.remove('open');
        }
    });

    header.addEventListener('click', (e) => {
        if (e.target.closest('.expanded-links') || e.target.closest('.search-overlay') || e.target.closest('.user-actions')) {
            e.stopPropagation();
        }
    });
}


async function initializeApp() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const productGrid = document.querySelector('.product-grid');

    if(productGrid) {
        showSpinner(productGrid);
    }

    try {
        const productsPromise = fetch('/api/products/search?keyword=').then(res => {
            if (!res.ok) throw new Error('فشل الاتصال بالسيرفر لجلب المنتجات');
            return res.json();
        });

        if (userInfo && userInfo.token) {
            const cartPromise = fetch('/api/users/cart', {
                headers: { 'Authorization': `Bearer ${userInfo.token}` }
            }).then(res => {
                if (!res.ok) return []; 
                return res.json();
            });

            const [products, userCart] = await Promise.all([productsPromise, cartPromise]);
            allProducts = products;
            
            localStorage.setItem('cart', JSON.stringify(userCart || []));

        } else {
            allProducts = await productsPromise;
        }

        runPageSpecificLogic(allProducts);

    } catch (error) {
        console.error('فشل في جلب البيانات الأولية:', error);
        showToast(error.message, true);
        if (productGrid) {
            productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>عفواً، حدث خطأ</h2><p>لا يمكن الاتصال بالسيرفر حالياً. حاول مرة أخرى.</p></div>`;
        }
    }
}


// دالة تعمل كـ "راوتر" لتشغيل الكود المناسب لكل صفحة
function runPageSpecificLogic(products) {
    updateUserNav();
    updateCartIcon();

    const urlParams = new URLSearchParams(window.location.search);

    if (document.querySelector('.product-grid')) {
        initializeHomePage(products, urlParams);
    }
    if (document.querySelector('.product-detail-layout')) {
        const productId = urlParams.get('id');
        initializeProductDetailPage(productId, products);
    }
    if (document.querySelector('.cart-page-container')) {
        displayCartItems(products);
    }
    if (document.querySelector('.checkout-page-container')) {
        displayCheckoutSummary(products);
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleOrderSubmission);
        }
    }
    if (document.getElementById('add-product-form')) {
        initializeAdminPage(products);
    }
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').addEventListener('submit', handleLoginForm);
    }
    if (document.getElementById('register-form')) {
        document.getElementById('register-form').addEventListener('submit', handleRegisterForm);
        initializeRegisterPageListeners(); 
    }
    if (document.getElementById('profile-page-container')) {
        initializeProfilePage();
    }
    if (document.getElementById('contact-form')) {
        initializeContactForm();
    }
    // --- بداية الجزء الجديد ---
    if (document.getElementById('forgot-password-form')) {
        document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPasswordForm);
    }
    if (document.getElementById('reset-password-form')) {
        document.getElementById('reset-password-form').addEventListener('submit', handleResetPasswordForm);
    }
    // --- نهاية الجزء الجديد ---
}


function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit-btn');
    if (!contactForm) return;

    const publicKey = 'LZePcExeLCFN4FrpM';
    const serviceID = 'service_b4ht9cf';
    const templateID = 'template_zwqd2g8';

    emailjs.init({ publicKey: publicKey });

    contactForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        submitBtn.textContent = 'جاري الإرسال...';
        submitBtn.disabled = true;

        emailjs.sendForm(serviceID, templateID, this)
            .then(() => {
                submitBtn.textContent = 'إرسال الرسالة';
                submitBtn.disabled = false;
                showToast('تم إرسال رسالتك بنجاح! شكراً لك.');
                contactForm.reset();
            }, (err) => {
                submitBtn.textContent = 'إرسال الرسالة';
                submitBtn.disabled = false;
                showToast('حدث خطأ أثناء إرسال الرسالة. حاول مرة أخرى.', true);
                console.error('EmailJS error:', JSON.stringify(err));
            });
    });
}


function renderProducts(productsToRender, containerId = '.product-grid') {
    const productGrid = document.querySelector(containerId);
    if (!productGrid) return;
    productGrid.innerHTML = '';

    if (productsToRender.length === 0 && containerId === '.product-grid') {
        productGrid.innerHTML = `<div class="empty-cart-container" style="display:block; grid-column: 1 / -1; text-align: center;"><h2>لا توجد منتجات تطابق بحثك.</h2><p>حاول استخدام كلمات بحث مختلفة.</p></div>`;
        return;
    }

    productsToRender.forEach(product => {
        const totalStock = product.sizes.reduce((acc, size) => acc + size.stock, 0);
        const outOfStockBadge = totalStock === 0 ? '<div class="out-of-stock-badge">نفذت الكمية</div>' : '';
        const cardHTML = `
            <div class="product-card ${totalStock === 0 ? 'out-of-stock' : ''}">
                <a href="product.html?id=${product.id}" style="text-decoration: none;">
                    <div class="card-image">
                        ${outOfStockBadge}
                        <img src="${product.images[0]}" alt="${product.name}">
                    </div>
                </a>
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

function initializeHomePage(products, urlParams) {
    const category = urlParams.get('category');
    let initialProducts = category ? products.filter(p => p.category === category && !p.isDeleted) : products.filter(p => !p.isDeleted);
    renderProducts(initialProducts);

    const searchBars = [document.getElementById('search-bar'), document.getElementById('mobile-search-bar')];
    let debounceTimer;

    const handleSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const productGrid = document.querySelector('.product-grid');
            if (productGrid) {
                showSpinner(productGrid); 
            }
            try {
                const response = await fetch(`/api/products/search?keyword=${encodeURIComponent(searchTerm)}`);
                if (!response.ok) throw new Error('فشل البحث');
                let filteredBySearch = await response.json();
                
                const finalResults = category 
                    ? filteredBySearch.filter(p => p.category === category) 
                    : filteredBySearch;

                renderProducts(finalResults);
            } catch (error) {
                console.error("خطأ أثناء البحث:", error);
                showToast('حدث خطأ أثناء البحث.', true);
            }
        }, 300);
    };

    searchBars.forEach(bar => {
        if (bar) bar.addEventListener('input', handleSearch);
    });
}

async function initializeProductDetailPage(productId, allProducts) {
    const productDetailLayout = document.querySelector('.product-detail-layout');
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('المنتج غير موجود');
        const data = await response.json();
        const { product, relatedProducts } = data;

        if (product) {
            document.querySelector('.product-title-large').textContent = product.name;
            document.querySelector('.product-price-large').textContent = `${product.price} ج.م`;
            document.querySelector('.product-description').innerHTML = product.description;
            document.title = `${product.name} - Zantiva Store`;

            const sliderWrapper = document.querySelector('.slider-wrapper');
            sliderWrapper.innerHTML = product.images.map(imgSrc => 
                `<div class="slide"><img src="${imgSrc}" alt="${product.name}"></div>`
            ).join('');
            setupImageSlider(sliderWrapper);

            const sizeSelector = document.querySelector('.size-selector');
            setupSizeSelector(product, sizeSelector);

            setupQuantitySelector();

            const addToCartButton = document.querySelector('.add-to-cart-btn');
            if (addToCartButton) {
                addToCartButton.addEventListener('click', () => {
                    const selectedSize = document.querySelector('.size-btn.active')?.dataset.size;
                    const quantity = parseInt(document.getElementById('quantity-input').value);
                    addToCart(product.id, quantity, selectedSize, allProducts);
                });
            }

            if (relatedProducts && relatedProducts.length > 0) {
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
        container.innerHTML = '<p>لا توجد مقاسات متاحة حالياً</p>';
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

function setupImageSlider(sliderWrapper) {
    let currentIndex = 0;
    const slides = sliderWrapper.children; 
    const totalSlides = slides.length;
    const nextBtn = document.querySelector('.slider-btn.next');
    const prevBtn = document.querySelector('.slider-btn.prev');

    if (totalSlides <= 1) {
        if(nextBtn) nextBtn.style.display = 'none';
        if(prevBtn) prevBtn.style.display = 'none';
        return;
    }
    
    if(nextBtn) nextBtn.style.display = 'block'; 
    if(prevBtn) prevBtn.style.display = 'block';

    function showSlide(index) {
        for (let slide of slides) {
            slide.classList.remove('active-slide');
        }
        if (slides[index]) {
            slides[index].classList.add('active-slide');
        }
    }

    showSlide(currentIndex);

    if(nextBtn) nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        showSlide(currentIndex);
    });

    if(prevBtn) prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        showSlide(currentIndex);
    });
}