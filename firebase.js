const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

try {
  // مسار الملف السري المُخزن في Render
  const serviceAccountPath = '/etc/secrets/firebase-service-key.json';

  // التحقق من وجود الملف أولًا
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account file not found at path: ${serviceAccountPath}`);
  }

  const serviceAccount = require(serviceAccountPath);

  // تهيئة تطبيق Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'wadd-f0a19.appspot.com',
  });

  const bucket = admin.storage().bucket();

  console.log('✅ Firebase initialized successfully with bucket:', bucket.name);
  module.exports = bucket;

} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  module.exports = null;
}
