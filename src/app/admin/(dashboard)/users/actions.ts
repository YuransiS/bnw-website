"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createManagerAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Будь ласка, вкажіть електронну пошту та пароль." };
  }
  if (password.length < 6) {
    return { error: "Пароль має містити не менше 6 символів." };
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Register user in Supabase auth using superuser Admin API
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true,
      });

    if (authError) {
      return { error: "Помилка створення акаунту: " + authError.message };
    }

    if (!authData.user) {
      return { error: "Не вдалося створити акаунт користувача." };
    }

    // 2. Insert profile record with role 'manager'
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email: email.trim(),
      role: "manager",
    });

    if (profileError) {
      // Rollback employee auth registration on failure to maintain db integrity
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: "Помилка створення профілю: " + profileError.message };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка на сервері." };
  }
}
export async function deleteManagerAction(profileId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    // Delete user from Supabase auth which automatically cascades to profiles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(profileId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка" };
  }
}
