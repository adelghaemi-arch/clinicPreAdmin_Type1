import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Ellipsis,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { currentDoctorId, fa, pageNames, roleNames } from "../data";
import {
  answer,
  getHints,
  suggestions,
  vitalFlags,
  type Hint,
  type Reply,
  type SmartAction,
} from "../insights";
import { invoices } from "../invoices";
import { useClinic, usePersistentState } from "../store";
import type { Page, Role, Vitals } from "../types";

const isMobile = () => window.matchMedia("(max-width: 760px)").matches;

function useRun() {
  const { navigate, setModal, setTheme, closeAssistant } = useClinic();
  return (action: SmartAction) => {
    if (action.theme) setTheme(action.theme);
    if (action.page) navigate(action.page);
    if (action.modal) setModal(action.modal);
    if (action.modal || isMobile()) closeAssistant();
  };
}

/* One-line hints under every page title. Details stay collapsed until tapped. */
export function PageHints() {
  const { data, role, page, openAssistant, patientId } = useClinic();
  const run = useRun();
  const hints = useMemo(
    () => getHints(data, role, page, patientId),
    [data, role, page, patientId],
  );
  const [shown, setShown] = usePersistentState("nabz-hints-visible", true);
  const [active, setActive] = useState<string | null>(null);
  const current = shown ? hints.find((item) => item.id === active) : undefined;
  return (
    <section className="smart-hints" aria-label="نکته‌های هوشمند این بخش">
      <button
        className="smart-toggle"
        aria-expanded={shown}
        title={shown ? "پنهان کردن نکته‌ها" : "نمایش نکته‌ها"}
        onClick={() => {
          setShown(!shown);
          setActive(null);
        }}
      >
        <Sparkles size={14} />
        <span>هوش نبض</span>
        <b>{fa(hints.length)}</b>
      </button>
      {shown && (
        <div className="smart-chips">
          {hints.map((item) => (
            <button
              key={item.id}
              className={`smart-chip tone-${item.tone} ${active === item.id ? "is-active" : ""}`}
              aria-expanded={active === item.id}
              onClick={() => setActive(active === item.id ? null : item.id)}
            >
              <i />
              {item.title}
              <ChevronDown size={12} />
            </button>
          ))}
        </div>
      )}
      {current && (
        <div className={`smart-detail tone-${current.tone}`}>
          <p>{current.detail}</p>
          <div>
            {current.action && (
              <button
                className="button primary small"
                onClick={() => run(current.action as SmartAction)}
              >
                {current.action.label}
              </button>
            )}
            {current.ask && (
              <button
                className="button secondary small"
                onClick={() => openAssistant(current.ask)}
              >
                <Sparkles size={13} />
                بپرس
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* A single, small hint with collapsible detail (used on the patient dashboard). */
export function SmartHint() {
  const { data, role, page, openAssistant, patientId } = useClinic();
  const run = useRun();
  const hints = useMemo(
    () => getHints(data, role, page, patientId),
    [data, role, page, patientId],
  );
  const [open, setOpen] = useState(false);
  const hint = hints[0];
  return (
    <section className="smart-hints smart-single" aria-label="نکته هوشمند">
      <button
        className={`smart-chip tone-${hint.tone} ${open ? "is-active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Sparkles size={13} className="smart-spark" />
        {hint.title}
        <ChevronDown size={12} />
      </button>
      {hints.length > 1 && (
        <button
          className="smart-more"
          onClick={() => openAssistant("خلاصه این بخش")}
        >
          {fa(hints.length - 1)} نکته دیگر
        </button>
      )}
      {open && (
        <div className={`smart-detail tone-${hint.tone}`}>
          <p>{hint.detail}</p>
          <div>
            {hint.action && (
              <button
                className="button primary small"
                onClick={() => run(hint.action as SmartAction)}
              >
                {hint.action.label}
              </button>
            )}
            {hint.ask && (
              <button
                className="button secondary small"
                onClick={() => openAssistant(hint.ask)}
              >
                <Sparkles size={13} />
                بپرس
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* Compact hints at the top of every modal form. */
export function InlineHints({ hints }: { hints: Hint[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!hints.length) return null;
  return (
    <div className="inline-hints">
      {hints.map((item) => (
        <div key={item.id} className={`inline-hint tone-${item.tone}`}>
          <button
            type="button"
            aria-expanded={open === item.id}
            onClick={() => setOpen(open === item.id ? null : item.id)}
          >
            <Sparkles size={13} />
            <span>{item.title}</span>
            <ChevronDown size={13} />
          </button>
          {open === item.id && <p>{item.detail}</p>}
        </div>
      ))}
    </div>
  );
}

/* Live check while the nurse types vitals. */
export function LiveVitals({ vitals }: { vitals: Partial<Vitals> }) {
  const flags = vitalFlags(vitals);
  if (!flags.length) return null;
  return (
    <div className="inline-hint tone-warn live-vitals span-2" role="status">
      <span>
        <Sparkles size={13} />
        خارج از محدوده معمول: {flags.join("، ")}
      </span>
      <p>
        اندازه‌گیری را تکرار و به پزشک اطلاع دهید. این هشدار قاعده‌محور است و
        جایگزین ارزیابی بالینی نیست.
      </p>
    </div>
  );
}

interface Message {
  id: number;
  question?: string;
  reply?: Reply;
}

function BotMessage({
  reply,
  run,
}: {
  reply: Reply;
  run: (action: SmartAction) => void;
}) {
  return (
    <div className="assistant-msg from-bot">
      <p>{reply.text}</p>
      {!!reply.details?.length && (
        <details>
          <summary>جزئیات ({fa(reply.details.length)})</summary>
          <ul>
            {reply.details.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      {!!reply.actions?.length && (
        <div className="assistant-actions">
          {reply.actions.map((action) => (
            <button
              key={action.label}
              className="button secondary small"
              onClick={() => run(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel() {
  const {
    data,
    role,
    page,
    patientId,
    assistant,
    closeAssistant,
    clearAssistantQuery,
  } = useClinic();
  const run = useRun();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const hints = useMemo(
    () => getHints(data, role, page, patientId),
    [data, role, page, patientId],
  );

  function send(value: string) {
    const question = value.trim();
    if (!question) return;
    const reply = answer(data, role, page, question, patientId);
    const id = (counter.current += 2);
    setMessages((previous) => [
      ...previous.slice(-18),
      { id: id - 1, question },
      { id, reply },
    ]);
    setText("");
  }

  useEffect(() => {
    if (assistant.open && assistant.query) {
      send(assistant.query);
      clearAssistantQuery();
    }
    // The pending question is consumed exactly once per request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant.open, assistant.query]);

  useEffect(() => {
    list.current?.scrollTo({
      top: list.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  useEffect(() => {
    if (!assistant.open) return;
    if (!isMobile()) input.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeAssistant();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant.open]);

  return (
    <>
      {assistant.open && (
        <div
          className="assistant-scrim"
          aria-hidden="true"
          onClick={closeAssistant}
        />
      )}
      <section
        className={`assistant-panel ${assistant.open ? "is-open" : ""}`}
        aria-label="دستیار هوشمند نبض"
      >
        <header className="assistant-head">
          <span className="assistant-avatar">
            <Sparkles size={18} />
          </span>
          <div>
            <strong>دستیار هوشمند نبض</strong>
            <small>
              {roleNames[role]} •{" "}
              {page === "dashboard" ? "نمای کلی" : pageNames[page]}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="بستن دستیار"
            onClick={closeAssistant}
          >
            <X size={18} />
          </button>
        </header>
        <div className="assistant-body" ref={list}>
          <div className="assistant-msg from-bot">
            <p>
              {hints[0].title}
              {hints.length > 1
                ? ` و ${fa(hints.length - 1)} نکته دیگر در این بخش.`
                : "."}
            </p>
            <details>
              <summary>نکته‌های این بخش ({fa(hints.length)})</summary>
              <ul>
                {hints.map((item) => (
                  <li key={item.id}>
                    <b>{item.title}</b> — {item.detail}
                  </li>
                ))}
              </ul>
            </details>
          </div>
          {messages.map((item) =>
            item.reply ? (
              <BotMessage key={item.id} reply={item.reply} run={run} />
            ) : (
              <div key={item.id} className="assistant-msg from-user">
                <p>{item.question}</p>
              </div>
            ),
          )}
        </div>
        <div className="assistant-chips">
          {suggestions(role).map((item) => (
            <button key={item} onClick={() => send(item)}>
              {item}
            </button>
          ))}
        </div>
        <form
          className="assistant-input"
          onSubmit={(event) => {
            event.preventDefault();
            send(text);
          }}
        >
          <input
            ref={input}
            value={text}
            maxLength={120}
            aria-label="پرسش از دستیار"
            placeholder="بپرسید؛ مثلاً «صف انتظار» یا نام پزشک"
            onChange={(event) => setText(event.target.value)}
          />
          <button
            className="assistant-send"
            type="submit"
            aria-label="ارسال پرسش"
            disabled={!text.trim()}
          >
            <Send size={16} />
          </button>
        </form>
        <p className="assistant-note">
          پاسخ‌ها محلی و قاعده‌محورند؛ توصیه پزشکی نیست.
        </p>
      </section>
    </>
  );
}

/* Floating button on desktop; on mobile the bottom bar opens the same panel. */
export function Assistant() {
  const { role, patientId, assistant, openAssistant, closeAssistant } =
    useClinic();
  return (
    <>
      <button
        className={`assistant-fab ${assistant.open ? "is-open" : ""}`}
        aria-label="دستیار هوشمند"
        aria-expanded={assistant.open}
        onClick={() => (assistant.open ? closeAssistant() : openAssistant())}
      >
        {assistant.open ? <X size={19} /> : <Sparkles size={19} />}
        <span>دستیار</span>
      </button>
      <Panel key={`${role}-${patientId}`} />
    </>
  );
}

const tabs: Record<Role, Page[]> = {
  management: ["dashboard", "appointments", "patients"],
  physician: ["dashboard", "visits", "queue"],
  reception: ["dashboard", "appointments", "queue"],
  nursing: ["dashboard", "triage", "procedures"],
  finance: ["dashboard", "finance", "insurance"],
  patient: ["dashboard", "booking", "appointments"],
};
const tabNames: Partial<Record<Page, string>> = {
  dashboard: "خانه",
  appointments: "نوبت‌ها",
  patients: "بیماران",
  visits: "ویزیت",
  queue: "صف",
  triage: "تریاژ",
  procedures: "خدمات",
  finance: "صندوق",
  insurance: "بیمه",
  booking: "رزرو",
};

/* Bottom tab bar for phones: three role tabs, the assistant, and "more". */
export function MobileNav({
  icons,
  moreOpen,
  setMore,
}: {
  icons: Record<Page, LucideIcon>;
  moreOpen: boolean;
  setMore: (open: boolean) => void;
}) {
  const {
    data,
    role,
    page,
    navigate,
    assistant,
    openAssistant,
    closeAssistant,
  } = useClinic();
  const items = tabs[role];
  const today = data.appointments.filter(
    (item) =>
      item.date === data.day &&
      (role !== "physician" || item.doctorId === currentDoctorId),
  );
  function badge(target: Page) {
    switch (target) {
      case "appointments":
        return role === "patient"
          ? 0
          : today.filter((item) => item.status === "scheduled").length;
      case "queue":
        return today.filter((item) =>
          ["waiting", "ready"].includes(item.status),
        ).length;
      case "visits":
        return today.filter((item) => item.status === "ready").length;
      case "triage":
        return today.filter((item) => item.status === "waiting" && !item.vitals)
          .length;
      case "procedures":
        return data.procedures.filter(
          (item) => item.status === "pending" && !item.urgent,
        ).length;
      case "finance":
        return invoices(data).filter(
          (item) => item.date === data.day && !item.paid,
        ).length;
      default:
        return 0;
    }
  }
  function tab(target: Page) {
    const Icon = icons[target];
    const count = badge(target);
    const current = page === target && !moreOpen && !assistant.open;
    return (
      <button
        key={target}
        className={`mobile-nav-item ${current ? "is-active" : ""}`}
        aria-current={page === target ? "page" : undefined}
        onClick={() => {
          closeAssistant();
          setMore(false);
          navigate(target);
        }}
      >
        <Icon size={21} strokeWidth={1.7} />
        <small>{tabNames[target] || pageNames[target]}</small>
        {count > 0 && <b>{fa(count)}</b>}
      </button>
    );
  }
  return (
    <nav className="mobile-nav" aria-label="ناوبری پایین صفحه">
      {items.slice(0, 2).map(tab)}
      <button
        className={`mobile-nav-ai ${assistant.open ? "is-active" : ""}`}
        aria-label="دستیار هوشمند"
        aria-expanded={assistant.open}
        onClick={() => {
          setMore(false);
          if (assistant.open) closeAssistant();
          else openAssistant();
        }}
      >
        <span>{assistant.open ? <X size={20} /> : <Sparkles size={20} />}</span>
        <small>دستیار</small>
      </button>
      {tab(items[2])}
      <button
        className={`mobile-nav-item ${moreOpen || (!items.includes(page) && !assistant.open) ? "is-active" : ""}`}
        aria-label="بیشتر"
        aria-expanded={moreOpen}
        onClick={() => {
          closeAssistant();
          setMore(!moreOpen);
        }}
      >
        <Ellipsis size={21} strokeWidth={1.7} />
        <small>بیشتر</small>
        {data.activities.some((item) => !item.read) && (
          <i className="mobile-nav-dot" />
        )}
      </button>
    </nav>
  );
}
