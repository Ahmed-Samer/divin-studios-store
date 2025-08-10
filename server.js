require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // لاستصدار التصاريح
const Coupon = require('./models/coupon.model.js');

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// --- بداية: تعريف متغيرات الأمان ---
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-strong-secret-key-for-jwt';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
// --- نهاية: تعريف متغيرات الأمان ---


mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('تم الاتصال بقاعدة البيانات بنجاح!');
        seedInitialProducts();
    })
    .catch(err => {
        console.error('فشل الاتصال بقاعدة البيانات:', err);
    });

// --- Product Schema and Model ---
const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: [String],
    description: { type: String },
    sizes: [{
        name: { type: String, required: true },
        stock: { type: Number, required: true, default: 0 }
    }],
    isDeleted: { type: Boolean, default: false }
});
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);


// --- Order Schema and Model ---
const orderSchema = new mongoose.Schema({
    customerDetails: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        governorate: { type: String, required: true },
        city: { type: String, required: true }
    },
    products: [{
        productId: { type: Number, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        size: { type: String, required: true }
    }],
    subtotal: { type: Number },
    discount: {
        code: String,
        amount: Number
    },
    totalPrice: { type: Number, required: true },
    status: { type: String, default: 'قيد المراجعة', enum: ['قيد المراجعة', 'تم التأكيد', 'تم الشحن', 'تم التوصيل', 'ملغي'] },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);


// --- المنتجات الأولية ---
const initialProducts = [
    { id: 1, name: 'Classic Fit Blazer', price: 1200, category: 'رجالي', images: ['/images/classicfitblazer1.jpg', '/images/classicfitblazer2.jpg', '/images/classicfitblazer3.jpg'], description: `خامة: 80% قطن – 20% بوليستر<br>ألوان: أسود، كحلي، رمادي<br>مثالي للمناسبات الرسمية والعمل`, sizes: [{name: 'S', stock: 5}, {name: 'M', stock: 5}, {name: 'L', stock: 3}, {name: 'XL', stock: 2}] },
    { id: 2, name: 'Slim Fit Jeans', price: 650, category: 'رجالي', images: ['/images/slimfitjeans1.jpg', '/images/slimfitjeans2.jpg', '/images/slimfitjeans3.jpg'], description: `خامة: دنيم مرن عالي الجودة<br>لون: أزرق غامق<br>جيوب أمامية وخلفية<br>تصميم عصري مريح`, sizes: [{name: '30', stock: 10}, {name: '32', stock: 10}, {name: '34', stock: 5}] },
];
async function seedInitialProducts() { try { const productCount = await Product.countDocuments(); if (productCount === 0) { console.log('قاعدة البيانات فارغة، سيتم إضافة المنتجات بالهيكل الجديد...'); await Product.insertMany(initialProducts); console.log('تمت إضافة المنتجات الأولية بنجاح!'); } } catch (error) { console.error('خطأ أثناء إضافة المنتجات الأولية:', error); } }


// --- Middleware لحماية مسارات الأدمن ---
const protectAdmin = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            
            if (decoded.isAdmin) {
                next();
            } else {
                res.status(403).json({ message: 'غير مصرح لك بالقيام بهذا الإجراء' });
            }
        } catch (error) {
            res.status(401).json({ message: 'تصريح غير صالح أو منتهي الصلاحية' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'غير مصرح بالدخول، لا يوجد تصريح' });
    }
};


// --- Admin Login API ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (!ADMIN_PASSWORD) {
        return res.status(500).json({ message: 'لم يتم تعيين كلمة سر الأدمن على السيرفر.' });
    }

    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            token: token
        });
    } else {
        res.status(401).json({ message: 'كلمة السر غير صحيحة.' });
    }
});


// --- COUPON APIS (محمية) ---
app.post('/api/coupons', protectAdmin, async (req, res) => {
    try {
        const { code, discountType, value, expiryDate } = req.body;
        const newCoupon = new Coupon({ code, discountType, value, expiryDate });
        const savedCoupon = await newCoupon.save();
        res.status(201).json(savedCoupon);
    } catch (error) {
        res.status(400).json({ message: 'فشل إنشاء الكوبون. تأكد أن الكود غير مكرر.' });
    }
});

app.get('/api/coupons', protectAdmin, async (req, res) => {
    try {
        const coupons = await Coupon.find({});
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'فشل في جلب الكوبونات.' });
    }
});

app.put('/api/coupons/:id', protectAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!coupon) {
            return res.status(404).json({ message: 'الكوبون غير موجود.' });
        }
        res.json(coupon);
    } catch (error) {
        res.status(400).json({ message: 'فشل تحديث الكوبون.' });
    }
});

