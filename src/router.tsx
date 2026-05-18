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
import CourseInterviewPage from "@/routes/course-interview";
import CourseQuizPage from "@/routes/course-quiz";
import NotificationsPage from "@/routes/notifications";
import SettingsNotificationsPage from "@/routes/settings-notifications";
import LoginMfaPage from "@/routes/login-mfa";
import SettingsProfilePage from "@/routes/settings-profile";
import SettingsSecurityPage from "@/routes/settings-security";
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
import InterviewConfigNewPage from "@/routes/teacher/interview-config-new";
import InterviewConfigPage from "@/routes/teacher/interview-config";
import InterviewGapReportPage from "@/routes/teacher/interview-gap-report";
import AdminHealthPage from "@/routes/admin/health";
import AdminStatsPage from "@/routes/admin/stats";
import AdminStatsActivePage from "@/routes/admin/stats-active";
import AdminStatsContentPage from "@/routes/admin/stats-content";
import AdminStatsHealthPage from "@/routes/admin/stats-health";
import AdminUsersPage from "@/routes/admin/users";
import AdminUserDetailPage from "@/routes/admin/user-detail";
import AdminCoursesPage from "@/routes/admin/courses";
import AdminCourseDetailPage from "@/routes/admin/course-detail";
import AdminProcessingPage from "@/routes/admin/processing";
import AdminProcessingJobPage from "@/routes/admin/processing-job";
import AdminAiCostsPage from "@/routes/admin/ai-costs";
import DeptCoursesPage from "@/routes/dept-courses";
import DeptCourseDetailPage from "@/routes/dept-course-detail";
import ManagementCourseEnrollmentsPage from "@/routes/management-course-enrollments";
import CareerPathsPage from "@/routes/career-paths";
import CareerPathDetailPage from "@/routes/career-path-detail";
import MyCareerPathsPage from "@/routes/me-career-paths";
import ManagementCareerPathsPage from "@/routes/management-career-paths";
import ManagementCareerPathDetailPage from "@/routes/management-career-path-detail";
import SrDashboardPage from "@/routes/sr-dashboard";
import StudyCardsDuePage from "@/routes/study-cards-due";
import TeacherSrCohortPage from "@/routes/teacher/sr-cohort";
import TeacherSrAtRiskPage from "@/routes/teacher/sr-at-risk";
import TeacherSrStudentDetailPage from "@/routes/teacher/sr-student-detail";

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

const teacherInterviewConfigNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/interview-configs/new",
  component: InterviewConfigNewPage,
});

const teacherInterviewConfigRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/interview-configs/$configId",
  component: InterviewConfigPage,
});

const teacherInterviewGapReportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/interview-sessions/$sessionId/gap-report",
  component: InterviewGapReportPage,
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
  component: AdminUserDetailPage,
});

const adminCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/courses",
  component: AdminCoursesPage,
});

const adminCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/courses/$courseId",
  component: AdminCourseDetailPage,
});

const adminProcessingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/processing",
  component: AdminProcessingPage,
});

const adminProcessingJobRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/processing/$jobId",
  component: AdminProcessingJobPage,
});

const adminAiCostsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/ai-costs",
  component: AdminAiCostsPage,
});

const deptCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept",
  component: DeptCoursesPage,
});

const deptCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept/courses/$courseId",
  component: DeptCourseDetailPage,
});

const managementCourseEnrollmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/courses/$courseId/enrollments",
  component: ManagementCourseEnrollmentsPage,
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
  component: ManagementCareerPathsPage,
});

const managementCareerPathDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths/$id",
  component: ManagementCareerPathDetailPage,
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
  component: TeacherSrCohortPage,
});

const teacherSrAtRiskRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/at-risk",
  component: TeacherSrAtRiskPage,
});

const teacherSrStudentDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students/$studentId/sr",
  component: TeacherSrStudentDetailPage,
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
