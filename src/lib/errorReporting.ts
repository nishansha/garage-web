export interface ErrorReportContext {
  componentStack?: string;
  [key: string]: unknown;
}

export type ErrorReporter = (
  error: Error,
  context?: ErrorReportContext,
) => void;

const defaultReporter: ErrorReporter = (error, context) => {
  if (import.meta.env.DEV) console.error("Unhandled application error", error, context);
};

let reporter: ErrorReporter = defaultReporter;

/**
 * Swap in a real backend (Sentry, Bugsnag, etc.) at app startup, e.g.:
 *   setErrorReporter((error, context) => Sentry.captureException(error, { extra: context }));
 */
export const setErrorReporter = (next: ErrorReporter): void => {
  reporter = next;
};

export const reportError = (
  error: Error,
  context?: ErrorReportContext,
): void => {
  reporter(error, context);
};
