import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin } from "./supabase-admin";

export interface PurchaseCode {
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

const DATA_DIR = path.join(process.cwd(), "data");
const CODES_FILE = path.join(DATA_DIR, "purchase_codes.json");

// أكواد مبدئية حقيقية لمشتريات المحل
const INITIAL_CODES: PurchaseCode[] = [
  {
    code: "JULY-100",
    points: 100,
    is_used: false,
    created_at: new Date().toISOString(),
    note: "كود مشتريات بقيمة 100 شيكل",
  },
  {
    code: "JULY-50",
    points: 50,
    is_used: false,
    created_at: new Date().toISOString(),
    note: "كود مشتريات بقيمة 50 شيكل",
  },
  {
    code: "JULY-VIP-250",
    points: 250,
    is_used: false,
    created_at: new Date().toISOString(),
    note: "كود مشتريات فئة VIP",
  },
  {
    code: "JULY-SHOP-30",
    points: 30,
    is_used: false,
    created_at: new Date().toISOString(),
    note: "كود مشتريات من المحل",
  },
  {
    code: "JULY-GIFT-75",
    points: 75,
    is_used: false,
    created_at: new Date().toISOString(),
    note: "كود هدية نقاط المحل",
  },
  {
    code: "JULY-USED-DEMO",
    points: 50,
    is_used: true,
    used_by: "system_demo",
    used_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    note: "كود مستخدم لاختبار رسالة الخطأ",
  },
  {
    code: "JULY-EXPIRED-DEMO",
    points: 40,
    is_used: false,
    expires_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    note: "كود منتهي الصلاحية لاختبار رسالة الخطأ",
  },
];

/** قفل تسلسلي لمنع تضارب الطلبات المتزامنة (Race conditions) */
let mutexPromise = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutexPromise.then(fn, fn);
  mutexPromise = result.then(() => {}, () => {});
  return result;
}

/** قراءة الأكواد المحفوظة */
export function getPurchaseCodes(): PurchaseCode[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CODES_FILE)) {
      fs.writeFileSync(CODES_FILE, JSON.stringify(INITIAL_CODES, null, 2), "utf8");
      return INITIAL_CODES;
    }
    const content = fs.readFileSync(CODES_FILE, "utf8");
    return JSON.parse(content) as PurchaseCode[];
  } catch (err) {
    console.error("Error reading purchase codes:", err);
    return INITIAL_CODES;
  }
}

/** حفظ الأكواد */
export function savePurchaseCodes(codes: PurchaseCode[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${CODES_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(codes, null, 2), "utf8");
    fs.renameSync(tempFile, CODES_FILE);
  } catch (err) {
    console.error("Error saving purchase codes:", err);
  }
}

/** جلب بيانات نقاط المستخدم وسجل الحركات */
export async function getUserLoyalty(userId: string): Promise<{ points: number; history: LoyaltyHistoryItem[] }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !user) {
      return { points: 0, history: [] };
    }
    const meta = user.user_metadata || {};
    const points = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    const history = Array.isArray(meta.loyalty_history) ? meta.loyalty_history : [];
    return { points, history };
  } catch (err) {
    console.error("Error getting user loyalty:", err);
    return { points: 0, history: [] };
  }
}

