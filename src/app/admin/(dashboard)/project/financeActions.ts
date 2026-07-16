"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Verify User Access Helper
async function verifyProjectAccess(projectId: string, writeRequired: boolean = false) {
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Unauthorized");

  const isSupervisor = ["admin", "superman", "founder", "developer"].includes(profile.role);
  if (isSupervisor) return user.id;

  // For non-supervisors, check project assignment mapping
  const { data: mapping } = await supabase
    .from("profile_projects")
    .select("project_id")
    .eq("profile_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!mapping) {
    // If not direct, check cell leadership
    const { data: cellProjects } = await supabase
      .from("projects")
      .select("cell_id, cells(cell_leader_id)")
      .eq("id", projectId)
      .single();

    const cellLeaderId = (cellProjects as any)?.cells?.cell_leader_id;
    if (cellLeaderId !== user.id || writeRequired) {
      throw new Error("Access Denied");
    }
  }

  return user.id;
}

// 2. Fetch Finance Summary & P&L Statistics
export async function getFinanceSummaryAction(
  projectId: string,
  startDateStr?: string,
  endDateStr?: string,
  limit: number = 20
) {
  try {
    const userId = await verifyProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    // Fetch Project baseline configurations
    const { data: project, error: projErr } = await adminSupabase
      .from("projects")
      .select("id, name, contract_model, target_currency, traffic_budget_plan, expert_share_percentage, cell_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) throw new Error("Project settings not found");

    // Fetch Accounts
    const { data: accounts } = await adminSupabase
      .from("project_accounts")
      .select("*")
      .eq("project_id", projectId)
      .order("name", { ascending: true });

    // Fetch Custom Categories
    const { data: customCategories } = await adminSupabase
      .from("project_categories")
      .select("name, type")
      .eq("project_id", projectId);

    // Fetch Transactions Query Builder
    let query = adminSupabase
      .from("financial_transactions")
      .select("*")
      .eq("project_id", projectId);

    if (startDateStr) {
      query = query.gte("date", startDateStr);
    }
    if (endDateStr) {
      query = query.lte("date", endDateStr);
    }

    const { data: allTransactions, error: txErr } = await query.order("date", { ascending: false }).order("created_at", { ascending: false });
    if (txErr || !allTransactions) throw new Error("Failed to fetch transactions");

    // Calculate aggregated metrics
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;
    let totalIncomeUAH = 0;
    let totalExpenseUAH = 0;
    let totalTrafficUSD = 0;
    let totalPaidToExpertUSD = 0;
    let totalPaidToExpertUAH = 0;
    let totalReceivablesUSD = 0;
    let totalReceivablesUAH = 0;

    // Accounts balance trackers
    const accountBalances = (accounts || []).reduce((acc: any, curr: any) => {
      acc[curr.id] = {
        ...curr,
        inflow: 0,
        outflow: 0,
        current_balance: Number(curr.starting_balance || 0),
      };
      return acc;
    }, {});

    // P&L item arrays
    const opexBreakdown = {
      traffic: 0,
      commissions: 0,
      services: 0,
      team: 0,
      other: 0
    };

    const revenueBreakdown = {
      product: 0,
      upsells: 0,
      installments: 0,
      other: 0,
      refunds: 0
    };

    allTransactions.forEach((tx) => {
      const amount = Number(tx.amount || 0);
      const amountUSD = Number(tx.amount_usd || 0);
      const isUAH = tx.currency === "UAH";

      // Calculate account adjustments
      if (accountBalances[tx.account_id]) {
        if (tx.type === "income") {
          accountBalances[tx.account_id].inflow += amountUSD;
          accountBalances[tx.account_id].current_balance += amount;
        } else {
          accountBalances[tx.account_id].outflow += amountUSD;
          accountBalances[tx.account_id].current_balance -= amount;
        }
      }

      // Group by categories
      const cleanCategory = tx.category.toLowerCase().trim();

      if (tx.type === "income") {
        totalIncomeUSD += amountUSD;
        if (isUAH) totalIncomeUAH += amount;
        else totalIncomeUAH += amountUSD * 44; // Fallback conversion for visual UAH summary

        if (cleanCategory.includes("дебіторка") || cleanCategory.includes("receivable") || cleanCategory.includes("дебиторка")) {
          totalReceivablesUSD += amountUSD;
          if (isUAH) totalReceivablesUAH += amount;
        } else if (cleanCategory.includes("допродаж") || cleanCategory.includes("upsell")) {
          revenueBreakdown.upsells += amountUSD;
        } else if (cleanCategory.includes("розстроч") || cleanCategory.includes("installment")) {
          revenueBreakdown.installments += amountUSD;
        } else if (cleanCategory.includes("продукт")) {
          revenueBreakdown.product += amountUSD;
        } else {
          revenueBreakdown.other += amountUSD;
        }
      } else {
        totalExpenseUSD += amountUSD;
        if (isUAH) totalExpenseUAH += amount;
        else totalExpenseUAH += amountUSD * 44;

        if (cleanCategory.includes("трафік") || cleanCategory.includes("реклам") || cleanCategory.includes("traffic")) {
          totalTrafficUSD += amountUSD;
          opexBreakdown.traffic += amountUSD;
        } else if (cleanCategory.includes("комісі") || cleanCategory.includes("комисси") || cleanCategory.includes("w4p")) {
          opexBreakdown.commissions += amountUSD;
        } else if (cleanCategory.includes("сервіс") || cleanCategory.includes("sendpulse")) {
          opexBreakdown.services += amountUSD;
        } else if (cleanCategory.includes("команд") || cleanCategory.includes("підряд") || cleanCategory.includes("зп")) {
          opexBreakdown.team += amountUSD;
        } else if (cleanCategory.includes("виплата експерту") || cleanCategory.includes("доля експерта")) {
          totalPaidToExpertUSD += amountUSD;
          if (isUAH) totalPaidToExpertUAH += amount;
        } else if (cleanCategory.includes("повернен") || cleanCategory.includes("refund")) {
          revenueBreakdown.refunds += amountUSD;
        } else {
          opexBreakdown.other += amountUSD;
        }
      }
    });

    const operatingProfitUSD = totalIncomeUSD - totalExpenseUSD;
    const operatingProfitUAH = totalIncomeUAH - totalExpenseUAH;
    const marginPercent = totalIncomeUSD > 0 ? (operatingProfitUSD / totalIncomeUSD) * 100 : 0;

    // Split calculations
    const expertSharePercentage = Number(project.expert_share_percentage || 50);
    const expertShareUSD = operatingProfitUSD * (expertSharePercentage / 100);
    const expertShareUAH = operatingProfitUAH * (expertSharePercentage / 100);
    const pcShareUSD = operatingProfitUSD * ((100 - expertSharePercentage) / 100);
    const pcShareUAH = operatingProfitUAH * ((100 - expertSharePercentage) / 100);

    const remainingExpertUSD = expertShareUSD - totalPaidToExpertUSD;

    // Format list of accounts
    const formattedAccounts = Object.values(accountBalances).map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      starting_balance: acc.starting_balance,
      current_balance: Number(acc.current_balance.toFixed(2)),
    }));

    return {
      project,
      summary: {
        totalIncomeUSD: Number(totalIncomeUSD.toFixed(2)),
        totalExpenseUSD: Number(totalExpenseUSD.toFixed(2)),
        operatingProfitUSD: Number(operatingProfitUSD.toFixed(2)),
        totalIncomeUAH: Number(totalIncomeUAH.toFixed(2)),
        totalExpenseUAH: Number(totalExpenseUAH.toFixed(2)),
        operatingProfitUAH: Number(operatingProfitUAH.toFixed(2)),
        marginPercent: Number(marginPercent.toFixed(1)),
        receivablesUSD: Number(totalReceivablesUSD.toFixed(2)),
        receivablesUAH: Number(totalReceivablesUAH.toFixed(2)),
        expertShareUSD: Number(expertShareUSD.toFixed(2)),
        expertShareUAH: Number(expertShareUAH.toFixed(2)),
        pcShareUSD: Number(pcShareUSD.toFixed(2)),
        pcShareUAH: Number(pcShareUAH.toFixed(2)),
        totalPaidToExpertUSD: Number(totalPaidToExpertUSD.toFixed(2)),
        remainingExpertUSD: Number(remainingExpertUSD.toFixed(2)),
        totalTrafficUSD: Number(totalTrafficUSD.toFixed(2)),
        trafficBudgetPlan: Number(project.traffic_budget_plan || 0),
      },
      accounts: formattedAccounts,
      categories: {
        custom: customCategories || [],
        default: {
          income: ["Продаж продукту", "Доплата", "Дебіторка", "Інше"],
          expense: ["Трафік / Реклама", "Команда / Підряд", "Сервіси", "Комісія платёжных систем", "Прочі витрати"]
        }
      },
      pnl: {
        revenue: {
          product: Number(revenueBreakdown.product.toFixed(2)),
          upsells: Number(revenueBreakdown.upsells.toFixed(2)),
          installments: Number(revenueBreakdown.installments.toFixed(2)),
          other: Number(revenueBreakdown.other.toFixed(2)),
          refunds: Number(revenueBreakdown.refunds.toFixed(2)),
        },
        opex: {
          traffic: Number(opexBreakdown.traffic.toFixed(2)),
          commissions: Number(opexBreakdown.commissions.toFixed(2)),
          services: Number(opexBreakdown.services.toFixed(2)),
          team: Number(opexBreakdown.team.toFixed(2)),
          other: Number(opexBreakdown.other.toFixed(2)),
        }
      },
      transactions: allTransactions.slice(0, limit),
      hasMore: allTransactions.length > limit,
    };
  } catch (error: any) {
    console.error("Error fetching financial data:", error);
    return { error: error.message || "Failed to load financial records" };
  }
}

