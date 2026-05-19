import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useUnsavedChangesWarning(isDirty: boolean, message?: string) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isDirty) return;
    const fallback = t("common.unsaved_changes_warning");
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message ?? fallback;
      return message ?? fallback;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, message, t]);
}
