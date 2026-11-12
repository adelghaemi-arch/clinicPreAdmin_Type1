import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarCheck2,
  Check,
  ChevronLeft,
  CreditCard,
  Download,
  FileHeart,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  Monitor,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  currentDoctorId,
  fa,
  insurances,
  latin,
  money,
  persianDate,
  specialties,
  uid,
  weekdays,
} from "../data";
import { activity, downloadFile, useClinic } from "../store";
import { invoices, serviceBilling } from "../invoices";
import type { Appointment, Doctor, Patient, Vitals } from "../types";
import { Avatar, EmptyState, Field, Modal, StatusBadge } from "./ui";
import { LiveVitals } from "./Smart";
import IntakeModal from "./Intake";
import HealthRecord, {
  MedicalEventModal,
  PatientContextSummary,
} from "./HealthRecord";

export default function ModalHost() {
  const { data, modal, role, setModal, patientId } = useClinic();
  if (!modal) return null;
  if (modal.type === "confirm")
    return (
      <Modal
        title={modal.title}
        footer={
          <>
            <button className="button secondary" onClick={() => setModal(null)}>
              انصراف
            </button>
            <button className="button primary" onClick={modal.onConfirm}>
              تأیید و ادامه
            </button>
          </>
        }
      >
        <p className="confirm-description">{modal.description}</p>
      </Modal>
    );
  if (
    modal.type === "record" &&
    role !== "finance" &&
    (role !== "patient" || modal.patientId === patientId)
  )
    return <RecordModal key={modal.patientId} patientId={modal.patientId} />;
  if (
    modal.type === "healthRecord" &&
    role !== "finance" &&
    (role !== "patient" || modal.patientId === patientId)
  )
    return (
      <Modal
        title="پرونده الکترونیک سلامت"
        subtitle="پرونده شخصی‌سازی‌شده بر اساس سن، جنسیت، وضعیت تأهل و ویزیت پیش رو"
        wide
        footer={
          <button className="button secondary" onClick={() => setModal(null)}>
            بستن
          </button>
        }
      >
        <HealthRecord patientId={modal.patientId} />
      </Modal>
    );
  if (
    modal.type === "intake" &&
    (role !== "patient" ||
      data.appointments.some(
        (item) =>
          item.id === modal.appointmentId && item.patientId === patientId,
      ))
  )
    return (
      <IntakeModal
        key={modal.appointmentId}
        appointmentId={modal.appointmentId}
      />
    );
  if (
    modal.type === "medicalEvent" &&
    (role !== "patient" || modal.patientId === patientId)
  )
    return (
      <MedicalEventModal
        key={modal.eventId || "new"}
        patientId={modal.patientId}
        eventId={modal.eventId}
        kind={modal.kind}
      />
    );
  if (
    modal.type === "appointment" &&
    ["management", "reception", "patient"].includes(role)
  )
    return (
      <AppointmentModal key={modal.appointmentId || modal.doctorId || "new"} />
    );
  if (modal.type === "patient" && ["management", "reception"].includes(role))
    return <PatientModal key={modal.id || "new"} />;
  if (modal.type === "doctor" && role === "management")
    return <DoctorModal key={modal.id || "new"} />;
  if (modal.type === "triage" && role === "nursing")
    return <TriageModal key={modal.appointmentId} />;
  if (
    modal.type === "visit" &&
    role === "physician" &&
    data.appointments.some(
      (item) =>
        item.id === modal.appointmentId && item.doctorId === currentDoctorId,
    )
  )
    return <VisitModal key={modal.appointmentId} />;
  if (
    modal.type === "pay" &&
    ["management", "finance", "patient"].includes(role)
  )
    return <PayModal key={modal.appointmentId} />;
  if (modal.type === "receipt") return <ReceiptModal />;
  if (modal.type === "service" && role === "nursing") return <ServiceModal />;
  if (modal.type === "tariff" && ["management", "finance"].includes(role))
    return <TariffModal key={modal.id || "new"} />;
  if (modal.type === "monitor") return <MonitorModal />;
  return (
    <Modal title="دسترسی این نقش محدود است">
      <EmptyState
        title="این عملیات در پنل شما فعال نیست"
        description="برای آزمایش این بخش، از منوی انتخاب نقش به پنل مرتبط بروید."
      />
    </Modal>
  );
}

