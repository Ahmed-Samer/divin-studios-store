require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

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

// --- Product Schema and Model (تمت إعادة هيكلته) ---
const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: [String],
    description: { type: String },
    sizes: [ // <-- تم تغيير هذا الجزء بالكامل
        {
            name: { type: String, required: true },
            stock: { type: Number, required: true, default: 0 }
        }
    ],
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
    totalPrice: { type: Number, required: true },
    status: { 
        type: String, 
        default: 'قيد المراجعة', 
        enum: ['قيد المراجعة', 'تم التأكيد', 'تم الشحن', 'تم التوصيل', 'ملغي'] 
    },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);


// --- المنتجات الأولية (تم تعديلها بالكامل لتناسب الهيكل الجديد) ---
const initialProducts = [
    { id: 1, name: 'Classic Fit Blazer', price: 1200, category: 'رجالي', images: ['/images/classicfitblazer1.jpg', '/images/classicfitblazer2.jpg', '/images/classicfitblazer3.jpg'], description: `خامة: 80% قطن – 20% بوليستر<br>ألوان: أسود، كحلي، رمادي<br>مثالي للمناسبات الرسمية والعمل`, sizes: [{name: 'S', stock: 5}, {name: 'M', stock: 5}, {name: 'L', stock: 3}, {name: 'XL', stock: 2}] },
    { id: 2, name: 'Slim Fit Jeans', price: 650, category: 'رجالي', images: ['/images/slimfitjeans1.jpg', '/images/slimfitjeans2.jpg', '/images/slimfitjeans3.jpg'], description: `خامة: دنيم مرن عالي الجودة<br>لون: أزرق غامق<br>جيوب أمامية وخلفية<br>تصميم عصري مريح`, sizes: [{name: '30', stock: 10}, {name: '32', stock: 10}, {name: '34', stock: 5}] },
    { id: 3, name: 'Cotton Polo Shirt', price: 450, category: 'رجالي', images: ['/images/cottonpoloshirt1.jpg', '/images/cottonpoloshirt2.jpg'], description: `خامة 100% قطن<br>ألوان متعددة: أبيض، أحمر، أزرق، أخضر<br>ياقة بأزرار<br>مناسب للكاجوال أو الشغل`, sizes: [{name: 'S', stock: 10}, {name: 'M', stock: 15}, {name: 'L', stock: 5}] },
    { id: 4, name: 'Hooded Zip Jacket', price: 900, category: 'رجالي', images: ['/images/hoodedzipjacket1.jpg', '/images/hoodedzipjacket2.jpg'], description: `خامة مقاومة للمطر<br>سوستة كاملة + قبعة<br>مبطنة من الداخل<br>مثالي للشتاء والخروجات`, sizes: [{name: 'M', stock: 6}, {name: 'L', stock: 4}, {name: 'XL', stock: 2}] },
    { id: 5, name: 'Linen Summer Shirt', price: 500, category: 'رجالي', images: ['/images/linensummershirt1.jpg', '/images/linensummershirt2.jpg'], description: `خامة: كتان خفيف<br>ألوان: بيج، أبيض، أزرق فاتح<br>أزرار أمامية بالكامل<br>مثالي للطقس الحار`, sizes: [{name: 'M', stock: 10}, {name: 'L', stock: 8}, {name: 'XL', stock: 4}] },
    { id: 6, name: 'Casual Chinos Pants', price: 580, category: 'رجالي', images: ['/images/casualchinospants1.jpg', '/images/casualchinospants2.jpg'], description: `خامة: قطن مطاطي<br>لون: كاكي، كحلي، رمادي فاتح<br>تصميم مستقيم<br>ينفع للشغل أو الخروجات`, sizes: [{name: '32', stock: 8}, {name: '34', stock: 10}, {name: '36', stock: 5}] },
    { id: 7, name: 'Basic Round Neck T-Shirt', price: 250, category: 'رجالي', images: ['/images/basicroundnecktshirt1.jpg', '/images/basicroundnecktshirt2.jpg'], description: `100% قطن عضوي<br>ألوان متعددة<br>تصميم بسيط<br>سهل التنسيق مع أي بنطلون`, sizes: [{name: 'S', stock: 20}, {name: 'M', stock: 20}, {name: 'L', stock: 10}] },
    { id: 8, name: 'Silk Midi Dress', price: 1500, category: 'نسائي', images: ['/images/silkmididress1.jpg', '/images/silkmididress2.jpg', '/images/silkmididress3.jpg'], description: `خامة: حرير ناعم<br>ألوان: نبيتي، أسود، أزرق<br>فتحة رقبة على شكل V<br>مثالي للسهرات`, sizes: [{name: 'S', stock: 5}, {name: 'M', stock: 3}, {name: 'L', stock: 2}] },
    { id: 9, name: 'High-Waisted Jeans', price: 700, category: 'نسائي', images: ['/images/highwaistedjeans1.jpg', '/images/highwaistedjeans2.jpg'], description: `تصميم slim fit<br>خامة مطاطة ومريحة<br>لون أزرق فاتح<br>جيوب أمامية وخلفية`, sizes: [{name: '28', stock: 8}, {name: '30', stock: 8}, {name: '32', stock: 4}] },
    { id: 10, name: 'Oversized Cotton Shirt', price: 550, category: 'نسائي', images: ['/images/oversizedcottonshirt1.jpg', '/images/oversizedcottonshirt2.jpg'], description: `خامة: قطن 100%<br>تصميم واسع مريح<br>ألوان: أبيض، روز، أزرق<br>يمكن ارتداؤه كجاكيت خفيف`, sizes: [{name: 'One Size', stock: 15}] },
    { id: 11, name: 'Pleated Maxi Skirt', price: 600, category: 'نسائي', images: ['/images/pleatedmaxiskirt1.jpg', '/images/pleatedmaxiskirt2.jpg'], description: `طول: للكاحل<br>خامة خفيفة ناعمة<br>ألوان: بيج، نبيتي، أخضر<br>تصميم أنثوي أنيق`, sizes: [{name: 'S', stock: 8}, {name: 'M', stock: 6}, {name: 'L', stock: 4}] },
    { id: 12, name: 'Sporty Crop Hoodie', price: 480, category: 'نسائي', images: ['/images/sportycrophoodie1.jpg', '/images/sportycrophoodie2.jpg'], description: `خامة: قطن ممزوج<br>تصميم كاجوال شبابي<br>قبعة + حزام<br>ألوان: أسود، موف، أبيض`, sizes: [{name: 'S', stock: 12}, {name: 'M', stock: 13}] },
    { id: 13, name: 'Classic Blouse with Lace', price: 520, category: 'نسائي', images: ['/images/classicblousewithlace1.jpg', '/images/classicblousewithlace2.jpg'], description: `خامة: شيفون + دانتيل<br>رقبة مغلقة<br>ألوان: ناعم وأنيق<br>مثالي للشغل أو المناسبات`, sizes: [{name: 'M', stock: 8}, {name: 'L', stock: 6}] },
    { id: 14, name: 'High Waist Wide Pants', price: 620, category: 'نسائي', images: ['/images/highwaistwidepants1.jpg', '/images/highwaistwidepants2.jpg'], description: `بنطلون واسع مريح<br>خامة ناعمة وسهلة الحركة<br>ألوان: بيج، أسود، زيتي<br>شكل عصري ومناسب لكل الأجسام`, sizes: [{name: 'S', stock: 10}, {name: 'M', stock: 10}] },
    { id: 15, name: 'Boys Graphic T-Shirt', price: 280, category: 'اطفالي', images: ['/images/boysgraphictshirt1.jpg', '/images/boysgraphictshirt2.jpg'], description: `قطن 100%<br>رسومات ممتعة للأطفال<br>ألوان: أزرق، أخضر، أحمر<br>من سن 3 – 12 سنة`, sizes: [{name: '3-4Y', stock: 10}, {name: '5-6Y', stock: 10}] },
    { id: 16, name: 'Girls Tulle Party Dress', price: 450, category: 'اطفالي', images: ['/images/girlstullepartydress1.jpg', '/images/girlstullepartydress2.jpg'], description: `خامة: تول + بطانة ناعمة<br>ألوان: وردي، لافندر، أبيض<br>تصميم أميرات<br>مناسب للأعياد والحفلات`, sizes: [{name: '4Y', stock: 5}, {name: '6Y', stock: 5}, {name: '8Y', stock: 5}] },
    { id: 17, name: 'Kids Zip-Up Hoodie', price: 380, category: 'اطفالي', images: ['/images/kidszipuphoodie1.jpg', '/images/kidszipuphoodie2.jpg'], description: `خامة دافئة<br>قبعة + سوستة<br>مناسب للأولاد والبنات<br>ألوان: رمادي، كحلي، موف`, sizes: [{name: 'S', stock: 10}, {name: 'M', stock: 10}, {name: 'L', stock: 10}] },
    { id: 18, name: 'Baby Romper Set', price: 320, category: 'اطفالي', images: ['/images/babyromperset1.jpg', '/images/babyromperset2.jpg'], description: `قطعة واحدة + قبعة<br>خامة ناعمة آمنة للرضع<br>سن: 0–24 شهر<br>ألوان: سماوي، أبيض، أصفر`, sizes: [{name: '0-6M', stock: 8}, {name: '6-12M', stock: 8}] },
    { id: 19, name: 'Boys Cargo Shorts', price: 300, category: 'اطفالي', images: ['/images/boyscargoshorts1.jpg', '/images/boyscargoshorts2.jpg'], description: `قطن قوي<br>جيوب جانبية<br>ألوان: بيج، زيتي، كاكي<br>مثالي للعب والحركة`, sizes: [{name: '4Y', stock: 10}, {name: '6Y', stock: 10}, {name: '8Y', stock: 10}] },
    { id: 20, name: 'Girls Leggings Pack (2pcs)', price: 220, category: 'اطفالي', images: ['/images/girlsleggingspack1.jpg', '/images/girlsleggingspack2.jpg'], description: `خامة مطاطية ومريحة<br>تصميمات مرحة<br>من 4–12 سنة<br>ألوان متنوعة`, sizes: [{name: '4-5Y', stock: 15}, {name: '6-7Y', stock: 15}] },
    { id: 21, name: 'Unisex Winter Jacket', price: 950, category: 'اطفالي', images: ['/images/unisexwinterjacket1.jpg', '/images/unisexwinterjacket2.jpg'], description: `مبطن ودافئ جدًا<br>مقاوم للهواء والمطر<br>قبعة قابلة للإزالة<br>ألوان: أسود، أزرق، وردي`, sizes: [{name: 'S', stock: 5}, {name: 'M', stock: 5}, {name: 'L', stock: 4}, {name: 'XL', stock: 4}] }
];

