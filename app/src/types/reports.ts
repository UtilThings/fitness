export type ReportKind = 'occupancy' | 'attendance' | 'revenue' | 'retention';
export type GroupBy = 'day' | 'week' | 'month';
export type ReportPreset = '7d' | '30d' | 'this-month' | 'last-month';
export type ReportDates = { from: string; to: string };

type ReportRange = ReportDates & {
  timezone: 'America/New_York';
  start_utc: string;
  end_utc: string;
};
type OccupancyCounts = {
  sessions: number;
  capacity: number;
  booked: number;
  occupancy_rate: number;
};
type AttendanceCounts = {
  booked: number;
  attended: number;
  no_show: number;
  late_cancelled: number;
  cancelled: number;
  no_show_rate: number;
  attendance_rate: number;
};
type RevenueCounts = {
  paid_cents: number;
  pending_cents: number;
  void_cents: number;
  payments: number;
};
type RetentionCounts = {
  active_start: number;
  new: number;
  churned: number;
  active_end: number;
  churn_rate: number;
  retention_rate: number;
};
type ByService<T> = T & { service: string; name: string };
type ByPlan<T> = T & { plan: string; name: string };

export type ReportPayload = {
  occupancy: {
    totals: OccupancyCounts;
    by_service: ByService<OccupancyCounts>[];
    by_class: (Omit<OccupancyCounts, 'sessions'> & {
      session_id: string;
      starts_at: string;
      local_date: string;
      local_time: string;
      service: string;
      coach_name: string;
      waitlisted: number;
    })[];
  };
  attendance: {
    totals: AttendanceCounts;
    by_service: ByService<AttendanceCounts>[];
    by_day: (AttendanceCounts & { day: string })[];
  };
  revenue: {
    totals: RevenueCounts;
    by_plan: ByPlan<RevenueCounts>[];
    by_service: ByService<RevenueCounts>[];
    by_period: (Pick<RevenueCounts, 'paid_cents' | 'payments'> & {
      period: string;
    })[];
  };
  retention: {
    totals: RetentionCounts;
    by_plan: ByPlan<RetentionCounts>[];
    by_period: (Pick<RetentionCounts, 'new' | 'churned' | 'active_end'> & {
      period: string;
    })[];
  };
};
export type ReportResponse<K extends ReportKind> = ReportPayload[K] & {
  range: ReportRange;
};
