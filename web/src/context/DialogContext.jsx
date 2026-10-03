import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageContext";

// WanderWise's own pop-up for confirmations and messages, used instead of
// the browser's window.confirm / window.alert (which show "localhost:3000
// says…" and can't be styled).
//
//   const { confirm, alert } = useDialog();
//   if (!(await confirm(t("confirmDeleteTrip"), { danger: true }))) return;
//   await alert(t("chooseAPhotoFirst"));
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const { t } = useLanguage();
  // { kind: "confirm" | "alert", message, danger, confirmLabel, resolve }
  const [dialog, setDialog] = useState(null);
  const confirmBtnRef = useRef(null);

  const open = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);
  const confirm = useCallback((message, options = {}) => open({ kind: "confirm", message, ...options }), [open]);
  const alert = useCallback((message, options = {}) => open({ kind: "alert", message, ...options }), [open]);

  const close = useCallback(
    (result) => {
      setDialog((current) => {
        current?.resolve(result);
        return null;
      });
    },
    []
  );

  // Enter = OK, Escape = Cancel. Focus the main button when it opens.
  useEffect(() => {
    if (!dialog) return;
    confirmBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") close(dialog.kind === "alert");
      if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div className="ww-dialog-overlay" onMouseDown={() => close(dialog.kind === "alert")}>
          <div
            className="ww-dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ww-dialog-brand">
              <img src="/assets/logo.jpg" alt="" className="ww-dialog-logo" />
              <span>WanderWise!</span>
            </div>
            <p className="ww-dialog-message">{dialog.message}</p>
            <div className="ww-dialog-actions">
              {dialog.kind === "confirm" && (
                <button type="button" className="ww-dialog-btn ww-dialog-cancel" onClick={() => close(false)}>
                  {t("cancel")}
                </button>
              )}
              <button
                type="button"
                ref={confirmBtnRef}
                className={`ww-dialog-btn ${dialog.danger ? "ww-dialog-danger" : "ww-dialog-ok"}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel || (dialog.kind === "confirm" ? t("dialogConfirm") : t("ok"))}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}