app.delete('/api/coupons/:id', protectAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'الكوبون غير موجود.' });
        }
        res.json({ message: 'تم حذف الكوبون بنجاح.' });
    } catch (error) {
        res.status(500).json({ message: 'فشل حذف الكوبون.' });
    }
});

app.post('/api/coupons/verify', async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: 'كود الخصم غير صحيح.' });
        }
        if (!coupon.isActive) {
            return res.status(400).json({ message: 'هذا الكوبون غير فعال حالياً.' });
        }
        if (coupon.expiryDate < new Date()) {
            return res.status(400).json({ message: 'هذا الكوبون منتهي الصلاحية.' });
        }

        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: 'خطأ في التحقق من الكوبون.' });
    }
});

// --- بداية: Endpoint آمن لجلب مفاتيح EmailJS ---
app.get('/api/emailjs-keys', (req, res) => {
    try {
        const keys = {
            serviceId: process.env.EMAILJS_SERVICE_ID,
            templateId: process.env.EMAILJS_TEMPLATE_ID,
            publicKey: process.env.EMAILJS_PUBLIC_KEY
        };

        // نتأكد إن كل المفاتيح موجودة في ملف .env
        if (!keys.serviceId || !keys.templateId || !keys.publicKey) {
            throw new Error('لم يتم تعيين مفاتيح EmailJS على السيرفر.');
        }

        res.json(keys);
    } catch (error) {
        console.error("خطأ في جلب مفاتيح EmailJS:", error.message);
        res.status(500).json({ message: 'خطأ في إعدادات السيرفر.' });
    }
});
// --- نهاية: Endpoint آمن لجلب مفاتيح EmailJS ---

// --- Products API ---
// المسارات العامة التي لا تحتاج حماية
app.get('/api/products/search', async (req, res) => { try { const keyword = req.query.keyword ? { name: { $regex: req.query.keyword, $options: 'i' } } : {}; const products = await Product.find({ ...keyword, isDeleted: { $ne: true } }); res.json(products); } catch (error) { res.status(500).json({ message: 'فشل في البحث عن المنتجات' }); } });

// --- بداية التعديل ---
// المسار المحدد يجب أن يأتي أولاً
app.get('/api/products/deleted', protectAdmin, async (req, res) => { 
    try { 
        const deletedProducts = await Product.find({ isDeleted: true }); 
        res.json(deletedProducts); 
    } catch (error) { 
        res.status(500).json({ message: 'فشل في جلب المنتجات المحذوفة' }); 
    } 
});

// المسار العام يأتي بعده
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id, isDeleted: { $ne: true } });
        if (product) {
            const relatedProducts = await Product.aggregate([ { $match: { category: product.category, id: { $ne: product.id }, isDeleted: { $ne: true } } }, { $sample: { size: 4 } } ]);
            res.json({ product, relatedProducts });
        } else {
            res.status(404).json({ message: 'المنتج غير موجود' });
        }
    } catch (error) {
        console.error(`خطأ في '/api/products/:id' GET:`, error);
        res.status(500).json({ message: 'فشل في جلب تفاصيل المنتج' });
    }
});
// --- نهاية التعديل ---


