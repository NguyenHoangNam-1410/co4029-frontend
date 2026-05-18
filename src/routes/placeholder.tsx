import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Construction } from "lucide-react";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-16 h-16 rounded-xl bg-m3-primary-fixed flex items-center justify-center mx-auto">
          <Construction className="h-8 w-8 text-m3-primary" />
        </div>
        <h1 className="font-headline font-bold text-2xl text-m3-on-surface">{title}</h1>
        <p className="text-m3-on-surface-variant text-sm">
          This page is coming soon. Check back after the API migration is complete.
        </p>
        <Link to="/dashboard">
          <Button className="gradient-primary text-white border-0 gap-2 font-semibold">
            Back to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function ProgressPage() {
  return <ComingSoonPage title="Progress" />;
}

export function SettingsPage() {
  return <ComingSoonPage title="Cài đặt" />;
}

export function QuizPage() {
  return <ComingSoonPage title="Bài kiểm tra" />;
}

export function InterviewPage() {
  return <ComingSoonPage title="AI Mock Interview" />;
}