// 3. Create Transaction
export async function createTransactionAction(payload: {
  projectId: string;
  funnelId?: string | null;
  date: string;
  type: "income" | "expense";
  category: string;
  description?: string;
  accountId: string;
  currency: string;
  amount: number;
  exchangeRate: number;
}) {
  try {
    const userId = await verifyProjectAccess(payload.projectId, true);
    const adminSupabase = createAdminClient();

    const amountUSD = Number(payload.amount) * Number(payload.exchangeRate);

    const { error } = await adminSupabase
      .from("financial_transactions")
      .insert({
        project_id: payload.projectId,
        funnel_id: payload.funnelId || null,
        date: payload.date,
        type: payload.type,
        category: payload.category,
        description: payload.description || "",
        account_id: payload.accountId,
        currency: payload.currency,
        amount: payload.amount,
        exchange_rate: payload.exchangeRate,
        amount_usd: amountUSD,
        created_by: userId,
      });

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/project/${payload.projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating financial transaction:", error);
    return { error: error.message || "Failed to record transaction" };
  }
}

// 4. Delete Transaction
export async function deleteTransactionAction(projectId: string, transactionId: string) {
  try {
    await verifyProjectAccess(projectId, true);
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("financial_transactions")
      .delete()
      .eq("id", transactionId)
      .eq("project_id", projectId);

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/project/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return { error: error.message || "Failed to delete record" };
  }
}

// 5. Create Custom Category
export async function createCustomCategoryAction(projectId: string, name: string, type: "income" | "expense") {
  try {
    await verifyProjectAccess(projectId, true);
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("project_categories")
      .insert({
        project_id: projectId,
        name: name.trim(),
        type,
      });

    if (error && !error.message.includes("unique_violation")) {
      throw new Error(error.message);
    }

    revalidatePath(`/admin/project/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating custom category:", error);
    return { error: error.message || "Failed to save category" };
  }
}

// 6. Save Project Financial Baseline Settings
export async function saveFinanceSettingsAction(projectId: string, settings: {
  contractModel: string;
  targetCurrency: string;
  trafficBudgetPlan: number;
  expertSharePercentage: number;
}) {
  try {
    await verifyProjectAccess(projectId, true);
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("projects")
      .update({
        contract_model: settings.contractModel,
        target_currency: settings.targetCurrency,
        traffic_budget_plan: settings.trafficBudgetPlan,
        expert_share_percentage: settings.expertSharePercentage,
      })
      .eq("id", projectId);

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/project/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return { error: error.message || "Failed to save settings" };
  }
}

// 7. Add Account Action
export async function createAccountAction(projectId: string, account: {
  name: string;
  currency: string;
  startingBalance: number;
}) {
  try {
    await verifyProjectAccess(projectId, true);
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("project_accounts")
      .insert({
        project_id: projectId,
        name: account.name.trim(),
        currency: account.currency,
        starting_balance: account.startingBalance,
      });

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/project/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating account:", error);
    return { error: error.message || "Failed to create account" };
  }
}
