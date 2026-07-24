import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";
import { store } from "./store/auth";
import { reportError } from "./lib/errorReporting";

window.addEventListener("error", (event) => {
  reportError(event.error instanceof Error ? event.error : new Error(event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  reportError(
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason)),
  );
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        !(
          error instanceof Error &&
          "status" in error &&
          error.status === 401
        ) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
