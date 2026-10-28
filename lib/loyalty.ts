import crypto from "crypto";
import { supabaseAdmin } from "./supabase-admin";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface PurchaseCodeUserUsage {
  user_id: string;
  user_name?: string;
  user_phone?: string;
  redeemed_at: string;
}

export interface PurchaseCode {
  id?: string;
  code: string;
  points: number;
  is_used: boolean;
  is_active: boolean;
  usage_type?: "once_per_user" | "once_globally";
  used_by?: string | null;
  used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  note?: string;
  usage_count?: number;
  used_by_users?: PurchaseCodeUserUsage[];
}

export interface LoyaltyHistoryItem {
  id: string;
  user_id?: string;
  code?: string;
  points: number;
  type: "store_purchase" | "reward" | "adjustment" | "admin_adjustment";
  title: string;
  note?: string;
  balance_before?: number;
  balance_after?: number;
  created_at: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  points_required: number;
  description: string;
  month_tag?: string;
  is_active: boolean;
  icon?: string;
  image?: string;
  created_at: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  points: number;
  history: LoyaltyHistoryItem[];
  used_codes: string[];
}

// ═══════════════════════════════════════════════════
// قفل تسلسلي لمنع تضارب الطلبات المتزامنة
// ═══════════════════════════════════════════════════

let mutexPromise = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutexPromise.then(fn, fn);
  mutexPromise = result.then(() => {}, () => {});
  return result;
}

// ═══════════════════════════════════════════════════
// المساعدات الداخلية لمزامنة رصيد المستخدم
// ═══════════════════════════════════════════════════

/** جلب رصيد المستخدم بدقة من user_profiles أو user_metadata */
async function getUserCurrentPoints(userId: string): Promise<{ points: number; user: any }> {
  const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !user) {
    throw new Error("المستخدم غير موجود أو غير مسجل في النظام");
  }

  // محاولة القراءة من جدول user_profiles أولاً
  let points = 0;
  try {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("points")
      .eq("id", userId)
      .single();
    if (profile && typeof profile.points === "number") {
      points = Math.max(0, profile.points);
      return { points, user };
    }
  } catch {
    // تجاهل في حال عدم وجود الجدول
  }

  // قراءة بديلة من user_metadata
  const meta = user.user_metadata || {};
  points = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
  return { points, user };
}

