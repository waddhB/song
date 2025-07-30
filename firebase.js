const admin = require('firebase-admin');
const path = require('path');

try {
  // ✅ استخدام الاسم الصحيح لملف المفتاح
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/etc/secrets/firebase-service-key.json';

  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    storageBucket: "wadd-f0a19.appspot.com"
  });

  const bucket = admin.storage().bucket();
  console.log('✅ Firebase App Initialized with Bucket:', bucket.name);
  module.exports = bucket;

} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  module.exports = null;
}
