const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const bookModel = require('./models/bookModel');
const storeModel = require('./models/storeModel');
const invoiceModel = require('./models/invoiceModel');
const balanceModel = require('./models/balanceModel');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const app = express();
const port = 3000;

const { DateTime } = require('luxon');

Date.prototype.toISOString = function() {
    return DateTime.fromJSDate(this).setZone('Africa/Cairo').toFormat("yyyy-MM-dd'T'HH:mm");
};


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true } // استخدم secure: true إذا كنت تستخدم HTTPS
}));

// ✅ إعداد قاعدة البيانات: التأكد من إنشاء الجداول
const initializeDatabase = async () => {
  try {
    await bookModel.createBooksTable();
    await storeModel.createStoresTable();
    await storeModel.createNotificationsTable();
    await invoiceModel.createInvoicesTable();
    await balanceModel.createBalancesTable();
    await balanceModel.initializeBalance();
    await balanceModel.createTotalBalanceHistoryTable();
    await balanceModel.createPendingBalanceHistoryTable();

    console.log('✅ Database tables initialized successfully.');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
};
initializeDatabase();

// ✅ ميدل وير للتحقق من تسجيل الدخول
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}
// ✅ ميدل وير للتحقق من الأدوار
function checkRole(role) {
  return function (req, res, next) {
    if (req.session.user && req.session.user.role === role) {
      next();
    } else {
      res.redirect('/login');
    }
  }
}
// ✅ ميدل وير لتسجيل الخروج
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: '❌ Failed to logout' });
    }
    res.redirect('/login');
  });
});
// ✅ مسارات تسجيل الدخول
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`🔍 Attempted login with Username: ${username}`);

  if (username === 'admin' && password === 'admin123') {
    req.session.user = { role: 'admin' };
    console.log('✅ Admin login successful');
    return res.json({ success: true, redirect: '/admin' });
  } else if (username === 'staff' && password === 'staff123') {
    req.session.user = { role: 'staff' };
    console.log('✅ Staff login successful');
    return res.json({ success: true, redirect: '/staff' });
  } else if (username === 'visitor' && password === 'visitor123') {
    req.session.user = { role: 'visitor' };
    console.log('✅ Visitor login successful');
    return res.json({ success: true, redirect: '/visitor' });
  } else {
    console.log('❌ Invalid credentials');
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});
// ✅ مسار الصفحة الرئيسية (login page)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ✅ تحديد المسارات للمستخدمين المختلفين مع التحقق من تسجيل الدخول والأدوار
app.use('/admin', checkAuth, checkRole('admin'), adminRoutes);
app.use('/staff', checkAuth, checkRole('staff'), staffRoutes);
app.use('/visitor', checkAuth, checkRole('visitor'), visitorRoutes);

// ✅ تحديد مجلد الملفات الثابتة (CSS, JS, HTML)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ التعامل مع الأخطاء عند عدم العثور على المسار
app.use((req, res) => {
  res.status(404).json({ message: '❌ Page not found' });
});

// ✅ معالجة الأخطاء العامة في السيرفر
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ message: '❌ Something went wrong!', error: err.message });
});
// ✅ تشغيل السيرفر
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