// المسارات المحمية الخاصة بالأدمن
app.post('/api/products', protectAdmin, async (req, res) => { try { const lastProduct = await Product.findOne().sort({ id: -1 }); const newId = lastProduct ? lastProduct.id + 1 : 1; const newProduct = new Product({ id: newId, ...req.body }); const savedProduct = await newProduct.save(); res.status(201).json(savedProduct); } catch (error) { 
        console.error('ERROR:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء إضافة المنتج' }); 
    } 
});
app.put('/api/products/:id', protectAdmin, async (req, res) => { try { const updatedProduct = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }); if (!updatedProduct) { return res.status(404).json({ message: 'المنتج غير موجود' }); } res.json(updatedProduct); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تحديث المنتج' }); } });
app.delete('/api/products/:id', protectAdmin, async (req, res) => { try { const result = await Product.findOneAndUpdate({ id: req.params.id }, { isDeleted: true }, { new: true }); if (!result) { return res.status(404).json({ message: 'المنتج غير موجود' }); } res.status(200).json({ message: 'تم نقل المنتج لسلة المحذوفات' }); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء حذف المنتج' }); } });
app.post('/api/products/:id/restore', protectAdmin, async (req, res) => { try { const result = await Product.findOneAndUpdate({ id: req.params.id }, { isDeleted: false }, { new: true }); if (!result) { return res.status(404).json({ message: 'المنتج المحذوف غير موجود' }); } res.status(200).json({ message: 'تم استرجاع المنتج بنجاح' }); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء استرجاع المنتج' }); } });


// --- Orders API ---
app.post('/api/orders', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { customerDetails, cartItems, couponCode } = req.body;
        
        if (!customerDetails || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'البيانات المرسلة غير كاملة أو السلة فارغة.' });
        }
        const productIds = cartItems.map(item => item.id);
        const productsFromDB = await Product.find({ 'id': { $in: productIds } }).session(session);

        for (const item of cartItems) {
            const product = productsFromDB.find(p => p.id == item.id);
            if (!product) { throw new Error(`منتج '${item.id}' غير موجود.`); }
            const sizeVariant = product.sizes.find(s => s.name === item.size);
            if (!sizeVariant) { throw new Error(`مقاس '${item.size}' غير موجود لمنتج '${product.name}'.`); }
            if (sizeVariant.stock < item.quantity) { throw new Error(`الكمية المطلوبة من منتج '${product.name}' مقاس '${item.size}' غير متوفرة.`); }
        }

        let subtotal = 0;
        const orderedProducts = cartItems.map(item => {
            const product = productsFromDB.find(p => p.id == item.id);
            subtotal += product.price * item.quantity;
            return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity, size: item.size };
        });

        let finalPrice = subtotal;
        let appliedDiscount = null;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isActive: true, expiryDate: { $gt: new Date() } }).session(session);
            if (coupon) {
                let discountAmount = 0;
                if (coupon.discountType === 'percentage') {
                    discountAmount = (subtotal * coupon.value) / 100;
                } else { 
                    discountAmount = coupon.value;
                }
                finalPrice = subtotal - discountAmount;
                if (finalPrice < 0) finalPrice = 0;
                
                appliedDiscount = { code: coupon.code, amount: discountAmount };
            }
        }

        const newOrderData = { 
            customerDetails, 
            products: orderedProducts, 
            subtotal: subtotal,
            discount: appliedDiscount,
            totalPrice: finalPrice 
        };

        const newOrder = new Order(newOrderData);
        await newOrder.save({ session });

        const stockUpdatePromises = cartItems.map(item => {
            return Product.updateOne(
                { id: item.id, 'sizes.name': item.size },
                { $inc: { 'sizes.$.stock': -item.quantity } },
                { session }
            );
        });
        await Promise.all(stockUpdatePromises);

        await session.commitTransaction();
        res.status(201).json(newOrder);
    } catch (error) {
        await session.abortTransaction();
        console.error("خطأ في '/api/orders' POST:", error);
        res.status(500).json({ message: error.message || 'حدث خطأ في السيرفر أثناء إنشاء الطلب' });
    } finally {
        session.endSession();
    }
});

app.get('/api/orders', protectAdmin, async (req, res) => { 
    try { 
        const orders = await Order.find({}).sort({ createdAt: -1 }); 
        res.json(orders); 
    } catch (error) { 
        res.status(500).json({ message: 'فشل في جلب الطلبات' }); 
    } 
});

app.put('/api/orders/:id/status', protectAdmin, async (req, res) => {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!newStatus) { throw new Error('حالة الطلب الجديدة مطلوبة.'); }
        if (!Order.schema.path('status').enumValues.includes(newStatus)) { throw new Error('حالة الطلب غير صالحة.'); }

        const order = await Order.findById(id).session(session);
        if (!order) { throw new Error('الطلب غير موجود.'); }

        const oldStatus = order.status;
        if (oldStatus === newStatus) {
            await session.abortTransaction();
            session.endSession();
            return res.json(order);
        }
        if (newStatus === 'ملغي' && oldStatus !== 'ملغي') {
            const restockPromises = order.products.map(p =>
                Product.updateOne(
                    { id: p.productId, 'sizes.name': p.size },
                    { $inc: { 'sizes.$.stock': p.quantity } },
                    { session }
                )
            );
            await Promise.all(restockPromises);
        }
        order.status = newStatus;
        const updatedOrder = await order.save({ session });
        await session.commitTransaction();
        res.json(updatedOrder);
    } catch (error) {
        await session.abortTransaction();
        console.error("خطأ في تحديث حالة الطلب:", error);
        res.status(500).json({ message: error.message || 'فشل في تحديث حالة الطلب' });
    } finally {
        session.endSession();
    }
});


// --- الجزء الخاص بالملفات الثابتة والمسارات النهائية ---
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
    const fileExtensions = ['.css', '.js', '.jpg', '.png', '.gif', '.jpeg', '.svg', '.webp'];
    if (fileExtensions.some(ext => req.path.endsWith(ext))) {
        res.status(404).send('Not found');
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`السيرفر المحلي يعمل الآن على البورت ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
}