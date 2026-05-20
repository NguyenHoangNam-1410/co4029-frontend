import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  Outlet,
} from "@tanstack/react-router";

import { getStoredAuthSession } from "@/lib/auth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "sonner";

import LandingPage from "@/routes/landing";
import LoginPage from "@/routes/login";
import AuthenticatedLayout from "@/routes/authenticated-layout";
import DashboardPage from "@/routes/dashboard";
import GoogleCallbackPage from "@/routes/google-callback";
import CoursesListPage from "@/routes/courses-list";
import CourseDetailPage from "@/routes/course-detail";
import CourseLearnPage from "@/routes/course-learn";
import CourseQuizPage from "@/routes/course-quiz";
import NotificationsPage from "@/routes/notifications";
import SettingsNotificationsPage from "@/routes/settings-notifications";
import LoginMfaPage from "@/routes/login-mfa";
import SettingsProfilePage from "@/routes/settings-profile";
import SettingsSecurityPage from "@/routes/settings-security";
import { ProgressPage, SettingsPage, InterviewPage } from "@/routes/placeholder";
import CareerPathsPage from "@/routes/career-paths";
import CareerPathDetailPage from "@/routes/career-path-detail";
import MyCareerPathsPage from "@/routes/me-career-paths";
import SrDashboardPage from "@/routes/sr-dashboard";
import StudyCardsDuePage from "@/routes/study-cards-due";

/* ── Root layout ── */
function Root() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

/* ── Route definitions ── */
const rootRoute = createRootRoute({ component: Root });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: LoginPage,
});

const loginMfaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login/mfa",
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: LoginMfaPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ location }) => {
    const session = getStoredAuthSession();

    if (!session) {
      const next = location.pathname.startsWith("/login")
        ? new URLSearchParams(location.search).get("next") ?? undefined
        : location.href;

      throw redirect({
        to: "/login",
        search: { next },
        replace: true,
      });
    }
  },
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const coursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses",
  component: CoursesListPage,
});

const courseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug",
  component: CourseDetailPage,
});

const courseLearnRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/learn",
  component: CourseLearnPage,
});

const courseQuizRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/quiz/$quizId",
  component: CourseQuizPage,
});

const courseInterviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/interview/$moduleId",
  component: InterviewPage,
});

const progressRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/progress",
  component: ProgressPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings",
  component: SettingsPage,
});

const settingsNotificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/notifications",
  component: SettingsNotificationsPage,
});

const settingsProfileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/profile",
  component: SettingsProfilePage,
});

const settingsSecurityRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/security",
  component: SettingsSecurityPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const teacherRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher",
  component: lazyRouteComponent(() => import("@/routes/teacher/index")),
});

const teacherCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses",
  component: lazyRouteComponent(() => import("@/routes/teacher/courses")),
});

const teacherCourseNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/new",
  component: lazyRouteComponent(() => import("@/routes/teacher/course-new")),
});

const teacherCourseManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId",
  component: lazyRouteComponent(() => import("@/routes/teacher/course-manage")),
});

const teacherLessonManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/lessons/$lessonId",
  component: lazyRouteComponent(() => import("@/routes/teacher/lesson-manage")),
});

const teacherLessonMaterialsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/lessons/$lessonId/materials",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/lesson-materials"),
  ),
});

const teacherModuleManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/modules/$moduleId",
  component: lazyRouteComponent(() => import("@/routes/teacher/module-manage")),
});

const teacherQuizManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/quizzes/$quizId",
  component: lazyRouteComponent(() => import("@/routes/teacher/quiz-manage")),
});

const teacherInterviewConfigNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/interview-configs/new",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/interview-config-new"),
  ),
});

const teacherInterviewConfigRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/interview-configs/$configId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/interview-config"),
  ),
});

const teacherInterviewGapReportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/interview-sessions/$sessionId/gap-report",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/interview-gap-report"),
  ),
});

const teacherCourseStudentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/course-students"),
  ),
});

const teacherCourseStudentDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students/$studentId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/course-student-detail"),
  ),
});

const adminHealthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/health",
  component: lazyRouteComponent(() => import("@/routes/admin/health")),
});

const adminStatsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats",
  component: lazyRouteComponent(() => import("@/routes/admin/stats")),
});

const adminStatsActiveRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/active",
  component: lazyRouteComponent(() => import("@/routes/admin/stats-active")),
});

const adminStatsContentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/content",
  component: lazyRouteComponent(() => import("@/routes/admin/stats-content")),
});

const adminStatsHealthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/health",
  component: lazyRouteComponent(() => import("@/routes/admin/stats-health")),
});

const adminUsersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users",
  component: lazyRouteComponent(() => import("@/routes/admin/users")),
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users/$userId",
  component: lazyRouteComponent(() => import("@/routes/admin/user-detail")),
});

const adminCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/courses",
  component: lazyRouteComponent(() => import("@/routes/admin/courses")),
});

const adminCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/courses/$courseId",
  component: lazyRouteComponent(() => import("@/routes/admin/course-detail")),
});

const adminProcessingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/processing",
  component: lazyRouteComponent(() => import("@/routes/admin/processing")),
});

const adminProcessingJobRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/processing/$jobId",
  component: lazyRouteComponent(
    () => import("@/routes/admin/processing-job"),
  ),
});

const adminAiCostsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/ai-costs",
  component: lazyRouteComponent(() => import("@/routes/admin/ai-costs")),
});

const deptCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept",
  component: lazyRouteComponent(() => import("@/routes/dept-courses")),
});

const deptCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept/courses/$courseId",
  component: lazyRouteComponent(() => import("@/routes/dept-course-detail")),
});

const managementCourseEnrollmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/courses/$courseId/enrollments",
  component: lazyRouteComponent(
    () => import("@/routes/management-course-enrollments"),
  ),
});

const careerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/career-paths",
  component: CareerPathsPage,
});

const careerPathDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/career-paths/$slug",
  component: CareerPathDetailPage,
});

const myCareerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/me/career-paths",
  component: MyCareerPathsPage,
});

const managementCareerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths",
  component: lazyRouteComponent(
    () => import("@/routes/management-career-paths"),
  ),
});

const managementCareerPathDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths/$id",
  component: lazyRouteComponent(
    () => import("@/routes/management-career-path-detail"),
  ),
});

const srDashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard/sr",
  component: SrDashboardPage,
});

const studyCardsDueRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/study/cards-due",
  component: StudyCardsDuePage,
});

const teacherSrCohortRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/sr-cohort",
  component: lazyRouteComponent(() => import("@/routes/teacher/sr-cohort")),
});

const teacherSrAtRiskRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/at-risk",
  component: lazyRouteComponent(() => import("@/routes/teacher/sr-at-risk")),
});

const teacherSrStudentDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students/$studentId/sr",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/sr-student-detail"),
  ),
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/google/callback",
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : null,
    state: typeof search.state === "string" ? search.state : null,
    error: typeof search.error === "string" ? search.error : null,
  }),
  component: GoogleCallbackPage,
});

/* ── Route tree ── */
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  loginMfaRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    coursesRoute,
    courseDetailRoute,
    courseLearnRoute,
    courseQuizRoute,
    courseInterviewRoute,
    progressRoute,
    settingsRoute,
    settingsNotificationsRoute,
    settingsProfileRoute,
    settingsSecurityRoute,
    notificationsRoute,
    teacherRoute,
    teacherCoursesRoute,
    teacherCourseNewRoute,
    teacherCourseManageRoute,
    teacherLessonManageRoute,
    teacherLessonMaterialsRoute,
    teacherModuleManageRoute,
    teacherQuizManageRoute,
    teacherInterviewConfigNewRoute,
    teacherInterviewConfigRoute,
    teacherInterviewGapReportRoute,
    teacherCourseStudentsRoute,
    teacherCourseStudentDetailRoute,
    adminHealthRoute,
    adminStatsRoute,
    adminStatsActiveRoute,
    adminStatsContentRoute,
    adminStatsHealthRoute,
    adminUsersRoute,
    adminUserDetailRoute,
    adminCoursesRoute,
    adminCourseDetailRoute,
    adminProcessingRoute,
    adminProcessingJobRoute,
    adminAiCostsRoute,
    deptCoursesRoute,
    deptCourseDetailRoute,
    managementCourseEnrollmentsRoute,
    careerPathsRoute,
    careerPathDetailRoute,
    myCareerPathsRoute,
    managementCareerPathsRoute,
    managementCareerPathDetailRoute,
    srDashboardRoute,
    studyCardsDueRoute,
    teacherSrCohortRoute,
    teacherSrAtRiskRoute,
    teacherSrStudentDetailRoute,
  ]),
  callbackRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
