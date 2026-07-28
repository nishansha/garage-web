import { api } from "../lib/api";

export type NavbarPosition = "LEFT" | "TOP";

export interface UserPreferences {
  navbarPosition: NavbarPosition;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  navbarPosition: "LEFT",
};

export const NAVBAR_POSITION_OPTIONS: readonly {
  value: NavbarPosition;
  label: string;
  description: string;
}[] = [
  {
    value: "LEFT",
    label: "Left sidebar",
    description: "Vertical navigation along the left edge of the screen.",
  },
  {
    value: "TOP",
    label: "Top navigation",
    description: "Horizontal menus with section links under the header.",
  },
] as const;

const isNavbarPosition = (value: unknown): value is NavbarPosition =>
  value === "LEFT" || value === "TOP";

export const normalizePreferences = (
  value: Partial<UserPreferences> | null | undefined,
): UserPreferences => ({
  navbarPosition: isNavbarPosition(value?.navbarPosition)
    ? value.navbarPosition
    : DEFAULT_PREFERENCES.navbarPosition,
});

export const preferencesApi = {
  get: () =>
    api
      .get<Partial<UserPreferences>>("v1/user/preferences")
      .then(normalizePreferences),

  update: async (preferences: UserPreferences) => {
    const result = await api.put<Partial<UserPreferences> | undefined>(
      "v1/user/preferences",
      preferences,
    );
    return normalizePreferences(result ?? preferences);
  },
};
