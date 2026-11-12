import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import {
  ArrowUpLeft,
  CalendarDays,
  ChevronLeft,
  Ellipsis,
  FileHeart,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { fa, money, statuses } from "../data";
import { useClinic, activity } from "../store";
import { getModalHints } from "../insights";
import { InlineHints, PageHints } from "./Smart";
import type { Appointment, AppointmentStatus } from "../types";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <div className="brand-mark">
        <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path
            d="M16 5h8v11h11v8H24v11h-8V24H5v-8h11V5Z"
            fill="currentColor"
          />
          <path
            d="m10 21 6-1 3-6 4 12 3-6h6"
            stroke="var(--brand-pulse, white)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <strong>
          نبض<span className="brand-dot">.</span>
        </strong>
        {!small && <span className="brand-caption">سامانه مدیریت کلینیک</span>}
      </div>
    </div>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  className = "",
  children,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon size={19} strokeWidth={1.7} />
      {children}
    </button>
  );
}

export function Avatar({
  name,
  src,
  size = "normal",
  index = 0,
}: {
  name: string;
  src?: string;
  size?: "small" | "normal" | "large";
  index?: number;
}) {
  return (
    <span className={`avatar-image avatar-${size} avatar-color-${index % 5}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        name
          .replace("دکتر ", "")
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join(" ")
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`status-badge ${statuses[status].className}`}>
      <i />
      {statuses[status].label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
  hints = true,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  hints?: boolean;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children && <div className="heading-actions">{children}</div>}
      </div>
      {hints && <PageHints />}
    </>
  );
}

export function PanelHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  title = "موردی پیدا نشد",
  description = "فیلترها را تغییر دهید یا یک مورد جدید ثبت کنید.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <FileHeart size={35} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "جستجو در نام، کد ملی و شماره پرونده...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button aria-label="پاک کردن جستجو" onClick={() => onChange("")}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  const id = useId();
  // Explicit labels keep a select's option text out of its accessible name.
  function connectLabel(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (
        !isValidElement<{ children?: ReactNode; "aria-labelledby"?: string }>(
          node,
        )
      )
        return node;
      if (
        typeof node.type === "string" &&
        ["input", "select", "textarea"].includes(node.type)
      ) {
        return cloneElement(node, { "aria-labelledby": id });
      }
      return node.props.children
        ? cloneElement(node, { children: connectLabel(node.props.children) })
        : node;
    });
  }
  return (
    <label className={`form-field ${className}`}>
      <span id={id}>{label}</span>
      {connectLabel(children)}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  fullscreen = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  fullscreen?: boolean;
  className?: string;
}) {
  const { setModal, modal, data, role, patientId } = useClinic();
  const hints = getModalHints(data, role, modal, patientId);
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => ref.current?.focus(), 30);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setModal(null);
      if (event.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [setModal]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setModal(null);
      }}
    >
      <section
        className={`app-modal ${wide ? "modal-wide" : ""} ${fullscreen ? "modal-full" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton
            icon={X}
            label="بستن پنجره"
            onClick={() => setModal(null)}
          />
        </div>
        <div className="modal-content">
          <InlineHints hints={hints} />
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </section>
    </div>
  );
}

export function AppointmentTable({
  appointments,
  compact = false,
}: {
  appointments: Appointment[];
  compact?: boolean;
}) {
  const { data, role, setModal, setData, toast, patientId } = useClinic();
  const canAccept = role === "management" || role === "reception";
  function openDetails(appointment: Appointment) {
    if (role === "finance") {
      if (["cancelled", "waitlisted"].includes(appointment.status)) {
        toast("این نوبت فاکتور فعال ندارد.", true);
        return;
      }
      setModal({
        type: appointment.paid ? "receipt" : "pay",
        appointmentId: appointment.id,
      });
    } else setModal({ type: "record", patientId: appointment.patientId });
  }
  function accept(appointment: Appointment) {
    setData((previous) => ({
      ...previous,
      appointments: previous.appointments.map((item) =>
        item.id === appointment.id ? { ...item, status: "waiting" } : item,
      ),
      activities: [
        activity(
          "پذیرش بیمار انجام شد",
          "بیمار به صف انتظار و تریاژ اضافه شد.",
          "appointment",
        ),
        ...previous.activities,
      ],
    }));
    toast("پذیرش ثبت شد؛ بیمار در صف تریاژ قرار گرفت.");
  }
  if (!appointments.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table className={`data-table ${compact ? "table-compact" : ""}`}>
        <thead>
          <tr>
            <th>بیمار</th>
            <th>پزشک / تخصص</th>
            <th>ساعت نوبت</th>
            <th>وضعیت</th>
            {!compact && <th>سهم بیمار</th>}
            <th className="action-cell">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment, index) => {
            const patient = data.patients.find(
              (item) => item.id === appointment.patientId,
            );
            const doctor = data.doctors.find(
              (item) => item.id === appointment.doctorId,
            );
            if (
              !patient ||
              !doctor ||
              (role === "patient" && patient.id !== patientId)
            )
              return null;
            return (
              <tr key={appointment.id}>
                <td>
                  <button
                    className="person-cell"
                    onClick={() => openDetails(appointment)}
                  >
                    <Avatar name={patient.name} index={index} size="small" />
                    <span>
                      <strong>{patient.name}</strong>
                      <small>{fa(patient.nationalCode)}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="cell-primary">{doctor.name}</span>
                  <small className="cell-secondary">{doctor.specialty}</small>
                </td>
                <td>
                  <span className="time-cell">{fa(appointment.time)}</span>
                </td>
                <td>
                  <StatusBadge status={appointment.status} />
                </td>
                {!compact && (
                  <td>
                    <span className="cell-primary">
                      {money(appointment.patientShare)} <small>تومان</small>
                    </span>
                    <small
                      className={`cell-secondary ${appointment.paid ? "text-positive" : ""}`}
                    >
                      {appointment.paid ? "پرداخت شده" : "در انتظار پرداخت"}
                    </small>
                  </td>
                )}
                <td className="action-cell">
                  <div className="row-actions">
                    {!compact && (
                      <>
                        {canAccept && appointment.status === "waitlisted" && (
                          <button
                            className="text-action"
                            onClick={() =>
                              setModal({
                                type: "appointment",
                                appointmentId: appointment.id,
                              })
                            }
                          >
                            تخصیص نوبت
                          </button>
                        )}
                        {canAccept && appointment.status === "scheduled" && (
                          <button
                            className="text-action"
                            onClick={() => accept(appointment)}
                          >
                            پذیرش
                          </button>
                        )}
                        {role === "nursing" &&
                          ["waiting", "ready"].includes(appointment.status) && (
                            <button
                              className="text-action"
                              onClick={() =>
                                setModal({
                                  type: "triage",
                                  appointmentId: appointment.id,
                                })
                              }
                            >
                              ثبت علائم
                            </button>
                          )}
                        {role === "physician" &&
                          ["waiting", "ready", "visiting"].includes(
                            appointment.status,
                          ) && (
                            <button
                              className="text-action"
                              onClick={() =>
                                setModal({
                                  type: "visit",
                                  appointmentId: appointment.id,
                                })
                              }
                            >
                              ویزیت
                            </button>
                          )}
                        {(role === "finance" || role === "patient") &&
                          !appointment.paid &&
                          !["cancelled", "waitlisted"].includes(
                            appointment.status,
                          ) && (
                            <button
                              className="text-action"
                              onClick={() =>
                                setModal({
                                  type: "pay",
                                  appointmentId: appointment.id,
                                })
                              }
                            >
                              پرداخت
                            </button>
                          )}
                      </>
                    )}
                    <button
                      className="more-button"
                      aria-label={`مشاهده پرونده ${patient.name}`}
                      title="پرونده و عملیات بیمار"
                      onClick={() => openDetails(appointment)}
                    >
                      <Ellipsis size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="link-button" onClick={onClick}>
      {children}
      <ChevronLeft size={15} />
    </button>
  );
}

export function NewAppointmentButton({
  label = "پذیرش جدید",
}: {
  label?: string;
}) {
  const { setModal, role, patientId } = useClinic();
  return (
    <button
      className="button primary"
      onClick={() =>
        setModal({
          type: "appointment",
          patientId: role === "patient" ? patientId : undefined,
        })
      }
    >
      <Plus size={18} />
      {label}
    </button>
  );
}

export function DateButton({
  date,
  onClick,
}: {
  date: string;
  onClick?: () => void;
}) {
  return (
    <button className="button secondary date-button" onClick={onClick}>
      <CalendarDays size={17} />
      {date}
      <ChevronLeft size={14} />
    </button>
  );
}

export function Trend({
  value,
  positive = true,
  label = "نسبت به هفته گذشته",
}: {
  value: string;
  positive?: boolean;
  label?: string;
}) {
  return (
    <span className="metric-trend">
      <span className={positive ? "text-positive" : "text-danger"}>
        <ArrowUpLeft size={13} />
        {value}
      </span>
      <small>{label}</small>
    </span>
  );
}
