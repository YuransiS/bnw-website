"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper function to verify that the calling user is a Superman (Admin)
async function verifyAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Неавторизовано. Будь ласка, увійдіть.");
  }

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "superman") {
    throw new Error("403 Доступ заборонено.");
  }

  return user.id;
}

// 1. Get all available projects from the DB
export async function getProjectsList() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, slug")
      .order("name");
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Failed to fetch projects list:", err);
    return [];
  }
}

// 2. Get projects assigned to a specific profile
export async function getUserProjects(profileId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profile_projects")
      .select("project_id")
      .eq("profile_id", profileId);

    if (error) throw error;
    return (data || []).map((p) => p.project_id);
  } catch (err) {
    console.error("Failed to fetch user project access:", err);
    return [];
  }
}

// 3. Create a new user (Superman, Operational Producer, Sales)
export async function createUserAction(prevState: any, formData: FormData) {
  try {
    const currentUserId = await verifyAdminAccess();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const fullName = formData.get("fullName") as string;
    const projectIdsJson = formData.get("projectIds") as string;
    const projectIds: string[] = projectIdsJson ? JSON.parse(projectIdsJson) : [];

    if (!email || !password || !role) {
      return { error: "Будь ласка, заповніть усі обов'язкові поля." };
    }
    if (password.length < 6) {
      return { error: "Пароль має містити не менше 6 символів." };
    }

    const allowedRoles = ["admin", "superman", "producer", "rop", "sales", "pending"];
    if (!allowedRoles.includes(role)) {
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

    // Insert profile record with role and full_name
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email: email.trim(),
      role: role,
      full_name: fullName?.trim() || "",
    });

    if (profileError) {
      // Rollback employee auth registration on failure
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: "Помилка створення профілю: " + profileError.message };
    }

    // Assign projects if user is not pending
    if (role !== "pending" && projectIds.length > 0) {
      const inserts = projectIds.map((pId) => ({
        profile_id: authData.user.id,
        project_id: pId,
      }));
      const { error: accessError } = await supabaseAdmin
        .from("profile_projects")
        .insert(inserts);

      if (accessError) {
        console.error("Failed to assign project access inside create:", accessError.message);
      }
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Користувача успішно створено!" };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка на сервері." };
  }
}

// 4. Edit an existing user (Email, Optional Password, Role, Project assignments)
export async function editUserAction(
  profileId: string,
  email: string,
  password?: string,
  role?: string,
  projectIds: string[] = [],
  fullName?: string
) {
  try {
    const currentUserId = await verifyAdminAccess();

    if (!profileId || !email) {
      return { error: "Ідентифікатор користувача та пошта є обов'язковими." };
    }

    const allowedRoles = ["admin", "superman", "producer", "rop", "sales", "pending"];
    if (role && !allowedRoles.includes(role)) {
      return { error: "Невірна роль користувача." };
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
    const profileParams: { email: string; role?: string; full_name?: string } = {
      email: email.trim(),
    };
    
    if (fullName !== undefined) {
      profileParams.full_name = fullName.trim();
    }

    // Prevent self-demoting from admin/superman role to maintain system integrity
    if (role) {
      if (profileId === currentUserId && role !== "admin" && role !== "superman") {
        return { error: "Ви не можете змінити власну роль з Адміністратора!" };
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

    // Sync project access junction table
    // 1. Delete all old assignments
    await supabaseAdmin
      .from("profile_projects")
      .delete()
      .eq("profile_id", profileId);

    // 2. Insert new ones if user is not pending
    if (role !== "pending" && projectIds.length > 0) {
      const inserts = projectIds.map((pId) => ({
        profile_id: profileId,
        project_id: pId,
      }));
      const { error: accessError } = await supabaseAdmin
        .from("profile_projects")
        .insert(inserts);

      if (accessError) {
        return { error: "Помилка призначення проектів: " + accessError.message };
      }
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Дані користувача успішно оновлено!" };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка на сервері." };
  }
}

// 5. Delete a user
export async function deleteUserAction(profileId: string) {
  try {
    const currentUserId = await verifyAdminAccess();

    if (profileId === currentUserId) {
      return { error: "Ви не можете видалити власний акаунт!" };
    }

    const supabaseAdmin = createAdminClient();

    // Delete user from Supabase auth which automatically cascades to profiles and profile_projects
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

// 6. Enable / Disable a project
export async function toggleProjectActiveAction(projectId: string, isActive: boolean) {
  try {
    await verifyAdminAccess();

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("projects")
      .update({ is_active: isActive })
      .eq("id", projectId);

    if (error) throw error;

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true, message: "Статус проекту успішно оновлено!" };
  } catch (err: any) {
    return { error: err.message || "Невідома помилка на сервері." };
  }
}
