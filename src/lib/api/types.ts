/**
 * Hand-curated re-exports of generated OpenAPI schemas.
 * Generated source: ./openapi-types.d.ts — regenerate via `bun run codegen:api`.
 */
import type { components, paths } from "./openapi-types";

type Schemas = components["schemas"];

export type Course = Schemas["CoursePublic"];
export type CourseAuthoring = Schemas["CourseAuthoring"];
export type CourseCreate = Schemas["CourseCreate"];
export type CourseUpdate = Schemas["CourseUpdate"];
export type CourseContent = Schemas["CourseContentPublic"];
export type CourseProgressSummary = Schemas["CourseProgressSummary"];
export type CourseLearningOutcome = Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomeAuthoring =
  Schemas["CourseLearningOutcomeAuthoring"];

export type Lesson = Schemas["LessonPublic"];
export type LessonAuthoring = Schemas["LessonAuthoring"];
export type LessonCreate = Schemas["LessonCreate"];
export type LessonUpdate = Schemas["LessonUpdate"];
export type LessonOverviewItem = Schemas["LessonOverviewItem"];
export type LessonProgress = Schemas["LessonProgressPublic"];
export type LessonResource = Schemas["LessonResourcePublic"];
export type LessonResourceAuthoring = Schemas["LessonResourceAuthoring"];
export type LessonResourceCreate = Schemas["LessonResourceCreate"];

export type Material = Schemas["MaterialPublic"];
export type MaterialAuthoring = Schemas["MaterialAuthoring"];
export type MaterialUpdate = Schemas["MaterialUpdate"];
export type MaterialEngagement = Schemas["MaterialEngagementPublic"];
export type MaterialStreamUrl = Schemas["MaterialStreamUrl"];

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

export type User = Schemas["UserRead"];
export type UserProfile = Schemas["UserProfileRead"];
export type UserListRow = Schemas["UserListRow"];

export type Page<T> = { items: T[]; next_cursor: string | null };
export type Paths = paths;
