✅ Firebase Initialized with Bucket: wadd-f0a19.appspot.com
const admin = require('firebase-admin');

// استخدام قاعدة البيانات الفعلية
const db = admin.database();
const songsRef = db.ref('songs');

// وظيفة: إضافة أغنية جديدة
function addSong(songData, callback) {
  const newSongRef = songsRef.push();
  newSongRef.set(songData, (error) => {
    if (callback) callback(error, newSongRef.key);
  });
}

// وظيفة: جلب كل الأغاني
function getAllSongs(callback) {
  songsRef.once('value', (snapshot) => {
    const songs = snapshot.val() || {};
    callback(null, Object.entries(songs).map(([id, data]) => ({ id, ...data })));
  }, (error) => {
    callback(error, null);
  });
}

// وظيفة: البحث عن أغنية عبر url_code
function findSongByUrlCode(urlCode, callback) {
  songsRef.orderByChild('url_code').equalTo(urlCode).once('value', (snapshot) => {
    const results = snapshot.val();
    if (results) {
      const [id, data] = Object.entries(results)[0];
      callback(null, { id, ...data });
    } else {
      callback(null, null);
    }
  }, (error) => {
    callback(error, null);
  });
}

module.exports = {
  addSong,
  getAllSongs,
  findSongByUrlCode
};
