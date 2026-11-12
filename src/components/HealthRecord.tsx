import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  CalendarCheck2,
  ClipboardList,
  FileText,
  HeartPulse,
  Pencil,
  Phone,
  Pill,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { fa, persianDate, uid } from "../data";
import { careFocus, getQuestions, intakeProgress } from "../intake";
import { vitalFlags } from "../insights";
import { activity, useClinic } from "../store";
import type { MedicalEvent, MedicalEventKind } from "../types";
import { Avatar, EmptyState, Field, Modal } from "./ui";

const kindLabel: Record<MedicalEventKind, string> = {
  surgery: "عمل جراحی",
  hospitalization: "بستری",
  episode: "بدحالی / علامت",
  document: "مدرک پزشکی",
};
const kindIcon = {
  surgery: Scissors,
  hospitalization: Activity,
  episode: HeartPulse,
  document: FileText,
};

export function usePatientRecord(patientId: string) {
  const { data } = useClinic();
  return useMemo(() => {
    const patient = data.patients.find((item) => item.id === patientId);
    const appointments = data.appointments
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const next = [...appointments]
      .reverse()
      .find(
        (item) =>
          item.date >= data.day &&
          !["cancelled", "completed"].includes(item.status),
      );
    const doctor = data.doctors.find((item) => item.id === next?.doctorId);
    const events = data.medicalEvents
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const prescriptions = data.prescriptions
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const intakes = data.intakes
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const vitals = appointments.find((item) => item.vitals)?.vitals;
    const trend = appointments
      .filter((item) => item.vitals)
      .slice(0, 5)
      .reverse();
    return {
      patient,
      appointments,
      next,
      doctor,
      events,
      prescriptions,
      intakes,
      vitals,
      trend,
      focus: patient ? careFocus(patient, doctor) : null,
    };
  }, [data, patientId]);
}

/** Compact, personalized summary shown inside the physician's visit form. */
export function PatientContextSummary({
  patientId,
  appointmentId,
}: {
  patientId: string;
  appointmentId?: string;
}) {
  const { data, setModal } = useClinic();
  const record = usePatientRecord(patientId);
  const { patient, focus, events, vitals } = record;
  if (!patient || !focus) return null;
  const appointment =
    data.appointments.find((item) => item.id === appointmentId) || record.next;
  const doctor =
    data.doctors.find((item) => item.id === appointment?.doctorId) ||
    record.doctor;
  const intake = data.intakes.find(
    (item) => item.appointmentId === appointment?.id,
  );
  const questions = getQuestions(patient, doctor, data);
  const progress = intakeProgress(intake, questions);
  const episode = events.find((event) => event.kind === "episode");
  const surgery = events.find(
    (event) => event.kind === "surgery" || event.kind === "hospitalization",
  );
  const flags = vitalFlags(vitals);
  return (
    <section className="context-summary span-2">
      <div className="context-summary-head">
        <span>
          <Sparkles size={15} />
          {focus.title}
        </span>
        <button
          type="button"
          className="text-action"
          onClick={() => setModal({ type: "healthRecord", patientId })}
        >
          پرونده کامل
        </button>
      </div>
      <div className="context-summary-grid">
        <div>
          <small>مشخصات</small>
          <b>
            {fa(patient.age)} سال • {patient.gender} • {patient.maritalStatus}
          </b>
          <span>{patient.conditions.join("، ") || "بدون بیماری ثبت‌شده"}</span>
        </div>
        <div className={patient.allergy !== "ندارد" ? "is-alert" : ""}>
          <small>حساسیت</small>
          <b>{patient.allergy}</b>
          <span>{patient.currentMedications || "دارویی ثبت نشده"}</span>
        </div>
        <div>
          <small>آخرین بدحالی مرتبط</small>
          <b>{episode ? episode.title : "ثبت نشده"}</b>
          <span>
            {episode
              ? `${persianDate(episode.date)} • ${episode.description}`
              : "از بیمار پرسیده شود"}
          </span>
        </div>
        <div>
          <small>عمل / بستری</small>
          <b>{surgery ? surgery.title : "ثبت نشده"}</b>
          <span>
            {surgery ? persianDate(surgery.date) : "از بیمار پرسیده شود"}
          </span>
        </div>
      </div>
      <div className="context-summary-foot">
        {vitals && (
          <span className={flags.length ? "is-alert" : ""}>
            <HeartPulse size={13} />
            فشار {fa(vitals.pressure)} • نبض {fa(vitals.pulse)}
            {flags.length ? ` • ${flags.join("، ")}` : ""}
          </span>
        )}
        <span
          className={intake?.status === "submitted" ? "is-good" : "is-warn"}
        >
          <ClipboardList size={13} />
          {intake?.status === "submitted"
            ? "پرسش‌های پیش از ویزیت ثبت شده"
            : `پرسش‌های پیش از ویزیت: ${fa(progress.answered)} از ${fa(progress.required)}`}
        </span>
        {appointment && (
          <button
            type="button"
            className="text-action"
            onClick={() =>
              setModal({ type: "intake", appointmentId: appointment.id })
            }
          >
            {intake?.status === "submitted"
              ? "مشاهده پاسخ‌ها"
              : "تکمیل پرسش‌ها"}
          </button>
        )}
      </div>
    </section>
  );
}

