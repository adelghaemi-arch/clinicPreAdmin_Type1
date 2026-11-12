import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { createSeed, normalizeClinicData, uid } from "./data";
import type {
  Activity,
  ClinicData,
  ModalState,
  Page,
  Role,
  Theme,
} from "./types";

export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  migrate?: (value: T) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as T;
        return migrate ? migrate(parsed) : parsed;
      }
    } catch {
      /* Storage is optional; the app also works in memory. */
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Private browsing can restrict storage. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

interface ClinicContextValue {
  data: ClinicData;
  setData: Dispatch<SetStateAction<ClinicData>>;
  role: Role;
  page: Page;
  navigate: (page: Page) => void;
  modal: ModalState;
  setModal: Dispatch<SetStateAction<ModalState>>;
  toast: (
    message: string,
    error?: boolean,
    action?: { label: string; onClick: () => void },
  ) => void;
  patientId: string;
  switchPatient: (id: string) => void;
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  assistant: { open: boolean; query: string | null };
  openAssistant: (query?: string) => void;
  closeAssistant: () => void;
  clearAssistantQuery: () => void;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({
  children,
  role,
  page,
  navigate,
  patientId,
  switchPatient: onSwitchPatient,
  theme,
  setTheme,
}: {
  children: ReactNode;
  role: Role;
  page: Page;
  navigate: (page: Page) => void;
  patientId: string;
  switchPatient: (id: string) => void;
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
}) {
  const [data, setData] = usePersistentState<ClinicData>(
    "nabz-clinic-data-v1",
    createSeed,
    normalizeClinicData,
  );
  const [modal, setModal] = useState<ModalState>(null);
  function switchPatient(id: string) {
    setModal(null);
    setAssistant({ open: false, query: null });
    onSwitchPatient(id);
  }
  const [assistant, setAssistant] = useState<{
    open: boolean;
    query: string | null;
  }>({ open: false, query: null });
  const openAssistant = (query?: string) =>
    setAssistant({ open: true, query: query || null });
  const closeAssistant = () =>
    setAssistant((previous) =>
      previous.open ? { open: false, query: null } : previous,
    );
  const clearAssistantQuery = () =>
    setAssistant((previous) =>
      previous.query ? { ...previous, query: null } : previous,
    );
  const [messages, setMessages] = useState<
    {
      id: string;
      message: string;
      error: boolean;
      action?: { label: string; onClick: () => void };
    }[]
  >([]);
  function toast(
    message: string,
    error = false,
    action?: { label: string; onClick: () => void },
  ) {
    const id = uid("toast");
    setMessages((previous) => [
      ...previous.slice(-2),
      { id, message, error, action },
    ]);
    window.setTimeout(
      () =>
        setMessages((previous) => previous.filter((item) => item.id !== id)),
      action ? 8000 : 4500,
    );
  }
  return (
    <ClinicContext.Provider
      value={{
        data,
        setData,
        role,
        page,
        navigate,
        modal,
        setModal,
        toast,
        patientId,
        switchPatient,
        theme,
        setTheme,
        assistant,
        openAssistant,
        closeAssistant,
        clearAssistantQuery,
      }}
    >
      {children}
      <div className="toast-container" aria-live="polite">
        {messages.map((item) => (
          <div
            className={`app-toast ${item.error ? "is-error" : ""}`}
            key={item.id}
          >
            <span className="toast-indicator" />
            {item.message}
            {item.action && (
              <button
                className="toast-action"
                onClick={() => {
                  item.action?.onClick();
                  setMessages((previous) =>
                    previous.filter((message) => message.id !== item.id),
                  );
                }}
              >
                {item.action.label}
              </button>
            )}
            <button
              aria-label="بستن پیام"
              onClick={() =>
                setMessages((previous) =>
                  previous.filter((message) => message.id !== item.id),
                )
              }
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const value = useContext(ClinicContext);
  if (!value) throw new Error("ClinicProvider is required");
  return value;
}

export function activity(
  title: string,
  description: string,
  kind: Activity["kind"] = "system",
): Activity {
  return {
    id: uid("activity"),
    title,
    description,
    kind,
    time: "همین حالا",
    read: false,
  };
}

export function downloadFile(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(
    new Blob([type.startsWith("text/csv") ? "\uFEFF" : "", content], { type }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csv(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
}
