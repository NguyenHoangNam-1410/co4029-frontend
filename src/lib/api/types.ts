/**
 * Hand-curated re-exports of generated OpenAPI schemas.
 * Generated source: ./openapi-types.d.ts — regenerate via `npm run codegen:api`.
 */
import type { components, paths } from "./openapi-types";

type Schemas = components["schemas"];

export type Course = Schemas["CoursePublic"];
export type CoursePublic = Schemas["CoursePublic"];
export type CourseAuthoring = Schemas["CourseAuthoring"];
export type CourseCreate = Schemas["CourseCreate"];
export type CourseUpdate = Schemas["CourseUpdate"];
export type CourseContent = Schemas["CourseContentPublic"];
export type CourseContentPublic = Schemas["CourseContentPublic"];
export type CourseProgressSummary = Schemas["CourseProgressSummary"];
export type CourseLearningOutcome = Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomePublic = Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomeAuthoring =
  Schemas["CourseLearningOutcomeAuthoring"];

export type Module = Schemas["ModulePublic"];
export type ModulePublic = Schemas["ModulePublic"];
export type ModuleItem = Schemas["ModuleItemPublic"];
export type ModuleItemPublic = Schemas["ModuleItemPublic"];

export type Tag = Schemas["TagPublic"];
export type TagPublic = Schemas["TagPublic"];

export type InstructorRead = Schemas["InstructorRead"];

export type Lesson = Schemas["LessonPublic"];
export type LessonPublic = Schemas["LessonPublic"];
export type LessonAuthoring = Schemas["LessonAuthoring"];
export type LessonCreate = Schemas["LessonCreate"];
export type LessonUpdate = Schemas["LessonUpdate"];
export type LessonOverviewItem = Schemas["LessonOverviewItem"];
export type LessonProgress = Schemas["LessonProgressPublic"];
export type LessonResource = Schemas["LessonResourcePublic"];
export type LessonResourcePublic = Schemas["LessonResourcePublic"];
export type LessonResourceAuthoring = Schemas["LessonResourceAuthoring"];
export type LessonResourceCreate = Schemas["LessonResourceCreate"];

export type ResourceDownloadUrlResponse = Schemas["ResourceDownloadUrlResponse"];

export type Material = Schemas["MaterialPublic"];
export type MaterialPublic = Schemas["MaterialPublic"];
export type MaterialAuthoring = Schemas["MaterialAuthoring"];
export type MaterialUpdate = Schemas["MaterialUpdate"];
export type MaterialEngagement = Schemas["MaterialEngagementPublic"];
export type MaterialStreamUrl = Schemas["MaterialStreamUrl"];
export type ChunkPreview = Schemas["ChunkPreview"];

export type Quiz = Schemas["QuizPublic"];
export type QuizAuthoring = Schemas["QuizAuthoring"];
export type QuizForTaking = Schemas["QuizForTakingPublic"];
export type QuizForAuthoring = Schemas["QuizForAuthoringPublic"];
export type QuizAttempt = Schemas["QuizAttemptRead"];
export type QuizAttemptStart = Schemas["QuizAttemptStart"];
export type QuizQuestion = Schemas["QuizQuestionPublic"];

export type Enrollment = Schemas["EnrollmentRead"];
export type EnrollmentAuthoring = Schemas["EnrollmentAuthoring"];

export type Notification = Schemas["NotificationRead"];
export type NotificationPreference = Schemas["NotificationPreferenceRead"];
export type NotificationPreferenceRead = Schemas["NotificationPreferenceRead"];
export type NotificationPreferenceUpdate = Schemas["NotificationPreferenceUpdate"];

/**
 * Notification category literals.
 *
 * The OpenAPI schema surfaces `category` as a free-form string, but the
 * backend ships exactly five categories. We pin them as a literal union for
 * exhaustive matrix rendering and Vietnamese-label maps.
 */
export type NotificationCategory =
  | "spaced_repetition"
  | "lesson_unlock"
  | "interview_result"
  | "course_announcement"
  | "system";

export type NotificationChannel = "email" | "in_app";

export type User = Schemas["UserRead"];
export type UserProfile = Schemas["UserProfileRead"];
export type UserProfileUpdate = Schemas["UserProfileUpdate"];
export type UserListRow = Schemas["UserListRow"];
export type UserListPage = Schemas["UserListPage"];
export type MyPermissions = Schemas["UserPermissionsRead"];
export type GoogleLoginResponse = Schemas["GoogleLoginResponse"];
export type TokenResponse = Schemas["TokenResponse"];

export type MfaEnrollResponse = Schemas["MfaEnrollResponse"];
export type MfaChallengeResponse = Schemas["MfaChallengeResponse"];
export type MfaRecoveryCodesResponse = Schemas["MfaRecoveryCodesResponse"];
export type MfaTotpVerifyRequest = Schemas["MfaTotpVerifyRequest"];
export type MfaVerifyRequest = Schemas["MfaVerifyRequest"];

export type OverviewOut = Schemas["OverviewOut"];
export type ActiveUsersOut = Schemas["ActiveUsersOut"];
export type ContentOut = Schemas["ContentOut"];
export type HealthOut = Schemas["HealthOut"];

export type Page<T> = { items: T[]; next_cursor: string | null };
export type Paths = paths;
