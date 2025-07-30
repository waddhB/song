const session = require('express-session');
const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./db');
const bucket = require('./firebase'); // استدعاء Firebase bucket
function generateCode() {
  return Math.random().toString(36).substring(2, 10); // يولد كود عشوائي 8 أحرف
}

const app = express();
const PORT = process.env.PORT || 3000;

// بيانات الدخول (ثابتة)
const ADMIN_USERNAME = '1';
const ADMIN_PASSWORD = '1';

app.get('/', (req, res) => {
  res.redirect('/login');
});

// إعداد EJS والملفات العامة
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// إعداد الجلسات
app.use(session({
  secret: 'lamsat_secret_key',
  resave: false,
  saveUninitialized: false
}));

// إعداد multer للتخزين في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({ storage });

// صفحة تسجيل الدخول
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// تحقق من بيانات الدخول
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

// عرض لوحة التحكم مع الأغاني
app.get('/dashboard', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');
  db.all("SELECT * FROM songs ORDER BY id DESC", (err, songs) => {
    if (err) return res.send("Database error");
    res.render('dashboard', { songs });
  });
});

// رفع الأغنية إلى Firebase Storage
app.post('/upload', upload.single('song'), async (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');

  // التحقق من وجود ملف
  if (!req.file) return res.status(400).send('لم يتم تحديد ملف');

  const { originalname, buffer } = req.file;
  const { title, artist, visibility } = req.body;

  const uniqueName = Date.now() + '-' + originalname;
  const blob = bucket.file('songs/' + uniqueName);
  const blobStream = blob.createWriteStream();

  // توليد كود URL عشوائي
  const url_code = Math.random().toString(36).substring(2, 10);

  blobStream.on('error', err => {
    console.error("🔥 خطأ في رفع الملف إلى Firebase:", err);
    res.status(500).send('خطأ في رفع الأغنية');
  });

  blobStream.on('finish', async () => {
    try {
      // ✅ جعل الملف متاحًا للعموم
      await blob.makePublic();

      // ✅ استخدام رابط مباشر من Google Cloud
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/songs/${uniqueName}`;

      // حفظ في قاعدة البيانات
      db.run(
       "INSERT INTO songs (title, artist, filename, url_code, visibility) VALUES (?, ?, ?, ?, ?)",
       [title, artist, publicUrl, url_code, visibility],
  
        (err) => {
          if (err) {
            console.error("🔥 خطأ في حفظ الأغنية في قاعدة البيانات:", err);
            return res.send("Database error");
          }
          res.redirect('/dashboard');
        }
      );
    } catch (err) {
      console.error("🔥 خطأ أثناء جعل الملف عامًا:", err);
      res.status(500).send("حدث خطأ أثناء تجهيز الرابط");
    }
  });

  blobStream.end(buffer);
});


// عرض رابط الأغنية للمشاركة
app.get('/song/:code', (req, res) => {
  const code = req.params.code;
  db.get("SELECT * FROM songs WHERE url_code = ?", [code], (err, song) => {
    if (err) {
      console.error("خطأ في قاعدة البيانات:", err);
      return res.status(500).send("خطأ في الخادم");
    }

    if (!song) {
      return res.send("لم يتم العثور على الأغنية");
    }

    res.render('song', { song });
  });
});

// حذف الأغنية من قاعدة البيانات و Firebase
app.post('/delete/:id', (req, res) => {
  const songId = req.params.id;

  // جلب معلومات الأغنية أولًا
  db.get("SELECT * FROM songs WHERE id = ?", [songId], async (err, song) => {
    if (err || !song) {
      console.error("❌ لم يتم العثور على الأغنية أو حدث خطأ:", err);
      return res.redirect('/dashboard');
    }

    try {
      // استخراج اسم الملف من رابط Firebase
      const urlParts = song.filename.split('/');
      const fileName = decodeURIComponent(urlParts[urlParts.length - 1]);

      // حذف الملف من Firebase
      const file = bucket.file(`songs/${fileName}`);
      await file.delete();

      // حذف من قاعدة البيانات
      db.run("DELETE FROM songs WHERE id = ?", [songId], (err) => {
        if (err) {
          console.error("❌ فشل حذف الأغنية من قاعدة البيانات:", err);
        }
        return res.redirect('/dashboard');
      });

    } catch (err) {
      console.error("❌ فشل حذف الملف من Firebase:", err);
      return res.redirect('/dashboard');
    }
  });
});

// تسجيل الخروج
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