/** تحديث رصيد وسجل المستخدم في كل من user_profiles و user_metadata */
async function syncUserPointsAndHistory(
  userId: string,
  user: any,
  newPoints: number,
  newHistoryItem?: LoyaltyHistoryItem
): Promise<void> {
  const meta = user.user_metadata || {};
  const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history)
    ? [...meta.loyalty_history]
    : [];

  if (newHistoryItem) {
    history.unshift(newHistoryItem);
  }

  // 1. تحديث auth.users metadata
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      points: newPoints,
      loyalty_history: history,
    },
  });

  // 2. تحديث جدول user_profiles في حال وجوده
  try {
    await supabaseAdmin
      .from("user_profiles")
      .upsert({
        id: userId,
        full_name: meta.full_name || meta.name || "",
        phone: meta.phone || "",
        email: user.email || "",
        points: newPoints,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
  } catch {
    // تجاهل في حال عدم وجود الجدول
  }
}

// ═══════════════════════════════════════════════════
// أكواد الخصم والمشتريات — Supabase
// ═══════════════════════════════════════════════════

/** جلب كل أكواد المشتريات والخصم مع إحصائيات استخدام كل كود */
export async function getPurchaseCodes(): Promise<PurchaseCode[]> {
  try {
    const [codesRes, redemptionsRes, txRes, usersRes] = await Promise.all([
      supabaseAdmin.from("store_purchase_codes").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("store_code_redemptions").select("*"),
      supabaseAdmin.from("loyalty_transactions").select("*").eq("type", "store_purchase"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (codesRes.error) {
      console.error("getPurchaseCodes error:", codesRes.error);
      return [];
    }

    const codes = codesRes.data || [];
    const redemptions = redemptionsRes.data || [];
    const transactions = txRes.data || [];
    const usersList = usersRes.data?.users || [];

    // خريطة المستخدمين بالـ id
    const userMap = new Map<string, { name: string; phone: string }>();
    usersList.forEach((u) => {
      const meta = u.user_metadata || {};
      userMap.set(u.id, {
        name: meta.full_name || meta.name || "",
        phone: meta.phone || (u.email?.replace("@july-store.local", "") ?? ""),
      });
    });

    return codes.map((c: any) => {
      // جمع من استخدم الكود من جدول redemptions وجدول transactions
      const usedByUsersMap = new Map<string, PurchaseCodeUserUsage>();

      redemptions
        .filter((r: any) => (r.code_id === c.id || (r.code && r.code.toUpperCase() === c.code.toUpperCase())))
        .forEach((r: any) => {
          const uInfo = userMap.get(r.user_id);
          usedByUsersMap.set(r.user_id, {
            user_id: r.user_id,
            user_name: r.user_name || uInfo?.name || "مستخدم",
            user_phone: r.user_phone || uInfo?.phone || "",
            redeemed_at: r.redeemed_at || r.created_at || c.created_at,
          });
        });

      transactions
        .filter((t: any) => t.code && t.code.toUpperCase() === c.code.toUpperCase())
        .forEach((t: any) => {
          if (!usedByUsersMap.has(t.user_id)) {
            const uInfo = userMap.get(t.user_id);
            usedByUsersMap.set(t.user_id, {
              user_id: t.user_id,
              user_name: t.user_name || uInfo?.name || "مستخدم",
              user_phone: t.user_phone || uInfo?.phone || "",
              redeemed_at: t.created_at,
            });
          }
        });

      // إذا كان الكود القديم مسجل عليه used_by
      if (c.used_by && !usedByUsersMap.has(c.used_by)) {
        const uInfo = userMap.get(c.used_by);
        usedByUsersMap.set(c.used_by, {
          user_id: c.used_by,
          user_name: uInfo?.name || "مستخدم",
          user_phone: uInfo?.phone || "",
          redeemed_at: c.used_at || c.created_at,
        });
      }

      const usedUsers = Array.from(usedByUsersMap.values());

      return {
        id: c.id,
        code: c.code,
        points: c.points,
        is_used: c.is_used || false,
        is_active: c.is_active !== undefined ? c.is_active : true,
        usage_type: c.usage_type || "once_per_user",
        used_by: c.used_by || null,
        used_at: c.used_at || null,
        expires_at: c.expires_at || null,
        created_at: c.created_at,
        note: c.note || "",
        usage_count: usedUsers.length,
        used_by_users: usedUsers,
      };
    });
  } catch (err) {
    console.error("getPurchaseCodes catch error:", err);
    return [];
  }
}

/** إنشاء أو تعديل كود خصم بنفس اسم وتفاصيل الأدمن */
export async function createOrUpdatePurchaseCode(data: {
  id?: string;
  code: string;
  points: number;
  note?: string;
  is_active?: boolean;
  usage_type?: "once_per_user" | "once_globally";
}): Promise<PurchaseCode> {
  const cleanCode = (data.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!cleanCode || cleanCode.length < 2) {
    throw new Error("يرجى كتابة رمز كود صالح يتكون من حرفين أو أكثر");
  }

  const cleanPoints = Math.max(1, Number(data.points));
  if (isNaN(cleanPoints) || cleanPoints <= 0) {
    throw new Error("يرجى تحديد عدد نقاط أكبر من صفر");
  }

  const payload: any = {
    code: cleanCode,
    points: cleanPoints,
    note: (data.note || "").trim(),
  };

  if (data.is_active !== undefined) {
    payload.is_active = data.is_active;
  }
  if (data.usage_type) {
    payload.usage_type = data.usage_type;
  }

  if (data.id) {
    // تعديل كود موجود
    const { data: updated, error } = await supabaseAdmin
      .from("store_purchase_codes")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      // فحص إن كان الخطأ بسبب نقص عمود is_active أو usage_type في قاعدة البيانات
      if (error.message.includes("is_active") || error.message.includes("usage_type")) {
        delete payload.is_active;
        delete payload.usage_type;
        const retry = await supabaseAdmin
          .from("store_purchase_codes")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single();
        if (retry.error) throw new Error("فشل تعديل الكود: " + retry.error.message);
        return retry.data as PurchaseCode;
      }
      throw new Error("فشل تعديل الكود: " + error.message);
    }
    return updated as PurchaseCode;
  } else {
    // التحقق من عدم وجود كود مكرر بالاسم نفسه
    const { data: existing } = await supabaseAdmin
      .from("store_purchase_codes")
      .select("id")
      .eq("code", cleanCode)
      .single();

    if (existing) {
      throw new Error(`الكود "${cleanCode}" مسجل مسبقاً! يرجى اختيار اسم كود آخر.`);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("store_purchase_codes")
      .insert({
        ...payload,
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("is_active") || error.message.includes("usage_type")) {
        delete payload.is_active;
        delete payload.usage_type;
        const retry = await supabaseAdmin
          .from("store_purchase_codes")
          .insert({
            ...payload,
            is_used: false,
          })
          .select()
          .single();
        if (retry.error) throw new Error("فشل إنشاء الكود: " + retry.error.message);
        return retry.data as PurchaseCode;
      }
      throw new Error("فشل إنشاء الكود: " + error.message);
    }
    return inserted as PurchaseCode;
  }
}

/** تفعيل أو تعطيل الكود */
export async function togglePurchaseCodeStatus(id: string, is_active: boolean): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("store_purchase_codes")
    .update({ is_active })
    .eq("id", id);

  if (error) {
    // إذا لم يكن عمود is_active موجوداً بعد في قاعدة البيانات
    if (error.message?.includes("is_active") || error.code === "42703") {
      throw new Error("عمود is_active غير موجود في قاعدة البيانات. يرجى تشغيل ملف migration_fix.sql في Supabase SQL Editor أولاً.");
    }
    console.error("togglePurchaseCodeStatus error:", error);
    throw new Error("فشل تغيير حالة الكود: " + error.message);
  }
  return true;
}

/** حذف كود من لوحة الأدمن دون التأثير على سجلات المستخدمين السابقة */
export async function deletePurchaseCode(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("store_purchase_codes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deletePurchaseCode error:", error);
    return false;
  }
  return true;
}

/** توليد كود مشتريات للمحل (للتوافق القديم) */
export async function generateStorePurchaseCode(
  points: number,
  note?: string
): Promise<PurchaseCode> {
  const cleanPoints = Math.max(1, Number(points));
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const codeStr = `JULY-${randomSuffix}-${cleanPoints}`;

  return createOrUpdatePurchaseCode({
    code: codeStr,
    points: cleanPoints,
    note: (note || "").trim() || `كود مشتريات بقيمة ${cleanPoints} نقطة`,
    is_active: true,
    usage_type: "once_per_user",
  });
}

/** التحقق من كود الخصم وإضافة النقاط بأمان ومصداقية كاملة */
export async function redeemStorePurchaseCode(
  userId: string,
  rawCode: string
): Promise<{
  success: boolean;
  pointsAdded: number;
  totalPoints: number;
  history: LoyaltyHistoryItem[];
  message: string;
}> {
  return withLock(async () => {
    const cleanCode = (rawCode || "").trim().toUpperCase().replace(/\s+/g, "");

    if (!cleanCode || cleanCode.length < 2) {
      throw new Error("يرجى إدخال رمز كود صحيح ومكتمل");
    }

    // 1. فحص وجود حساب المستخدم
    const { points: currentPoints, user } = await getUserCurrentPoints(userId);
    const meta = user.user_metadata || {};
    const userName = meta.full_name || meta.name || "";
    const userPhone = meta.phone || (user.email?.replace("@july-store.local", "") ?? "");

    // 2. جلب الكود من جدول store_purchase_codes
    const { data: codeRow, error: codeError } = await supabaseAdmin
      .from("store_purchase_codes")
      .select("*")
      .eq("code", cleanCode)
      .single();

    if (codeError || !codeRow) {
      throw new Error("كود الخصم أو المشتريات غير صحيح، يرجى التأكد من الرمز والمحاولة مرة أخرى.");
    }

    // 3. فحص حالة التفعيل (is_active)
    if (codeRow.is_active === false) {
      throw new Error("عذراً، هذا الكود غير مفعّل حالياً أو تم إيقافه من قبل الإدارة.");
    }

    // 4. فحص الصلاحية الزمنية
    if (codeRow.expires_at && new Date(codeRow.expires_at).getTime() < Date.now()) {
      throw new Error("عذراً، هذا الكود منتهي الصلاحية.");
    }

    // 5. فحص هل المستخدم استخدم هذا الكود مسبقاً (يمنع تكرار الاحتساب نهائياً)
    // أ) فحص جدول store_code_redemptions
    let alreadyUsed = false;
    try {
      const { data: redemptionCheck } = await supabaseAdmin
        .from("store_code_redemptions")
        .select("id")
        .eq("code", cleanCode)
        .eq("user_id", userId)
        .limit(1);

      if (redemptionCheck && redemptionCheck.length > 0) {
        alreadyUsed = true;
      }
    } catch {
      // الجدول غير موجود بعد
    }

    // ب) فحص جدول loyalty_transactions الاحتياطي للتأكد الصارم
    if (!alreadyUsed) {
      const { data: txCheck } = await supabaseAdmin
        .from("loyalty_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("code", cleanCode)
        .limit(1);

      if (txCheck && txCheck.length > 0) {
        alreadyUsed = true;
      }
    }

    // ج) فحص إذا كان الكود نوعه استخدام مرة واحدة عالمياً وتم استخدامه
    if (codeRow.usage_type === "once_globally" && codeRow.is_used) {
      throw new Error("هذا الكود تم استخدامه مسبقاً ولا يمكن استخدامه مرة أخرى.");
    }

    if (alreadyUsed) {
      throw new Error("لقد قمتِ باستخدام هذا الكود مسبقاً! كل كود صالح للاستخدام مرة واحدة فقط لكل حساب.");
    }

    const pointsToAdd = Math.max(0, Number(codeRow.points));
    const newTotal = currentPoints + pointsToAdd;

    // 6. تسجيل العملية أولاً في store_code_redemptions لضمان القيد الفريد
    try {
      await supabaseAdmin.from("store_code_redemptions").insert({
        code_id: codeRow.id,
        code: codeRow.code,
        user_id: userId,
        user_name: userName,
        user_phone: userPhone,
        points: pointsToAdd,
        redeemed_at: new Date().toISOString(),
      });
    } catch {
      // في حال عدم وجود الجدول نتخطى، لكن إذا كان خطأ قيد تكرار يتم إيقاف العملية
    }

    // إذا كان الكود مخصص لمرة واحدة فقط عالمياً نحدث is_used
    if (codeRow.usage_type === "once_globally") {
      await supabaseAdmin
        .from("store_purchase_codes")
        .update({
          is_used: true,
          used_by: userId,
          used_at: new Date().toISOString(),
        })
        .eq("id", codeRow.id);
    }

    // 7. تسجيل المعاملة في جدول حركات النقاط loyalty_transactions
    const transactionId = crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}`;
    const txTitle = codeRow.note || "إضافة نقاط كود خصم / مشتريات";

    try {
      await supabaseAdmin.from("loyalty_transactions").insert({
        id: transactionId,
        user_id: userId,
        code: codeRow.code,
        points: pointsToAdd,
        type: "store_purchase",
        title: txTitle,
        note: `تم تفعيل الكود ${codeRow.code} والحصول على ${pointsToAdd} نقطة`,
        balance_before: currentPoints,
        balance_after: newTotal,
        user_name: userName,
        user_phone: userPhone,
      });
    } catch (insertTxErr: any) {
      // محاولة بديلة بالأعمدة الأساسية في حال عدم وجود الأعمدة المضافة بعد
      try {
        await supabaseAdmin.from("loyalty_transactions").insert({
          id: transactionId,
          user_id: userId,
          code: codeRow.code,
          points: pointsToAdd,
          type: "store_purchase",
          title: txTitle,
        });
      } catch (e) {
        console.warn("Failed to insert into loyalty_transactions:", e);
      }
    }

    // 8. تحديث رصيد وسجل المستخدم
    const newHistoryItem: LoyaltyHistoryItem = {
      id: transactionId,
      code: codeRow.code,
      points: pointsToAdd,
      type: "store_purchase",
      title: txTitle,
      balance_before: currentPoints,
      balance_after: newTotal,
      created_at: new Date().toISOString(),
    };

    await syncUserPointsAndHistory(userId, user, newTotal, newHistoryItem);

    // جلب السجل المحدث
    const updatedHistory = await getUserLoyalty(userId);

    return {
      success: true,
      pointsAdded: pointsToAdd,
      totalPoints: newTotal,
      history: updatedHistory.history,
      message: `مبروك! تمت إضافة ${pointsToAdd} نقطة بنجاح إلى رصيدك!`,
    };
  });
}

// ═══════════════════════════════════════════════════
// إدارة المستخدمين والنقاط — لوحة الأدمن
// ═══════════════════════════════════════════════════

/** جلب جميع المستخدمين وحساباتهم وأرصدة نقاطهم وسجل كل مستخدم */
export async function getAllCustomers(): Promise<CustomerUser[]> {
  try {
    const [usersRes, txRes, redemptionsRes, profilesRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("loyalty_transactions").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("store_code_redemptions").select("*"),
      supabaseAdmin.from("user_profiles").select("*"),
    ]);

    if (usersRes.error) {
      console.error("getAllCustomers error:", usersRes.error);
      return [];
    }

    const rawUsers = usersRes.data.users || [];
    const transactions = txRes.data || [];
    const redemptions = redemptionsRes.data || [];
    const profiles = profilesRes.data || [];

    const profileMap = new Map<string, any>();
    profiles.forEach((p: any) => profileMap.set(p.id, p));

    return rawUsers.map((u) => {
      const meta = u.user_metadata || {};
      const profile = profileMap.get(u.id);

      // الرصيد: نأخذ من profile إن وجد، وإلا من user_metadata
      let points = 0;
      if (profile && typeof profile.points === "number") {
        points = Math.max(0, profile.points);
      } else if (typeof meta.points === "number") {
        points = Math.max(0, meta.points);
      }

      // جلب الحركات الخاصة بالمستخدم
      const userTx: LoyaltyHistoryItem[] = transactions
        .filter((t: any) => t.user_id === u.id)
        .map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          code: t.code,
          points: t.points,
          type: t.type || "store_purchase",
          title: t.title || "حركة نقاط",
          note: t.note,
          balance_before: t.balance_before,
          balance_after: t.balance_after,
          created_at: t.created_at,
        }));

      // جمع الأكواد التي استخدمها المستخدم
      const usedCodesSet = new Set<string>();
      redemptions
        .filter((r: any) => r.user_id === u.id && r.code)
        .forEach((r: any) => usedCodesSet.add(r.code));

      userTx
        .filter((t) => t.code)
        .forEach((t) => usedCodesSet.add(t.code!));

      const phone =
        meta.phone ||
        profile?.phone ||
        (u.email ? u.email.replace("@july-store.local", "") : "");

      const name =
        meta.full_name ||
        meta.name ||
        profile?.full_name ||
        phone ||
        "عميل July";

      return {
        id: u.id,
        name,
        phone,
        email: u.email || "",
        created_at: u.created_at,
        points,
        history: userTx,
        used_codes: Array.from(usedCodesSet),
      };
    });
  } catch (err) {
    console.error("getAllCustomers catch error:", err);
    return [];
  }
}

/** تعديل نقاط مستخدم من لوحة الأدمن (إضافة أو خصم) مع تسجيل السبب والرصيد قبل وبعد */
export async function adjustCustomerPoints(
  userId: string,
  pointsDelta: number,
  reason: string
): Promise<{
  success: boolean;
  oldPoints: number;
  newPoints: number;
  customerName: string;
  transaction: LoyaltyHistoryItem;
}> {
  return withLock(async () => {
    const delta = Number(pointsDelta);
    if (!delta || isNaN(delta) || delta === 0) {
      throw new Error("يرجى تحديد عدد نقاط صالح للإضافة أو الخصم (لا يمكن أن يكون صفراً)");
    }

    const cleanReason = (reason || "").trim() || (delta > 0 ? "إضافة نقاط يدوية من الإدارة" : "خصم نقاط يدوي من الإدارة");

    const { points: currentPoints, user } = await getUserCurrentPoints(userId);
    const meta = user.user_metadata || {};
    const customerName = meta.full_name || meta.name || meta.phone || "العميل";
    const customerPhone = meta.phone || (user.email?.replace("@july-store.local", "") ?? "");

    const newPoints = currentPoints + delta;
    if (newPoints < 0) {
      throw new Error(
        `لا يمكن خصم ${Math.abs(delta)} نقطة لأن رصيد المستخدم الحالي (${currentPoints} نقطة) غير كافٍ.`
      );
    }

    const txId = crypto.randomUUID ? crypto.randomUUID() : `adj_${Date.now()}`;
    const txTitle = delta > 0 ? `إضافة نقاط إدارية (+${delta})` : `خصم نقاط إداري (${delta})`;

    // 1. تسجيل الحركة في جدول loyalty_transactions
    try {
      await supabaseAdmin.from("loyalty_transactions").insert({
        id: txId,
        user_id: userId,
        code: null,
        points: delta,
        type: "admin_adjustment",
        title: txTitle,
        note: cleanReason,
        balance_before: currentPoints,
        balance_after: newPoints,
        user_name: customerName,
        user_phone: customerPhone,
      });
    } catch {
      try {
        await supabaseAdmin.from("loyalty_transactions").insert({
          id: txId,
          user_id: userId,
          points: delta,
          type: "admin_adjustment",
          title: `${txTitle} - ${cleanReason}`,
        });
      } catch (e) {
        console.warn("Could not insert adjustment into loyalty_transactions:", e);
      }
    }

    // 2. تحديث رصيد وسجل المستخدم
    const newHistoryItem: LoyaltyHistoryItem = {
      id: txId,
      points: delta,
      type: "admin_adjustment",
      title: txTitle,
      note: cleanReason,
      balance_before: currentPoints,
      balance_after: newPoints,
      created_at: new Date().toISOString(),
    };

    await syncUserPointsAndHistory(userId, user, newPoints, newHistoryItem);

    return {
      success: true,
      oldPoints: currentPoints,
      newPoints,
      customerName,
      transaction: newHistoryItem,
    };
  });
}

// ═══════════════════════════════════════════════════
// الجوائز الشهرية — Supabase
// ═══════════════════════════════════════════════════

/** جلب الجوائز */
export async function getLoyaltyRewards(onlyActive: boolean = false): Promise<LoyaltyReward[]> {
  let query = supabaseAdmin
    .from("loyalty_rewards")
    .select("*")
    .order("points_required", { ascending: true });

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getLoyaltyRewards error:", error);
    return [];
  }
  return (data || []) as LoyaltyReward[];
}

/** إضافة أو تعديل جائزة */
export async function saveLoyaltyReward(data: {
  id?: string;
  title: string;
  points_required: number;
  description: string;
  month_tag?: string;
  is_active?: boolean;
  icon?: string;
  image?: string;
}): Promise<LoyaltyReward> {
  const payload = {
    title: data.title.trim(),
    points_required: Math.max(1, Number(data.points_required)),
    description: (data.description || "").trim(),
    month_tag: (data.month_tag || "جوائز هذا الشهر").trim(),
    is_active: data.is_active !== undefined ? data.is_active : true,
    icon: data.icon || "fa-gift",
    image: (data.image || "").trim() || null,
  };

  if (data.id) {
    const { data: updated, error } = await supabaseAdmin
      .from("loyalty_rewards")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error("فشل تعديل الجائزة: " + error.message);
    return updated as LoyaltyReward;
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("loyalty_rewards")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error("فشل إضافة الجائزة: " + error.message);
    return inserted as LoyaltyReward;
  }
}

/** حذف جائزة */
export async function deleteLoyaltyReward(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("loyalty_rewards")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteLoyaltyReward error:", error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════
// استبدال النقاط بمكافأة
// ═══════════════════════════════════════════════════

export async function claimLoyaltyReward(
  userId: string,
  rewardId: string
): Promise<{
  success: boolean;
  rewardTitle: string;
  pointsDeducted: number;
  remainingPoints: number;
  claimCode: string;
  history: LoyaltyHistoryItem[];
}> {
  return withLock(async () => {
    const { points: currentPoints, user } = await getUserCurrentPoints(userId);

    const { data: reward, error: rewardError } = await supabaseAdmin
      .from("loyalty_rewards")
      .select("*")
      .eq("id", rewardId)
      .single();

    if (rewardError || !reward) throw new Error("المكافأة المطلوبة غير موجودة");
    if (!reward.is_active) throw new Error("عذراً، هذه المكافأة غير نشطة حالياً");

    if (currentPoints < reward.points_required) {
      throw new Error(
        `رصيدك الحالي (${currentPoints} نقطة) لا يكفي لاستبدال هذه الجائزة (${reward.points_required} نقطة مطلوبة).`
      );
    }

    const newTotal = Math.max(0, currentPoints - reward.points_required);
    const claimCode = `JULY-GIFT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord: LoyaltyHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `claim_${Date.now()}`,
      code: claimCode,
      points: -reward.points_required,
      type: "reward",
      title: `استبدال هدية: ${reward.title}`,
      balance_before: currentPoints,
      balance_after: newTotal,
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseAdmin.from("loyalty_transactions").insert({
        user_id: userId,
        code: claimCode,
        points: -reward.points_required,
        type: "reward",
        title: `استبدال هدية: ${reward.title}`,
        balance_before: currentPoints,
        balance_after: newTotal,
      });
    } catch { /* تجاهل */ }

    await syncUserPointsAndHistory(userId, user, newTotal, newRecord);

    const updatedLoyalty = await getUserLoyalty(userId);

    return {
      success: true,
      rewardTitle: reward.title,
      pointsDeducted: reward.points_required,
      remainingPoints: newTotal,
      claimCode,
      history: updatedLoyalty.history,
    };
  });
}

// ═══════════════════════════════════════════════════
// وظائف الحساب الشخصي واللوحة
// ═══════════════════════════════════════════════════

/** جلب بيانات نقاط المستخدم وسجله */
export async function getUserLoyalty(
  userId: string
): Promise<{ points: number; history: LoyaltyHistoryItem[] }> {
  try {
    const { points, user } = await getUserCurrentPoints(userId);
    const meta = user.user_metadata || {};

    // جلب الحركات من جدول loyalty_transactions للحصول على أحدث وأدق سجل
    const { data: txData } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (txData && txData.length > 0) {
      const history: LoyaltyHistoryItem[] = txData.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        code: t.code,
        points: t.points,
        type: t.type || "store_purchase",
        title: t.title || "حركة نقاط",
        note: t.note,
        balance_before: t.balance_before,
        balance_after: t.balance_after,
        created_at: t.created_at,
      }));
      return { points, history };
    }

    const history = Array.isArray(meta.loyalty_history) ? meta.loyalty_history : [];
    return { points, history };
  } catch {
    return { points: 0, history: [] };
  }
}

