import { QueryClient } from "@tanstack/react-query";
import { store } from "../store/auth";

export const queryClient = new QueryClient({
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

/** Drop cached queries whenever the signed-in user changes (including logout). */
let previousUserId = store.getState().auth.session?.user.id ?? null;
store.subscribe(() => {
  const nextUserId = store.getState().auth.session?.user.id ?? null;
  if (nextUserId === previousUserId) return;
  previousUserId = nextUserId;
  queryClient.clear();
});
