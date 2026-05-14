import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useQuiz,
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/use-teacher-api";
import { QuizAuthoringPanel } from "@/routes/teacher/module-manage";

export default function QuizManagePage() {
  const navigate = useNavigate();
  const { courseId, quizId } = useParams({ strict: false }) as { courseId: string; quizId: string };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: quiz, isLoading: quizLoading } = useQuiz(quizId);
  const { data: content, isLoading: contentLoading } = useTeacherCourseContent(courseId);

  const module = content?.modules.find((entry) => entry.id === quiz?.module_id);

  if (quizLoading || contentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!quiz || !module) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">Quiz not found</p>
          <p className="text-sm mt-1">The requested quiz could not be loaded for this course.</p>
        </div>
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="inline-flex">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
        <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">My Courses</Link>
        <ArrowRight className="h-3 w-3" />
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="hover:text-m3-primary transition-colors truncate max-w-[160px]">
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId/modules/$moduleId"
          params={{ courseId, moduleId: module.id }}
          className="hover:text-m3-primary transition-colors truncate max-w-[160px]"
        >
          {module.title}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium truncate max-w-[200px]">{quiz.title}</span>
      </div>

      <div className="flex items-start gap-3">
        <Link to="/teacher/courses/$courseId/modules/$moduleId" params={{ courseId, moduleId: module.id }}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="font-headline font-bold text-2xl text-m3-on-surface">{quiz.title}</h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            Manage quiz settings, author questions, generate draft questions from lesson materials, and publish from one dedicated page.
          </p>
        </div>
      </div>

      <QuizAuthoringPanel
        quizId={quizId}
        module={module}
        courseId={courseId}
        onClose={() => {
          void navigate({
            to: "/teacher/courses/$courseId/modules/$moduleId",
            params: { courseId, moduleId: module.id },
          });
        }}
      />
    </div>
  );
}
