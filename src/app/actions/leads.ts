"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { NotificationService } from "@/lib/notifications";
import { headers } from "next/headers";

export async function getClientCountry() {
  try {
    const headersList = await headers();
    const country = headersList.get("x-vercel-ip-country") || "UA";
    return country;
  } catch (err) {
    console.error("Error getting client country:", err);
    return "UA";
  }
}


interface LeadInput {
  name: string;
  phone: string;
  telegram?: string;
  instagram?: string;
  buttonId: string;
  visitorId: string;
}

export async function createLeadAction(input: LeadInput) {
  try {
    const { name, phone, telegram, instagram, buttonId, visitorId } = input;

    // 1. Server-side validations
    if (!name || !name.trim()) {
      return { error: "Ім'я є обов'язковим для заповнення." };
    }
    if (!phone || !phone.trim()) {
      return { error: "Номер телефону є обов'язковим." };
    }
    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^\+\d{9,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return { error: "Некоректний формат номера телефону. Номер має починатися з '+' та містити від 9 до 15 цифр." };
    }
    if (!telegram?.trim() && !instagram?.trim()) {
      return { error: "Будь ласка, вкажіть хоча б один спосіб зв'язку (Telegram або Instagram)." };
    }

    const supabase = createAdminClient();

    // 2. Perform backend duplicate check (same phone within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLeads, error: checkError } = await supabase
      .from("leads")
      .select("id")
      .eq("phone", phone.trim())
      .gt("created_at", oneDayAgo);

    if (checkError) {
      console.error("[createLeadAction] Error checking duplicates:", checkError);
    } else if (existingLeads && existingLeads.length > 0) {
      return { error: "duplicate_lead" };
    }

    // 3. Perform insert into leads database table
    const { data: leadData, error: dbError } = await supabase
      .from("leads")
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        telegram: telegram?.trim() || null,
        instagram: instagram?.trim() || null,
        button_id: buttonId || "unknown",
        visitor_id: visitorId,
        status: "new",
      })
      .select()
      .single();

    if (dbError) {
      console.error("[createLeadAction] Supabase DB Insert error:", dbError);
      return { error: "Помилка бази даних: " + dbError.message };
    }

    if (!leadData) {
      return { error: "Не вдалося зберегти заявку." };
    }

    // 3. Trigger Notification dispatcher
    // Dashboard polling preparation call (synchronous execution is fine here)
    await NotificationService.sendToDashboard(leadData);

    // Telegram Bot dispatch is awaited to prevent serverless function termination on Vercel before the request completes
    try {
      await NotificationService.sendToTelegram(leadData);
    } catch (tgErr) {
      console.error("[createLeadAction] Telegram trigger caught error:", tgErr);
    }

    return { success: true, lead: leadData };
  } catch (err: any) {
    console.error("[createLeadAction] Critical error registering lead:", err);
    return { error: err.message || "Невідома помилка на сервері." };
  }
}
