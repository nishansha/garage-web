import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "../lib/api";
import {
  NAVBAR_POSITION_OPTIONS,
  preferencesApi,
  type NavbarPosition,
  type UserPreferences,
} from "../services/preferences";
import {
  THEME_OPTIONS,
  toColorTheme,
  toThemePreference,
  type ColorTheme,
} from "../lib/theme";
import { setPreferences, useAppDispatch, useAppSelector } from "../store/auth";
import { useTheme } from "./ThemeProvider";
import { Button, Modal } from "./ui";
import { cx } from "../lib/utils";

export const PreferencesModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const stored =
    useAppSelector((state) => state.auth.preferences) ??
    ({ navbarPosition: "LEFT", theme: "DARK" } satisfies UserPreferences);
  const [navbarPosition, setNavbarPosition] = useState<NavbarPosition>(
    stored.navbarPosition,
  );
  const [draftTheme, setDraftTheme] = useState<ColorTheme>(theme);

  useEffect(() => {
    if (!open) return;
    setNavbarPosition(stored.navbarPosition);
    setDraftTheme(toColorTheme(stored.theme));
  }, [open, stored.navbarPosition, stored.theme]);

  const save = useMutation({
    mutationFn: () =>
      preferencesApi.update({
        navbarPosition,
        theme: toThemePreference(draftTheme),
      }),
    onSuccess: (preferences) => {
      dispatch(setPreferences(preferences));
      setTheme(toColorTheme(preferences.theme));
      toast.success("Preferences saved");
      onClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to save preferences.",
      );
    },
  });

  const close = () => {
    setTheme(toColorTheme(stored.theme));
    onClose();
  };

  const dirty =
    navbarPosition !== stored.navbarPosition ||
    toThemePreference(draftTheme) !== stored.theme;

  return (
    <Modal
      open={open}
      title="Preferences"
      onClose={close}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={close}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={!dirty}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="preferences-stack">
        <section className="preferences-section">
          <div className="preferences-section__header">
            <h3>Appearance</h3>
            <p>Keep the same mint accents on a dark or light canvas.</p>
          </div>
          <div className="preferences-options" role="radiogroup" aria-label="Appearance">
            {THEME_OPTIONS.map((option) => {
              const selected = draftTheme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cx(
                    "preferences-option",
                    selected && "is-selected",
                  )}
                  onClick={() => {
                    setDraftTheme(option.value);
                    setTheme(option.value);
                  }}
                >
                  <span className="preferences-option__radio" aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span
                    className={cx("theme-swatch", `theme-swatch--${option.value}`)}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </section>
        <section className="preferences-section">
          <div className="preferences-section__header">
            <h3>Layout</h3>
            <p>Choose where the main navigation appears.</p>
          </div>
          <div className="preferences-options" role="radiogroup" aria-label="Layout">
            {NAVBAR_POSITION_OPTIONS.map((option) => {
              const selected = navbarPosition === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cx(
                    "preferences-option",
                    selected && "is-selected",
                  )}
                  onClick={() => setNavbarPosition(option.value)}
                >
                  <span className="preferences-option__radio" aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
};
