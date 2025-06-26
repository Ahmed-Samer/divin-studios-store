const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true // عشان نضمن إن كل أكواد الكوبونات حروف كبيرة ومنمنعش أخطاء
    },
    discountType: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed'] // النوع يا إما نسبة مئوية أو مبلغ ثابت
    },
    value: {
        type: Number,
        required: true // قيمة الخصم (مثلاً 20 لو 20% أو 50 لو 50 جنيه)
    },
    expiryDate: {
        type: Date,
        required: true // تاريخ انتهاء صلاحية الكوبون
    },
    isActive: {
        type: Boolean,
        default: true // عشان نقدر نوقف كوبون من غير ما نمسحه
    }
}, {
    timestamps: true // عشان نعرف امتى الكوبون اتعمل واتعدل
});

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

module.exports = Coupon;