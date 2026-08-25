"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isPaidStatus } from "@/lib/statusMapper";

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
      .select("id, name, contract_model, target_currency, traffic_budget_plan, expert_share_percent, fixed_fee_amount, financial_goal_plan_usd, acquiring_fee_percent, cell_id")
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
      .select("name, type, parent_section, is_system")
      .or(`project_id.eq.${projectId},is_system.eq.true`);

    // 1. Fetch Transactions Query Builder
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

    // 2. Fetch Automated Paid Orders from unified_orders
    let ordersQuery = adminSupabase
      .from("unified_orders")
      .select("id, amount, status, order_id, created_at, metadata")
      .eq("project_id", projectId)
      .gt("amount", 0);

    if (startDateStr) {
      ordersQuery = ordersQuery.gte("created_at", startDateStr);
    }
    if (endDateStr) {
      ordersQuery = ordersQuery.lte("created_at", `${endDateStr}T23:59:59.999Z`);
    }

    const { data: dbOrders } = await ordersQuery;

    // 3. Fetch traffic spend from daily_traffic_and_costs
    let trafficQuery = adminSupabase
      .from("daily_traffic_and_costs")
      .select("spend_usd, spend")
      .eq("project_id", projectId);

    if (startDateStr) {
      trafficQuery = trafficQuery.gte("date", startDateStr);
    }
    if (endDateStr) {
      trafficQuery = trafficQuery.lte("date", endDateStr);
    }

    const { data: dbTraffic } = await trafficQuery;
    const totalTrafficFromDbUSD = (dbTraffic || []).reduce((sum: number, t: any) => sum + Number(t.spend_usd || t.spend || 0), 0);

    // Calculate aggregated metrics
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;
    let totalIncomeUAH = 0;
    let totalExpenseUAH = 0;
    const totalTrafficUSD = totalTrafficFromDbUSD;
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
      marketing: totalTrafficFromDbUSD,
      services: 0,
      team: 0,
      commissions: 0,
      other: 0
    };

    const revenueBreakdown = {
      product: 0,
      tripwires: 0,
      club: 0,
      installments: 0,
      other: 0,
      refunds: 0
    };

    // Aggregate automated revenue from unified_orders (with deduplication matching SQL RPC)
    const seenOrderKeys = new Set<string>();
    const deduplicatedOrders = (dbOrders || []).filter((order) => {
      const orderKey = order.order_id ? String(order.order_id).trim() : String(order.id);
      if (seenOrderKeys.has(orderKey)) return false;
      seenOrderKeys.add(orderKey);
      return true;
    });

    deduplicatedOrders.forEach((order) => {
      if (!isPaidStatus(order.status)) return;

      const rawAmount = Number(order.amount || 0);
      if (rawAmount <= 0) return;

      const meta = order.metadata || {};
      const uahAmount = Number(meta.uah_amount || 0);
      const usdAmount = Number(meta.usd_amount || 0);
      const currency = String(
        meta.currency || 
        meta.lead?.currency || 
        meta.raw_row?.currency || 
        (project as any).default_currency || 
        "UAH"
      ).toUpperCase().trim();

      let finalUSD = usdAmount;
      let finalUAH = uahAmount;

      if (!finalUSD && !finalUAH) {
        if (currency === "USD" || currency === "$") {
          finalUSD = rawAmount;
          finalUAH = rawAmount * 41.5;
        } else if (currency === "EUR" || currency === "€") {
          finalUSD = rawAmount * 1.08;
          finalUAH = rawAmount * 44.8;
        } else {
          finalUAH = rawAmount;
          finalUSD = rawAmount / 41.5;
        }
      } else if (!finalUSD && finalUAH) {
        finalUSD = finalUAH / 41.5;
      } else if (finalUSD && !finalUAH) {
        finalUAH = finalUSD * 41.5;
      }

      totalIncomeUSD += finalUSD;
      totalIncomeUAH += finalUAH;

      // Classify category for PnL
      const productInfo = String(
        meta.tariff ||
        meta.product ||
        meta.raw_row?.query ||
        meta.raw_row?.tariff ||
        meta.target_sheet ||
        order.order_id ||
        ""
      ).toLowerCase();

      if (productInfo.includes("клуб") || productInfo.includes("club") || productInfo.includes("renew") || productInfo.includes("підписк")) {
        revenueBreakdown.club += finalUSD;
      } else if (productInfo.includes("трипва") || productInfo.includes("tripwire") || productInfo.includes("міні") || productInfo.includes("mini") || productInfo.includes("допродаж")) {
        revenueBreakdown.tripwires += finalUSD;
      } else if (productInfo.includes("розстроч") || productInfo.includes("рассроч") || productInfo.includes("installment")) {
        revenueBreakdown.installments += finalUSD;
      } else {
        revenueBreakdown.product += finalUSD;
      }
    });

    allTransactions.forEach((tx) => {
      const amount = Number(tx.amount || 0);
      const amountUSD = Number(tx.amount_usd || 0);
      const isUAH = tx.currency === "UAH";

      // Calculate account adjustments (all physical money flow is tracked here)
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
      const cleanCategory = (tx.category || "").toLowerCase().trim();
      const parentSec = tx.parent_section || "";

      if (tx.type === "income") {
        totalIncomeUSD += amountUSD;
        if (isUAH) totalIncomeUAH += amount;
        else totalIncomeUAH += amountUSD * 44;

        if (cleanCategory.includes("дебіторка") || cleanCategory.includes("receivable") || cleanCategory.includes("дебиторка") || cleanCategory.includes("бронь")) {
          totalReceivablesUSD += amountUSD;
          if (isUAH) totalReceivablesUAH += amount;
        }

        if (parentSec === "revenue_product" || cleanCategory.includes("основний курс") || cleanCategory.includes("продукт")) {
          revenueBreakdown.product += amountUSD;
        } else if (parentSec === "revenue_tripwire" || cleanCategory.includes("трипваєр") || cleanCategory.includes("міні-продукт") || cleanCategory.includes("допродаж")) {
          revenueBreakdown.tripwires += amountUSD;
        } else if (parentSec === "revenue_club" || cleanCategory.includes("клуб") || cleanCategory.includes("ltv") || cleanCategory.includes("підписка")) {
          revenueBreakdown.club += amountUSD;
        } else if (parentSec === "revenue_installments" || cleanCategory.includes("рассроч") || cleanCategory.includes("розстроч")) {
          revenueBreakdown.installments += amountUSD;
        } else if (parentSec === "revenue_refunds" || cleanCategory.includes("повернен") || cleanCategory.includes("refund")) {
          revenueBreakdown.refunds += amountUSD;
        } else {
          revenueBreakdown.other += amountUSD;
        }
      } else {
        // This is an expense
        const isPayout = 
          cleanCategory.includes("виплата") || 
          cleanCategory.includes("выплата") || 
          cleanCategory.includes("доля") || 
          cleanCategory.includes("розподіл") || 
          cleanCategory.includes("распредел");

        if (isPayout) {
          // Exclude payouts to expert and producer from operational expenses (OPEX)
          if (cleanCategory.includes("експерт") || cleanCategory.includes("эксперт") || cleanCategory.includes("sony")) {
            totalPaidToExpertUSD += amountUSD;
            if (isUAH) totalPaidToExpertUAH += amount;
          }
        } else {
          // Check if manual traffic cost to ignore it in OPEX (we take it exclusively from Meta ad spend!)
          const isTrafficCategory = 
            parentSec === "opex_marketing" || 
            cleanCategory.includes("трафік") || 
            cleanCategory.includes("реклам") || 
            cleanCategory.includes("traffic") || 
            cleanCategory.includes("ad spend");

          if (!isTrafficCategory) {
            totalExpenseUSD += amountUSD;
            if (isUAH) totalExpenseUAH += amount;
            else totalExpenseUAH += amountUSD * 44;

            if (parentSec === "opex_commissions" || cleanCategory.includes("комісі") || cleanCategory.includes("комисси") || cleanCategory.includes("w4p") || cleanCategory.includes("еквайринг")) {
              opexBreakdown.commissions += amountUSD;
            } else if (parentSec === "opex_services" || cleanCategory.includes("сервіс") || cleanCategory.includes("sendpulse") || cleanCategory.includes("хостинг")) {
              opexBreakdown.services += amountUSD;
            } else if (parentSec === "opex_team" || cleanCategory.includes("команд") || cleanCategory.includes("підряд") || cleanCategory.includes("зп") || cleanCategory.includes("зарплата")) {
              opexBreakdown.team += amountUSD;
            } else {
              opexBreakdown.other += amountUSD;
            }
          }
        }
      }
    });

    // Add Meta Ads traffic spend to total opex and expenses
    totalExpenseUSD += totalTrafficFromDbUSD;
    totalExpenseUAH += totalTrafficFromDbUSD * 44;

    const netRevenueUSD = revenueBreakdown.product + revenueBreakdown.tripwires + revenueBreakdown.club + revenueBreakdown.installments + revenueBreakdown.other - revenueBreakdown.refunds;
    const totalOpExUSD = opexBreakdown.marketing + opexBreakdown.services + opexBreakdown.team + opexBreakdown.commissions + opexBreakdown.other;
    const operatingProfitUSD = netRevenueUSD - totalOpExUSD;
    const operatingProfitUAH = totalIncomeUAH - totalExpenseUAH;
    const marginPercent = totalIncomeUSD > 0 ? (operatingProfitUSD / totalIncomeUSD) * 100 : 0;

    // Monthly Target Goal Math
    const goalPlanUSD = Number(project.financial_goal_plan_usd || project.traffic_budget_plan || 0);
    const goalProgressPercent = goalPlanUSD > 0 ? Math.min((totalIncomeUSD / goalPlanUSD) * 100, 999) : 0;

    // Mathematical Profit Models Calculation
    const contractModel = project.contract_model || "50/50 Profit Split";
    const expertSharePercentage = Number(project.expert_share_percent || (project as any).expert_share_percentage || 50);
    const fixedFeeUSD = Number(project.fixed_fee_amount || 0);

    let expertShareUSD = 0;
    let pcShareUSD = 0;

    if (contractModel.includes("70/30") || contractModel.includes("80/20") || contractModel.includes("gross")) {
      // Model 2: % from Gross Revenue (after acquiring fees), OpEx paid by Expert
      const grossAfterAcquiring = netRevenueUSD - opexBreakdown.commissions;
      expertShareUSD = grossAfterAcquiring * (expertSharePercentage / 100);
      pcShareUSD = grossAfterAcquiring * ((100 - expertSharePercentage) / 100);
    } else if (contractModel.includes("fixed") || contractModel.includes("фикс")) {
      // Model 3: Fixed Fee + Bonus % over Plan target
      const bonusUSD = totalIncomeUSD > goalPlanUSD && goalPlanUSD > 0 ? (totalIncomeUSD - goalPlanUSD) * (expertSharePercentage / 100) : 0;
      expertShareUSD = fixedFeeUSD + bonusUSD;
      pcShareUSD = operatingProfitUSD - expertShareUSD;
    } else {
      // Model 1: 50/50 Net Operating Profit Split
      expertShareUSD = operatingProfitUSD > 0 ? operatingProfitUSD * (expertSharePercentage / 100) : 0;
      pcShareUSD = operatingProfitUSD > 0 ? operatingProfitUSD * ((100 - expertSharePercentage) / 100) : 0;
    }

    const expertShareUAH = expertShareUSD * 44;
    const pcShareUAH = pcShareUSD * 44;
    const remainingExpertUSD = expertShareUSD - totalPaidToExpertUSD;

    // Format list of accounts
    const formattedAccounts = Object.values(accountBalances).map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type || "card",
      currency: acc.currency,
      starting_balance: acc.starting_balance,
      current_balance: Number(acc.current_balance.toFixed(2)),
    }));

    return {
      project,
      summary: {
        totalIncomeUSD: Number(totalIncomeUSD.toFixed(2)),
        totalExpenseUSD: Number(totalExpenseUSD.toFixed(2)),
        netRevenueUSD: Number(netRevenueUSD.toFixed(2)),
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
        goalPlanUSD,
        goalProgressPercent: Number(goalProgressPercent.toFixed(1)),
        trafficBudgetPlan: Number(project.traffic_budget_plan || 0),
      },
      accounts: formattedAccounts,
      categories: {
        custom: customCategories || [],
        default: {
          income: ["Продаж основного курсу", "Продаж трипваєра / міні-продукту", "Клубні підписки (LTV)", "Розстрочка (Банківське поступлення)", "Інший дохід", "Повернення клієнту (Refund)"],
          expense: ["Трафік та Реклама (Ad Spend)", "Сервіси та інфраструктура", "Оплата команди та підрядників", "Банківські комісії та Еквайринг", "Виплата авансу експерту", "Інші операційні витрати"]
        }
      },
      pnl: {
        revenue: {
          product: Number(revenueBreakdown.product.toFixed(2)),
          tripwires: Number(revenueBreakdown.tripwires.toFixed(2)),
          club: Number(revenueBreakdown.club.toFixed(2)),
          installments: Number(revenueBreakdown.installments.toFixed(2)),
          other: Number(revenueBreakdown.other.toFixed(2)),
          refunds: Number(revenueBreakdown.refunds.toFixed(2)),
          totalNetRevenue: Number(netRevenueUSD.toFixed(2))
        },
        opex: {
          marketing: Number(opexBreakdown.marketing.toFixed(2)),
          services: Number(opexBreakdown.services.toFixed(2)),
          team: Number(opexBreakdown.team.toFixed(2)),
          commissions: Number(opexBreakdown.commissions.toFixed(2)),
          other: Number(opexBreakdown.other.toFixed(2)),
          totalOpEx: Number(totalOpExUSD.toFixed(2))
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
  parentSection?: string;
  description?: string;
  accountId: string;
  currency: string;
  amount: number;
  exchangeRate: number;
  acquiringFeeAmount?: number;
}) {
  try {
    const userId = await verifyProjectAccess(payload.projectId, true);
    const adminSupabase = createAdminClient();

    let resolvedAccountId = payload.accountId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedAccountId);

    if (!isUuid) {
      // Extract clean account name e.g. "std_0_Рахунок ФОП" -> "Рахунок ФОП"
      const cleanName = resolvedAccountId.replace(/^std_\d+_/, "").trim() || "Рахунок ФОП";
      
      // Try to find an account with this name for the project
      const { data: existingAcc } = await adminSupabase
        .from("project_accounts")
        .select("id")
        .eq("project_id", payload.projectId)
        .ilike("name", `%${cleanName}%`)
        .limit(1)
        .maybeSingle();

      if (existingAcc) {
        resolvedAccountId = existingAcc.id;
      } else {
        // Create the account and get its UUID
        const { data: newAcc, error: accErr } = await adminSupabase
          .from("project_accounts")
          .insert({
            project_id: payload.projectId,
            name: cleanName,
            currency: payload.currency || "UAH",
            starting_balance: 0
          })
          .select("id")
          .single();

        if (accErr || !newAcc) {
          throw new Error("Не вдалося знайти або створити фінансовий рахунок");
        }
        resolvedAccountId = newAcc.id;
      }
    }

    const amountUSD = Number(payload.amount) * Number(payload.exchangeRate);

    const { error } = await adminSupabase
      .from("financial_transactions")
      .insert({
        project_id: payload.projectId,
        funnel_id: payload.funnelId || null,
        date: payload.date,
        type: payload.type,
        category: payload.category,
        parent_section: payload.parentSection || null,
        description: payload.description || "",
        account_id: resolvedAccountId,
        currency: payload.currency,
        amount: payload.amount,
        exchange_rate: payload.exchangeRate,
        amount_usd: amountUSD,
        acquiring_fee_amount: payload.acquiringFeeAmount || 0,
        created_by: userId,
      });

    if (error) throw new Error(error.message);

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

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return { error: error.message || "Failed to delete record" };
  }
}

