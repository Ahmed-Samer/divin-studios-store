require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

// خدمة الملفات الثابتة (CSS, JS, Images) من الفولدر الرئيسي
app.use(express.static(path.join(__dirname, '../')));

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: [String],
    description: { type: String },
    sizes: [String]
});

const Product = mongoose.model('Product', productSchema);

const initialProducts = [
    { id: 1, name: 'Classic Fit Blazer', price: 1200, category: 'رجالي', images: ['images/classicfitblazer1.jpg', 'images/classicfitblazer2.jpg', 'images/classicfitblazer3.jpg'], description: `خامة: 80% قطن – 20% بوليستر<br>ألوان: أسود، كحلي، رمادي<br>مثالي للمناسبات الرسمية والعمل`, sizes: ['S', 'M', 'L', 'XL'] },
    { id: 2, name: 'Slim Fit Jeans', price: 650, category: 'رجالي', images: ['images/slimfitjeans1.jpg', 'images/slimfitjeans2.jpg', 'images/slimfitjeans3.jpg'], description: `خامة: دنيم مرن عالي الجودة<br>لون: أزرق غامق<br>جيوب أمامية وخلفية<br>تصميم عصري مريح`, sizes: ['30', '32', '34', '36'] },
    { id: 3, name: 'Cotton Polo Shirt', price: 450, category: 'رجالي', images: ['images/cottonpoloshirt1.jpg', 'images/cottonpoloshirt2.jpg'], description: `خامة 100% قطن<br>ألوان متعددة: أبيض، أحمر، أزرق، أخضر<br>ياقة بأزرار<br>مناسب للكاجوال أو الشغل`, sizes: ['S', 'M', 'L'] },
    { id: 4, name: 'Hooded Zip Jacket', price: 900, category: 'رجالي', images: ['images/hoodedzipjacket1.jpg', 'images/hoodedzipjacket2.jpg'], description: `خامة مقاومة للمطر<br>سوستة كاملة + قبعة<br>مبطنة من الداخل<br>مثالي للشتاء والخروجات`, sizes: ['M', 'L', 'XL'] },
    { id: 5, name: 'Linen Summer Shirt', price: 500, category: 'رجالي', images: ['images/linensummershirt1.jpg', 'images/linensummershirt2.jpg'], description: `خامة: كتان خفيف<br>ألوان: بيج، أبيض، أزرق فاتح<br>أزرار أمامية بالكامل<br>مثالي للطقس الحار`, sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    { id: 6, name: 'Casual Chinos Pants', price: 580, category: 'رجالي', images: ['images/casualchinospants1.jpg', 'images/casualchinospants2.jpg'], description: `خامة: قطن مطاطي<br>لون: كاكي، كحلي، رمادي فاتح<br>تصميم مستقيم<br>ينفع للشغل أو الخروجات`, sizes: ['30', '32', '34', '36', '38'] },
    { id: 7, name: 'Basic Round Neck T-Shirt', price: 250, category: 'رجالي', images: ['images/basicroundnecktshirt1.jpg', 'images/basicroundnecktshirt2.jpg'], description: `100% قطن عضوي<br>ألوان متعددة<br>تصميم بسيط<br>سهل التنسيق مع أي بنطلون`, sizes: ['S', 'M', 'L', 'XL'] },
    { id: 8, name: 'Silk Midi Dress', price: 1500, category: 'نسائي', images: ['images/silkmididress1.jpg', 'images/silkmididress2.jpg', 'images/silkmididress3.jpg'], description: `خامة: حرير ناعم<br>ألوان: نبيتي، أسود، أزرق<br>فتحة رقبة على شكل V<br>مثالي للسهرات`, sizes: ['S', 'M', 'L'] },
    { id: 9, name: 'High-Waisted Jeans', price: 700, category: 'نسائي', images: ['images/highwaistedjeans1.jpg', 'images/highwaistedjeans2.jpg'], description: `تصميم slim fit<br>خامة مطاطة ومريحة<br>لون أزرق فاتح<br>جيوب أمامية وخلفية`, sizes: ['26', '28', '30', '32'] },
    { id: 10, name: 'Oversized Cotton Shirt', price: 550, category: 'نسائي', images: ['images/oversizedcottonshirt1.jpg', 'images/oversizedcottonshirt2.jpg'], description: `خامة: قطن 100%<br>تصميم واسع مريح<br>ألوان: أبيض، روز، أزرق<br>يمكن ارتداؤه كجاكيت خفيف`, sizes: ['One Size'] },
    { id: 11, name: 'Pleated Maxi Skirt', price: 600, category: 'نسائي', images: ['images/pleatedmaxiskirt1.jpg', 'images/pleatedmaxiskirt2.jpg'], description: `طول: للكاحل<br>خامة خفيفة ناعمة<br>ألوان: بيج، نبيتي، أخضر<br>تصميم أنثوي أنيق`, sizes: ['S', 'M', 'L'] },
    { id: 12, name: 'Sporty Crop Hoodie', price: 480, category: 'نسائي', images: ['images/sportycrophoodie1.jpg', 'images/sportycrophoodie2.jpg'], description: `خامة: قطن ممزوج<br>تصميم كاجوال شبابي<br>قبعة + حزام<br>ألوان: أسود، موف، أبيض`, sizes: ['S', 'M'] },
    { id: 13, name: 'Classic Blouse with Lace', price: 520, category: 'نسائي', images: ['images/classicblousewithlace1.jpg', 'images/classicblousewithlace2.jpg'], description: `خامة: شيفون + دانتيل<br>رقبة مغلقة<br>ألوان: ناعم وأنيق<br>مثالي للشغل أو المناسبات`, sizes: ['S', 'M', 'L', 'XL'] },
    { id: 14, name: 'High Waist Wide Pants', price: 620, category: 'نسائي', images: ['images/highwaistwidepants1.jpg', 'images/highwaistwidepants2.jpg'], description: `بنطلون واسع مريح<br>خامة ناعمة وسهلة الحركة<br>ألوان: بيج، أسود، زيتي<br>شكل عصري ومناسب لكل الأجسام`, sizes: ['S', 'M', 'L'] },
    { id: 15, name: 'Boys Graphic T-Shirt', price: 280, category: 'اطفالي', images: ['images/boysgraphictshirt1.jpg', '/images/boysgraphictshirt2.jpg'], description: `قطن 100%<br>رسومات ممتعة للأطفال<br>ألوان: أزرق، أخضر، أحمر<br>من سن 3 – 12 سنة`, sizes: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'] },
    { id: 16, name: 'Girls Tulle Party Dress', price: 450, category: 'اطفالي', images: ['/images/girlstullepartydress1.jpg', '/images/girlstullepartydress2.jpg'], description: `خامة: تول + بطانة ناعمة<br>ألوان: وردي، لافندر، أبيض<br>تصميم أميرات<br>مناسب للأعياد والحفلات`, sizes: ['4Y', '6Y', '8Y'] },
    { id: 17, name: 'Kids Zip-Up Hoodie', price: 380, category: 'اطفالي', images: ['/images/kidszipuphoodie1.jpg', '/images/kidszipuphoodie2.jpg'], description: `خامة دافئة<br>قبعة + سوستة<br>مناسب للأولاد والبنات<br>ألوان: رمادي، كحلي، موف`, sizes: ['S', 'M', 'L'] },
    { id: 18, name: 'Baby Romper Set', price: 320, category: 'اطفالي', images: ['/images/babyromperset1.jpg', '/images/babyromperset2.jpg'], description: `قطعة واحدة + قبعة<br>خامة ناعمة آمنة للرضع<br>سن: 0–24 شهر<br>ألوان: سماوي، أبيض، أصفر`, sizes: ['0-6M', '6-12M', '12-24M'] },
    { id: 19, name: 'Boys Cargo Shorts', price: 300, category: 'اطفالي', images: ['/images/boyscargoshorts1.jpg', '/images/boyscargoshorts2.jpg'], description: `قطن قوي<br>جيوب جانبية<br>ألوان: بيج، زيتي، كاكي<br>مثالي للعب والحركة`, sizes: ['4Y', '6Y', '8Y', '10Y'] },
    { id: 20, name: 'Girls Leggings Pack (2pcs)', price: 250, category: 'اطفالي', images: ['/images/girlsleggingspack1.jpg', '/images/girlsleggingspack2.jpg'], description: `خامة مطاطية ومريحة<br>تصميمات مرحة<br>من 4–12 سنة<br>ألوان متنوعة`, sizes: ['4-5Y', '6-7Y', '8-9Y'] },
    { id: 21, name: 'Unisex Winter Jacket', price: 950, category: 'اطفالي', images: ['/images/unisexwinterjacket1.jpg', '/images/unisexwinterjacket2.jpg'], description: `مبطن ودافئ جدًا<br>مقاوم للهواء والمطر<br>قبعة قابلة للإزالة<br>ألوان: أسود، أزرق، وردي`, sizes: ['S', 'M', 'L', 'XL'] }
];

const main = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('تم الاتصال بقاعدة البيانات بنجاح!');
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            console.log('قاعدة البيانات فارغة، سيتم إضافة المنتجات...');
            await Product.insertMany(initialProducts);
            console.log('تمت إضافة المنتجات الأولية بنجاح!');
        }
    } catch (err) {
        console.error('فشل الاتصال بقاعدة البيانات:', err);
    }
};

main();

// الـ Endpoint الخاص بالمنتجات
app.get('/api/products', async (req, res) => {
    try {
        const productsFromDB = await Product.find({});
        res.json(productsFromDB);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'فشل في جلب المنتجات' });
    }
});

// --- التعديل الجديد هنا ---
// مسار مخصص لخدمة الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel يحتاج هذا السطر
module.exports = app;