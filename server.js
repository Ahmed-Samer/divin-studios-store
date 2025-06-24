require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path =require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('تم الاتصال بقاعدة البيانات بنجاح!');
        seedInitialProducts();
    })
    .catch(err => {
        console.error('فشل الاتصال بقاعدة البيانات:', err);
    });

// --- موديل المستخدم ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    cart: [
        {
            id: { type: Number, required: true },
            quantity: { type: Number, required: true, default: 1 },
            size: { type: String, required: true }
        }
    ],
    // --- بداية الحقل الجديد ---
    wishlist: [{
        type: Number
    }],
    // --- نهاية الحقل الجديد ---
    passwordResetToken: String,
    passwordResetExpires: Date,
}, {
    timestamps: true
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
const User = mongoose.models.User || mongoose.model('User', userSchema);


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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
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

// --- وظائف الحماية (Middleware) ---
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401).json({ message: 'غير مصرح لك بالدخول، التوكن غير صالح' });
        }
    } else {
        res.status(401).json({ message: 'غير مصرح لك بالدخول، لا يوجد توكن' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(401).json({ message: 'غير مصرح لك، هذه الوظيفة للمسؤولين فقط' });
    }
};

// --- Users API ---
const generateToken = (id) => { return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' }); };
app.post('/api/users/register', async (req, res) => { const { name, email, password } = req.body; try { const userExists = await User.findOne({ email }); if (userExists) { return res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' }); } const user = await User.create({ name, email, password }); if (user) { res.status(201).json({ _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, token: generateToken(user._id), cart: user.cart, wishlist: user.wishlist }); } else { res.status(400).json({ message: 'بيانات المستخدم غير صالحة' }); } } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); } });
app.post('/api/users/login', async (req, res) => { const { email, password } = req.body; try { const user = await User.findOne({ email }); if (user && (await user.matchPassword(password))) { res.json({ _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, token: generateToken(user._id), cart: user.cart, wishlist: user.wishlist }); } else { res.status(401).json({ message: 'البريد الإلكتروني أو كلمة السر غير صحيحة' }); } } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); } });
app.post('/api/users/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
        }
        const userExists = await User.findOne({ email: email.toLowerCase() });
        res.status(200).json({ exists: !!userExists });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء التحقق' });
    }
});
app.post('/api/users/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(200).json({ message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، فستتلقى رابطًا لإعادة تعيين كلمة المرور.' });
        }
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
        await user.save();
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        const message = `لقد طلبت إعادة تعيين كلمة المرور. برجاء الضغط على الرابط التالي (أو نسخه ولصقه في متصفحك) لإعادة تعيين كلمة المرور الخاصة بك. هذا الرابط صالح لمدة 15 دقيقة فقط:\n\n${resetURL}`;
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: `"Zantiva Store" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'إعادة تعيين كلمة المرور لمتجر Zantiva',
            text: message,
        });
        res.status(200).json({ message: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.' });
    } catch (err) {
        console.error('ERROR IN FORGOT PASSWORD:', err);
        res.status(200).json({ message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، فستتلقى رابطًا لإعادة تعيين كلمة المرور.' });
    }
});
app.post('/api/users/reset-password/:token', async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ message: 'التوكن غير صالح أو انتهت صلاحيته.' });
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح!' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء إعادة تعيين كلمة المرور.' });
    }
});
app.get('/api/users/myorders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'فشل في جلب طلبات المستخدم' });
    }
});
app.get('/api/users/cart', protect, (req, res) => {
    res.status(200).json(req.user.cart);
});
app.post('/api/users/cart', protect, async (req, res) => {
    try {
        const { cart } = req.body;
        const user = await User.findById(req.user._id);
        if (user) {
            user.cart = cart;
            const updatedUser = await user.save();
            res.status(200).json(updatedUser.cart);
        } else {
            res.status(404).json({ message: 'المستخدم غير موجود' });
        }
    } catch (error) {
        res.status(500).json({ message: 'خطأ في تحديث السلة' });
    }
});
app.put('/api/users/profile/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user && (await user.matchPassword(currentPassword))) {
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({ message: 'كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على أرقام وحروف.' });
            }

            user.password = newPassword;
            await user.save();
            res.status(200).json({ message: 'تم تحديث كلمة المرور بنجاح.' });
        } else {
            res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة.' });
        }
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تحديث كلمة المرور.' });
    }
});

// --- بداية endpoints المفضلة ---
app.get('/api/users/wishlist', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const wishlistedProducts = await Product.find({ id: { $in: user.wishlist }, isDeleted: { $ne: true } });
        res.json(wishlistedProducts);
    } catch (error) {
        res.status(500).json({ message: "فشل في جلب قائمة المفضلة" });
    }
});

app.post('/api/users/wishlist/add', protect, async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { wishlist: productId } }, // addToSet تمنع التكرار
            { new: true }
        );
        res.status(200).json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: "فشل في إضافة المنتج للمفضلة" });
    }
});

app.post('/api/users/wishlist/remove', protect, async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { wishlist: productId } },
            { new: true }
        );
        res.status(200).json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: "فشل في حذف المنتج من المفضلة" });
    }
});
// --- نهاية endpoints المفضلة ---


// --- Products API ---
app.get('/api/products/search', async (req, res) => { try { const keyword = req.query.keyword ? { name: { $regex: req.query.keyword, $options: 'i' } } : {}; const products = await Product.find({ ...keyword, isDeleted: { $ne: true } }); res.json(products); } catch (error) { res.status(500).json({ message: 'فشل في البحث عن المنتجات' }); } });
app.get('/api/products/deleted', protect, admin, async (req, res) => { try { const deletedProducts = await Product.find({ isDeleted: true }); res.json(deletedProducts); } catch (error) { res.status(500).json({ message: 'فشل في جلب المنتجات المحذوفة' }); } });
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
app.post('/api/products', protect, admin, async (req, res) => { try { const lastProduct = await Product.findOne().sort({ id: -1 }); const newId = lastProduct ? lastProduct.id + 1 : 1; const newProduct = new Product({ id: newId, ...req.body }); const savedProduct = await newProduct.save(); res.status(201).json(savedProduct); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء إضافة المنتج' }); } });
app.put('/api/products/:id', protect, admin, async (req, res) => { try { const updatedProduct = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }); if (!updatedProduct) { return res.status(404).json({ message: 'المنتج غير موجود' }); } res.json(updatedProduct); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تحديث المنتج' }); } });
app.delete('/api/products/:id', protect, admin, async (req, res) => { try { const result = await Product.findOneAndUpdate({ id: req.params.id }, { isDeleted: true }, { new: true }); if (!result) { return res.status(404).json({ message: 'المنتج غير موجود' }); } res.status(200).json({ message: 'تم نقل المنتج لسلة المحذوفات' }); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء حذف المنتج' }); } });
app.post('/api/products/:id/restore', protect, admin, async (req, res) => { try { const result = await Product.findOneAndUpdate({ id: req.params.id }, { isDeleted: false }, { new: true }); if (!result) { return res.status(404).json({ message: 'المنتج المحذوف غير موجود' }); } res.status(200).json({ message: 'تم استرجاع المنتج بنجاح' }); } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء استرجاع المنتج' }); } });


// --- Orders API ---
app.post('/api/orders', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { customerDetails, cartItems } = req.body;
        let user = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const token = req.headers.authorization.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decoded.id);
            } catch (e) {
                console.log("توكن غير صالح أو منتهي الصلاحية، سيتم التعامل مع الطلب كزائر.");
            }
        }
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

        let totalPrice = 0;
        const orderedProducts = cartItems.map(item => {
            const product = productsFromDB.find(p => p.id == item.id);
            totalPrice += product.price * item.quantity;
            return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity, size: item.size };
        });

        const newOrderData = { customerDetails, products: orderedProducts, totalPrice };
        if (user) {
            newOrderData.user = user._id;
        }

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

        if (user) {
            user.cart = [];
            await user.save({ session });
        }

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

app.get('/api/orders', protect, admin, async (req, res) => { try { const orders = await Order.find().sort({ createdAt: -1 }); res.json(orders); } catch (error) { res.status(500).json({ message: 'فشل في جلب الطلبات' }); } });

app.put('/api/orders/:id/status', protect, admin, async (req, res) => {
    const { id } = req.params;
    const { status: newStatus } = req.body;
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!newStatus) {
            throw new Error('حالة الطلب الجديدة مطلوبة.');
        }
        if (!Order.schema.path('status').enumValues.includes(newStatus)) {
            throw new Error('حالة الطلب غير صالحة.');
        }

        const order = await Order.findById(id).session(session);
        if (!order) {
            throw new Error('الطلب غير موجود.');
        }

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
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`السيرفر المحلي يعمل الآن على البورت ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
}