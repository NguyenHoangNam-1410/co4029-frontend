/**
 * Centralized query-key namespace for TanStack Query.
 *
 * Convention: ['<domain>', '<entity>', ...args]
 *
 * All hooks MUST use these factories — never inline string arrays.
 * See docs/frontend-cutover/qc-conventions.md for full rationale.
 */

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
    permissions: () => ["auth", "permissions"] as const,
  },

  courses: {
    list: (cursor?: string) => ["courses", "list", cursor] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
    bySlug: (slug: string) => ["courses", "by-slug", slug] as const,
    content: (id: string) => ["courses", "content", id] as const,
    modules: (id: string) => ["courses", "modules", id] as const,
  },

  materials: {
    detail: (id: string) => ["materials", "detail", id] as const,
    streamUrl: (id: string) => ["materials", "stream-url", id] as const,
    processing: (id: string) => ["materials", "processing", id] as const,
  },

  notifications: {
    inbox: (cursor?: string) => ["notifications", "inbox", cursor] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },

  sr: {
    cardsDue: (lessonId?: string, cursor?: string) =>
      ["sr", "cards-due", lessonId, cursor] as const,
    lessonSummary: (lessonId: string) =>
      ["sr", "lesson-summary", lessonId] as const,
    courseOverview: (courseId: string) =>
      ["sr", "course-overview", courseId] as const,
  },

  admin: {
    statsOverview: () => ["admin", "stats", "overview"] as const,
    users: (cursor?: string) => ["admin", "users", cursor] as const,
    aiCosts: {
      summary: () => ["admin", "ai-costs", "summary"] as const,
    },
  },

  // --- Stubs for future domains (Wave 1+) ---

  quizzes: {
    list: (courseId: string) => ["quizzes", "list", courseId] as const,
    detail: (id: string) => ["quizzes", "detail", id] as const,
  },

  interviews: {
    list: (cursor?: string) => ["interviews", "list", cursor] as const,
    detail: (id: string) => ["interviews", "detail", id] as const,
  },

  enrollments: {
    list: (cursor?: string) => ["enrollments", "list", cursor] as const,
    detail: (id: string) => ["enrollments", "detail", id] as const,
  },

  progress: {
    course: (courseId: string) => ["progress", "course", courseId] as const,
    lesson: (lessonId: string) => ["progress", "lesson", lessonId] as const,
  },

  careerPaths: {
    list: (cursor?: string) => ["career-paths", "list", cursor] as const,
    detail: (id: string) => ["career-paths", "detail", id] as const,
  },
} as const;
