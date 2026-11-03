import {
  StudentProfile,
  QuickStat,
  WeeklyGoal,
  TopicProgress,
  ImprovementRecommendation,
} from "./types";

export const mockStudentProfile: StudentProfile = {
  name: "Quý",
  avatarUrl: "/assets/report/student-avatar.png",
  greeting: "Xin chào, Quý",
  subGreetingPrefix: "Hôm nay là một ngày học ",
  subGreetingHighlight: "năng suất!",
};

export const mockQuickStats: QuickStat[] = [
  {
    id: "repos",
    icon: "repo",
    badgeText: "+1 tuần này",
    value: "3",
    label: "Repo đang học",
  },
  {
    id: "hours",
    icon: "clock",
    badgeText: "Top 5%",
    value: "24.5",
    label: "Giờ đã học",
  },
  {
    id: "streak",
    icon: "streak",
    badgeText: "Top 5%",
    value: "14",
    unit: "ngày",
    label: "Ngày liên tiếp",
  },
];

export const mockWeeklyGoal: WeeklyGoal = {
  title: "TIẾN ĐỘ TUẦN NÀY",
  currentHours: "6.5 giờ",
  targetHours: "8.0 giờ",
  percentage: 81,
};

export const mockTodayKnowledge: {
  repoName: string;
  averageScore: number;
  completedSummary: string;
  encouragementTitle: string;
  topics: TopicProgress[];
} = {
  repoName: "REPO: JAVA BACKEND",
  averageScore: 72,
  encouragementTitle: "Bạn đang làm rất tốt!",
  completedSummary: "Đã hoàn thành 2/6 hàm chính trong lộ trình Java Backend.",
  topics: [
    {
      id: "t1",
      title: "Hàm kiểm tra tồn kho",
      score: 100,
      status: "mastered",
    },
    {
      id: "t2",
      title: "Hàm lấy danh sách khách hàng",
      score: 100,
      status: "mastered",
    },
    {
      id: "t3",
      title: "Hàm xử lý mua hàng",
      score: 72,
      status: "review",
    },
    {
      id: "t4",
      title: "Hàm cập nhật thông tin đơn",
      score: 0,
      status: "not_started",
    },
    {
      id: "t5",
      title: "Hàm hủy đơn hàng",
      score: 0,
      status: "not_started",
    },
    {
      id: "t6",
      title: "Hàm xuất hóa đơn VAT",
      score: 0,
      status: "not_started",
    },
  ],
};

export const mockImprovementRecommendations: ImprovementRecommendation[] = [
  {
    id: "imp-1",
    title: "Ôn lại cách gọi xử lý THANH TOÁN TỪ BÊN THỨ BA",
    tag: "QUAN TRỌNG",
    tagVariant: "danger",
  },
  {
    id: "imp-2",
    title: "Ôn lại cách xử dụng HTTP STATUS",
    tag: "NÊN HỌC",
    tagVariant: "warning",
  },
  {
    id: "imp-3",
    title: "Ôn lại cách gọi xử lý TRANSACTION",
    tag: "QUAN TRỌNG",
    tagVariant: "danger",
  },
  {
    id: "imp-4",
    title: "Ôn lại cách gọi xử lý RACE CONDITION",
    tag: "BỔ ÍCH",
    tagVariant: "success",
  },
];
