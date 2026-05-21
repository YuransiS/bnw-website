"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper function to verify that the calling user is an Admin
async function verifyAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Неавторизовано. Будь ласка, увійдіть.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("403 Доступ заборонено.");
  }

  return user.id;
}

// 1. Create a new user (Admin or Manager)
export async function createUserAction(prevState: any, formData: FormData) {
  try {
    await verifyAdminAccess();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as "admin" | "manager";

    if (!email || !password || !role) {
      return { error: "Будь ласка, заповніть усі обов'язкові поля." };
    }
    if (password.length < 6) {
      return { error: "Пароль має містити не менше 6 символів." };
    }
    if (role !== "admin" && role !== "manager") {
      return { error: "Невірна роль користувача." };
    }

    const supabaseAdmin = createAdminClient();

    // Register user in Supabase auth using superuser Admin API
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

    // Insert profile record with role
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email: email.trim(),
      role: role,
    });

    if (profileError) {
      // Rollback employee auth registration on failure
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: "Помилка створення профілю: " + profileError.message };
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Користувача успішно створено!" };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка на сервері." };
  }
}

// 2. Edit an existing user (Email, Optional Password, Role)
export async function editUserAction(
  profileId: string,
  email: string,
  password?: string,
  role?: "admin" | "manager"
) {
  try {
    const currentUserId = await verifyAdminAccess();

    if (!profileId || !email) {
      return { error: "Ідентифікатор користувача та пошта є обов'язковими." };
    }

    const supabaseAdmin = createAdminClient();

    // Prepare update parameters for Auth API
    const updateParams: { email: string; password?: string } = {
      email: email.trim(),
    };
    if (password && password.trim().length >= 6) {
      updateParams.password = password.trim();
    } else if (password && password.trim().length > 0) {
      return { error: "Новий пароль має містити не менше 6 символів." };
    }

    // Update in Supabase Auth using Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      profileId,
      updateParams
    );

    if (authError) {
      return { error: "Помилка оновлення акаунту: " + authError.message };
    }

    // Prepare update parameters for Profiles table
    const profileParams: { email: string; role?: "admin" | "manager" } = {
      email: email.trim(),
    };
    
    // Prevent self-demoting from admin role to maintain system integrity
    if (role && (role === "admin" || role === "manager")) {
      if (profileId === currentUserId && role !== "admin") {
        return { error: "Ви не можете змінити власну роль з Адміністратора на Менеджера!" };
      }
      profileParams.role = role;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileParams)
      .eq("id", profileId);

    if (profileError) {
      return { error: "Помилка оновлення профілю: " + profileError.message };
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Дані користувача успішно оновлено!" };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка на сервері." };
  }
}

// 3. Delete a user
export async function deleteUserAction(profileId: string) {
  try {
    const currentUserId = await verifyAdminAccess();

    if (profileId === currentUserId) {
      return { error: "Ви не можете видалити власний акаунт!" };
    }

    const supabaseAdmin = createAdminClient();

    // Delete user from Supabase auth which automatically cascades to profiles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(profileId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Користувача видалено." };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка" };
  }
}