function AppointmentModal() {
  const {
    data,
    modal,
    role,
    setModal,
    setData,
    toast,
    patientId: activePatientId,
  } = useClinic();
  const details = modal?.type === "appointment" ? modal : null;
  const existing = data.appointments.find(
    (item) => item.id === details?.appointmentId,
  );
  const [patientId, setPatientId] = useState(
    role === "patient"
      ? activePatientId
      : existing?.patientId || details?.patientId || "",
  );
  const [doctorId, setDoctorId] = useState(
    existing?.doctorId || details?.doctorId || "",
  );
  const [specialty, setSpecialty] = useState(
    data.doctors.find((item) => item.id === doctorId)?.specialty || "",
  );
  const [date, setDate] = useState(existing?.date || data.day);
  const [time, setTime] = useState(existing?.time || "");
  const [waitlist, setWaitlist] = useState(existing?.status === "waitlisted");
  const patient = data.patients.find((item) => item.id === patientId);
  const doctor = data.doctors.find((item) => item.id === doctorId);
  const tariff = data.tariffs.find(
    (item) => item.specialty === doctor?.specialty,
  );
  const total = existing?.paid ? existing.total : tariff?.amount || 0;
  const share = existing?.paid
    ? existing.patientShare
    : patient?.insurance === "آزاد"
      ? total
      : Math.round((total * (100 - (tariff?.insurancePercent || 0))) / 100);
  const slots: string[] = [];
  if (doctor) {
    const [hours, minutes] = doctor.startTime.split(":").map(Number);
    const [endHours, endMinutes] = doctor.endTime.split(":").map(Number);
    for (
      let value = hours * 60 + minutes;
      value < endHours * 60 + endMinutes;
      value += 15
    )
      slots.push(
        `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`,
      );
  }
  if (existing?.time && !slots.includes(existing.time))
    slots.unshift(existing.time);
  function save(event: FormEvent) {
    event.preventDefault();
    if (!patient || !doctor || (!time && !waitlist) || !tariff) {
      toast("لطفاً بیمار، پزشک و ساعت نوبت را کامل انتخاب کنید.", true);
      return;
    }
    if (date < data.day && (!existing || date !== existing.date)) {
      toast("رزرو نوبت در تاریخ گذشته امکان‌پذیر نیست.", true);
      return;
    }
    if (doctor.status === "off" && date === data.day) {
      toast("پزشک امروز خارج از شیفت است؛ تاریخ دیگری انتخاب کنید.", true);
      return;
    }
    const sameDay = data.appointments.filter(
      (item) =>
        item.id !== existing?.id &&
        item.doctorId === doctorId &&
        item.date === date &&
        !["cancelled", "waitlisted"].includes(item.status),
    );
    if (!waitlist && sameDay.some((item) => item.time === time)) {
      toast("این ساعت رزرو شده است؛ ساعت دیگری انتخاب کنید.", true);
      return;
    }
    if (!waitlist && sameDay.length >= doctor.capacity) {
      toast(
        "ظرفیت پزشک تکمیل است؛ می‌توانید گزینه لیست انتظار را فعال کنید.",
        true,
      );
      return;
    }
    const appointment: Appointment = existing
      ? {
          ...existing,
          patientId,
          doctorId,
          date,
          time: waitlist ? "--:--" : time,
          status: waitlist
            ? "waitlisted"
            : existing.status === "waitlisted"
              ? "scheduled"
              : existing.status,
          total,
          patientShare: share,
        }
      : {
          id: uid("appointment"),
          patientId,
          doctorId,
          date,
          time: waitlist ? "--:--" : time,
          number:
            Math.max(
              0,
              ...data.appointments
                .filter((item) => item.date === date)
                .map((item) => item.number),
            ) + 1,
          status: waitlist ? "waitlisted" : "scheduled",
          total,
          patientShare: share,
          paid: false,
        };
    setData((previous) => ({
      ...previous,
      appointments: existing
        ? previous.appointments.map((item) =>
            item.id === existing.id ? appointment : item,
          )
        : [...previous.appointments, appointment],
      activities: [
        activity(
          existing ? "نوبت جابه‌جا شد" : "نوبت جدید ثبت شد",
          `${patient.name}، ${doctor.name}، ساعت ${fa(time)}`,
          "appointment",
        ),
        ...previous.activities,
      ],
    }));
    setModal(null);
    toast(
      waitlist
        ? "بیمار بدون صدور فاکتور به لیست انتظار اضافه شد."
        : existing
          ? "تغییرات نوبت ذخیره شد."
          : `نوبت ${fa(appointment.number)} ثبت شد؛ فاکتور در پنل مالی قابل مشاهده است.`,
    );
  }
  return (
    <Modal
      title={existing ? "ویرایش و جابه‌جایی نوبت" : "ثبت نوبت جدید"}
      subtitle="اطلاعات بیمار، پزشک و زمان مراجعه را انتخاب کنید."
      wide
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button
            type="submit"
            form="appointment-form"
            className="button primary"
          >
            <CalendarCheck2 size={17} />
            {existing ? "ذخیره تغییرات" : "تأیید و ثبت نوبت"}
          </button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={save} className="form-grid">
        <Field label="انتخاب بیمار" className="span-2">
          <div className="field-with-action">
            <select
              required
              value={patientId}
              disabled={role === "patient" || !!existing}
              onChange={(event) => setPatientId(event.target.value)}
            >
              <option value="">بیمار را انتخاب کنید</option>
              {data.patients
                .filter(
                  (item) => role !== "patient" || item.id === activePatientId,
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {fa(item.nationalCode)}
                  </option>
                ))}
            </select>
            {role !== "patient" && !existing && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal({ type: "patient" })}
              >
                <Plus size={16} />
                بیمار جدید
              </button>
            )}
          </div>
        </Field>
        <Field label="تخصص">
          <select
            value={specialty}
            required
            disabled={existing?.paid}
            onChange={(event) => {
              setSpecialty(event.target.value);
              setDoctorId("");
              setTime("");
            }}
          >
            <option value="">انتخاب تخصص</option>
            {specialties.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="پزشک متخصص">
          <select
            value={doctorId}
            required
            disabled={existing?.paid}
            onChange={(event) => {
              setDoctorId(event.target.value);
              setTime("");
            }}
          >
            <option value="">انتخاب پزشک</option>
            {data.doctors
              .filter((item) => !specialty || item.specialty === specialty)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="تاریخ مراجعه">
          <input
            type="date"
            required
            min={data.day}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setTime("");
            }}
          />
        </Field>
        <Field label="پوشش بیمه">
          <div className="readonly-field">
            <ShieldCheck size={17} />
            {patient?.insurance || "ابتدا بیمار را انتخاب کنید"}
          </div>
        </Field>
        {doctor && (
          <div className="time-slots-field span-2">
            <span className="field-title">
              ساعت مراجعه <small>مدت هر نوبت: ۱۵ دقیقه</small>
            </span>
            <div className="time-slots">
              {slots.map((slot) => {
                const taken = data.appointments.some(
                  (item) =>
                    item.id !== existing?.id &&
                    item.doctorId === doctorId &&
                    item.date === date &&
                    item.time === slot &&
                    !["cancelled", "waitlisted"].includes(item.status),
                );
                return (
                  <button
                    type="button"
                    key={slot}
                    disabled={taken || waitlist}
                    className={time === slot ? "chosen" : ""}
                    onClick={() => setTime(slot)}
                  >
                    {fa(slot)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!existing?.paid && (
          <label className="waitlist-option span-2">
            <input
              type="checkbox"
              checked={waitlist}
              onChange={(event) => {
                setWaitlist(event.target.checked);
                setTime("");
              }}
            />
            <span>
              <strong>افزودن به لیست انتظار</strong>
              <small>
                بدون رزرو ساعت و صدور فاکتور؛ پس از آزاد شدن ظرفیت، زمان نوبت را
                تخصیص دهید.
              </small>
            </span>
          </label>
        )}
        <div className="invoice-preview span-2">
          <div>
            <span>تعرفه ویزیت</span>
            <strong>{money(total)} تومان</strong>
          </div>
          <div>
            <span>سهم بیمه</span>
            <strong>{money(total - share)} تومان</strong>
          </div>
          <div className="invoice-total">
            <span>قابل پرداخت توسط بیمار</span>
            <strong>
              {money(share)} <small>تومان</small>
            </strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function PatientModal() {
  const { data, modal, setData, setModal, toast } = useClinic();
  const existing = data.patients.find(
    (item) => modal?.type === "patient" && item.id === modal.id,
  );
  const [form, setForm] = useState<Omit<Patient, "id">>(
    existing || {
      name: "",
      nationalCode: "",
      phone: "",
      age: 30,
      gender: "زن",
      maritalStatus: "نامشخص",
      occupation: "",
      smoking: "نامشخص",
      emergencyContact: { name: "", phone: "", relation: "" },
      familyHistory: "",
      currentMedications: "",
      conditions: [],
      insurance: insurances[0],
      bloodType: "نامشخص",
      allergy: "ندارد",
      history: "",
    },
  );
  function change<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (
      data.patients.some(
        (item) =>
          item.id !== existing?.id && item.nationalCode === form.nationalCode,
      )
    ) {
      toast("با این کد ملی قبلاً پرونده تشکیل شده است.", true);
      return;
    }
    const patient = {
      ...form,
      id: existing?.id || uid("patient"),
      name: form.name.trim(),
    };
    setData((previous) => ({
      ...previous,
      patients: existing
        ? previous.patients.map((item) =>
            item.id === patient.id ? patient : item,
          )
        : [...previous.patients, patient],
      activities: [
        activity(
          "پرونده بیمار به‌روز شد",
          `پرونده ${patient.name} در سامانه ثبت شد.`,
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    setModal({ type: "record", patientId: patient.id });
    toast(existing ? "اطلاعات بیمار به‌روز شد." : "پرونده بیمار تشکیل شد.");
  }
  return (
    <Modal
      title={existing ? "ویرایش مشخصات بیمار" : "تشکیل پرونده بیمار"}
      subtitle="اطلاعات هویتی و پزشکی اولیه را ثبت کنید."
      wide
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button className="button primary" type="submit" form="patient-form">
            <Check size={17} />
            ذخیره پرونده
          </button>
        </>
      }
    >
      <form className="form-grid" id="patient-form" onSubmit={save}>
        <Field label="نام و نام خانوادگی">
          <input
            required
            minLength={3}
            maxLength={70}
            value={form.name}
            onChange={(event) => change("name", event.target.value)}
          />
        </Field>
        <Field label="کد ملی (۱۰ رقم)">
          <input
            required
            dir="ltr"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={form.nationalCode}
            onChange={(event) =>
              change(
                "nationalCode",
                latin(event.target.value).replace(/\D/g, ""),
              )
            }
          />
        </Field>
        <Field label="شماره همراه">
          <input
            required
            dir="ltr"
            inputMode="tel"
            pattern="09[0-9]{9}"
            maxLength={11}
            value={form.phone}
            onChange={(event) =>
              change("phone", latin(event.target.value).replace(/\D/g, ""))
            }
            placeholder="09123456789"
          />
        </Field>
        <Field label="بیمه پایه">
          <select
            value={form.insurance}
            onChange={(event) => change("insurance", event.target.value)}
          >
            {insurances.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="سن">
          <input
            required
            type="number"
            min={0}
            max={120}
            value={form.age}
            onChange={(event) => change("age", Number(event.target.value))}
          />
        </Field>
        <Field label="جنسیت">
          <select
            value={form.gender}
            onChange={(event) =>
              change("gender", event.target.value as Patient["gender"])
            }
          >
            <option>زن</option>
            <option>مرد</option>
          </select>
        </Field>
        <Field label="وضعیت تأهل">
          <select
            value={form.maritalStatus}
            onChange={(event) =>
              change(
                "maritalStatus",
                event.target.value as Patient["maritalStatus"],
              )
            }
          >
            {["مجرد", "متأهل", "سایر", "نامشخص"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="شغل">
          <input
            maxLength={60}
            value={form.occupation}
            onChange={(event) => change("occupation", event.target.value)}
          />
        </Field>
        <Field label="تماس اضطراری">
          <input
            maxLength={60}
            value={form.emergencyContact.name}
            onChange={(event) =>
              change("emergencyContact", {
                ...form.emergencyContact,
                name: event.target.value,
              })
            }
            placeholder="نام همراه"
          />
        </Field>
        <Field label="تلفن تماس اضطراری">
          <input
            dir="ltr"
            inputMode="tel"
            pattern="09[0-9]{9}"
            maxLength={11}
            value={form.emergencyContact.phone}
            onChange={(event) =>
              change("emergencyContact", {
                ...form.emergencyContact,
                phone: latin(event.target.value).replace(/\D/g, ""),
              })
            }
          />
        </Field>
        <Field label="گروه خون">
          <select
            value={form.bloodType}
            onChange={(event) => change("bloodType", event.target.value)}
          >
            {["نامشخص", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </Field>
        <Field label="حساسیت دارویی">
          <input
            value={form.allergy}
            maxLength={200}
            onChange={(event) => change("allergy", event.target.value)}
          />
        </Field>
        <Field label="سوابق بیماری" className="span-2">
          <textarea
            rows={3}
            maxLength={1000}
            value={form.history}
            onChange={(event) => change("history", event.target.value)}
            placeholder="بیماری‌های زمینه‌ای، سوابق جراحی و داروهای مصرفی..."
          />
        </Field>
      </form>
    </Modal>
  );
}

function DoctorModal() {
  const { data, modal, setData, setModal, toast } = useClinic();
  const existing = data.doctors.find(
    (item) => modal?.type === "doctor" && item.id === modal.id,
  );
  const [form, setForm] = useState<Omit<Doctor, "id">>(
    existing || {
      name: "",
      specialty: specialties[0],
      avatar: "",
      room: "",
      status: "available",
      startTime: "08:00",
      endTime: "14:00",
      capacity: 24,
      days: ["شنبه", "دوشنبه", "چهارشنبه"],
    },
  );
  function change<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!form.days.length || form.endTime <= form.startTime) {
      toast("روزهای حضور و ساعت پایان معتبر را انتخاب کنید.", true);
      return;
    }
    if (
      form.status === "off" &&
      data.appointments.some(
        (item) => item.doctorId === existing?.id && item.status === "visiting",
      )
    ) {
      toast("پزشک در حال ویزیت است؛ ابتدا ویزیت فعال را پایان دهید.", true);
      return;
    }
    const doctor = {
      ...form,
      name: form.name.startsWith("دکتر")
        ? form.name.trim()
        : `دکتر ${form.name.trim()}`,
      id: existing?.id || uid("doctor"),
    };
    setData((previous) => ({
      ...previous,
      doctors: existing
        ? previous.doctors.map((item) =>
            item.id === doctor.id ? doctor : item,
          )
        : [...previous.doctors, doctor],
      activities: [
        activity(
          "برنامه پزشک به‌روز شد",
          `${doctor.name}، تخصص ${doctor.specialty}`,
        ),
        ...previous.activities,
      ],
    }));
    setModal(null);
    toast("اطلاعات و برنامه پزشک ذخیره شد.");
  }
  return (
    <Modal
      title={existing ? "مدیریت برنامه پزشک" : "افزودن پزشک متخصص"}
      subtitle={existing?.name || "مشخصات و برنامه حضور پزشک را تعریف کنید."}
      wide
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button className="button primary" type="submit" form="doctor-form">
            <Check size={17} />
            ذخیره برنامه
          </button>
        </>
      }
    >
      <form id="doctor-form" className="form-grid" onSubmit={save}>
        <Field label="نام و نام خانوادگی">
          <input
            required
            minLength={4}
            maxLength={70}
            value={form.name}
            onChange={(event) => change("name", event.target.value)}
          />
        </Field>
        <Field label="تخصص">
          <select
            value={form.specialty}
            onChange={(event) => change("specialty", event.target.value)}
          >
            {specialties.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="شماره اتاق">
          <input
            required
            maxLength={10}
            value={form.room}
            onChange={(event) => change("room", event.target.value)}
          />
        </Field>
        <Field label="ظرفیت روزانه">
          <input
            required
            type="number"
            min={1}
            max={100}
            value={form.capacity}
            onChange={(event) => change("capacity", Number(event.target.value))}
          />
        </Field>
        <Field label="شروع شیفت">
          <input
            required
            type="time"
            value={form.startTime}
            onChange={(event) => change("startTime", event.target.value)}
          />
        </Field>
        <Field label="پایان شیفت">
          <input
            required
            type="time"
            value={form.endTime}
            onChange={(event) => change("endTime", event.target.value)}
          />
        </Field>
        <Field label="وضعیت حضور" className="span-2">
          <select
            value={form.status}
            onChange={(event) =>
              change("status", event.target.value as Doctor["status"])
            }
          >
            <option value="available">حاضر و آماده ویزیت</option>
            <option value="visiting">در حال ویزیت</option>
            <option value="off">مرخصی / خارج از شیفت</option>
          </select>
        </Field>
        <div className="span-2">
          <span className="field-title">روزهای حضور در هفته</span>
          <div className="day-options">
            {weekdays.map((day) => (
              <button
                type="button"
                className={form.days.includes(day) ? "chosen" : ""}
                key={day}
                onClick={() =>
                  change(
                    "days",
                    form.days.includes(day)
                      ? form.days.filter((item) => item !== day)
                      : [...form.days, day],
                  )
                }
              >
                {form.days.includes(day) && <Check size={13} />}
                {day}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RecordModal({ patientId }: { patientId: string }) {
  const { data, role, setModal, setData, toast } = useClinic();
  const [tab, setTab] = useState("overview");
  const patient = data.patients.find((item) => item.id === patientId);
  if (!patient) return null;
  const appointments = data.appointments
    .filter((item) => item.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const prescriptions = data.prescriptions.filter(
    (item) => item.patientId === patientId,
  );
  const vitals = appointments.find((item) => item.vitals)?.vitals;
  function accept(item: Appointment) {
    setData((previous) => ({
      ...previous,
      appointments: previous.appointments.map((value) =>
        value.id === item.id ? { ...value, status: "waiting" } : value,
      ),
      activities: [
        activity(
          "بیمار پذیرش شد",
          `${patient?.name} در صف تریاژ قرار گرفت.`,
          "appointment",
        ),
        ...previous.activities,
      ],
    }));
    toast("پذیرش ثبت شد؛ بیمار در صف تریاژ و فاکتور در صندوق قرار گرفت.");
  }
  function cancel(item: Appointment) {
    setModal({
      type: "confirm",
      title: "لغو نوبت بیمار",
      description: `نوبت ${patient?.name} در ${persianDate(item.date)} ساعت ${fa(item.time)} لغو شود؟`,
      onConfirm: () => {
        setData((previous) => ({
          ...previous,
          appointments: previous.appointments.map((value) =>
            value.id === item.id ? { ...value, status: "cancelled" } : value,
          ),
          activities: [
            activity(
              "نوبت لغو شد",
              `نوبت ${patient?.name} لغو شد.`,
              "appointment",
            ),
            ...previous.activities,
          ],
        }));
        setModal(null);
        toast("نوبت لغو شد و ظرفیت آزاد شد.");
      },
    });
  }
  return (
    <Modal
      title="پرونده الکترونیک سلامت"
      subtitle={`شماره پرونده: NBZ-${patient.id.toUpperCase()}`}
      wide
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            بستن پرونده
          </button>
          {["management", "reception"].includes(role) && (
            <button
              className="button primary"
              onClick={() => setModal({ type: "patient", id: patient.id })}
            >
              ویرایش مشخصات
              <ChevronLeft size={16} />
            </button>
          )}
          {role !== "finance" && (
            <button
              className="button secondary"
              onClick={() => setModal({ type: "healthRecord", patientId })}
            >
              پرونده شخصی‌سازی‌شده
            </button>
          )}
          {role === "patient" && (
            <button
              className="button primary"
              onClick={() => setModal({ type: "appointment", patientId })}
            >
              <Plus size={16} />
              رزرو نوبت جدید
            </button>
          )}
        </>
      }
    >
      <div className="record-person">
        <Avatar name={patient.name} size="large" />
        <div>
          <h3>{patient.name}</h3>
          <p>
            {fa(patient.age)} سال <span>•</span> {patient.gender} <span>•</span>{" "}
            {patient.insurance}
          </p>
        </div>
        <span className="blood-type" dir="ltr">
          {patient.bloodType}
        </span>
      </div>
      <div className="table-tabs record-tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          نمای کلی پرونده
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          سوابق و نسخه‌ها<span>{fa(prescriptions.length)}</span>
        </button>
        <button
          className={tab === "appointments" ? "active" : ""}
          onClick={() => setTab("appointments")}
        >
          نوبت‌ها و عملیات<span>{fa(appointments.length)}</span>
        </button>
      </div>
      {tab === "overview" ? (
        <>
          <PatientContextSummary patientId={patientId} />
          <div className="record-details">
            <div>
              <small>کد ملی</small>
              <strong>{fa(patient.nationalCode)}</strong>
            </div>
            <div>
              <small>شماره تماس</small>
              <strong>{fa(patient.phone)}</strong>
            </div>
            <div>
              <small>سابقه بیماری</small>
              <strong>{patient.history || "ثبت نشده"}</strong>
            </div>
            <div>
              <small>حساسیت دارویی</small>
              <strong
                className={patient.allergy !== "ندارد" ? "text-danger" : ""}
              >
                {patient.allergy}
              </strong>
            </div>
          </div>
          {vitals && (
            <div className="record-vitals">
              <h3>
                <HeartPulse size={18} />
                آخرین علائم حیاتی
              </h3>
              <div>
                {[
                  ["فشار خون", vitals.pressure, "mmHg"],
                  ["نبض", vitals.pulse, "bpm"],
                  ["دمای بدن", vitals.temperature, "°C"],
                  ["وزن", vitals.weight, "kg"],
                ].map(([label, value, unit]) => (
                  <span key={label}>
                    <small>{label}</small>
                    <strong dir="ltr">
                      {value} <small>{unit}</small>
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="record-next">
            <h3>نوبت‌ها و پیگیری درمان</h3>
            <p>
              {fa(
                appointments.filter(
                  (item) =>
                    item.status !== "completed" && item.status !== "cancelled",
                ).length,
              )}{" "}
              نوبت فعال در پرونده وجود دارد.
            </p>
            <button
              className="text-action"
              onClick={() => setTab("appointments")}
            >
              مشاهده نوبت‌ها و عملیات
              <ChevronLeft size={15} />
            </button>
          </div>
        </>
      ) : tab === "history" ? (
        <div className="record-history">
          {prescriptions.map((item) => (
            <div key={item.id}>
              <span className="eyebrow">
                {persianDate(item.date)} <span>•</span>{" "}
                {
                  data.doctors.find((doctor) => doctor.id === item.doctorId)
                    ?.name
                }
              </span>
              <h3>{item.diagnosis}</h3>
              <p>{item.medicine}</p>
              <p>{item.directions}</p>
              {item.referral && <p>ارجاع: {item.referral}</p>}
              <span className="tracking-code">
                کد نسخه محلی: {fa(item.tracking)}
              </span>
            </div>
          ))}
          {!prescriptions.length && (
            <EmptyState title="نسخه‌ای در پرونده ثبت نشده" />
          )}
        </div>
      ) : (
        <div className="record-appointments">
          {appointments.map((item) => (
            <div className="record-appointment" key={item.id}>
              <div className="record-appointment-heading">
                <div>
                  <strong>
                    {
                      data.doctors.find((doctor) => doctor.id === item.doctorId)
                        ?.name
                    }
                  </strong>
                  <p>
                    {persianDate(item.date)} <span>•</span> ساعت {fa(item.time)}{" "}
                    <span>•</span> نوبت {fa(item.number)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="record-appointment-actions">
                <span>
                  {money(item.patientShare)} تومان{" "}
                  <small className={item.paid ? "text-positive" : ""}>
                    ({item.paid ? "پرداخت شده" : "پرداخت نشده"})
                  </small>
                </span>
                <div>
                  {["management", "reception"].includes(role) &&
                    item.status === "scheduled" && (
                      <button
                        className="button primary small"
                        onClick={() => accept(item)}
                      >
                        ثبت پذیرش
                      </button>
                    )}
                  {role === "nursing" &&
                    ["waiting", "ready"].includes(item.status) && (
                      <button
                        className="button primary small"
                        onClick={() =>
                          setModal({ type: "triage", appointmentId: item.id })
                        }
                      >
                        ثبت علائم حیاتی
                      </button>
                    )}
                  {role === "physician" &&
                    item.doctorId === currentDoctorId &&
                    ["waiting", "ready", "visiting"].includes(item.status) && (
                      <button
                        className="button primary small"
                        onClick={() =>
                          setModal({ type: "visit", appointmentId: item.id })
                        }
                      >
                        شروع ویزیت
                      </button>
                    )}
                  {["management", "finance", "patient"].includes(role) &&
                    !["cancelled", "waitlisted"].includes(item.status) && (
                      <button
                        className="button secondary small"
                        onClick={() =>
                          setModal({
                            type: item.paid ? "receipt" : "pay",
                            appointmentId: item.id,
                          })
                        }
                      >
                        {item.paid ? "رسید پرداخت" : "پرداخت فاکتور"}
                      </button>
                    )}
                  {["management", "reception", "patient"].includes(role) &&
                    ["scheduled", "waiting", "waitlisted"].includes(
                      item.status,
                    ) && (
                      <button
                        className="text-action"
                        onClick={() =>
                          setModal({
                            type: "appointment",
                            appointmentId: item.id,
                          })
                        }
                      >
                        جابه‌جایی
                      </button>
                    )}
                  {["management", "reception", "patient"].includes(role) &&
                    ["scheduled", "waitlisted"].includes(item.status) &&
                    !item.paid && (
                      <button
                        className="text-action text-danger"
                        onClick={() => cancel(item)}
                      >
                        لغو
                      </button>
                    )}
                </div>
              </div>
            </div>
          ))}
          {!appointments.length && (
            <EmptyState
              title="نوبتی در پرونده وجود ندارد"
              action={
                ["management", "reception"].includes(role) ? (
                  <button
                    className="button primary"
                    onClick={() => setModal({ type: "appointment", patientId })}
                  >
                    رزرو نوبت
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      )}
    </Modal>
  );
}

function TriageModal() {
  const { data, modal, setData, setModal, toast } = useClinic();
  const appointment = data.appointments.find(
    (item) => modal?.type === "triage" && item.id === modal.appointmentId,
  )!;
  const patient = data.patients.find(
    (item) => item.id === appointment.patientId,
  )!;
  const [form, setForm] = useState<Vitals>(
    appointment.vitals || {
      pressure: "",
      pulse: "",
      temperature: "",
      weight: "",
      height: "",
      glucose: "",
      note: "",
    },
  );
  function save(event: FormEvent) {
    event.preventDefault();
    setData((previous) => ({
      ...previous,
      appointments: previous.appointments.map((item) =>
        item.id === appointment.id
          ? { ...item, vitals: form, status: "ready" }
          : item,
      ),
      activities: [
        activity(
          "تریاژ بیمار تکمیل شد",
          `${patient.name} آماده ویزیت پزشک است.`,
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    setModal(null);
    toast("علائم حیاتی ثبت شد؛ بیمار آماده ویزیت است.");
  }
  const fields: {
    key: keyof Vitals;
    label: string;
    placeholder: string;
    min?: number;
    max?: number;
    step?: string;
  }[] = [
    { key: "pressure", label: "فشار خون (mmHg)", placeholder: "120/80" },
    {
      key: "pulse",
      label: "نبض (در دقیقه)",
      placeholder: "76",
      min: 20,
      max: 250,
    },
    {
      key: "temperature",
      label: "دمای بدن (سانتی‌گراد)",
      placeholder: "36.7",
      min: 30,
      max: 45,
      step: "0.1",
    },
    {
      key: "weight",
      label: "وزن (کیلوگرم)",
      placeholder: "68",
      min: 1,
      max: 400,
      step: "0.1",
    },
    {
      key: "height",
      label: "قد (سانتی‌متر)",
      placeholder: "170",
      min: 30,
      max: 240,
    },
    {
      key: "glucose",
      label: "قند خون (اختیاری)",
      placeholder: "95",
      min: 20,
      max: 700,
    },
  ];
  return (
    <Modal
      title="ثبت تریاژ و علائم حیاتی"
      subtitle={`${patient.name} | نوبت ${fa(appointment.number)}`}
      wide
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button form="triage-form" type="submit" className="button primary">
            <HeartPulse size={17} />
            ذخیره و آماده‌سازی ویزیت
          </button>
        </>
      }
    >
      <form id="triage-form" className="form-grid" onSubmit={save}>
        {patient.allergy !== "ندارد" && (
          <div className="clinical-warning span-2">
            <AlertCircle size={18} />
            {patient.allergy}
          </div>
        )}
        {fields.map((field) => (
          <Field key={field.key} label={field.label}>
            <input
              required={field.key !== "glucose"}
              type={field.key === "pressure" ? "text" : "number"}
              pattern={
                field.key === "pressure" ? "[0-9]{2,3}/[0-9]{2,3}" : undefined
              }
              min={field.min}
              max={field.max}
              step={field.step || "1"}
              dir="ltr"
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  [field.key]: latin(event.target.value),
                }))
              }
            />
          </Field>
        ))}
        <LiveVitals vitals={form} />
        <Field label="یادداشت پرستاری" className="span-2">
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="وضعیت عمومی بیمار و نکات قابل توجه..."
            value={form.note}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, note: event.target.value }))
            }
          />
        </Field>
      </form>
    </Modal>
  );
}

function VisitModal() {
  const { data, modal, setData, setModal, toast } = useClinic();
  const appointment = data.appointments.find(
    (item) => modal?.type === "visit" && item.id === modal.appointmentId,
  )!;
  const patient = data.patients.find(
    (item) => item.id === appointment.patientId,
  )!;
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicine, setMedicine] = useState("");
  const [directions, setDirections] = useState("");
  const [referral, setReferral] = useState("");
  function save(event: FormEvent) {
    event.preventDefault();
    const prescription = {
      id: uid("rx"),
      patientId: patient.id,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      date: data.day,
      diagnosis: diagnosis.trim(),
      medicine: medicine.trim() || "بدون تجویز دارو",
      directions: directions.trim() || "طبق دستور پزشک معالج",
      tracking: String(Math.floor(10000 + Math.random() * 90000)),
      referral: referral.trim(),
    };
    setData((previous) => ({
      ...previous,
      appointments: previous.appointments.map((item) =>
        item.id === appointment.id
          ? { ...item, status: "completed", diagnosis, notes, referral }
          : item,
      ),
      doctors: previous.doctors.map((doctor) =>
        doctor.id === appointment.doctorId
          ? {
              ...doctor,
              status: previous.appointments.some(
                (item) =>
                  item.id !== appointment.id &&
                  item.doctorId === doctor.id &&
                  item.status === "visiting",
              )
                ? "visiting"
                : "available",
            }
          : doctor,
      ),
      prescriptions: [prescription, ...previous.prescriptions],
      procedures: referral.trim()
        ? [
            {
              id: uid("service"),
              patientId: patient.id,
              name: referral.trim(),
              note: `دستور ${previous.doctors.find((doctor) => doctor.id === appointment.doctorId)?.name || "پزشک معالج"}؛ ${diagnosis.trim()}`,
              date: data.day,
              status: "pending",
              urgent: false,
              ...serviceBilling(previous, patient.id, "ts3"),
            },
            ...previous.procedures,
          ]
        : previous.procedures,
      activities: [
        activity(
          "ویزیت و نسخه ثبت شد",
          `${patient.name}؛ کد نسخه محلی ${fa(prescription.tracking)}`,
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    setModal(null);
    toast(
      `ویزیت پایان یافت؛ نسخه محلی با کد ${fa(prescription.tracking)} ثبت شد.`,
    );
  }
  return (
    <Modal
      title="ویزیت و ثبت نسخه"
      subtitle={`${patient.name} | ${fa(patient.age)} سال | ${patient.insurance}`}
      wide
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button className="button primary" type="submit" form="visit-form">
            <Check size={17} />
            ثبت نسخه و پایان ویزیت
          </button>
        </>
      }
    >
      <form className="form-grid" id="visit-form" onSubmit={save}>
        <PatientContextSummary
          patientId={patient.id}
          appointmentId={appointment.id}
        />
        <div className="visit-patient-note span-2">
          <FileHeart size={20} />
          <div>
            <strong>نکات پرونده</strong>
            <p>
              {patient.history} <span>•</span> {patient.allergy}
            </p>
            {appointment.vitals && (
              <p>
                فشار خون: {fa(appointment.vitals.pressure)} <span>•</span> دما:{" "}
                {fa(appointment.vitals.temperature)} <span>•</span> نبض:{" "}
                {fa(appointment.vitals.pulse)}
              </p>
            )}
          </div>
        </div>
        {!appointment.vitals && (
          <div className="clinical-warning span-2">
            <AlertCircle size={17} />
            علائم حیاتی این بیمار هنوز ثبت نشده است؛ پیش از تصمیم بالینی،
            ارزیابی لازم را انجام دهید.
          </div>
        )}
        <Field label="شرح حال و معاینه" className="span-2">
          <textarea
            required
            rows={3}
            maxLength={3000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="علائم مراجعه، یافته‌های معاینه و سوابق مرتبط..."
          />
        </Field>
        <Field label="تشخیص و کد ICD-10" className="span-2">
          <input
            required
            maxLength={200}
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            placeholder="مثال: I10 - فشار خون اولیه"
          />
        </Field>
        <Field label="دارو یا خدمت تجویزشده" className="span-2">
          <input
            maxLength={500}
            value={medicine}
            onChange={(event) => setMedicine(event.target.value)}
            placeholder="نام دارو، شکل دارویی و دوز؛ در صورت نیاز"
          />
        </Field>
        <Field label="دستور مصرف" className="span-2">
          <textarea
            required={!!medicine}
            rows={2}
            maxLength={1000}
            value={directions}
            onChange={(event) => setDirections(event.target.value)}
            placeholder="تعداد، زمان مصرف و طول دوره درمان..."
          />
        </Field>
        <Field label="آزمایش، تصویربرداری یا ارجاع" className="span-2">
          <input
            maxLength={500}
            value={referral}
            onChange={(event) => setReferral(event.target.value)}
            placeholder="مثال: آزمایش CBC یا ارجاع به کلینیک داخلی"
          />
        </Field>
        <p className="form-disclaimer span-2">
          این نسخه فقط در مرورگر ثبت می‌شود و به تأمین اجتماعی یا بیمه سلامت
          ارسال نخواهد شد.
        </p>
      </form>
    </Modal>
  );
}

function PayModal() {
  const { data, modal, role, setData, setModal, toast, patientId } =
    useClinic();
  const appointment = invoices(data).find(
    (item) => modal?.type === "pay" && item.id === modal.appointmentId,
  )!;
  const [method, setMethod] = useState(
    role === "patient" ? "درگاه نمایشی" : "کارت‌خوان",
  );
  const [processing, setProcessing] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  if (role === "patient" && appointment.patientId !== patientId) return null;
  function pay(event: FormEvent) {
    event.preventDefault();
    if (data.cashClosedDate === data.day) {
      toast("صندوق بسته است؛ از واحد مالی درخواست بازگشایی کنید.", true);
      return;
    }
    if (appointment.paid) {
      setModal({ type: "receipt", appointmentId: appointment.id });
      return;
    }
    setProcessing(true);
    timer.current = window.setTimeout(() => {
      const receipt = `NBZ-${Date.now().toString().slice(-9)}`;
      setData((previous) => ({
        ...previous,
        appointments: previous.appointments.map((item) =>
          item.id === appointment.id
            ? { ...item, paid: true, paymentMethod: method, receipt }
            : item,
        ),
        procedures: previous.procedures.map((item) =>
          item.id === appointment.id
            ? { ...item, paid: true, paymentMethod: method, receipt }
            : item,
        ),
        activities: [
          activity(
            "پرداخت ثبت شد",
            `${data.patients.find((patient) => patient.id === appointment.patientId)?.name}؛ ${money(appointment.patientShare)} تومان`,
            "payment",
          ),
          ...previous.activities,
        ],
      }));
      toast("پرداخت نمایشی ثبت شد؛ هیچ مبلغی از حساب کسر نشده است.");
      setModal({ type: "receipt", appointmentId: appointment.id });
    }, 900);
  }
  return (
    <Modal
      title="تسویه فاکتور"
      subtitle={`${data.patients.find((patient) => patient.id === appointment.patientId)?.name} | ${appointment.serviceName}`}
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button
            className="button primary"
            form="payment-form"
            type="submit"
            disabled={processing}
          >
            {processing ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <LockKeyhole size={17} />
            )}
            {processing ? "در حال ثبت..." : "ثبت پرداخت نمایشی"}
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={pay}>
        <div className="payment-amount">
          <small>مبلغ قابل پرداخت</small>
          <strong>
            {money(appointment.patientShare)}
            <span>تومان</span>
          </strong>
        </div>
        <div className="invoice-preview">
          <div>
            <span>تعرفه کل</span>
            <strong>{money(appointment.total)} تومان</strong>
          </div>
          <div>
            <span>سهم بیمه</span>
            <strong>
              {money(appointment.total - appointment.patientShare)} تومان
            </strong>
          </div>
        </div>
        <span className="field-title">روش پرداخت</span>
        <div className="payment-methods">
          {[
            { name: "کارت‌خوان", icon: CreditCard },
            { name: "نقدی", icon: Banknote },
            { name: "درگاه نمایشی", icon: Monitor },
          ]
            .filter(
              (item) => role !== "patient" || item.name === "درگاه نمایشی",
            )
            .map((item) => (
              <button
                className={method === item.name ? "chosen" : ""}
                type="button"
                key={item.name}
                onClick={() => setMethod(item.name)}
              >
                <item.icon size={21} />
                {item.name}
                {method === item.name && <Check size={14} />}
              </button>
            ))}
        </div>
        <div className="inline-note">
          <ShieldCheck size={17} />
          این پرداخت شبیه‌سازی شده و هیچ درگاه بانکی فراخوانی نمی‌شود.
        </div>
      </form>
    </Modal>
  );
}

function ReceiptModal() {
  const { data, modal, role, setModal, toast, patientId } = useClinic();
  const appointment = invoices(data).find(
    (item) => modal?.type === "receipt" && item.id === modal.appointmentId,
  )!;
  if (role === "patient" && appointment.patientId !== patientId) return null;
  const patient = data.patients.find(
    (item) => item.id === appointment.patientId,
  )!;
  const provider = appointment.provider;
  function download() {
    downloadFile(
      `receipt-${appointment.receipt || appointment.id}.txt`,
      `${data.profile.clinicName}\nرسید پرداخت نمایشی نبض\nشماره رسید: ${appointment.receipt || appointment.id}\nنام بیمار: ${patient.name}\nکد ملی: ${patient.nationalCode}\nخدمت: ${appointment.serviceName}\nارائه‌دهنده: ${provider}\nتاریخ خدمت: ${persianDate(appointment.date)}\nبیمه: ${patient.insurance}\nتعرفه کل: ${money(appointment.total)} تومان\nسهم بیمه: ${money(appointment.total - appointment.patientShare)} تومان\nمبلغ پرداختی: ${money(appointment.patientShare)} تومان\nروش پرداخت: ${appointment.paymentMethod || "ثبت اولیه"}\nاین رسید صرفاً نمایشی است و اعتبار مالی یا بیمه‌ای ندارد.`,
      "text/plain;charset=utf-8",
    );
    toast("رسید نمایشی دانلود شد.");
  }
  return (
    <Modal
      title="رسید پرداخت"
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            بستن
          </button>
          <button className="button primary" onClick={download}>
            <Download size={17} />
            دانلود رسید
          </button>
        </>
      }
    >
      <div className="receipt-success">
        <span>
          <Check size={28} />
        </span>
        <h3>پرداخت با موفقیت ثبت شد</h3>
        <p>این رسید مربوط به یک پرداخت نمایشی است.</p>
        <strong>
          {money(appointment.patientShare)} <small>تومان</small>
        </strong>
      </div>
      <div className="receipt-lines">
        {[
          ["نام بیمار", patient.name],
          ["ارائه‌دهنده خدمت", provider],
          ["عنوان خدمت", appointment.serviceName],
          ["بیمه پایه", patient.insurance],
          ["تاریخ مراجعه", persianDate(appointment.date)],
          ["شماره رسید", appointment.receipt || "ثبت اولیه"],
          ["روش پرداخت", appointment.paymentMethod || "کارت‌خوان"],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ServiceModal() {
  const { data, modal, setData, setModal, toast } = useClinic();
  const urgent = modal?.type === "service" && !!modal.urgent;
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const serviceTariffs = data.tariffs.filter(
    (item) => item.specialty === "خدمات سرپایی",
  );
  const [tariffId, setTariffId] = useState(serviceTariffs[0]?.id || "ts1");
  const estimate = serviceBilling(data, patientId, tariffId);
  function save(event: FormEvent) {
    event.preventDefault();
    setData((previous) => ({
      ...previous,
      procedures: [
        {
          id: uid("service"),
          patientId,
          name: name.trim(),
          note: note.trim(),
          date: data.day,
          status: "pending",
          urgent,
          ...(urgent
            ? { total: 0, patientShare: 0, paid: false }
            : serviceBilling(previous, patientId, tariffId)),
        },
        ...previous.procedures,
      ],
      activities: [
        activity(
          urgent ? "مورد فوری ثبت شد" : "دستور خدمت ثبت شد",
          name,
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    setModal(null);
    toast("دستور خدمت ثبت شد.");
  }
  return (
    <Modal
      title={urgent ? "ثبت مورد فوری سرپایی" : "ثبت دستور خدمت بالینی"}
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button
            className={`button ${urgent ? "danger" : "primary"}`}
            type="submit"
            form="service-form"
          >
            ثبت دستور
          </button>
        </>
      }
    >
      <form id="service-form" onSubmit={save} className="form-stack">
        <Field label="بیمار">
          <select
            required
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          >
            <option value="">انتخاب بیمار</option>
            {data.patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="عنوان خدمت / اقدام">
          <input
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              urgent
                ? "ارزیابی اولیه، پایش یا انتقال به اورژانس"
                : "تزریقات، پانسمان، نمونه‌گیری و..."
            }
          />
        </Field>
        <Field label="دستور پزشک و توضیحات">
          <textarea
            required
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {!urgent && (
          <>
            <Field label="تعرفه خدمت">
              <select
                value={tariffId}
                onChange={(event) => setTariffId(event.target.value)}
              >
                {serviceTariffs.length ? (
                  serviceTariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name} - {money(tariff.amount)} تومان
                    </option>
                  ))
                ) : (
                  <option value="ts1">خدمت سرپایی - ۸۵٬۰۰۰ تومان</option>
                )}
              </select>
            </Field>
            <div className="invoice-preview">
              <div>
                <span>سهم بیمار پس از انجام خدمت</span>
                <strong>{money(estimate.patientShare)} تومان</strong>
              </div>
            </div>
            <p className="form-disclaimer">
              پس از ثبت انجام خدمت، فاکتور این دستور به صندوق اضافه می‌شود.
            </p>
          </>
        )}
        {urgent && (
          <p className="form-disclaimer">
            ثبت این فرم، اورژانس را مطلع نمی‌کند؛ تماس و هماهنگی حضوری ضروری
            است.
          </p>
        )}
      </form>
    </Modal>
  );
}

function TariffModal() {
  const { data, modal, setData, setModal, toast } = useClinic();
  const existing = data.tariffs.find(
    (item) => modal?.type === "tariff" && item.id === modal.id,
  );
  const [name, setName] = useState(existing?.name || "");
  const [specialty, setSpecialty] = useState(
    existing?.specialty || specialties[0],
  );
  const [amount, setAmount] = useState(existing?.amount || 500000);
  const [percent, setPercent] = useState(existing?.insurancePercent ?? 70);
  function save(event: FormEvent) {
    event.preventDefault();
    const tariff = {
      id: existing?.id || uid("tariff"),
      name: name.trim(),
      specialty,
      amount,
      insurancePercent: percent,
    };
    setData((previous) => ({
      ...previous,
      tariffs: existing
        ? previous.tariffs.map((item) =>
            item.id === tariff.id ? tariff : item,
          )
        : [...previous.tariffs, tariff],
    }));
    setModal(null);
    toast("تعرفه ذخیره شد؛ نوبت‌های جدید با این مبلغ محاسبه می‌شوند.");
  }
  return (
    <Modal
      title={existing ? "ویرایش تعرفه خدمت" : "تعریف خدمت جدید"}
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            انصراف
          </button>
          <button className="button primary" type="submit" form="tariff-form">
            ذخیره تعرفه
          </button>
        </>
      }
    >
      <form id="tariff-form" className="form-stack" onSubmit={save}>
        <Field label="عنوان خدمت">
          <input
            required
            minLength={3}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="تخصص">
          <select
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          >
            {[...specialties, "خدمات سرپایی"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="تعرفه آزاد (تومان)">
          <input
            required
            dir="ltr"
            type="number"
            min={1000}
            max={100000000}
            step={1000}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </Field>
        <Field label="درصد پوشش بیمه پایه">
          <input
            required
            dir="ltr"
            type="number"
            min={0}
            max={100}
            value={percent}
            onChange={(event) => setPercent(Number(event.target.value))}
          />
        </Field>
        <div className="invoice-preview">
          <div>
            <span>سهم بیمار بیمه‌شده</span>
            <strong>
              {money(Math.round((amount * (100 - percent)) / 100))} تومان
            </strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function MonitorModal() {
  const { data } = useClinic();
  const appointments = data.appointments.filter(
    (item) => item.date === data.day && item.status === "visiting",
  );
  return (
    <Modal
      title={`نمایشگر سالن انتظار ${data.profile.clinicName}`}
      subtitle="اطلاعات این نمایشگر به‌صورت زنده از همین مرورگر خوانده می‌شود."
      wide
    >
      <div className="waiting-monitor">
        <span className="eyebrow">
          مراجعین گرامی، لطفاً به اتاق پزشک مراجعه کنید
        </span>
        {appointments.map((item) => {
          const doctor = data.doctors.find(
            (person) => person.id === item.doctorId,
          )!;
          return (
            <div className="monitor-call" key={item.id}>
              <span>
                <small>شماره نوبت</small>
                <strong>{fa(item.number)}</strong>
              </span>
              <div>
                <h3>
                  {
                    data.patients.find(
                      (patient) => patient.id === item.patientId,
                    )?.name
                  }
                </h3>
                <p>{doctor.name}</p>
              </div>
              <span className="monitor-room">
                <small>اتاق</small>
                <strong>{doctor.room}</strong>
              </span>
            </div>
          );
        })}
        {!appointments.length && (
          <EmptyState
            title="در انتظار فراخوان بعدی"
            description="پس از فراخوان، شماره نوبت و اتاق پزشک اینجا نمایش داده می‌شود."
          />
        )}
        <p className="monitor-bottom">
          <HeartPulse size={17} />
          از همراهی و شکیبایی شما سپاسگزاریم.
        </p>
      </div>
    </Modal>
  );
}
