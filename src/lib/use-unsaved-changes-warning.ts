import { useEffect } from "react";

const DEFAULT_MESSAGE =
  "Bạn có thay đổi chưa được lưu. Rời khỏi trang sẽ làm mất các thay đổi này.";

export function useUnsavedChangesWarning(isDirty: boolean, message?: string) {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message ?? DEFAULT_MESSAGE;
      return message ?? DEFAULT_MESSAGE;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, message]);
}
