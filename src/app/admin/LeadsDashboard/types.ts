export interface ProjectLanding {
  label: string;
  url: string;
  badgeColor: string;
  type: "paid" | "free";
}

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  telegram: string;
  email: string;
  status: string;
  page_path?: string;
  page_url?: string;
  touchCount: number;
  usdPaid: number;
  uahPaid: number;
  eurPaid: number;
  usdTripwirePaid: number;
  uahTripwirePaid: number;
  eurTripwirePaid: number;
  usdAttempted: number;
  uahAttempted: number;
  eurAttempted: number;
  usdCourseCount: number;
  uahCourseCount: number;
  eurCourseCount: number;
  usdTripwireCount: number;
  uahTripwireCount: number;
  eurTripwireCount: number;
  diagnosticsComment?: string;
  diagnostics_comment?: string;
  managerComment?: string;
  manager_comment?: string;
  assignedManagerId?: string | null;
  assigned_manager_id?: string | null;
  assigned_manager_name?: string;
  utmSource?: string;
  utm_source?: string;
  utmMedium?: string;
  utm_medium?: string;
  utmCampaign?: string;
  utm_campaign?: string;
  utmContent?: string;
  utm_content?: string;
  utmTerm?: string;
  utm_term?: string;
  targetSheet?: string;
  isUnpaidIntent?: boolean;
  visitedLandings?: string[];
  isMultiSource?: boolean;
  createdAt: string;
  visitor_uuid?: string | null;
  customerId?: string | null;
  history?: any[];
  metadata?: any;
}

export interface ProjectStats {
  totalLeads: number;
  totalClicks: number;
  totalSpend: number;
  totalApplications: number;
  conversionRate: number;
  cpl: number;
  usdRevenue: number;
  uahRevenue: number;
  eurRevenue: number;
  usdCourseRevenue: number;
  uahCourseRevenue: number;
  eurCourseRevenue: number;
  usdTripwireRevenue: number;
  uahTripwireRevenue: number;
  eurTripwireRevenue: number;
  netProfitUsd: number;
  roi: number;
  totalSales: number;
  paidLeadsCount: number;
  paidTripwiresCount: number;
  leadToSaleConv: number;
  leadToSaleConvUsd: number;
  leadToSaleConvUah: number;
  leadToSaleConvEur: number;
  aovUsd: number;
  aovUah: number;
  aovEur: number;
}

export interface DashboardData {
  viewType: "all" | "single" | "none";
  role: string;
  allowedProjects: any[];
  activeSlug: string;
  activeProject?: any;
  summary?: any[];
  campaigns?: any[];
  unresolvedOrders: any[];
  leads?: LeadItem[];
  totalCount?: number;
  stats?: ProjectStats;
  splineTrendData?: any[];
  utmAttributionTree?: any[];
  diagnosticsIssues?: {
    nameless: any[];
    unmatchedUrls: any[];
    currencyErrors: any[];
  };
  uniqueSources?: string[];
  salesManagers?: any[];
  filters?: {
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
    touchCountFilter: string;
    sourceFilter: string;
    unpaidIntentOnly: boolean;
    startDate: string;
    endDate: string;
    selectedLanding: string;
  };
  dataHealth?: {
    leadsWithoutUuidCount: number;
    ordersWithAmountAndClickStatusCount: number;
    unparseableMetadataDatesCount: number;
  };
  performance?: {
    dbFetchMs: number;
    dbRpcMs: number;
    jsClusteringMs: number;
    cacheRebuildMs: number;
    payloadSizeKb: number;
  };
}
