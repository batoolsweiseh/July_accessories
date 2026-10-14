import crypto from "crypto";
import { supabaseAdmin } from "./supabase-admin";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export interface PurchaseCode {
  id?: string;
  code: string;
  points: number;
  is_used: boolean;
  used_by?: string | null;
  used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  note?: string;
}

export interface LoyaltyHistoryItem {
  id: string;
  code?: string;
  points: number;
  type: "store_purchase" | "reward" | "adjustment";
  title: string;
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
// أكواد مشتريات المحل — Supabase
// ═══════════════════════════════════════════════════

/** جلب كل أكواد المشتريات */
export async function getPurchaseCodes(): Promise<PurchaseCode[]> {
  const { data, error } = await supabaseAdmin
    .from("store_purchase_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPurchaseCodes error:", error);
    return [];
  }
  return (data || []) as PurchaseCode[];
}

/** توليد كود مشتريات جديد للمحل */
export async function generateStorePurchaseCode(
  points: number,
  note?: string
): Promise<PurchaseCode> {
  const cleanPoints = Math.max(1, Number(points));
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const codeStr = `JULY-${randomSuffix}-${cleanPoints}`;

  const { data, error } = await supabaseAdmin
    .from("store_purchase_codes")
    .insert({
      code: codeStr,
      points: cleanPoints,
      is_used: false,
      note: (note || "").trim() || `كود مشتريات بقيمة ${cleanPoints} نقطة`,
    })
    .select()
    .single();

  if (error) {
    console.error("generateStorePurchaseCode error:", error);
    throw new Error("فشل توليد الكود: " + error.message);
  }
  return data as PurchaseCode;
}

/** التحقق من كود مشتريات وإضافة النقاط لرصيد المستخدم */
export async function redeemStorePurchaseCode(
  userId: string,
  rawCode: string
): Promise<{ success: boolean; pointsAdded: number; totalPoints: number; history: LoyaltyHistoryItem[] }> {
  return withLock(async () => {
    const cleanCode = (rawCode || "").trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 3) {
      throw new Error("يرجى إدخال كود مشتريات صحيح");
    }

    // 1. فحص وجود المستخدم
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error("المستخدم غير موجود أو غير مسجل");
    }

    // 2. جلب الكود من Supabase
    const { data: codeRow, error: codeError } = await supabaseAdmin
      .from("store_purchase_codes")
      .select("*")
      .eq("code", cleanCode)
      .single();

    if (codeError || !codeRow) {
      throw new Error("كود المشتريات غير صحيح، يرجى التأكد من الرمز والمحاولة مرة أخرى.");
    }

    // 3. فحص هل تم استخدامه
    if (codeRow.is_used) {
      throw new Error("هذا الكود تم استخدامه مسبقاً ولا يمكن استخدامه مرة أخرى.");
    }

    // 4. فحص الصلاحية الزمنية
    if (codeRow.expires_at && new Date(codeRow.expires_at).getTime() < Date.now()) {
      throw new Error("عذراً، هذا الكود منتهي الصلاحية.");
    }

    const pointsToAdd = Math.max(0, codeRow.points);

    // 5. تحديث الكود كمستخدم في Supabase
    const { error: updateCodeError } = await supabaseAdmin
      .from("store_purchase_codes")
      .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq("id", codeRow.id);

    if (updateCodeError) {
      throw new Error("فشل تحديث حالة الكود");
    }

    // 6. تحديث رصيد المستخدم في Auth user_metadata
    const meta = user.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    const newTotal = currentPoints + pointsToAdd;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history) ? [...meta.loyalty_history] : [];

    const newRecord: LoyaltyHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `pt_${Date.now()}`,
      code: codeRow.code,
      points: pointsToAdd,
      type: "store_purchase",
      title: codeRow.note || "إضافة نقاط مشتريات من المحل",
      created_at: new Date().toISOString(),
    };
    history.unshift(newRecord);

    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...meta, points: newTotal, loyalty_history: history },
    });

    if (updateUserError) {
      throw new Error("حدث خطأ أثناء حفظ النقاط في حسابك. يرجى المحاولة مرة أخرى.");
    }

    // سجل المعاملة
    try {
      await supabaseAdmin.from("loyalty_transactions").insert({
        user_id: userId,
        code: codeRow.code,
        points: pointsToAdd,
        type: "store_purchase",
        title: codeRow.note || "إضافة نقاط مشتريات",
      });
    } catch { /* تجاهل */ }

    return { success: true, pointsAdded: pointsToAdd, totalPoints: newTotal, history };
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
    // تعديل
    const { data: updated, error } = await supabaseAdmin
      .from("loyalty_rewards")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error("فشل تعديل الجائزة: " + error.message);
    return updated as LoyaltyReward;
  } else {
    // إضافة جديدة
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
    // 1. وجود المستخدم
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) throw new Error("المستخدم غير موجود أو غير مسجل");

    // 2. جلب الجائزة من Supabase
    const { data: reward, error: rewardError } = await supabaseAdmin
      .from("loyalty_rewards")
      .select("*")
      .eq("id", rewardId)
      .single();

    if (rewardError || !reward) throw new Error("المكافأة المطلوبة غير موجودة");
    if (!reward.is_active) throw new Error("عذراً، هذه المكافأة غير نشطة حالياً");

    // 3. فحص الرصيد
    const meta = user.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;

    if (currentPoints < reward.points_required) {
      throw new Error(
        `رصيدك الحالي (${currentPoints} نقطة) لا يكفي لاستبدال هذه الجائزة (${reward.points_required} نقطة مطلوبة).`
      );
    }

    // 4. خصم النقاط
    const newTotal = Math.max(0, currentPoints - reward.points_required);
    const claimCode = `JULY-GIFT-${Math.floor(1000 + Math.random() * 9000)}`;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history) ? [...meta.loyalty_history] : [];

    history.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `claim_${Date.now()}`,
      code: claimCode,
      points: -reward.points_required,
      type: "reward",
      title: `استبدال هدية: ${reward.title}`,
      created_at: new Date().toISOString(),
    });

    // 5. حفظ في Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...meta, points: newTotal, loyalty_history: history },
    });

    if (updateError) throw new Error("حدث خطأ أثناء خصم النقاط من حسابك.");

    // سجل المعاملة
    try {
      await supabaseAdmin.from("loyalty_transactions").insert({
        user_id: userId,
        code: claimCode,
        points: -reward.points_required,
        type: "reward",
        title: `استبدال هدية: ${reward.title}`,
      });
    } catch { /* تجاهل */ }

    return {
      success: true,
      rewardTitle: reward.title,
      pointsDeducted: reward.points_required,
      remainingPoints: newTotal,
      claimCode,
      history,
    };
  });
}