// 5. Create Custom Category
export async function createCustomCategoryAction(projectId: string, name: string, type: "income" | "expense", parentSection?: string) {
  try {
    await verifyProjectAccess(projectId, true);
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("project_categories")
      .insert({
        project_id: projectId,
        name: name.trim(),
        type,
        parent_section: parentSection || null,
        is_system: false
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
  financialGoalPlanUSD?: number;
  fixedFeeAmount?: number;
  acquiringFeePercent?: number;
}) {
  try {
    await verifyProjectAccess(projectId, true);
    const adminSupabase = createAdminClient();

    const updatePayload: any = {
      contract_model: settings.contractModel,
      target_currency: settings.targetCurrency,
      traffic_budget_plan: settings.trafficBudgetPlan,
      expert_share_percent: settings.expertSharePercentage,
    };

    if (settings.financialGoalPlanUSD !== undefined) {
      updatePayload.financial_goal_plan_usd = settings.financialGoalPlanUSD;
    }
    if (settings.fixedFeeAmount !== undefined) {
      updatePayload.fixed_fee_amount = settings.fixedFeeAmount;
    }
    if (settings.acquiringFeePercent !== undefined) {
      updatePayload.acquiring_fee_percent = settings.acquiringFeePercent;
    }

    const { error } = await adminSupabase
      .from("projects")
      .update(updatePayload)
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
  type?: string;
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
        type: account.type || "card",
      });

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/project/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating account:", error);
    return { error: error.message || "Failed to create account" };
  }
}

// 8. Generate 1-Click P&L Act Report
export async function generatePnlReportAction(
  projectId: string,
  startDateStr?: string,
  endDateStr?: string
) {
  try {
    const data = await getFinanceSummaryAction(projectId, startDateStr, endDateStr, 1000);
    if ("error" in data) throw new Error(data.error as string);

    return {
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        startDate: startDateStr || "Початок періоду",
        endDate: endDateStr || "Кінець періоду",
        project: data.project,
        summary: data.summary,
        pnl: data.pnl,
        accounts: data.accounts,
        transactionCount: data.transactions.length
      }
    };
  } catch (error: any) {
    console.error("Error generating PnL Report:", error);
    return { error: error.message || "Failed to generate PnL report" };
  }
}
