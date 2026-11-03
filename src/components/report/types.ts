export interface StudentProfile {
  name: string;
  avatarUrl: string;
  greeting: string;
  subGreetingPrefix: string;
  subGreetingHighlight: string;
}

export interface QuickStat {
  id: string;
  icon: "repo" | "clock" | "streak";
  badgeText: string;
  value: string | number;
  unit?: string;
  label: string;
}

export interface WeeklyGoal {
  title: string;
  currentHours: string;
  targetHours: string;
  percentage: number;
}

export interface TopicProgress {
  id: string;
  title: string;
  score: number;
  status: "mastered" | "review" | "not_started";
}

export interface ImprovementRecommendation {
  id: string;
  title: string;
  tag: string;
  tagVariant: "danger" | "warning" | "success";
}
