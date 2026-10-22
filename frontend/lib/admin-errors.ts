/** Report validation locations without echoing submitted content or credentials. */
export function adminErrorMessage(result: unknown, status: number): string {
  const detail = result && typeof result === "object" && "detail" in result
    ? result.detail : undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((issue: unknown) => {
      if (!issue || typeof issue !== "object" || !("msg" in issue) || typeof issue.msg !== "string") return [];
      const loc = "loc" in issue && Array.isArray(issue.loc)
        ? issue.loc.filter((part) => part !== "body" && (typeof part === "string" || typeof part === "number")).join(".")
        : "";
      return [loc ? `${loc}: ${issue.msg}` : issue.msg];
    });
    if (messages.length) return [...new Set(messages)].join("; ");
  }
  return `Unable to save changes (HTTP ${status}). Please try again.`;
}
