import {
  createRootRoute,
  createRoute,
  createRouter,
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
import { ProgressPage, SettingsPage, InterviewPage } from "@/routes/placeholder";
import TeacherDashboard from "@/routes/teacher/index";
import TeacherCoursesPage from "@/routes/teacher/courses";
import CourseNewPage from "@/routes/teacher/course-new";
import CourseManagePage from "@/routes/teacher/course-manage";
import LessonManagePage from "@/routes/teacher/lesson-manage";
import LessonMaterialsPage from "@/routes/teacher/lesson-materials";
import CourseStudentsPage from "@/routes/teacher/course-students";
import CourseStudentDetailPage from "@/routes/teacher/course-student-detail";
import ModuleManagePage from "@/routes/teacher/module-manage";
import QuizManagePage from "@/routes/teacher/quiz-manage";
import AdminHealthPage from "@/routes/admin/health";
import AdminStatsPage from "@/routes/admin/stats";
import AdminStatsActivePage from "@/routes/admin/stats-active";
import AdminStatsContentPage from "@/routes/admin/stats-content";
import AdminStatsHealthPage from "@/routes/admin/stats-health";
import AdminUsersPage from "@/routes/admin/users";
import AdminUserDetailStubPage from "@/routes/admin/user-detail";

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

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ location }) => {
    const session = getStoredAuthSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { next: location.href },
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

const notificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const teacherRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher",
  component: TeacherDashboard,
});

const teacherCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses",
  component: TeacherCoursesPage,
});

const teacherCourseNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/new",
  component: CourseNewPage,
});

const teacherCourseManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId",
  component: CourseManagePage,
});

const teacherLessonManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/lessons/$lessonId",
  component: LessonManagePage,
});

const teacherLessonMaterialsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/lessons/$lessonId/materials",
  component: LessonMaterialsPage,
});

const teacherModuleManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/modules/$moduleId",
  component: ModuleManagePage,
});

const teacherQuizManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/quizzes/$quizId",
  component: QuizManagePage,
});

const teacherCourseStudentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students",
  component: CourseStudentsPage,
});

const teacherCourseStudentDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students/$studentId",
  component: CourseStudentDetailPage,
});

const adminHealthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/health",
  component: AdminHealthPage,
});

const adminStatsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats",
  component: AdminStatsPage,
});

const adminStatsActiveRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/active",
  component: AdminStatsActivePage,
});

const adminStatsContentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/content",
  component: AdminStatsContentPage,
});

const adminStatsHealthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/health",
  component: AdminStatsHealthPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users/$userId",
  component: AdminUserDetailStubPage,
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
  authenticatedRoute.addChildren([
    dashboardRoute,
    coursesRoute,
    courseDetailRoute,
    courseLearnRoute,
    courseQuizRoute,
    courseInterviewRoute,
    progressRoute,
    settingsRoute,
    notificationsRoute,
    teacherRoute,
    teacherCoursesRoute,
    teacherCourseNewRoute,
    teacherCourseManageRoute,
    teacherLessonManageRoute,
    teacherLessonMaterialsRoute,
    teacherModuleManageRoute,
    teacherQuizManageRoute,
    teacherCourseStudentsRoute,
    teacherCourseStudentDetailRoute,
    adminHealthRoute,
    adminStatsRoute,
    adminStatsActiveRoute,
    adminStatsContentRoute,
    adminStatsHealthRoute,
    adminUsersRoute,
    adminUserDetailRoute,
  ]),
  callbackRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
