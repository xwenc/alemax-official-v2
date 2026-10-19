"use client";
import { useEffect } from "react";
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement)?.closest("a");
      if (
        !link ||
        link.target === "_blank" ||
        !link.href ||
        link.href === window.location.href
      )
        return;
      if (!window.confirm("Discard unsaved changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const submit = (event: SubmitEvent) => {
      if (
        (event.target as HTMLFormElement)?.dataset.adminLogout !== undefined &&
        !window.confirm("Discard unsaved changes and sign out?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    document.addEventListener("submit", submit, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      document.removeEventListener("submit", submit, true);
    };
  }, [dirty]);
}