/** التحقق من كود مشتريات المحل وإضافته لرصيد المستخدم بطريقة آمنة */
export async function redeemStorePurchaseCode(
  userId: string,
  rawCode: string
): Promise<{ success: boolean; pointsAdded: number; totalPoints: number; history: LoyaltyHistoryItem[] }> {
  return withLock(async () => {
    const cleanCode = (rawCode || "").trim().toUpperCase();

    if (!cleanCode) {
      throw new Error("يرجى إدخال كود مشتريات المحل");
    }

    if (cleanCode.length < 3) {
      throw new Error("رمز الكود المدخل غير صالح");
    }

    // 1. فحص وجود المستخدم
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error("المستخدم غير موجود أو غير مسجل");
    }

    // 2. فحص الأكواد من قاعدة البيانات
    const codes = getPurchaseCodes();
    const codeIndex = codes.findIndex((c) => c.code.toUpperCase() === cleanCode);

    if (codeIndex === -1) {
      throw new Error("كود المشتريات غير صحيح، يرجى التأكد من الرمز والمحاولة مرة أخرى.");
    }

    const targetCode = codes[codeIndex];

    // 3. فحص هل تم استخدامه سابقاً
    if (targetCode.is_used) {
      throw new Error("هذا الكود تم استخدامه مسبقاً ولا يمكن استخدامه مرة أخرى.");
    }

    // 4. فحص الصلاحية الزمنية
    if (targetCode.expires_at) {
      const expiry = new Date(targetCode.expires_at);
      if (expiry.getTime() < Date.now()) {
        throw new Error("عذراً، هذا الكود منتهي الصلاحية.");
      }
    }

    // 5. تحديث الكود كمستخدم لمنع استخدامه مرة أخرى نهائياً
    const pointsToAdd = Math.max(0, targetCode.points);
    targetCode.is_used = true;
    targetCode.used_by = userId;
    targetCode.used_at = new Date().toISOString();
    codes[codeIndex] = targetCode;
    savePurchaseCodes(codes);

    // 6. تحديث رصيد وسجل المستخدم في Supabase Auth user_metadata
    const meta = user.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    const newTotal = currentPoints + pointsToAdd;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history)
      ? [...meta.loyalty_history]
      : [];

    const newRecord: LoyaltyHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `pt_${Date.now()}`,
      code: targetCode.code,
      points: pointsToAdd,
      type: "store_purchase",
      title: targetCode.note || "إضافة نقاط مشتريات من المحل",
      created_at: new Date().toISOString(),
    };

    history.unshift(newRecord);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        points: newTotal,
        loyalty_history: history,
      },
    });

    if (updateError) {
      console.error("Failed to update user loyalty in Supabase:", updateError);
      throw new Error("حدث خطأ أثناء حفظ النقاط في حسابك. يرجى المحاولة مرة أخرى.");
    }

    // محاولة إضافية: إذا كانت جداول Supabase موجودة يتم التحديث فيها أيضاً
    try {
      await supabaseAdmin.from("loyalty_transactions").insert({
        user_id: userId,
        code: targetCode.code,
        points: pointsToAdd,
        type: "store_purchase",
      });
    } catch {
      // تجاهل إذا لم يكن الجدول منشأ في Supabase
    }

    return {
      success: true,
      pointsAdded: pointsToAdd,
      totalPoints: newTotal,
      history,
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   إدارة جوائز ومكافآت النقاط الشهرية (Monthly Loyalty Rewards)
   ══════════════════════════════════════════════════════════════ */

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

const REWARDS_FILE = path.join(DATA_DIR, "loyalty_rewards.json");

const INITIAL_REWARDS: LoyaltyReward[] = [
  {
    id: "rew-1",
    title: "خاتم هدية مجاناً",
    points_required: 100,
    description: "اختاري أي خاتم شبيه ذهب كهدية مجانية من فرع المحل أو مع طلبك القادم.",
    month_tag: "جوائز هذا الشهر",
    is_active: true,
    icon: "fa-gem",
    created_at: new Date().toISOString(),
  },
  {
    id: "rew-2",
    title: "قسيمة خصم 25 شيكل",
    points_required: 200,
    description: "خصم فوري بقيمة 25 شيكل على أي قطعة أو إكسسوار من اختيارك.",
    month_tag: "جوائز هذا الشهر",
    is_active: true,
    icon: "fa-tags",
    created_at: new Date().toISOString(),
  },
  {
    id: "rew-3",
    title: "طقم أساور نواعم فاخر",
    points_required: 350,
    description: "طقم أساور أنيق مكفول اللون مع علبة إهداء فاخرة مجاناً.",
    month_tag: "جوائز هذا الشهر",
    is_active: true,
    icon: "fa-crown",
    created_at: new Date().toISOString(),
  },
  {
    id: "rew-4",
    title: "ساعة يد ماركة مميزة",
    points_required: 500,
    description: "ساعة يد ستاتي راقية ضد تغير اللون مع كفالة شاملة.",
    month_tag: "فئة VIP",
    is_active: true,
    icon: "fa-clock",
    created_at: new Date().toISOString(),
  },
];

/** قراءة جوائز ومكافآت النقاط */
export function getLoyaltyRewards(onlyActive: boolean = false): LoyaltyReward[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(REWARDS_FILE)) {
      fs.writeFileSync(REWARDS_FILE, JSON.stringify(INITIAL_REWARDS, null, 2), "utf8");
      return onlyActive ? INITIAL_REWARDS.filter((r) => r.is_active) : INITIAL_REWARDS;
    }
    const content = fs.readFileSync(REWARDS_FILE, "utf8");
    const rewards = JSON.parse(content) as LoyaltyReward[];
    return onlyActive ? rewards.filter((r) => r.is_active) : rewards;
  } catch (err) {
    console.error("Error reading loyalty rewards:", err);
    return onlyActive ? INITIAL_REWARDS.filter((r) => r.is_active) : INITIAL_REWARDS;
  }
}

/** حفظ قائمة الجوائز */
export function saveLoyaltyRewards(rewards: LoyaltyReward[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${REWARDS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(rewards, null, 2), "utf8");
    fs.renameSync(tempFile, REWARDS_FILE);
  } catch (err) {
    console.error("Error saving loyalty rewards:", err);
  }
}

