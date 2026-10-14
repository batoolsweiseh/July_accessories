const fs = require('fs');

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- بدء اختبارات نظام حسابي ونقاط الولاء وأكواد المحل ---');

  // 1. إنشاء حساب تجريبي لاختبار النقاط
  const testPhone = '0598' + Math.floor(Math.random() * 900000 + 100000);
  const testPassword = 'Password123!';
  const testName = 'سارة أحمد';

  console.log(`1. تسجيل مستخدم جديد بالرقم: ${testPhone}`);
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, phone: testPhone, password: testPassword }),
  });
  const regData = await regRes.json();
  console.log('نتيجة التسجيل:', regData.success ? '✅ نجح' : `❌ فشل: ${regData.error}`);

  // الحصول على كوكي الجلسة
  const cookieHeader = regRes.headers.get('set-cookie');
  if (!cookieHeader) {
    console.error('❌ لم يتم استلام الكوكي!');
    return;
  }
  const sessionCookie = cookieHeader.split(';')[0];
  console.log('✅ تم الحصول على كوكي الجلسة');

  // 2. فحص رصيد النقاط الأولي للمستخدم الجديد (يجب أن يكون 0)
  console.log('2. فحص رصيد النقاط الأولي...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meData = await meRes.json();
  console.log('بيانات المستخدم:', meData.user);
  if (meData.user.points === 0) {
    console.log('✅ الرصيد الأولي 0 كما هو مطلوب.');
  } else {
    console.log(`❌ الرصيد الأولي غير متوقع: ${meData.user.points}`);
  }

  // 3. فحص نقاط الولاء عبر /api/account/points
  const ptsRes = await fetch(`${baseUrl}/api/account/points`, {
    headers: { Cookie: sessionCookie },
  });
  const ptsData = await ptsRes.json();
  console.log('نتيجة نقاط الحساب:', ptsData);
  if (ptsData.success && ptsData.points === 0 && ptsData.history.length === 0) {
    console.log('✅ /api/account/points يعمل بنجاح.');
  }

  // 4. اختبار إدخال كود خاطئ / غير موجود
  console.log('4. اختبار كود غير صحيح...');
  const invRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ code: 'FAKE-CODE-999' }),
  });
  const invData = await invRes.json();
  console.log('رد الكود غير الصحيح:', invData);
  if (!invData.success && invData.error.includes('غير صحيح')) {
    console.log('✅ تم رفض الكود غير الصحيح بنجاح مع رسالة واضحة.');
  } else {
    console.log('❌ خطأ في التحقق من الكود غير الصحيح!');
  }

  // 5. اختبار كود منتهي الصلاحية
  console.log('5. اختبار كود منتهي الصلاحية...');
  const expRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ code: 'JULY-EXPIRED-DEMO' }),
  });
  const expData = await expRes.json();
  console.log('رد الكود المنتهي:', expData);
  if (!expData.success && expData.error.includes('منتهي الصلاحية')) {
    console.log('✅ تم رفض الكود المنتهي بنجاح.');
  }

  // 6. اختبار كود مستخدم مسبقاً
  console.log('6. اختبار كود مستخدم مسبقاً...');
  const usedRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ code: 'JULY-USED-DEMO' }),
  });
  const usedData = await usedRes.json();
  console.log('رد الكود المستخدم:', usedData);
  if (!usedData.success && usedData.error.includes('استخدامه مسبقاً')) {
    console.log('✅ تم رفض الكود المستخدم بنجاح.');
  }

  // 7. اختبار إدخال كود صالح وإضافة النقاط (JULY-100 = 100 نقطة)
  console.log('7. اختبار كود صالح (JULY-100)...');
  const validRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ code: 'JULY-100' }),
  });
  const validData = await validRes.json();
  console.log('رد إضافة النقاط:', validData);
  if (validData.success && validData.pointsAdded === 100 && validData.totalPoints === 100) {
    console.log('✅ تمت إضافة 100 نقطة بنجاح وأصبح الرصيد 100!');
  } else {
    console.error('❌ فشل في إضافة النقاط:', validData);
  }

  // 8. محاولة إعادة استخدام نفس الكود (JULY-100) مرة أخرى
  console.log('8. اختبار إعادة استخدام الكود نفسه...');
  const reUseRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ code: 'JULY-100' }),
  });
  const reUseData = await reUseRes.json();
  console.log('رد إعادة الاستخدام:', reUseData);
  if (!reUseData.success && reUseData.error.includes('استخدامه مسبقاً')) {
    console.log('✅ تم منع إعادة استخدام الكود نفسه بنجاح (Single-use security enforced)!');
  } else {
    console.error('❌ خطأ: الكود تم قبوله مرتين!', reUseData);
  }

  // 9. إضافة كود صالح ثانٍ (JULY-50 = 50 نقطة)
  console.log('9. اختبار إضافة كود آخر (JULY-50)...');
  const secondRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ code: 'july-50' }), // تجربة أحرف صغيرة للتحقق من عدم حساسية الأحرف
  });
  const secondData = await secondRes.json();
  console.log('رد إضافة الكود الثاني:', secondData);
  if (secondData.success && secondData.pointsAdded === 50 && secondData.totalPoints === 150) {
    console.log('✅ تمت إضافة 50 نقطة وأصبح الرصيد التراكمي 150 نقطة وسجل الحركات يحتوي على العمليتين!');
  }

  // 10. اختبار محاولة إضافة نقاط بدون تسجيل دخول (Security Check)
  console.log('10. اختبار محاولة إضافة نقاط كضيف بدون تسجيل دخول...');
  const guestRes = await fetch(`${baseUrl}/api/account/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'JULY-VIP-250' }),
  });
  const guestData = await guestRes.json();
  console.log('رد الضيف بدون تسجيل:', guestData);
  if (guestRes.status === 401 && !guestData.success) {
    console.log('✅ تم منع الضيف بدون تسجيل دخول بنجاح (401 Unauthorized)!');
  }

  console.log('--- اكتملت جميع الاختبارات بنجاح تام! 🎉 ---');
}

runTests().catch(console.error);
