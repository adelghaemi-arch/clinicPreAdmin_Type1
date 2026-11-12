import { useState } from "react";
import {
  ArrowLeft,
  CalendarCheck2,
  ClipboardList,
  CreditCard,
  FileHeart,
  FlaskConical,
  Plus,
  Sparkles,
} from "lucide-react";
import { fa, money, persianDate } from "../data";
import { getIntake, getQuestions, intakeProgress } from "../intake";
import { invoices } from "../invoices";
import { useClinic } from "../store";
import { usePatientRecord } from "./HealthRecord";
import PatientSwitcher from "./PatientSwitcher";
import { SmartHint } from "./Smart";
import { EmptyState, PageHeader } from "./ui";

export default function PatientInbox() {
  const { data, patientId, navigate, setModal } = useClinic();
  const record = usePatientRecord(patientId);
  const [filter, setFilter] = useState("all");
  if (!record.patient || !record.next)
    return (
      <EmptyState
        title="کارتابل شما مرتب است"
        description="برای شروع، یک نوبت پزشک رزرو کنید."
        action={
          <button
            className="button primary"
            onClick={() => navigate("booking")}
          >
            <Plus size={16} />
            رزرو نوبت
          </button>
        }
      />
    );
  const { patient, next, doctor } = record;
  const appointment = next!;
  const intake = getIntake(data, appointment.id);
  const questions = getQuestions(
    patient,
    data.doctors.find((item) => item.id === appointment.doctorId),
    data,
  );
  const progress = intakeProgress(intake, questions);
  const intakeDone = intake?.status === "submitted" && progress.complete;
  const unpaid = invoices(data).filter(
    (item) => item.patientId === patientId && !item.paid,
  );
  const services = data.procedures.filter(
    (item) => item.patientId === patientId && item.status === "pending",
  );
  const followUp = record.appointments.find(
    (item) => item.status === "completed" && item.notes,
  );
  const tasks = [
    ...(!intakeDone
      ? [
          {
            key: "intake",
            group: "health",
            icon: ClipboardList,
            tone: "blue",
            title: "تکمیل پرونده برای ویزیت امروز",
            description: `${fa(progress.answered)} از ${fa(progress.required)} پاسخ ضروری؛ علائم، سوابق و مدارک خود را به زبان خودتان بنویسید.`,
            meta: `${doctor?.name} | ${doctor?.specialty}`,
            label: "تکمیل پرونده",
            action: () =>
              setModal({ type: "intake", appointmentId: appointment.id }),
          },
        ]
      : []),
    ...unpaid.map((item) => ({
      key: item.id,
      group: "finance",
      icon: CreditCard,
      tone: "amber",
      title: `پرداخت ${item.serviceName}`,
      description: `سهم شما ${money(item.patientShare)} تومان؛ سهم بیمه ${money(item.total - item.patientShare)} تومان.`,
      meta: persianDate(item.date),
      label: "پرداخت نمایشی",
      action: () => setModal({ type: "pay", appointmentId: item.id }),
    })),
    ...services.map((item) => ({
      key: item.id,
      group: "health",
      icon: FlaskConical,
      tone: "violet",
      title: item.name,
      description: item.note,
      meta: "در انتظار انجام در کلینیک",
      label: "پرونده سلامت",
      action: () => setModal({ type: "record", patientId }),
    })),
    ...(followUp
      ? [
          {
            key: "follow",
            group: "appointments",
            icon: CalendarCheck2,
            tone: "teal",
            title: "پیگیری توصیه پزشک",
            description:
              followUp.notes || "برای بررسی وضعیت، نوبت پیگیری رزرو کنید.",
            meta: "از آخرین ویزیت شما",
            label: "رزرو پیگیری",
            action: () => navigate("booking"),
          },
        ]
      : []),
  ];
  const filtered = tasks.filter(
    (task) => filter === "all" || task.group === filter,
  );
  return (
    <>
      <PageHeader
        title="کارتابل من"
        subtitle="کارهای سلامت، نوبت‌ها و پرداخت‌های شما؛ مرتب و در یک نگاه."
      >
        <PatientSwitcher />
        <button className="button primary" onClick={() => navigate("booking")}>
          <Plus size={17} />
          رزرو نوبت
        </button>
      </PageHeader>
      <SmartHint />
      <div className="inbox-summary">
        <button onClick={() => setFilter("all")}>
          <ClipboardList size={21} />
          <strong>{fa(tasks.length)}</strong>
          <span>کار باز</span>
        </button>
        <button onClick={() => setFilter("health")}>
          <FileHeart size={21} />
          <strong>
            {fa(tasks.filter((task) => task.group === "health").length)}
          </strong>
          <span>پیگیری سلامت</span>
        </button>
        <button onClick={() => setFilter("finance")}>
          <CreditCard size={21} />
          <strong>{fa(unpaid.length)}</strong>
          <span>پرداخت باز</span>
        </button>
      </div>
      <section className="panel inbox-panel">
        <div className="table-tabs">
          {[
            ["all", "همه کارها"],
            ["health", "سلامت"],
            ["appointments", "نوبت‌ها"],
            ["finance", "مالی"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? "active" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inbox-task-list">
          {filtered.map((task) => (
            <article className="inbox-task" key={task.key}>
              <span className={`inbox-task-icon icon-${task.tone}`}>
                <task.icon size={23} />
              </span>
              <div>
                <h2>{task.title}</h2>
                <p>{task.description}</p>
                <small>{task.meta}</small>
              </div>
              <button
                className={`button small ${task.key === "intake" ? "primary" : "secondary"}`}
                onClick={task.action}
              >
                {task.label}
                <ArrowLeft size={14} />
              </button>
            </article>
          ))}
          {!filtered.length && (
            <EmptyState
              title="کار بازی در این بخش ندارید"
              description="همه چیز مرتب است؛ پیگیری بعدی را از همین‌جا شروع کنید."
            />
          )}
        </div>
      </section>
      {intakeDone && (
        <div className="inline-banner">
          <ClipboardList size={17} />
          پرسش‌های پیش از ویزیت ثبت شده؛ پاسخ‌ها و تحلیل در پرونده سلامت در
          دسترس است.
        </div>
      )}
      <div className="inbox-local-note">
        <Sparkles size={14} />
        این کارتابل فقط از اطلاعات همین مرورگر استفاده می‌کند؛ ارسال واقعی به
        پزشک یا بیمه انجام نمی‌شود.
      </div>
    </>
  );
}