/** فحص رصيد زبونة بالهاتف */
export async function lookupCustomerPointsByPhone(
  phone: string
): Promise<{ success: boolean; customerName: string; points: number; error?: string }> {
  try {
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const email = `${cleanPhone}@july-store.local`;

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error || !users) throw new Error("فشل الوصول إلى قائمة العملاء");

    const targetUser = users.find((u) => {
      const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      return uPhone === cleanPhone || u.email === email;
    });

    if (!targetUser) {
      return { success: false, customerName: "", points: 0, error: `لا يوجد حساب مسجل برقم: ${phone}` };
    }

    const { points } = await getUserCurrentPoints(targetUser.id);
    const meta = targetUser.user_metadata || {};
    return { success: true, customerName: meta.full_name || meta.name || "", points };
  } catch (err: any) {
    return { success: false, customerName: "", points: 0, error: err.message || "فشل فحص الرصيد" };
  }
}

/** خصم نقاط محددة من حساب زبونة بالهاتف */
export async function deductCustomerPointsByPhone(
  phone: string,
  pointsToDeduct: number,
  reason?: string
): Promise<{ success: boolean; newPoints: number; customerName: string; claimCode: string }> {
  const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  const email = `${cleanPhone}@july-store.local`;

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error || !users) throw new Error("فشل الوصول إلى قائمة العملاء");

  const targetUser = users.find((u) => {
    const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    return uPhone === cleanPhone || u.email === email;
  });

  if (!targetUser) throw new Error(`لم يتم العثور على حساب مسجل برقم الهاتف: ${phone}`);

  const cleanDeduct = Math.abs(Number(pointsToDeduct));
  const res = await adjustCustomerPoints(
    targetUser.id,
    -cleanDeduct,
    reason || "تسليم هدية من فرع المحل وخصم النقاط"
  );

  const claimCode = `SHOP-CLAIM-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    newPoints: res.newPoints,
    customerName: res.customerName,
    claimCode,
  };
}

/** تصفير رصيد زبونة بالكامل لـ 0 */
export async function resetCustomerPointsByPhone(
  phone: string,
  reason?: string
): Promise<{ success: boolean; oldPoints: number; newPoints: number; customerName: string; claimCode: string }> {
  const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  const email = `${cleanPhone}@july-store.local`;

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error || !users) throw new Error("فشل الوصول إلى قائمة العملاء");

  const targetUser = users.find((u) => {
    const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    return uPhone === cleanPhone || u.email === email;
  });

  if (!targetUser) throw new Error(`لم يتم العثور على حساب مسجل برقم الهاتف: ${phone}`);

  const { points: currentPoints } = await getUserCurrentPoints(targetUser.id);
  if (currentPoints <= 0) {
    throw new Error("رصيد الزبونة الحالي هو 0 نقطة بالفعل.");
  }

  const res = await adjustCustomerPoints(
    targetUser.id,
    -currentPoints,
    reason || "استلام هدية وتصفير الرصيد لـ 0"
  );

  const claimCode = `RESET-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    oldPoints: currentPoints,
    newPoints: 0,
    customerName: res.customerName,
    claimCode,
  };
}
