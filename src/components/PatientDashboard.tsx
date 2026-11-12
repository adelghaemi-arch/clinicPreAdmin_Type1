import {
  CalendarCheck2,
  CalendarPlus,
  ChevronLeft,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { fa, money, persianDate, shiftDate } from "../data";
import { careFocus, getIntake, getQuestions, intakeProgress } from "../intake";
import { vitalFlags } from "../insights";
import { invoices } from "../invoices";
import { useClinic } from "../store";
import type { Appointment } from "../types";
import { usePatientRecord } from "./HealthRecord";
import PatientSwitcher from "./PatientSwitcher";
import { SmartHint } from "./Smart";
import { Avatar, EmptyState, PageHeader, StatusBadge } from "./ui";

const shortDate = (date: string) =>
  persianDate(date).split(" ").slice(0, 2).join(" ");

export default function PatientDashboard() {
  const { data, patientId, navigate, setModal } = useClinic();
  const record = usePatientRecord(patientId);
  const me = record.patient;
  if (!me || !record.focus) return <EmptyState title="پرونده بیمار پیدا نشد" />;
  const { events, prescriptions, vitals, trend, next, doctor } = record;
  const byDateDesc = (a: Appointment, b: Appointment) =>
    b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
  const mine = data.appointments.filter((item) => item.patientId === me.id);
  const upcoming = mine
    .filter(
      (item) =>
        item.date >= data.day &&
        !["cancelled", "completed"].includes(item.status),
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  const past = mine
    .filter((item) => item.status === "completed")
    .sort(byDateDesc);
  const bills = invoices(data).filter((item) => item.patientId === me.id);
  const open = bills.filter((item) => !item.paid);
  const paid = bills.filter((item) => item.paid);
  const openTotal = open.reduce((sum, item) => sum + item.patientShare, 0);
  const covered = paid.reduce(
    (sum, item) => sum + item.total - item.patientShare,
    0,
  );
  const services = data.procedures.filter(
    (item) => item.patientId === me.id && item.status === "pending",
  );
  const flags = vitalFlags(vitals);
  const focus = careFocus(me, doctor);
  const intake = next ? getIntake(data, next.id) : undefined;
  const questions = getQuestions(me, doctor, data);
  const progress = intakeProgress(intake, questions);
  const intakeDone = intake?.status === "submitted" && progress.complete;
  const firstMissing = progress.missing[0];
  const surgery = events.find(
    (event) => event.kind === "surgery" || event.kind === "hospitalization",
  );
  const episode = events.find((event) => event.kind === "episode");
  const documents = events.filter((event) => event.kind === "document");
  const lastRx = prescriptions[0];
  const allergy = me.allergy !== "ندارد" ? me.allergy : "";
  const dayLabel = !next
    ? ""
    : next.date === data.day
      ? "امروز"
      : next.date === shiftDate(data.day, 1)
        ? "فردا"
        : persianDate(next.date, true);
  const ahead =
    next && next.date === data.day
      ? data.appointments.filter(
          (item) =>
            item.date === data.day &&
            item.doctorId === next.doctorId &&
            item.id !== next.id &&
            ["waiting", "ready", "visiting"].includes(item.status) &&
            item.time < next.time,
        ).length
      : 0;
  const weight = Number(vitals?.weight);
  const height = Number(vitals?.height) / 100;
  const bmi = weight && height ? weight / (height * height) : 0;
  const profilePercent = Math.round(
    ([
      me.maritalStatus !== "نامشخص",
      !!me.occupation,
      !!me.emergencyContact.name,
      !!me.currentMedications,
      me.smoking !== "نامشخص",
      events.some((e) => e.kind === "surgery") ||
        events.some((e) => e.kind === "hospitalization"),
    ].filter(Boolean).length /
      6) *
      100,
  );

  const stats = [
    {
      label: "نوبت فعال",
      value: fa(upcoming.length),
      icon: CalendarCheck2,
      tone: "blue",
      page: "appointments" as const,
    },
    {
      label: "ویزیت انجام‌شده",
      value: fa(past.length),
      icon: Stethoscope,
      tone: "teal",
      page: "history" as const,
    },
    {
      label: "نسخه",
      value: fa(prescriptions.length),
      icon: FileText,
      tone: "violet",
      page: "prescriptions" as const,
    },
    {
      label: "خدمت باز",
      value: fa(services.length),
      icon: FlaskConical,
      tone: "blue",
      page: "history" as const,
    },
    {
      label: "بدهی باز",
      value: openTotal ? money(openTotal) : "۰",
      unit: openTotal ? "تومان" : "",
      icon: Wallet,
      tone: "amber",
      page: "payments" as const,
    },
    {
      label: "تکمیل پرونده",
      value: `${fa(profilePercent)}٪`,
      icon: ClipboardList,
      tone: "teal",
      page: "history" as const,
    },
  ];
  const tasks = [
    ...(next && !intakeDone
      ? [
          {
            key: "intake",
            icon: ClipboardList,
            tone: "warn",
            title: "تکمیل پرسش‌های ویزیت",
            meta: `${fa(progress.missing.length)} پرسش ضروری باقی مانده`,
            label: "شروع",
            action: () => setModal({ type: "intake", appointmentId: next.id }),
          },
        ]
      : []),
    ...open.slice(0, 2).map((item) => ({
      key: item.id,
      icon: CreditCard,
      tone: "warn",
      title: `پرداخت ${item.serviceName}`,
      meta: `${money(item.patientShare)} تومان • ${shortDate(item.date)}`,
      label: "پرداخت",
      action: () => setModal({ type: "pay", appointmentId: item.id }),
    })),
    ...services.slice(0, 2).map((item) => ({
      key: item.id,
      icon: FlaskConical,
      tone: "info",
      title: item.name,
      meta: "در انتظار انجام در کلینیک",
      label: "",
      action: undefined,
    })),
  ].slice(0, 4);

  return (
    <div className="pd">
      <PageHeader
        hints={false}
        title={`${me.name.split(" ")[0]} عزیز، سلام`}
        subtitle={persianDate(data.day, true)}
      >
        <PatientSwitcher compact />
        {next && (
          <button
            className={`button ${intakeDone ? "secondary" : "primary"}`}
            onClick={() => setModal({ type: "intake", appointmentId: next.id })}
          >
            <ClipboardList size={17} />
            {intakeDone
              ? "پاسخ‌ها ثبت شده"
              : `تکمیل پرونده • ${fa(progress.percent)}٪`}
          </button>
        )}
        <button
          className="button secondary"
          onClick={() => navigate("booking")}
        >
          <CalendarPlus size={17} />
          رزرو نوبت
        </button>
      </PageHeader>
      <SmartHint />

      <div className="pd-top">
        <section className="pd-card pd-next">
          <header className="pd-head">
            <span>
              <CalendarCheck2 size={15} />
              نوبت بعدی
            </span>
            {next && <StatusBadge status={next.status} />}
          </header>
          {next && doctor ? (
            <>
              <div className="pd-next-main">
                <div className="pd-when">
                  <strong>
                    {next.status === "waitlisted" ? "—" : fa(next.time)}
                  </strong>
                  <span>
                    {next.status === "waitlisted" ? "لیست انتظار" : dayLabel}
                  </span>
                </div>
                <div className="pd-doc">
                  <Avatar name={doctor.name} src={doctor.avatar} />
                  <div>
                    <b>{doctor.name}</b>
                    <small>
                      {doctor.specialty} • اتاق {doctor.room}
                    </small>
                  </div>
                </div>
              </div>
              <div className="pd-tags">
                {next.date === data.day && next.status !== "waitlisted" && (
                  <span>
                    <Clock3 size={13} />
                    {ahead
                      ? `${fa(ahead)} نفر جلوتر • حدود ${fa(ahead * 15)} دقیقه`
                      : "نفر بعدی صف"}
                  </span>
                )}
                {next.status !== "waitlisted" && (
                  <span className={next.paid ? "is-good" : "is-warn"}>
                    <CreditCard size={13} />
                    {next.paid
                      ? "پرداخت شده"
                      : `${money(next.patientShare)} تومان پرداخت‌نشده`}
                  </span>
                )}
                {next.total > next.patientShare && (
                  <span>
                    <ShieldCheck size={13} />
                    سهم بیمه {money(next.total - next.patientShare)}
                  </span>
                )}
              </div>
              <div className="pd-actions">
                {!next.paid && next.status !== "waitlisted" && (
                  <button
                    className="button primary small"
                    onClick={() =>
                      setModal({ type: "pay", appointmentId: next.id })
                    }
                  >
                    پرداخت
                  </button>
                )}
                {["scheduled", "waiting", "waitlisted"].includes(
                  next.status,
                ) && (
                  <button
                    className="button secondary small"
                    onClick={() =>
                      setModal({ type: "appointment", appointmentId: next.id })
                    }
                  >
                    جابه‌جایی
                  </button>
                )}
                {upcoming.length > 1 && (
                  <button
                    className="text-action"
                    onClick={() => navigate("appointments")}
                  >
                    {fa(upcoming.length - 1)} نوبت دیگر
                    <ChevronLeft size={14} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="pd-empty">
              <p>نوبت فعالی ندارید.</p>
              <button
                className="button primary small"
                onClick={() => navigate("booking")}
              >
                رزرو نوبت
              </button>
            </div>
          )}
        </section>

        <section className={`pd-card pd-intake ${intakeDone ? "is-done" : ""}`}>
          <header className="pd-head">
            <span>
              <Sparkles size={15} />
              آمادگی ویزیت
            </span>
            <b className="pd-count">{fa(progress.percent)}٪</b>
          </header>
          <b className="pd-intake-title">
            {focus.title.replace("تمرکز امروز: ", "برای ویزیت ")}
          </b>
          <p className="pd-intake-note">
            {intakeDone
              ? "پاسخ‌های شما ثبت شده و پزشک پیش از ویزیت آن‌ها را می‌بیند."
              : firstMissing
                ? `پرسش بعدی: ${firstMissing.prompt}`
                : "پرسش‌های متناسب با سن، جنسیت و تخصص ویزیت آماده است."}
          </p>
          <div className="pd-progress">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="pd-intake-meta">
            <span>
              {fa(progress.answered)} از {fa(progress.required)} پاسخ ضروری
            </span>
            <span>حدود ۳ دقیقه</span>
            <span>
              {intake?.status === "submitted"
                ? "ثبت شده"
                : intake
                  ? "پیش‌نویس"
                  : "شروع نشده"}
            </span>
          </div>
          <div className="pd-actions">
            {next ? (
              <button
                className={`button small ${intakeDone ? "secondary" : "primary"}`}
                onClick={() =>
                  setModal({ type: "intake", appointmentId: next.id })
                }
              >
                {intakeDone
                  ? "مشاهده پاسخ‌ها"
                  : intake
                    ? "ادامه پرسش‌ها"
                    : "شروع پرسش‌ها"}
              </button>
            ) : (
              <button
                className="button secondary small"
                onClick={() => navigate("history")}
              >
                پرونده من
              </button>
            )}
            <button className="text-action" onClick={() => navigate("history")}>
              پرونده کامل
              <ChevronLeft size={14} />
            </button>
          </div>
        </section>

        <section className="pd-card pd-health">
          <header className="pd-head">
            <span>
              <HeartPulse size={15} />
              سلامت من
            </span>
            <button className="text-action" onClick={() => navigate("history")}>
              پرونده
              <ChevronLeft size={14} />
            </button>
          </header>
          <div className="pd-id">
            <span className="pd-blood" dir="ltr">
              {me.bloodType}
            </span>
            <div>
              <b>
                {fa(me.age)} سال • {me.gender} • {me.maritalStatus}
              </b>
              <small>{me.insurance}</small>
            </div>
          </div>
          {allergy && (
            <p className="pd-allergy">
              <TriangleAlert size={13} />
              {allergy}
            </p>
          )}
          <div className="pd-vitals">
            <div
              className={`pd-vital ${flags.some((f) => f.includes("فشار")) ? "is-flagged" : ""}`}
            >
              <small>فشار</small>
              <strong dir="ltr">{vitals ? fa(vitals.pressure) : "—"}</strong>
            </div>
            <div className="pd-vital">
              <small>نبض</small>
              <strong dir="ltr">
                {vitals ? fa(vitals.pulse) : "—"}
                <span>bpm</span>
              </strong>
            </div>
            <div className="pd-vital">
              <small>دما</small>
              <strong dir="ltr">
                {vitals ? fa(vitals.temperature) : "—"}
                <span>°C</span>
              </strong>
            </div>
            <div
              className={`pd-vital ${bmi >= 25 || (!!bmi && bmi < 18.5) ? "is-flagged" : ""}`}
            >
              <small>BMI</small>
              <strong dir="ltr">{bmi ? fa(bmi.toFixed(1)) : "—"}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="pd-stats">
        {stats.map((item) => (
          <button
            key={item.label}
            className="pd-stat"
            onClick={() => navigate(item.page)}
          >
            <span className={`pd-stat-icon icon-${item.tone}`}>
              <item.icon size={17} />
            </span>
            <span>
              <strong>
                {item.value}
                {item.unit && <small> {item.unit}</small>}
              </strong>
              <small>{item.label}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="pd-middle">
        <section className="pd-card pd-ehr">
          <header className="pd-head">
            <span>
              <Stethoscope size={15} />
              پرونده من در یک نگاه
            </span>
            <div className="pd-tags">
              {focus.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </header>
          <div className="pd-ehr-grid">
            <div>
              <small>
                <Pill size={12} />
                بیماری‌ها و داروها
              </small>
              <b>{me.conditions.join("، ") || "بدون بیماری ثبت‌شده"}</b>
              <p>{me.currentMedications || "دارویی ثبت نشده"}</p>
            </div>
            <div>
              <small>
                <Scissors size={12} />
                عمل / بستری
              </small>
              <b>{surgery ? surgery.title : "ثبت نشده"}</b>
              <p>
                {surgery
                  ? `${shortDate(surgery.date)} • ${surgery.description}`
                  : "برای ویزیت امروز از شما پرسیده می‌شود."}
              </p>
            </div>
            <div>
              <small>
                <HeartPulse size={12} />
                آخرین بدحالی مرتبط
              </small>
              <b>{episode ? episode.title : "ثبت نشده"}</b>
              <p>
                {episode
                  ? `${shortDate(episode.date)} • ${episode.description}`
                  : "در پرسش‌های پیش از ویزیت ثبت کنید."}
              </p>
            </div>
            <div>
              <small>
                <FileText size={12} />
                مدارک
              </small>
              <b>{fa(documents.length)} مدرک پزشکی</b>
              <p>
                {documents[0]
                  ? `${documents[0].title} • ${shortDate(documents[0].date)}`
                  : "گزارش آزمایش یا تصویربرداری ثبت نشده"}
              </p>
            </div>
          </div>
          {trend.length > 1 && (
            <div className="pd-trend">
              <small>روند فشار خون</small>
              {trend.map((item) => (
                <span key={item.id}>
                  <i
                    style={{
                      height: `${Math.min(100, Number(item.vitals?.pressure.split("/")[0]) / 1.8)}%`,
                    }}
                  />
                  <b>{fa(item.vitals?.pressure.split("/")[0] || "")}</b>
                  <small>{shortDate(item.date)}</small>
                </span>
              ))}
            </div>
          )}
        </section>
        <section className="pd-card">
          <header className="pd-head">
            <span>کارهای من</span>
            <button className="text-action" onClick={() => navigate("inbox")}>
              کارتابل
              <ChevronLeft size={13} />
            </button>
            <b className="pd-count">{fa(tasks.length)}</b>
          </header>
          {tasks.length ? (
            <ul className="pd-list">
              {tasks.map((item) => (
                <li key={item.key}>
                  <span className={`pd-list-icon tone-${item.tone}`}>
                    <item.icon size={15} />
                  </span>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.meta}</small>
                  </div>
                  {item.action && (
                    <button className="text-action" onClick={item.action}>
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pd-muted">کار بازی ندارید.</p>
          )}
        </section>
      </div>

      <div className="pd-bottom">
        <section className="pd-card">
          <header className="pd-head">
            <span>
              <FileText size={15} />
              آخرین نسخه
            </span>
            {lastRx && (
              <button
                className="text-action"
                onClick={() => navigate("prescriptions")}
              >
                همه
                <ChevronLeft size={14} />
              </button>
            )}
          </header>
          {lastRx ? (
            <div className="pd-rx">
              <b>{lastRx.medicine}</b>
              <p>{lastRx.directions}</p>
              <div className="pd-tags">
                <span>{lastRx.diagnosis}</span>
                <span>کد {fa(lastRx.tracking)}</span>
                <span>{shortDate(lastRx.date)}</span>
              </div>
            </div>
          ) : (
            <p className="pd-muted">نسخه‌ای ثبت نشده است.</p>
          )}
        </section>
        <section className="pd-card">
          <header className="pd-head">
            <span>
              <Wallet size={15} />
              پرداخت و بیمه
            </span>
            <button
              className="text-action"
              onClick={() => navigate("payments")}
            >
              جزئیات
              <ChevronLeft size={14} />
            </button>
          </header>
          <div className="pd-pay">
            <div>
              <small>بدهی باز</small>
              <b className={openTotal ? "is-warn" : "is-good"}>
                {money(openTotal)} <small>تومان</small>
              </b>
            </div>
            <div>
              <small>پرداخت‌شده توسط بیمه</small>
              <b className="is-good">
                {money(covered)} <small>تومان</small>
              </b>
            </div>
          </div>
          <p className="pd-muted">
            {me.insurance} • {fa(paid.length)} فاکتور تسویه‌شده
          </p>
          {open[0] && (
            <button
              className="button primary small"
              onClick={() =>
                setModal({ type: "pay", appointmentId: open[0].id })
              }
            >
              پرداخت {money(open[0].patientShare)} تومان
            </button>
          )}
        </section>
        <section className="pd-card">
          <header className="pd-head">
            <span>
              <Stethoscope size={15} />
              ویزیت‌های اخیر
            </span>
            {past.length > 0 && (
              <button
                className="text-action"
                onClick={() => navigate("history")}
              >
                سوابق
                <ChevronLeft size={14} />
              </button>
            )}
          </header>
          {past.length ? (
            <ul className="pd-list">
              {past.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <span className="pd-date">{shortDate(item.date)}</span>
                  <div>
                    <b>{item.diagnosis || "ویزیت دوره‌ای"}</b>
                    <small>
                      {data.doctors.find((d) => d.id === item.doctorId)?.name}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pd-muted">هنوز ویزیتی ثبت نشده است.</p>
          )}
        </section>
      </div>
    </div>
  );
}
