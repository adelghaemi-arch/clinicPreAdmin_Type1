import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  CalendarCheck2,
  ChevronDown,
  Clock3,
  Download,
  Stethoscope,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  currentDoctorId,
  fa,
  money,
  persianDate,
  roleNames,
  specialties,
} from "../data";
import { csv, downloadFile, useClinic } from "../store";
import { invoices } from "../invoices";
import PatientDashboard from "./PatientDashboard";
import {
  AppointmentTable,
  Avatar,
  LinkButton,
  NewAppointmentButton,
  PageHeader,
  PanelHeader,
  Trend,
} from "./ui";
import type { Appointment, Page } from "../types";

export function AreaChart({ expanded = false }: { expanded?: boolean }) {
  const { data } = useClinic();
  const [period, setPeriod] = useState("week");
  const [hover, setHover] = useState<number | null>(null);
  const today = data.appointments.filter(
    (item) =>
      item.date === data.day &&
      !["cancelled", "waitlisted"].includes(item.status),
  ).length;
  const values =
    period === "week"
      ? [6, 9, 8, 13, 10, 15, today]
      : [27, 39, 33, 49, 43, 61, 54];
  const previous =
    period === "week"
      ? [4, 6, 5, 9, 7, 10, Math.max(4, today - 4)]
      : [20, 29, 28, 35, 31, 44, 40];
  const max = period === "week" ? Math.max(20, Math.ceil(today / 5) * 5) : 80;
  const labels =
    period === "week"
      ? ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
      : ["۱", "۵", "۱۰", "۱۵", "۲۰", "۲۵", "۳۰"];
  const width = 650,
    height = 166,
    left = 16,
    top = 14,
    bottom = 180;
  const points = (items: number[]) =>
    items.map((value, index) => ({
      x: left + index * 98,
      y: top + height - (value / max) * height,
    }));
  function path(items: number[]) {
    const pts = points(items);
    return pts
      .map((point, index) =>
        index === 0
          ? `M${point.x},${point.y}`
          : `C${pts[index - 1].x + 42},${pts[index - 1].y} ${point.x - 42},${point.y} ${point.x},${point.y}`,
      )
      .join(" ");
  }
  const currentPoints = points(values);
  return (
    <section
      className={`panel chart-panel ${expanded ? "chart-expanded" : ""}`}
    >
      <PanelHeader
        title="روند مراجعه بیماران"
        subtitle="مقایسه تعداد مراجعین در بازه زمانی انتخاب‌شده"
      >
        <select
          className="quiet-select"
          aria-label="بازه نمودار مراجعات"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="week">این هفته</option>
          <option value="month">این ماه</option>
        </select>
      </PanelHeader>
      <div className="chart-legend">
        <span>
          <i style={{ background: "var(--accent)" }} />
          {period === "week" ? "هفته جاری" : "ماه جاری"}
        </span>
        <span>
          <i className="legend-previous" />
          {period === "week" ? "هفته گذشته" : "ماه گذشته"}
        </span>
        <strong>
          {fa(values.reduce((sum, value) => sum + value, 0))}
          <small> مراجعه</small>
        </strong>
      </div>
      <div className="area-chart" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${width} 218`}
          role="img"
          aria-label="نمودار مقایسه مراجعات فعلی و دوره گذشته"
        >
          <defs>
            <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4d89f5" stopOpacity=".19" />
              <stop offset="100%" stopColor="#4d89f5" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((index) => (
            <g key={index}>
              <line
                x1={left}
                y1={top + (index * height) / 4}
                x2="608"
                y2={top + (index * height) / 4}
                className="chart-grid"
              />
              <text
                x="638"
                y={top + (index * height) / 4 + 4}
                className="chart-label"
                textAnchor="middle"
              >
                {fa(max - (index * max) / 4)}
              </text>
            </g>
          ))}
          <path
            d={`${path(values)} L604,${bottom} L16,${bottom} Z`}
            fill="url(#area-fill)"
          />
          <path
            d={path(previous)}
            fill="none"
            className="previous-line"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <path
            d={path(values)}
            fill="none"
            className="current-line"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {currentPoints.map((point, index) => (
            <g key={index} onMouseEnter={() => setHover(index)}>
              <rect
                x={point.x - 32}
                y="0"
                width="64"
                height="186"
                fill="transparent"
              />
              {(index === 5 || hover === index) && (
                <>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="7"
                    fill="var(--surface)"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="2.5"
                    fill="var(--accent)"
                  />
                </>
              )}
              {hover === index && (
                <g>
                  <rect
                    x={Math.min(Math.max(point.x - 41, 0), 550)}
                    y={Math.max(point.y - 36, 0)}
                    width="83"
                    height="25"
                    rx="6"
                    fill="var(--accent)"
                  />
                  <text
                    x={Math.min(Math.max(point.x, 41), 591)}
                    y={Math.max(point.y - 19, 17)}
                    fill="white"
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {fa(values[index])} مراجعه
                  </text>
                </g>
              )}
              <text
                x={point.x}
                y="207"
                className="chart-label"
                textAnchor="middle"
              >
                {labels[index]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

const specialtyColors = [
  "#427ff0",
  "#45b9ac",
  "#8b89e2",
  "#efb36e",
  "#68a9d4",
  "#c0c9dd",
];

export function SpecialtyChart() {
  const { data } = useClinic();
  const [selected, setSelected] = useState<string | null>(null);
  const appointments = data.appointments.filter(
    (item) =>
      item.date === data.day &&
      !["cancelled", "waitlisted"].includes(item.status),
  );
  const groups = specialties.map((name, index) => ({
    name,
    count: appointments.filter(
      (item) =>
        data.doctors.find((doctor) => doctor.id === item.doctorId)
          ?.specialty === name,
    ).length,
    color: specialtyColors[index],
  }));
  const total = appointments.length;
  let offset = 0;
  return (
    <section className="panel specialty-panel">
      <PanelHeader
        title="مراجعات به تفکیک تخصص"
        subtitle="توزیع مراجعین امروز کلینیک"
      />
      <div className="specialty-content">
        <div className="donut-chart">
          <svg
            viewBox="0 0 170 170"
            role="img"
            aria-label="توزیع مراجعات بر اساس تخصص"
          >
            <circle
              cx="85"
              cy="85"
              r="63"
              fill="none"
              stroke="var(--line)"
              strokeWidth="18"
            />
            {groups
              .filter((group) => group.count)
              .map((group) => {
                const length = (group.count / Math.max(total, 1)) * 395.84;
                const currentOffset = offset;
                offset += length;
                return (
                  <circle
                    key={group.name}
                    cx="85"
                    cy="85"
                    r="63"
                    fill="none"
                    stroke={group.color}
                    strokeWidth={selected === group.name ? 23 : 18}
                    strokeDasharray={`${Math.max(length - 4, 0)} ${395.84 - Math.max(length - 4, 0)}`}
                    strokeDashoffset={-currentOffset}
                    transform="rotate(-90 85 85)"
                    className="donut-segment"
                    onClick={() =>
                      setSelected(selected === group.name ? null : group.name)
                    }
                  >
                    <title>
                      {group.name}: {fa(group.count)} مراجعه
                    </title>
                  </circle>
                );
              })}
          </svg>
          <div className="donut-center">
            <strong>
              {fa(
                selected
                  ? groups.find((group) => group.name === selected)?.count || 0
                  : total,
              )}
            </strong>
            <span>{selected ? "مراجعه در این تخصص" : "مجموع مراجعه"}</span>
          </div>
        </div>
        <div className="specialty-legend">
          {groups.map((group) => (
            <button
              key={group.name}
              className={selected === group.name ? "legend-selected" : ""}
              onClick={() =>
                setSelected(selected === group.name ? null : group.name)
              }
            >
              <span>
                <i style={{ background: group.color }} />
                {group.name}
              </span>
              <strong>{fa(group.count)}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="panel-footnote">
        <span className="tiny-dot" />
        {selected
          ? `تخصص انتخاب‌شده: ${selected}`
          : "قلب و عروق، پرمراجعه‌ترین تخصص امروز"}
      </div>
    </section>
  );
}

export function DoctorPresence() {
  const { data, navigate, setModal } = useClinic();
  const doctors = data.doctors.filter((doctor) => doctor.status !== "off");
  return (
    <section className="panel doctors-presence">
      <PanelHeader title="پزشکان حاضر">
        <span className="soft-count">{fa(doctors.length)} پزشک</span>
      </PanelHeader>
      <div className="presence-list">
        {doctors.slice(0, 4).map((doctor) => (
          <button
            className="presence-person"
            key={doctor.id}
            onClick={() => setModal({ type: "doctor", id: doctor.id })}
          >
            <Avatar name={doctor.name} src={doctor.avatar} />
            <span className="presence-name">
              <strong>{doctor.name}</strong>
              <small>
                {doctor.specialty} <span>•</span> اتاق {doctor.room}
              </small>
            </span>
            <span
              className={`presence-status ${doctor.status === "available" ? "available" : ""}`}
            >
              <i />
              {doctor.status === "available" ? "آماده" : "در ویزیت"}
            </span>
          </button>
        ))}
      </div>
      <div className="presence-footer">
        <LinkButton onClick={() => navigate("doctors")}>
          مشاهده همه پزشکان
        </LinkButton>
      </div>
    </section>
  );
}

interface Metric {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  color: string;
  page: Page;
  note: string;
  trend?: string;
  down?: boolean;
}

function DashboardMetrics({ appointments }: { appointments: Appointment[] }) {
  const { data, role, navigate, patientId } = useClinic();
  const visits = appointments.filter(
    (item) => !["cancelled", "waitlisted"].includes(item.status),
  );
  const income = invoices(data)
    .filter((item) =>
      role === "patient"
        ? item.patientId === patientId
        : item.date === data.day,
    )
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.patientShare, 0);
  const waiting = visits.filter((item) =>
    ["waiting", "ready"].includes(item.status),
  ).length;
  let metrics: Metric[] =
    role === "patient"
      ? [
          {
            title: "نوبت‌های پیش رو",
            value: visits.filter((item) => item.status !== "completed").length,
            unit: "نوبت",
            icon: CalendarCheck2,
            color: "blue",
            page: "appointments" as const,
            note: "برنامه مراقبت از سلامت شما",
          },
          {
            title: "ویزیت‌های انجام‌شده",
            value: visits.filter((item) => item.status === "completed").length,
            unit: "ویزیت",
            icon: Stethoscope,
            color: "teal",
            page: "history" as const,
            note: "سوابق پزشکی در دسترس شماست",
          },
          {
            title: "نسخه‌های الکترونیک",
            value: data.prescriptions.filter(
              (item) => item.patientId === patientId,
            ).length,
            unit: "نسخه",
            icon: Wallet,
            color: "violet",
            page: "prescriptions" as const,
            note: "کدهای رهگیری و دستورات پزشک",
          },
          {
            title: "پرداخت‌های من",
            value: money(income),
            unit: "تومان",
            icon: Wallet,
            color: "amber",
            page: "payments" as const,
            note: "مجموع پرداخت‌های ثبت‌شده",
          },
        ]
      : [
          {
            title: "مراجعین امروز",
            value: visits.length,
            unit: "نفر",
            icon: UsersRound,
            color: "blue",
            page: "appointments" as const,
            trend: "۱۸٪",
            note: "نسبت به روز گذشته",
          },
          {
            title: "درآمد امروز",
            value: money(income),
            unit: "تومان",
            icon: Wallet,
            color: "teal",
            page:
              role === "physician" || role === "nursing" || role === "reception"
                ? ("appointments" as const)
                : ("finance" as const),
            trend: "۱۲٪",
            note: "نسبت به روز گذشته",
          },
          {
            title: "پزشکان فعال",
            value: data.doctors.filter((doctor) => doctor.status !== "off")
              .length,
            unit: "پزشک",
            icon: Stethoscope,
            color: "violet",
            page:
              role === "management"
                ? ("doctors" as const)
                : ("appointments" as const),
            note: `از ${fa(data.doctors.length)} پزشک برنامه‌ریزی‌شده`,
          },
          {
            title: "بیماران در انتظار",
            value: waiting,
            unit: "نفر",
            icon: Clock3,
            color: "amber",
            page:
              role === "nursing"
                ? ("triage" as const)
                : ("appointments" as const),
            note: "میانگین زمان انتظار: ۱۸ دقیقه",
            down: true,
          },
        ];
  if (role === "physician")
    metrics = [
      {
        title: "بیماران امروز من",
        value: visits.length,
        unit: "نفر",
        icon: UsersRound,
        color: "blue",
        page: "appointments",
        note: "بر اساس برنامه امروز شما",
      },
      {
        title: "ویزیت تکمیل‌شده",
        value: visits.filter((item) => item.status === "completed").length,
        unit: "ویزیت",
        icon: Stethoscope,
        color: "teal",
        page: "visits",
        note: "ویزیت‌های ثبت‌شده امروز",
      },
      {
        title: "نسخه‌های ثبت‌شده",
        value: data.prescriptions.filter(
          (item) => item.doctorId === currentDoctorId,
        ).length,
        unit: "نسخه",
        icon: Wallet,
        color: "violet",
        page: "prescriptions",
        note: "نسخه‌ها و ارجاعات محلی",
      },
      {
        title: "در انتظار ویزیت",
        value: waiting,
        unit: "نفر",
        icon: Clock3,
        color: "amber",
        page: "queue",
        note: "بیماران آماده و در انتظار",
      },
    ];
  if (role === "nursing")
    metrics = [
      {
        title: "در انتظار تریاژ",
        value: visits.filter(
          (item) => item.status === "waiting" && !item.vitals,
        ).length,
        unit: "نفر",
        icon: UsersRound,
        color: "blue",
        page: "triage",
        note: "نیازمند ثبت علائم حیاتی",
      },
      {
        title: "آماده ویزیت",
        value: visits.filter((item) => item.status === "ready").length,
        unit: "نفر",
        icon: Stethoscope,
        color: "teal",
        page: "triage",
        note: "ارزیابی اولیه تکمیل شده",
      },
      {
        title: "خدمات در انتظار",
        value: data.procedures.filter(
          (item) => !item.urgent && item.status === "pending",
        ).length,
        unit: "خدمت",
        icon: CalendarCheck2,
        color: "violet",
        page: "procedures",
        note: "دستورات خدمات سرپایی",
      },
      {
        title: "موارد فوری",
        value: data.procedures.filter(
          (item) => item.urgent && item.status === "pending",
        ).length,
        unit: "مورد",
        icon: Clock3,
        color: "amber",
        page: "emergency",
        note: "نیازمند رسیدگی فوری",
      },
    ];
  if (role === "reception")
    metrics[1] = {
      title: "پرونده‌های بیماران",
      value: data.patients.length,
      unit: "پرونده",
      icon: UsersRound,
      color: "teal",
      page: "patients",
      note: "پرونده‌های ثبت‌شده کلینیک",
    };
  if (role === "finance")
    metrics = [
      {
        title: "فاکتورهای امروز",
        value: invoices(data).filter((item) => item.date === data.day).length,
        unit: "فاکتور",
        icon: CalendarCheck2,
        color: "blue",
        page: "finance",
        note: "فاکتورهای فعال صندوق",
      },
      {
        title: "وصولی امروز",
        value: money(income),
        unit: "تومان",
        icon: Wallet,
        color: "teal",
        page: "finance",
        note: "پرداخت‌های ثبت‌شده",
      },
      {
        title: "بسته‌های بیمه",
        value: data.claims.length,
        unit: "بسته",
        icon: Stethoscope,
        color: "violet",
        page: "insurance",
        note: "بسته‌های محلی اسناد",
      },
      {
        title: "فاکتور باز",
        value: invoices(data).filter(
          (item) => item.date === data.day && !item.paid,
        ).length,
        unit: "فاکتور",
        icon: Clock3,
        color: "amber",
        page: "finance",
        note: "در انتظار تسویه بیمار",
      },
    ];
  return (
    <div className="metrics-grid">
      {metrics.map((metric, index) => (
        <button
          className={`metric-card enter-up stagger-${index + 1}`}
          key={metric.title}
          onClick={() => navigate(metric.page)}
        >
          <div className="metric-top">
            <span>{metric.title}</span>
            <span className={`metric-icon icon-${metric.color}`}>
              <metric.icon size={21} strokeWidth={1.6} />
            </span>
          </div>
          <div className="metric-value">
            {typeof metric.value === "number" ? fa(metric.value) : metric.value}
            <small>{metric.unit}</small>
            <svg
              className={`metric-sparkline spark-${metric.color}`}
              viewBox="0 0 82 30"
              aria-hidden="true"
            >
              <path
                d={
                  index % 2 === 0
                    ? "M1 26 12 20 22 22 32 12 43 16 54 7 66 11 80 2"
                    : "M1 25 13 21 22 25 34 16 44 19 55 11 66 14 80 4"
                }
              />
            </svg>
          </div>
          <div className="metric-bottom">
            {"trend" in metric && metric.trend ? (
              <Trend value={metric.trend} label={metric.note} />
            ) : (
              <span className="metric-note">
                {"down" in metric && metric.down && (
                  <ArrowDownLeft size={13} className="text-positive" />
                )}
                {metric.note}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { role } = useClinic();
  return role === "patient" ? <PatientDashboard /> : <StaffDashboard />;
}

function StaffDashboard() {
  const { data, role, navigate, setModal, toast, patientId } = useClinic();
  const [tab, setTab] = useState("all");
  const isManager = role === "management";
  const appointmentPage: Page =
    role === "finance"
      ? "finance"
      : role === "nursing"
        ? "triage"
        : "appointments";
  const appointments = data.appointments.filter((item) =>
    role === "patient"
      ? item.patientId === patientId
      : item.date === data.day &&
        (role !== "physician" || item.doctorId === currentDoctorId),
  );
  const filtered = appointments.filter(
    (item) =>
      tab === "all" ||
      (tab === "waiting"
        ? ["waiting", "ready"].includes(item.status)
        : item.status === tab),
  );
  function exportToday() {
    const rows: (string | number)[][] = [
      ["بیمار", "پزشک", "ساعت", "سهم بیمار", "پرداخت شده"],
    ];
    appointments.forEach((item) =>
      rows.push([
        data.patients.find((patient) => patient.id === item.patientId)?.name ||
          "",
        data.doctors.find((doctor) => doctor.id === item.doctorId)?.name || "",
        item.time,
        item.patientShare,
        item.paid ? "بله" : "خیر",
      ]),
    );
    downloadFile(`nabz-${data.day}.csv`, csv(rows));
    toast("گزارش امروز دانلود شد.");
  }
  const title =
    role === "patient"
      ? "مریم عزیز، به نبض خوش آمدید"
      : isManager
        ? "داشبورد مدیریتی"
        : `داشبورد ${roleNames[role]}`;
  return (
    <div className="dashboard-page">
      <PageHeader
        title={title}
        subtitle={
          role === "patient"
            ? "همراه شما در مسیر سلامتی، از رزرو نوبت تا پیگیری درمان."
            : "یک نگاه جامع به عملکرد امروز کلینیک؛ برای مراقبتی بهتر."
        }
      >
        <button
          className="button secondary export-button"
          onClick={exportToday}
        >
          <Download size={17} />
          دریافت گزارش
        </button>
        {["management", "reception", "patient"].includes(role) && (
          <NewAppointmentButton
            label={role === "patient" ? "رزرو نوبت جدید" : "پذیرش جدید"}
          />
        )}
      </PageHeader>
      <DashboardMetrics appointments={appointments} />
      {isManager || role === "finance" || role === "reception" ? (
        <div className="analytics-grid enter-up stagger-3">
          <AreaChart />
          <SpecialtyChart />
        </div>
      ) : (
        <section className="welcome-workspace enter-up">
          <div className="workspace-symbol">
            <Stethoscope size={32} strokeWidth={1.4} />
          </div>
          <div>
            <span className="eyebrow">{persianDate(data.day, true)}</span>
            <h2>
              {role === "patient"
                ? "سلامت شما، اولویت ماست."
                : role === "physician"
                  ? "برای یک روز سرشار از مراقبت آماده‌اید؟"
                  : "مراقبت خوب، از توجه شما شروع می‌شود."}
            </h2>
            <p>
              {role === "patient"
                ? "نوبت‌ها، سوابق و نسخه‌هایتان را از همین‌جا مدیریت کنید."
                : `امروز ${fa(appointments.filter((item) => ["waiting", "ready", "visiting"].includes(item.status)).length)} بیمار در مسیر دریافت خدمات شما هستند.`}
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              role === "patient"
                ? navigate("booking")
                : navigate(role === "nursing" ? "triage" : "visits")
            }
          >
            {role === "patient" ? "پیدا کردن پزشک" : "شروع رسیدگی"}
            <ArrowUpLeft size={17} />
          </button>
        </section>
      )}
      <div
        className={`operations-grid enter-up stagger-4 ${!isManager ? "operations-full" : ""}`}
      >
        <section className="panel appointments-panel">
          <PanelHeader
            title={role === "patient" ? "نوبت‌های من" : "نوبت‌های امروز"}
          >
            <LinkButton onClick={() => navigate(appointmentPage)}>
              مشاهده همه نوبت‌ها
            </LinkButton>
          </PanelHeader>
          <div className="table-tabs">
            <button
              className={tab === "all" ? "active" : ""}
              onClick={() => setTab("all")}
            >
              همه نوبت‌ها<span>{fa(appointments.length)}</span>
            </button>
            <button
              className={tab === "waiting" ? "active" : ""}
              onClick={() => setTab("waiting")}
            >
              در انتظار
            </button>
            <button
              className={tab === "visiting" ? "active" : ""}
              onClick={() => setTab("visiting")}
            >
              در حال ویزیت
            </button>
            <button
              className={tab === "completed" ? "active" : ""}
              onClick={() => setTab("completed")}
            >
              ویزیت شده
            </button>
            <span className="table-date">
              <CalendarCheck2 size={14} />
              {persianDate(data.day).split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
          <AppointmentTable appointments={filtered.slice(0, 5)} compact />
          <div className="table-bottom">
            <span>
              نمایش {fa(Math.min(5, filtered.length))} نوبت از{" "}
              {fa(filtered.length)} نوبت
            </span>
            <button onClick={() => navigate(appointmentPage)}>
              مدیریت نوبت‌ها
              <ChevronDown size={14} />
            </button>
          </div>
        </section>
        {isManager && <DoctorPresence />}
      </div>
      <div className="dashboard-bottom">
        <span>
          <span className="live-dot" />
          اطلاعات در همین مرورگر به‌روزرسانی می‌شوند
        </span>
        <button
          onClick={() =>
            setModal({
              type: "confirm",
              title: "درباره نسخه نمایشی نبض",
              description:
                "این سامانه کاملاً مستقل و بدون بک‌اند است. تمام داده‌ها در مرورگر شما ذخیره می‌شوند. پیامک، پرداخت، استعلام بیمه و نسخه‌نویسی فقط شبیه‌سازی می‌شوند و به سرویس واقعی متصل نیستند.",
              onConfirm: () => setModal(null),
            })
          }
        >
          نسخه نمایشی نبض <span>۱.۰.۰</span>
        </button>
      </div>
    </div>
  );
}