export default function HealthRecord({ patientId }: { patientId: string }) {
  const {
    data,
    role,
    patientId: activePatientId,
    navigate,
    modal,
    setModal,
    setData,
    toast,
  } = useClinic();
  const record = usePatientRecord(patientId);
  const {
    patient,
    appointments,
    next,
    doctor,
    events,
    prescriptions,
    intakes,
    vitals,
    trend,
    focus,
  } = record;
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState<"all" | MedicalEventKind>("all");
  if (!patient || !focus) return <EmptyState title="پرونده پیدا نشد" />;
  const canEdit =
    role === "patient"
      ? patient.id === activePatientId
      : ["management", "physician", "nursing", "reception"].includes(role);
  const flags = vitalFlags(vitals);
  const filteredEvents = events.filter(
    (event) => filter === "all" || event.kind === filter,
  );
  const nextIntake = next
    ? intakes.find((item) => item.appointmentId === next.id)
    : undefined;
  const nextQuestions = getQuestions(patient, doctor, data);
  const nextProgress = intakeProgress(nextIntake, nextQuestions);

  function remove(event: MedicalEvent) {
    const back = modal?.type === "healthRecord" ? modal : null;
    setModal({
      type: "confirm",
      title: `حذف «${event.title}»`,
      description:
        "این رویداد از پرونده حذف می‌شود. بلافاصله پس از حذف، امکان بازگردانی با دکمه «بازگردانی» وجود دارد.",
      onConfirm: () => {
        setData((previous) => ({
          ...previous,
          medicalEvents: previous.medicalEvents.filter(
            (item) => item.id !== event.id,
          ),
        }));
        setModal(back);
        toast("رویداد حذف شد.", false, {
          label: "بازگردانی",
          onClick: () =>
            setData((previous) => ({
              ...previous,
              medicalEvents: [...previous.medicalEvents, event],
            })),
        });
      },
    });
  }

  const tabs = [
    ["overview", "نمای کلی"],
    ["events", "سوابق و رویدادها"],
    ["meds", "داروها و نسخه‌ها"],
    ["intake", "پرسش‌های پیش از ویزیت"],
    ["documents", "مدارک"],
  ];

  return (
    <div className="ehr">
      <header className="ehr-head">
        <Avatar
          name={patient.name}
          size="large"
          index={patient.id === "p2" ? 1 : 0}
        />
        <div className="ehr-title">
          <h2>{patient.name}</h2>
          <div className="ehr-chips">
            <span>{fa(patient.age)} سال</span>
            <span>{patient.gender}</span>
            <span>{patient.maritalStatus}</span>
            <span>{patient.occupation || "شغل ثبت نشده"}</span>
            <span>{patient.insurance}</span>
            <span dir="ltr">{patient.bloodType}</span>
          </div>
        </div>
        <div className="ehr-head-actions">
          {canEdit && (
            <button
              className="button secondary small"
              onClick={() => setModal({ type: "medicalEvent", patientId })}
            >
              <Plus size={15} />
              افزودن سابقه
            </button>
          )}
          {role === "patient" && (
            <button
              className="button secondary small"
              onClick={() => navigate("settings")}
            >
              <Pencil size={15} />
              ویرایش مشخصات
            </button>
          )}
        </div>
      </header>

      <section className="ehr-focus">
        <span className="ehr-focus-icon">
          <Stethoscope size={20} />
        </span>
        <div>
          <b>{focus.title}</b>
          <p>{focus.note}</p>
          <div className="ehr-chips">
            {focus.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        {role === "patient" && next && (
          <button
            className={`button small ${nextProgress.complete && nextIntake?.status === "submitted" ? "secondary" : "primary"}`}
            onClick={() => setModal({ type: "intake", appointmentId: next.id })}
          >
            <ClipboardList size={15} />
            {nextIntake?.status === "submitted"
              ? "پاسخ‌ها ثبت شده"
              : `تکمیل پرونده • ${fa(nextProgress.percent)}٪`}
          </button>
        )}
      </section>

      <div className="table-tabs record-tabs ehr-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
            {key === "intake" && intakes.length > 0 && (
              <span>{fa(intakes.length)}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="ehr-grid">
          <section className="ehr-card ehr-alerts">
            <h3>
              <TriangleAlert size={15} />
              هشدارها و بیماری‌ها
            </h3>
            <p className={patient.allergy !== "ندارد" ? "ehr-alert" : ""}>
              {patient.allergy !== "ندارد"
                ? patient.allergy
                : "حساسیت دارویی ثبت نشده"}
            </p>
            <ul>
              {patient.conditions.length ? (
                patient.conditions.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>بیماری زمینه‌ای ثبت نشده</li>
              )}
            </ul>
            <small>سابقه خانوادگی: {patient.familyHistory || "ثبت نشده"}</small>
          </section>
          <section className="ehr-card">
            <h3>
              <HeartPulse size={15} />
              آخرین علائم حیاتی
            </h3>
            {vitals ? (
              <>
                <div className="ehr-vitals">
                  <span
                    className={
                      flags.some((flag) => flag.includes("فشار"))
                        ? "is-alert"
                        : ""
                    }
                  >
                    <small>فشار</small>
                    <b dir="ltr">{fa(vitals.pressure)}</b>
                  </span>
                  <span>
                    <small>نبض</small>
                    <b>{fa(vitals.pulse)}</b>
                  </span>
                  <span>
                    <small>دما</small>
                    <b>{fa(vitals.temperature)}</b>
                  </span>
                  <span>
                    <small>قند</small>
                    <b>{fa(vitals.glucose || "—")}</b>
                  </span>
                </div>
                {trend.length > 1 && (
                  <div className="ehr-trend">
                    {trend.map((item) => (
                      <span key={item.id}>
                        <i
                          style={{
                            height: `${Math.min(100, Number(item.vitals?.pressure.split("/")[0]) / 1.8)}%`,
                          }}
                        />
                        <small>{persianDate(item.date).split(" ")[0]}</small>
                      </span>
                    ))}
                  </div>
                )}
                {flags.length > 0 && (
                  <p className="ehr-alert">{flags.join("، ")}</p>
                )}
              </>
            ) : (
              <p className="pd-muted">علائمی ثبت نشده است.</p>
            )}
          </section>
          <section className="ehr-card">
            <h3>
              <Pill size={15} />
              داروهای فعلی
            </h3>
            <p>{patient.currentMedications || "دارویی ثبت نشده"}</p>
            <small>سیگار: {patient.smoking}</small>
            {prescriptions[0] && (
              <button className="text-action" onClick={() => setTab("meds")}>
                آخرین نسخه: {prescriptions[0].diagnosis}
              </button>
            )}
          </section>
          <section className="ehr-card">
            <h3>
              <Scissors size={15} />
              عمل و بدحالی اخیر
            </h3>
            {events
              .filter((event) => event.kind !== "document")
              .slice(0, 2)
              .map((event) => (
                <div key={event.id} className="ehr-mini-event">
                  <b>{event.title}</b>
                  <small>
                    {persianDate(event.date)} • {event.description}
                  </small>
                </div>
              ))}
            {!events.some((event) => event.kind !== "document") && (
              <p className="pd-muted">سابقه‌ای ثبت نشده است.</p>
            )}
            <button className="text-action" onClick={() => setTab("events")}>
              همه رویدادها
            </button>
          </section>
          <section className="ehr-card">
            <h3>
              <CalendarCheck2 size={15} />
              ویزیت‌ها
            </h3>
            {appointments.slice(0, 3).map((item) => (
              <div key={item.id} className="ehr-mini-event">
                <b>
                  {item.diagnosis ||
                    data.doctors.find((d) => d.id === item.doctorId)?.specialty}
                </b>
                <small>
                  {persianDate(item.date)} •{" "}
                  {data.doctors.find((d) => d.id === item.doctorId)?.name}
                </small>
              </div>
            ))}
          </section>
          <section className="ehr-card">
            <h3>
              <Phone size={15} />
              تماس اضطراری
            </h3>
            {patient.emergencyContact.name ? (
              <>
                <b>{patient.emergencyContact.name}</b>
                <p>
                  {patient.emergencyContact.relation} •{" "}
                  <span dir="ltr">{fa(patient.emergencyContact.phone)}</span>
                </p>
              </>
            ) : (
              <p className="pd-muted">ثبت نشده است.</p>
            )}
            <small>
              <ShieldCheck size={12} /> اطلاعات فقط در این مرورگر نگهداری
              می‌شود.
            </small>
          </section>
        </div>
      )}

      {tab === "events" && (
        <section className="ehr-card">
          <div className="ehr-list-head">
            <div className="segmented-control">
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                همه
              </button>
              {(Object.keys(kindLabel) as MedicalEventKind[])
                .filter((kind) => kind !== "document")
                .map((kind) => (
                  <button
                    key={kind}
                    className={filter === kind ? "active" : ""}
                    onClick={() => setFilter(kind)}
                  >
                    {kindLabel[kind]}
                  </button>
                ))}
            </div>
            {canEdit && (
              <button
                className="button primary small"
                onClick={() => setModal({ type: "medicalEvent", patientId })}
              >
                <Plus size={14} />
                افزودن
              </button>
            )}
          </div>
          {filteredEvents.length ? (
            filteredEvents.map((event) => {
              const Icon = kindIcon[event.kind];
              return (
                <div key={event.id} className="ehr-event">
                  <span className={`ehr-event-icon kind-${event.kind}`}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <b>{event.title}</b>
                    <p>{event.description}</p>
                    <small>
                      {persianDate(event.date)} • {kindLabel[event.kind]} •{" "}
                      {event.source === "patient"
                        ? "اظهار بیمار"
                        : "ثبت کادر درمان"}
                    </small>
                  </div>
                  {canEdit && (
                    <div className="ehr-event-actions">
                      <button
                        className="icon-button"
                        aria-label="ویرایش"
                        onClick={() =>
                          setModal({
                            type: "medicalEvent",
                            patientId,
                            eventId: event.id,
                          })
                        }
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="حذف"
                        onClick={() => remove(event)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              title="رویدادی ثبت نشده"
              description="عمل جراحی، بستری یا آخرین بدحالی را اضافه کنید."
            />
          )}
        </section>
      )}

      {tab === "meds" && (
        <div className="ehr-grid two">
          <section className="ehr-card">
            <h3>
              <Pill size={15} />
              داروهای فعلی
            </h3>
            <p>{patient.currentMedications || "ثبت نشده"}</p>
            <small>برای تغییر دارو با پزشک مشورت کنید.</small>
          </section>
          <section className="ehr-card">
            <h3>
              <FileText size={15} />
              نسخه‌ها
            </h3>
            {prescriptions.length ? (
              prescriptions.map((item) => (
                <div key={item.id} className="ehr-mini-event">
                  <b>{item.medicine}</b>
                  <small>{item.directions}</small>
                  <small>
                    {persianDate(item.date)} • کد {fa(item.tracking)}
                  </small>
                </div>
              ))
            ) : (
              <p className="pd-muted">نسخه‌ای ثبت نشده</p>
            )}
          </section>
        </div>
      )}

      {tab === "intake" && (
        <section className="ehr-card">
          {intakes.length ? (
            intakes.map((intake) => {
              const appointment = data.appointments.find(
                (item) => item.id === intake.appointmentId,
              );
              const intakeDoctor = data.doctors.find(
                (item) => item.id === appointment?.doctorId,
              );
              const questions = getQuestions(patient, intakeDoctor, data);
              const progress = intakeProgress(intake, questions);
              return (
                <div key={intake.id} className="ehr-intake">
                  <div className="ehr-list-head">
                    <div>
                      <b>{intake.specialty}</b>
                      <small>
                        {appointment ? persianDate(appointment.date) : ""} •{" "}
                        {fa(progress.answered)} از {fa(progress.required)} پاسخ
                        ضروری
                      </small>
                    </div>
                    <span
                      className={`status-badge ${intake.status === "submitted" ? "status-green" : "status-amber"}`}
                    >
                      {intake.status === "submitted" ? "ثبت شده" : "پیش‌نویس"}
                    </span>
                  </div>
                  {intake.analysis && (
                    <div className="ehr-analysis">
                      <b>جمع‌بندی: {intake.analysis.summary}</b>
                      {!!intake.analysis.flags.length && (
                        <small>{intake.analysis.flags.join(" • ")}</small>
                      )}
                      <details>
                        <summary>
                          جزئیات تحلیل ({fa(intake.analysis.topics.length)})
                        </summary>
                        <ul>
                          {intake.analysis.topics.map((topic) => (
                            <li key={topic.id}>
                              <span>{topic.title}</span>
                              <b>{topic.summary}</b>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                  {!!intake.attachments?.length && (
                    <div className="ehr-files">
                      {intake.attachments.map((file) => (
                        <span key={file.id}>
                          {file.dataUrl?.startsWith("data:image") ? (
                            <img src={file.dataUrl} alt={file.name} />
                          ) : null}
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <ul>
                    {questions.map((question) => (
                      <li key={question.id}>
                        <span>{question.label}</span>
                        <div>
                          <b>
                            {intake.answers[question.id]?.value ||
                              (intake.answers[question.id]?.skipped
                                ? "فعلاً نمی‌دانم"
                                : "بی‌پاسخ")}
                          </b>
                          {intake.answers[question.id]?.note && (
                            <p>{intake.answers[question.id]?.note}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {appointment && (
                    <button
                      className="button secondary small"
                      onClick={() =>
                        setModal({
                          type: "intake",
                          appointmentId: appointment.id,
                        })
                      }
                    >
                      {role === "patient" ? "ویرایش پاسخ‌ها" : "مشاهده پرسش‌ها"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              title="پرسش‌هایی ثبت نشده"
              description="پیش از ویزیت، پرسش‌های متناسب با تخصص از بیمار پرسیده می‌شود."
            />
          )}
        </section>
      )}

      {tab === "documents" && (
        <section className="ehr-card">
          <div className="ehr-list-head">
            <h3>
              <FileText size={15} />
              مدارک پزشکی
            </h3>
            {canEdit && (
              <button
                className="button primary small"
                onClick={() =>
                  setModal({
                    type: "medicalEvent",
                    patientId,
                    kind: "document",
                  })
                }
              >
                <Plus size={14} />
                افزودن مدرک
              </button>
            )}
          </div>
          {events.filter((event) => event.kind === "document").length ? (
            events
              .filter((event) => event.kind === "document")
              .map((event) => (
                <div key={event.id} className="ehr-event">
                  <span className="ehr-event-icon kind-document">
                    <FileText size={16} />
                  </span>
                  <div>
                    <b>{event.title}</b>
                    <p>{event.description}</p>
                    <small>{persianDate(event.date)}</small>
                  </div>
                  {canEdit && (
                    <button
                      className="icon-button"
                      aria-label="حذف"
                      onClick={() => remove(event)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
          ) : (
            <EmptyState
              title="مدرکی ثبت نشده"
              description="گزارش آزمایش یا تصویربرداری را به‌صورت متنی ثبت کنید."
            />
          )}
        </section>
      )}
    </div>
  );
}

export function MedicalEventModal({
  patientId,
  eventId,
  kind,
}: {
  patientId: string;
  eventId?: string;
  kind?: MedicalEventKind;
}) {
  const {
    data,
    role,
    patientId: activePatientId,
    setData,
    setModal,
    toast,
  } = useClinic();
  const existing = data.medicalEvents.find((item) => item.id === eventId);
  const patient = data.patients.find((item) => item.id === patientId);
  const [form, setForm] = useState({
    kind: existing?.kind || kind || ("episode" as MedicalEventKind),
    title: existing?.title || "",
    date: existing?.date || data.day,
    description: existing?.description || "",
  });
  const allowed =
    role === "patient"
      ? patientId === activePatientId
      : ["management", "physician", "nursing", "reception"].includes(role);
  if (!patient || !allowed) return null;
  function save(event: FormEvent) {
    event.preventDefault();
    const record: MedicalEvent = {
      id: existing?.id || uid("event"),
      patientId,
      kind: form.kind,
      title: form.title.trim(),
      date: form.date,
      description: form.description.trim(),
      source: role === "patient" ? "patient" : "clinician",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    setData((previous) => ({
      ...previous,
      medicalEvents: existing
        ? previous.medicalEvents.map((item) =>
            item.id === record.id ? record : item,
          )
        : [...previous.medicalEvents, record],
      activities: [
        activity(
          existing ? "سابقه پزشکی ویرایش شد" : "سابقه پزشکی اضافه شد",
          `${patient!.name}: ${record.title}`,
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    toast(existing ? "سابقه به‌روز شد." : "سابقه به پرونده اضافه شد.");
    setModal(null);
  }
  return (
    <Modal
      title={existing ? "ویرایش سابقه" : "افزودن سابقه پزشکی"}
      subtitle={patient.name}
      footer={
        <>
          <button
            className="button secondary"
            onClick={() => setModal({ type: "healthRecord", patientId })}
          >
            انصراف
          </button>
          <button className="button primary" type="submit" form="event-form">
            ذخیره
          </button>
        </>
      }
    >
      <form id="event-form" className="form-stack" onSubmit={save}>
        <Field label="نوع رویداد">
          <select
            value={form.kind}
            onChange={(event) =>
              setForm({ ...form, kind: event.target.value as MedicalEventKind })
            }
          >
            {(Object.keys(kindLabel) as MedicalEventKind[]).map((key) => (
              <option key={key} value={key}>
                {kindLabel[key]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="عنوان">
          <input
            required
            minLength={2}
            maxLength={120}
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="مثلاً آپاندکتومی / سردرد شدید"
          />
        </Field>
        <Field label="تاریخ">
          <input
            required
            type="date"
            max={data.day}
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
        </Field>
        <Field label="توضیح">
          <textarea
            required
            rows={4}
            maxLength={1000}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="چه اتفاقی افتاد، چه علائمی داشتید و چه اقدامی انجام شد؟"
          />
        </Field>
      </form>
    </Modal>
  );
}
