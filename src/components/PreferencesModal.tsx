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
import { setPreferences, useAppDispatch, useAppSelector } from "../store/auth";
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
  const stored =
    useAppSelector((state) => state.auth.preferences) ??
    ({ navbarPosition: "LEFT" } satisfies UserPreferences);
  const [navbarPosition, setNavbarPosition] = useState<NavbarPosition>(
    stored.navbarPosition,
  );

  useEffect(() => {
    if (open) setNavbarPosition(stored.navbarPosition);
  }, [open, stored.navbarPosition]);

  const save = useMutation({
    mutationFn: () => preferencesApi.update({ navbarPosition }),
    onSuccess: (preferences) => {
      dispatch(setPreferences(preferences));
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

  const dirty = navbarPosition !== stored.navbarPosition;

  return (
    <Modal
      open={open}
      title="Preferences"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
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
    </Modal>
  );
};