// ═══════════════════════════════════════════════════
// وظائف لوحة التحكم — خصم/فحص/تصفير نقاط الزبونة
// ═══════════════════════════════════════════════════

/** جلب بيانات نقاط المستخدم */
export async function getUserLoyalty(userId: string): Promise<{ points: number; history: LoyaltyHistoryItem[] }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !user) return { points: 0, history: [] };
    const meta = user.user_metadata || {};
    const points = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
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

    const meta = targetUser.user_metadata || {};
    const points = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
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
  return withLock(async () => {
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const email = `${cleanPhone}@july-store.local`;

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error || !users) throw new Error("فشل الوصول إلى قائمة العملاء");

    const targetUser = users.find((u) => {
      const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      return uPhone === cleanPhone || u.email === email;
    });

    if (!targetUser) throw new Error(`لم يتم العثور على حساب مسجل برقم الهاتف: ${phone}`);

    const meta = targetUser.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    const cleanDeduct = Math.max(1, Number(pointsToDeduct));

    if (currentPoints < cleanDeduct) {
      throw new Error(`رصيد الزبونة الحالي (${currentPoints} نقطة) أقل من النقاط المراد خصمها (${cleanDeduct} نقطة).`);
    }

    const newTotal = Math.max(0, currentPoints - cleanDeduct);
    const claimCode = `SHOP-CLAIM-${Math.floor(1000 + Math.random() * 9000)}`;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history) ? [...meta.loyalty_history] : [];

    history.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `admin_deduct_${Date.now()}`,
      code: claimCode,
      points: -cleanDeduct,
      type: "reward",
      title: reason || "استلام هدية من فرع المحل وخصم النقاط",
      created_at: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: { ...meta, points: newTotal, loyalty_history: history },
    });

    if (updateError) throw new Error("فشل تحديث رصيد الزبونة في قاعدة البيانات");

    return { success: true, newPoints: newTotal, customerName: meta.full_name || meta.name || "", claimCode };
  });
}

/** تصفير رصيد زبونة بالكامل لـ 0 */
export async function resetCustomerPointsByPhone(
  phone: string,
  reason?: string
): Promise<{ success: boolean; oldPoints: number; newPoints: number; customerName: string; claimCode: string }> {
  return withLock(async () => {
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const email = `${cleanPhone}@july-store.local`;

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error || !users) throw new Error("فشل الوصول إلى قائمة العملاء");

    const targetUser = users.find((u) => {
      const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      return uPhone === cleanPhone || u.email === email;
    });

    if (!targetUser) throw new Error(`لم يتم العثور على حساب مسجل برقم الهاتف: ${phone}`);

    const meta = targetUser.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;

    if (currentPoints <= 0) throw new Error("رصيد الزبونة الحالي هو 0 نقطة بالفعل.");

    const claimCode = `RESET-${Math.floor(1000 + Math.random() * 9000)}`;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history) ? [...meta.loyalty_history] : [];

    history.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `reset_${Date.now()}`,
      code: claimCode,
      points: -currentPoints,
      type: "reward",
      title: reason || "استلام هدية وتصفير الرصيد لـ 0",
      created_at: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: { ...meta, points: 0, loyalty_history: history },
    });

    if (updateError) throw new Error("فشل تصفير رصيد الزبونة في قاعدة البيانات");

    return { success: true, oldPoints: currentPoints, newPoints: 0, customerName: meta.full_name || meta.name || "", claimCode };
  });
}