/** إضافة أو تعديل جائزة */
export function saveLoyaltyReward(data: {
  id?: string;
  title: string;
  points_required: number;
  description: string;
  month_tag?: string;
  is_active?: boolean;
  icon?: string;
  image?: string;
}): LoyaltyReward {
  const rewards = getLoyaltyRewards(false);
  const existingIdx = data.id ? rewards.findIndex((r) => r.id === data.id) : -1;

  if (existingIdx !== -1 && data.id) {
    // تعديل
    const updated: LoyaltyReward = {
      ...rewards[existingIdx],
      title: data.title.trim(),
      points_required: Math.max(1, Number(data.points_required)),
      description: (data.description || "").trim(),
      month_tag: (data.month_tag || "").trim(),
      is_active: data.is_active !== undefined ? data.is_active : rewards[existingIdx].is_active,
      icon: data.icon || rewards[existingIdx].icon || "fa-gift",
      image: data.image !== undefined ? data.image : rewards[existingIdx].image,
    };
    rewards[existingIdx] = updated;
    saveLoyaltyRewards(rewards);
    return updated;
  } else {
    // إضافة جديدة
    const newReward: LoyaltyReward = {
      id: `rew_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      points_required: Math.max(1, Number(data.points_required)),
      description: (data.description || "").trim(),
      month_tag: (data.month_tag || "").trim() || "جوائز هذا الشهر",
      is_active: data.is_active !== undefined ? data.is_active : true,
      icon: data.icon || "fa-gift",
      image: data.image || undefined,
      created_at: new Date().toISOString(),
    };
    rewards.push(newReward);
    saveLoyaltyRewards(rewards);
    return newReward;
  }
}

/** حذف جائزة */
export function deleteLoyaltyReward(id: string): boolean {
  const rewards = getLoyaltyRewards(false);
  const filtered = rewards.filter((r) => r.id !== id);
  if (filtered.length !== rewards.length) {
    saveLoyaltyRewards(filtered);
    return true;
  }
  return false;
}

/** توليد كود مشتريات جديد للمحل من لوحة التحكم */
export function generateStorePurchaseCode(points: number, note?: string): PurchaseCode {
  const codes = getPurchaseCodes();
  const cleanPoints = Math.max(1, Number(points));
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const codeStr = `JULY-${randomSuffix}-${cleanPoints}`;

  const newCode: PurchaseCode = {
    code: codeStr,
    points: cleanPoints,
    is_used: false,
    created_at: new Date().toISOString(),
    note: (note || "").trim() || `كود مشتريات بقيمة ${cleanPoints} نقطة`,
  };

  codes.unshift(newCode);
  savePurchaseCodes(codes);
  return newCode;
}

/**
 * استبدال نقاط العميل مقابل مكافأة (خصم النقاط وإرجاعها لـ 0 أو الرصيد المتبقي)
 */
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
    // 1. التحقق من وجود المستخدم
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error("المستخدم غير موجود أو غير مسجل");
    }

    // 2. البحث عن المكافأة
    const rewards = getLoyaltyRewards(false);
    const reward = rewards.find((r) => r.id === rewardId || r.title === rewardId);
    if (!reward) {
      throw new Error("المكافأة المطلوبة غير موجودة");
    }

    if (!reward.is_active) {
      throw new Error("عذراً، هذه المكافأة غير نشطة حالياً");
    }

    // 3. التحقق من رصيد المستخدم
    const meta = user.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;

    if (currentPoints < reward.points_required) {
      throw new Error(
        `رصيدك الحالي (${currentPoints} نقطة) لا يكفي لاستبدال هذه الجائزة (${reward.points_required} نقطة مطلوبة).`
      );
    }

    // 4. خصم النقاط (يصبح الرصيد 0 إذا تساوى الرصيد مع المطلوب، أو المتبقي)
    const newTotal = Math.max(0, currentPoints - reward.points_required);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const claimCode = `JULY-GIFT-${randomCode}`;

    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history)
      ? [...meta.loyalty_history]
      : [];

    const newRecord: LoyaltyHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `claim_${Date.now()}`,
      code: claimCode,
      points: -reward.points_required,
      type: "reward",
      title: `استبدال هدية: ${reward.title}`,
      created_at: new Date().toISOString(),
    };

    history.unshift(newRecord);

    // 5. حفظ الرصيد الجديد في Supabase
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        points: newTotal,
        loyalty_history: history,
      },
    });

    if (updateError) {
      console.error("Failed to deduct points in Supabase:", updateError);
      throw new Error("حدث خطأ أثناء خصم النقاط من حسابك. يرجى المحاولة لاحقاً.");
    }

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

/** خصم نقاط من حساب عميل بالهاتف (من قبل الإدارة / كاشير المحل عند تسليم الهدية) */
export async function deductCustomerPointsByPhone(
  phone: string,
  pointsToDeduct: number,
  reason?: string
): Promise<{ success: boolean; newPoints: number; customerName: string; claimCode: string }> {
  return withLock(async () => {
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const email = `${cleanPhone}@july-store.local`;

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error || !users) {
      throw new Error("فشل الوصول إلى قائمة العملاء");
    }

    const targetUser = users.find((u) => {
      const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      return uPhone === cleanPhone || u.email === email;
    });

    if (!targetUser) {
      throw new Error(`لم يتم العثور على حساب مسجل برقم الهاتف: ${phone}`);
    }

    const meta = targetUser.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    const cleanDeduct = Math.max(1, Number(pointsToDeduct));

    if (currentPoints < cleanDeduct) {
      throw new Error(
        `رصيد الزبونة الحالي (${currentPoints} نقطة) أقل من النقاط المراد خصمها (${cleanDeduct} نقطة).`
      );
    }

    const newTotal = Math.max(0, currentPoints - cleanDeduct);
    const claimCode = `SHOP-CLAIM-${Math.floor(1000 + Math.random() * 9000)}`;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history)
      ? [...meta.loyalty_history]
      : [];

    const newRecord: LoyaltyHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `admin_deduct_${Date.now()}`,
      code: claimCode,
      points: -cleanDeduct,
      type: "reward",
      title: reason || "استلام هدية من فرع المحل وخصم النقاط",
      created_at: new Date().toISOString(),
    };

    history.unshift(newRecord);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...meta,
        points: newTotal,
        loyalty_history: history,
      },
    });

    if (updateError) {
      throw new Error("فشل تحديث رصيد الزبونة في قاعدة البيانات");
    }

    return {
      success: true,
      newPoints: newTotal,
      customerName: meta.full_name || meta.name || "",
      claimCode,
    };
  });
}

/** فحص رصيد زبونة بالهاتف من لوحة التحكم */
export async function lookupCustomerPointsByPhone(
  phone: string
): Promise<{ success: boolean; customerName: string; points: number; error?: string }> {
  try {
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const email = `${cleanPhone}@july-store.local`;

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error || !users) {
      throw new Error("فشل الوصول إلى قائمة العملاء");
    }

    const targetUser = users.find((u) => {
      const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      return uPhone === cleanPhone || u.email === email;
    });

    if (!targetUser) {
      return { success: false, customerName: "", points: 0, error: `لا يوجد حساب مسجل برقم: ${phone}` };
    }

    const meta = targetUser.user_metadata || {};
    const points = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    return {
      success: true,
      customerName: meta.full_name || meta.name || "",
      points,
    };
  } catch (err: any) {
    return { success: false, customerName: "", points: 0, error: err.message || "فشل فحص الرصيد" };
  }
}

/** تصفير رصيد عميل بالكامل لـ 0 عند استلام الهدية */
export async function resetCustomerPointsByPhone(
  phone: string,
  reason?: string
): Promise<{ success: boolean; oldPoints: number; newPoints: number; customerName: string; claimCode: string }> {
  return withLock(async () => {
    const cleanPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const email = `${cleanPhone}@july-store.local`;

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error || !users) {
      throw new Error("فشل الوصول إلى قائمة العملاء");
    }

    const targetUser = users.find((u) => {
      const uPhone = (u.user_metadata?.phone || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      return uPhone === cleanPhone || u.email === email;
    });

    if (!targetUser) {
      throw new Error(`لم يتم العثور على حساب مسجل برقم الهاتف: ${phone}`);
    }

    const meta = targetUser.user_metadata || {};
    const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;

    if (currentPoints <= 0) {
      throw new Error(`رصيد الزبونة الحالي هو 0 نقطة بالفعل.`);
    }

    const claimCode = `RESET-${Math.floor(1000 + Math.random() * 9000)}`;
    const history: LoyaltyHistoryItem[] = Array.isArray(meta.loyalty_history)
      ? [...meta.loyalty_history]
      : [];

    const newRecord: LoyaltyHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `reset_${Date.now()}`,
      code: claimCode,
      points: -currentPoints,
      type: "reward",
      title: reason || "استلام هدية وتصفير الرصيد لـ 0",
      created_at: new Date().toISOString(),
    };

    history.unshift(newRecord);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...meta,
        points: 0,
        loyalty_history: history,
      },
    });

    if (updateError) {
      throw new Error("فشل تصفير رصيد الزبونة في قاعدة البيانات");
    }

    return {
      success: true,
      oldPoints: currentPoints,
      newPoints: 0,
      customerName: meta.full_name || meta.name || "",
      claimCode,
    };
  });
}



