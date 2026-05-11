export interface MaterialStatus {
  material_id: string;
  current_version_id: string | null;
  processing_status: string | null;
  processing_error: string | null;
  active_job_id: string | null;
  active_job_status: string | null;
}

export interface LearningMaterial {
  id: string;
  lesson_id: string;
  title: string;
  material_type: string;
  ai_processing_enabled: boolean;
  visible_to_students: boolean;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingSummary {
  lesson_id: string;
  materials_total: number;
  versions_total: number;
  pending_versions: number;
  processing_versions: number;
  completed_versions: number;
  failed_versions: number;
}

export interface UploadUrlResponse {
  storage_object: { id: string; object_key: string; bucket: string };
  upload_url: string;
  expires_at: string;
}

export interface LessonRead {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string | null;
  notes_markdown: string | null;
  primary_material_id: string | null;
  lesson_type: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RosterStudent {
  enrollment_id: string;
  student_id: string;
  enrollment_status: string;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  primary_email: string;
  display_name: string;
  progress_percent: number;
  at_risk_level: string;
  last_activity_at: string | null;
  final_grade: string | null;
}

export interface CourseRoster {
  course_id: string;
  students: RosterStudent[];
}

export interface CourseEnrollmentRead {
  id: string;
  course_id: string;
  student_id: string;
  status: string;
  waitlist_position: number | null;
  source: string;
  invitation_code_id: string | null;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  created_at: string;
  updated_at: string;
}

export const LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "quiz", label: "Quiz" },
  { value: "reading", label: "Reading" },
  { value: "exercise", label: "Exercise" },
] as const;
