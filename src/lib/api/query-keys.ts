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
    myList: (cursor?: string) => ["courses", "my", cursor] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
    bySlug: (slug: string) => ["courses", "by-slug", slug] as const,
    content: (id: string) => ["courses", "content", id] as const,
    tags: (id: string) => ["courses", "tags", id] as const,
    outcomes: (id: string) => ["courses", "outcomes", id] as const,
    modules: (id: string) => ["courses", "modules", id] as const,
    moduleDetail: (id: string) => ["courses", "module-detail", id] as const,
    moduleItems: (id: string) => ["courses", "module-items", id] as const,
    moduleLessons: (id: string) => ["courses", "module-lessons", id] as const,
    lesson: (id: string) => ["courses", "lesson", id] as const,
    lessonResources: (id: string) => ["courses", "lesson-resources", id] as const,
    resourceDownload: (id: string) =>
      ["courses", "resource-download", id] as const,
  },

  materials: {
    detail: (id: string) => ["materials", "detail", id] as const,
    streamUrl: (id: string) => ["materials", "stream-url", id] as const,
    chunksPreview: (id: string, limit?: number) =>
      ["materials", "chunks-preview", id, limit] as const,
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
    activeUsers: () => ["admin", "stats", "active-users"] as const,
    content: () => ["admin", "stats", "content"] as const,
    statsHealth: (since: string) =>
      ["admin", "stats", "health", since] as const,
    users: (cursor?: string) => ["admin", "users", cursor] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    courses: (includeDeleted?: boolean, cursor?: string) =>
      ["admin", "courses", includeDeleted ?? true, cursor] as const,
    courseAudit: (courseId: string) =>
      ["admin", "courses", courseId, "audit"] as const,
    courseProcessing: (courseId: string, limit?: number) =>
      ["admin", "courses", courseId, "processing", limit] as const,
    courseStats: () => ["admin", "courses", "stats"] as const,
    processingQueue: () => ["admin", "processing", "queue"] as const,
    processingJobs: (status?: string) =>
      ["admin", "processing", "jobs", status] as const,
    processingJob: (jobId: string) =>
      ["admin", "processing", "jobs", "detail", jobId] as const,
    aiCosts: {
      summary: () => ["admin", "ai-costs", "summary"] as const,
    },
  },

  dept: {
    courses: () => ["dept", "courses"] as const,
    teachers: (courseId: string) =>
      ["dept", "courses", courseId, "teachers"] as const,
    roster: (courseId: string) =>
      ["dept", "courses", courseId, "roster"] as const,
    orgUnitCourses: (orgUnitId: string) =>
      ["dept", "org-units", orgUnitId, "courses"] as const,
  },

  infra: {
    healthz: () => ["infra", "healthz"] as const,
    readyz: () => ["infra", "readyz"] as const,
  },

  // --- Stubs for future domains (Wave 1+) ---

  quizzes: {
    list: (courseId: string) => ["quizzes", "list", courseId] as const,
    detail: (id: string) => ["quizzes", "detail", id] as const,
    attempt: (attemptId: string) => ["quizzes", "attempt", attemptId] as const,
    myAttempts: (quizId: string) =>
      ["quizzes", "my-attempts", quizId] as const,
  },

  interviews: {
    list: (cursor?: string) => ["interviews", "list", cursor] as const,
    detail: (id: string) => ["interviews", "detail", id] as const,
    session: (sessionId: string) =>
      ["interviews", "session", sessionId] as const,
    mySessions: () => ["interviews", "my-sessions"] as const,
    gapReport: (sessionId: string) =>
      ["interviews", "gap-report", sessionId] as const,
  },

  enrollments: {
    list: (courseId: string) => ["enrollments", "list", courseId] as const,
    invitationCodes: (courseId: string) =>
      ["enrollments", "invitation-codes", courseId] as const,
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