async function seedInitialProducts() {
    try {
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            console.log('قاعدة البيانات فارغة، سيتم إضافة المنتجات بالهيكل الجديد...');
            await Product.insertMany(initialProducts);
            console.log('تمت إضافة المنتجات الأولية بنجاح!');
        }
    } catch (error) {
        console.error('خطأ أثناء إضافة المنتجات الأولية:', error);
    }
}

// --- API Routes ---

// Products API
app.get('/api/products', async (req, res) => { try { const productsFromDB = await Product.find({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] }); res.json(productsFromDB); } catch (error) { console.error("خطأ في '/api/products' GET:", error); res.status(500).json({ message: 'فشل في جلب المنتجات' }); } });
app.get('/api/products/deleted', async (req, res) => { try { const deletedProducts = await Product.find({ isDeleted: true }); res.json(deletedProducts); } catch (error) { console.error("خطأ في '/api/products/deleted' GET:", error); res.status(500).json({ message: 'فشل في جلب المنتجات المحذوفة' }); } });
app.post('/api/products', async (req, res) => { try { const lastProduct = await Product.findOne().sort({ id: -1 }); const newId = lastProduct ? lastProduct.id + 1 : 1; const newProduct = new Product({ id: newId, ...req.body }); const savedProduct = await newProduct.save(); res.status(201).json(savedProduct); } catch (error) { console.error("خطأ في '/api/products' POST:", error); res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء إضافة المنتج' }); } });
app.put('/api/products/:id', async (req, res) => { try { const updatedProduct = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }); if (!updatedProduct) { return res.status(404).json({ message: 'المنتج غير موجود' }); } res.json(updatedProduct); } catch (error) { console.error("خطأ في '/api/products/:id' PUT:", error); res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تحديث المنتج' }); } });
app.delete('/api/products/:id', async (req, res) => { try { const result = await Product.findOneAndUpdate({ id: req.params.id }, { isDeleted: true }, { new: true }); if (!result) { return res.status(404).json({ message: 'المنتج غير موجود' }); } res.status(200).json({ message: 'تم نقل المنتج لسلة المحذوفات' }); } catch (error) { console.error("خطأ في '/api/products/:id' DELETE:", error); res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء حذف المنتج' }); } });
app.post('/api/products/:id/restore', async (req, res) => { try { const result = await Product.findOneAndUpdate({ id: req.params.id }, { isDeleted: false }, { new: true }); if (!result) { return res.status(404).json({ message: 'المنتج المحذوف غير موجود' }); } res.status(200).json({ message: 'تم استرجاع المنتج بنجاح' }); } catch (error) { console.error("خطأ في '/api/products/:id/restore' POST:", error); res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء استرجاع المنتج' }); } });

// --- Orders API (تم تعديله بالكامل) ---
app.post('/api/orders', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { customerDetails, cartItems } = req.body;
        if (!customerDetails || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'البيانات المرسلة غير كاملة أو السلة فارغة.' });
        }
        
        const productIds = cartItems.map(item => item.id);
        const productsFromDB = await Product.find({ 'id': { $in: productIds } }).session(session);

        for (const item of cartItems) {
            const product = productsFromDB.find(p => p.id == item.id);
            if (!product) {
                throw new Error(`منتج '${item.id}' غير موجود.`);
            }
            const sizeVariant = product.sizes.find(s => s.name === item.size);
            if (!sizeVariant) {
                throw new Error(`مقاس '${item.size}' غير موجود لمنتج '${product.name}'.`);
            }
            if (sizeVariant.stock < item.quantity) {
                throw new Error(`الكمية المطلوبة من منتج '${product.name}' مقاس '${item.size}' غير متوفرة.`);
            }
        }
        
        let totalPrice = 0;
        const orderedProducts = cartItems.map(item => {
            const product = productsFromDB.find(p => p.id == item.id);
            totalPrice += product.price * item.quantity;
            return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity, size: item.size };
        });

        const newOrder = new Order({ customerDetails, products: orderedProducts, totalPrice });
        const savedOrder = await newOrder.save({ session });
        
        for (const product of savedOrder.products) {
            await Product.updateOne(
                { id: product.productId, "sizes.name": product.size },
                { $inc: { "sizes.$.stock": -product.quantity } },
                { session }
            );
}

        await session.commitTransaction();
        res.status(201).json(savedOrder);

    } catch (error) {
        await session.abortTransaction();
        console.error("خطأ في '/api/orders' POST:", error);
        res.status(500).json({ message: error.message || 'حدث خطأ في السيرفر أثناء إنشاء الطلب' });
    } finally {
        session.endSession();
    }
});

app.get('/api/orders', async (req, res) => { try { const orders = await Order.find().sort({ createdAt: -1 }); res.json(orders); } catch (error) { console.error("خطأ في '/api/orders' GET:", error); res.status(500).json({ message: 'فشل في جلب الطلبات' }); } });
app.put('/api/orders/:id/status', async (req, res) => { try { const { status } = req.body; const { id } = req.params; if (!status) { return res.status(400).json({ message: 'حالة الطلب الجديدة مطلوبة.' }); } if (!Order.schema.path('status').enumValues.includes(status)) { return res.status(400).json({ message: 'حالة الطلب غير صالحة.' }); } const updatedOrder = await Order.findByIdAndUpdate(id, { status: status }, { new: true }); if (!updatedOrder) { return res.status(404).json({ message: 'الطلب غير موجود.' }); } res.json(updatedOrder); } catch (error) { console.error("خطأ في '/api/orders/:id/status' PUT:", error); res.status(500).json({ message: 'فشل في تحديث حالة الطلب' }); } });


// Static Files & Server Initialization
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`السيرفر المحلي يعمل الآن على البورت ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
}