import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

export type UserRole = "ADMIN" | "STAFF" | string;

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: AuthUser;
}

interface AuthState {
  session: AuthSession | null;
  hydrated: boolean;
}

const STORAGE_KEY = "garage.web.auth";

const readSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const sessionStorage = {
  read: readSession,
  write(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState: { session: readSession(), hydrated: true } satisfies AuthState,
  reducers: {
    setSession(state, action: PayloadAction<AuthSession>) {
      state.session = action.payload;
      sessionStorage.write(action.payload);
    },
    updateTokens(
      state,
      action: PayloadAction<{ token: string; refreshToken?: string }>,
    ) {
      if (!state.session) return;
      state.session.token = action.payload.token;
      state.session.refreshToken =
        action.payload.refreshToken ?? state.session.refreshToken;
      sessionStorage.write(state.session);
    },
    clearSession(state) {
      state.session = null;
      sessionStorage.clear();
    },
  },
});

export const { clearSession, setSession, updateTokens } = authSlice.actions;

export const store = configureStore({
  reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
