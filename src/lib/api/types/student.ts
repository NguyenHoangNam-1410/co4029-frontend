export interface CourseStatus {
  student_id: string;
  course_id: string;
  progress_percent: number;
  final_grade: string | null;
  retention_estimate: number | null;
  review_compliance_rate: number | null;
  at_risk_level: string;
  last_activity_at: string | null;
  last_computed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonProgressSummary {
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percent: number;
  completed_at: string | null;
}

export interface CourseLessonsProgress {
  course_id: string;
  lessons: LessonProgressSummary[];
}

export interface ModuleStatusSummary {
  module_id: string;
  lesson_completion_ratio: number;
  quiz_passed: boolean;
  interview_passed: boolean;
  completed_at: string | null;
}

export interface CourseModulesStatus {
  course_id: string;
  modules: ModuleStatusSummary[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}
