import { useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Download,
  FileText,
  HeartPulse,
  LayoutGrid,
  List,
  Megaphone,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Syringe,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react";
import {
  currentDoctorId,
  fa,
  latin,
  money,
  persianDate,
  specialties,
  statuses,
  weekdays,
} from "../data";
import { activity, downloadFile, useClinic } from "../store";
import {
  AppointmentTable,
  Avatar,
  EmptyState,
  IconButton,
  NewAppointmentButton,
  PageHeader,
  PanelHeader,
  SearchInput,
} from "./ui";
import HealthRecord from "./HealthRecord";
import type { AppointmentStatus } from "../types";

export function Appointments() {
  const { data, role, patientId } = useClinic();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [date, setDate] = useState(role === "patient" ? "" : data.day);
  const [page, setPage] = useState(1);
  const owned = data.appointments.filter(
    (item) =>
      (role !== "patient" || item.patientId === patientId) &&
      (role !== "physician" || item.doctorId === currentDoctorId),
  );
  const filtered = owned
    .filter((item) => {
      const patient = data.patients.find(
        (person) => person.id === item.patientId,
      )!;
      const doctor = data.doctors.find(
        (person) => person.id === item.doctorId,
      )!;
      return (
        (!date || item.date === date) &&
        (status === "all" || item.status === status) &&
        (specialty === "all" || doctor.specialty === specialty) &&
        `${patient.name} ${patient.nationalCode} ${doctor.name}`.includes(
          latin(search),
        )
      );
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const safePage = Math.min(page, pages);
  function resetFilter(fn: () => void) {
    fn();
    setPage(1);
  }
  return (
    <>
      <PageHeader
        title={role === "patient" ? "نوبت‌های من" : "نوبت‌ها و پذیرش"}
        subtitle="از رزرو تا پایان ویزیت، مسیر هر نوبت را دنبال کنید."
      >
        {["management", "reception", "patient"].includes(role) && (
          <NewAppointmentButton
            label={role === "patient" ? "رزرو نوبت" : "ثبت نوبت جدید"}
          />
        )}
      </PageHeader>
      <section className="panel">
        <div className="filter-toolbar">
          <SearchInput
            value={search}
            onChange={(value) => resetFilter(() => setSearch(value))}
          />
          <div className="filter-controls">
            <select
              aria-label="فیلتر تخصص"
              value={specialty}
              onChange={(event) =>
                resetFilter(() => setSpecialty(event.target.value))
              }
            >
              <option value="all">همه تخصص‌ها</option>
              {specialties.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input
              type="date"
              aria-label="تاریخ نوبت‌ها"
              value={date}
              onChange={(event) =>
                resetFilter(() => setDate(event.target.value))
              }
            />
            <button
              className="button secondary small"
              onClick={() => {
                setDate("");
                setSpecialty("all");
                setStatus("all");
                setSearch("");
                setPage(1);
              }}
            >
              <SlidersHorizontal size={15} />
              همه نوبت‌ها
            </button>
          </div>
        </div>
        <div className="table-tabs wrap-tabs">
          <button
            className={status === "all" ? "active" : ""}
            onClick={() => resetFilter(() => setStatus("all"))}
          >
            همه
            <span>
              {fa(owned.filter((item) => !date || item.date === date).length)}
            </span>
          </button>
          {(Object.keys(statuses) as AppointmentStatus[]).map((item) => (
            <button
              key={item}
              className={status === item ? "active" : ""}
              onClick={() => resetFilter(() => setStatus(item))}
            >
              {statuses[item].label}
            </button>
          ))}
        </div>
        <AppointmentTable
          appointments={filtered.slice((safePage - 1) * 8, safePage * 8)}
        />
        <div className="pagination">
          <span>{fa(filtered.length)} نوبت پیدا شد</span>
          <div>
            <IconButton
              icon={ChevronRight}
              label="صفحه قبل"
              onClick={() => setPage(Math.max(1, safePage - 1))}
            />
            <span>
              صفحه {fa(safePage)} از {fa(pages)}
            </span>
            <IconButton
              icon={ChevronLeft}
              label="صفحه بعد"
              onClick={() => setPage(Math.min(pages, safePage + 1))}
            />
          </div>
        </div>
      </section>
      <div className="inline-note">
        <ShieldCheck size={16} />
        اعتبارسنجی بیمه و ارسال پیامک در این نسخه، صرفاً نمایشی است.
      </div>
    </>
  );
}

export function Doctors({ booking = false }: { booking?: boolean }) {
  const { data, role, setModal, patientId } = useClinic();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [view, setView] = useState("grid");
  const doctors = data.doctors.filter(
    (doctor) =>
      (specialty === "all" || specialty === doctor.specialty) &&
      `${doctor.name} ${doctor.specialty}`.includes(search),
  );
  return (
    <>
      <PageHeader
        title={
          booking ? "پزشک شما، در زمان دلخواه شما" : "مدیریت پزشکان و شیفت‌ها"
        }
        subtitle={
          booking
            ? "تخصص را انتخاب کنید و اولین قدم را برای حال بهتر بردارید."
            : "برنامه حضور، ظرفیت پذیرش و شیفت پزشکان را مدیریت کنید."
        }
      >
        {role === "management" && (
          <button
            className="button primary"
            onClick={() => setModal({ type: "doctor" })}
          >
            <Plus size={18} />
            افزودن پزشک
          </button>
        )}
      </PageHeader>
      <div className="standalone-filters">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی نام پزشک یا تخصص..."
        />
        <select
          aria-label="انتخاب تخصص پزشک"
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value)}
        >
          <option value="all">همه تخصص‌ها</option>
          {specialties.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        {!booking && (
          <div className="view-switch">
            <IconButton
              icon={LayoutGrid}
              label="نمای پزشکان"
              className={view === "grid" ? "selected" : ""}
              onClick={() => setView("grid")}
            />
            <IconButton
              icon={List}
              label="برنامه هفتگی"
              className={view === "week" ? "selected" : ""}
              onClick={() => setView("week")}
            />
          </div>
        )}
      </div>
      {view === "week" ? (
        <section className="panel table-scroll">
          <table className="data-table schedule-table">
            <thead>
              <tr>
                <th>پزشک</th>
                {weekdays.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>
                    <strong>{doctor.name}</strong>
                    <small className="cell-secondary">{doctor.specialty}</small>
                  </td>
                  {weekdays.map((day) => (
                    <td key={day}>
                      {doctor.days.includes(day) ? (
                        <button
                          className={`schedule-slot ${doctor.status === "off" ? "slot-off" : ""}`}
                          onClick={() =>
                            setModal({ type: "doctor", id: doctor.id })
                          }
                        >
                          {fa(doctor.startTime)} - {fa(doctor.endTime)}
                          <small>
                            {doctor.status === "off"
                              ? "مرخصی / غیرفعال"
                              : `${fa(doctor.capacity)} نفر ظرفیت`}
                          </small>
                        </button>
                      ) : (
                        <span className="muted">بدون شیفت</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="doctor-grid">
          {doctors.map((doctor) => {
            const count = data.appointments.filter(
              (item) =>
                item.doctorId === doctor.id &&
                item.date === data.day &&
                !["cancelled", "waitlisted"].includes(item.status),
            ).length;
            return (
              <article className="doctor-card" key={doctor.id}>
                <div className="doctor-card-top">
                  <Avatar name={doctor.name} src={doctor.avatar} size="large" />
                  <span
                    className={`status-badge ${doctor.status === "off" ? "status-slate" : "status-green"}`}
                  >
                    <i />
                    {doctor.status === "off" ? "خارج از شیفت" : "فعال"}
                  </span>
                </div>
                <h2>{doctor.name}</h2>
                <p className="doctor-specialty">{doctor.specialty}</p>
                <div className="doctor-meta">
                  <span>
                    <CalendarDays size={15} />
                    {doctor.days.join("، ")}
                  </span>
                  <span>
                    <ClockIcon />
                    {fa(doctor.startTime)} تا {fa(doctor.endTime)} <i /> اتاق{" "}
                    {doctor.room}
                  </span>
                </div>
                <div className="capacity-label">
                  <span>نوبت‌های امروز</span>
                  <strong>
                    {fa(count)} <small>از {fa(doctor.capacity)} نفر</small>
                  </strong>
                </div>
                <div className="capacity-bar">
                  <span
                    style={{
                      width: `${Math.min(100, (count / doctor.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  className={`button ${booking ? "primary" : "secondary"} full-width`}
                  onClick={() =>
                    setModal(
                      booking
                        ? {
                            type: "appointment",
                            patientId: patientId,
                            doctorId: doctor.id,
                          }
                        : { type: "doctor", id: doctor.id },
                    )
                  }
                >
                  {booking
                    ? "انتخاب پزشک و رزرو نوبت"
                    : "مشاهده و ویرایش برنامه"}
                  <ChevronLeft size={16} />
                </button>
              </article>
            );
          })}
          {!doctors.length && <EmptyState />}
        </div>
      )}
    </>
  );
}

function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function Patients() {
  const { data, role, setModal } = useClinic();
  const [search, setSearch] = useState("");
  const [insurance, setInsurance] = useState("all");
  const patients = data.patients.filter(
    (patient) =>
      `${patient.name} ${patient.nationalCode} ${patient.phone}`.includes(
        latin(search),
      ) &&
      (insurance === "all" || patient.insurance === insurance),
  );
  return (
    <>
      <PageHeader
        title="پرونده بیماران"
        subtitle="اطلاعات سلامت و سوابق مراجعه، یکپارچه و در دسترس شما."
      >
        {["management", "reception"].includes(role) && (
          <button
            className="button primary"
            onClick={() => setModal({ type: "patient" })}
          >
            <UserRoundPlus size={18} />
            تشکیل پرونده جدید
          </button>
        )}
      </PageHeader>
      <section className="panel">
        <div className="filter-toolbar">
          <SearchInput value={search} onChange={setSearch} />
          <select
            aria-label="فیلتر بیمه بیمار"
            value={insurance}
            onChange={(event) => setInsurance(event.target.value)}
          >
            <option value="all">همه بیمه‌ها</option>
            {Array.from(
              new Set(data.patients.map((patient) => patient.insurance)),
            ).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام بیمار</th>
                <th>کد ملی</th>
                <th>شماره همراه</th>
                <th>سن / جنسیت</th>
                <th>بیمه پایه</th>
                <th>پرونده</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient, index) => (
                <tr key={patient.id}>
                  <td>
                    <div className="person-cell">
                      <Avatar name={patient.name} index={index} />
                      <strong>{patient.name}</strong>
                    </div>
                  </td>
                  <td>{fa(patient.nationalCode)}</td>
                  <td className="numeric-cell">{fa(patient.phone)}</td>
                  <td>
                    {fa(patient.age)} سال / {patient.gender}
                  </td>
                  <td>
                    <span className="insurance-label">
                      <ShieldCheck size={14} />
                      {patient.insurance}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-action"
                      onClick={() =>
                        setModal({ type: "record", patientId: patient.id })
                      }
                    >
                      مشاهده پرونده
                      <ChevronLeft size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!patients.length && <EmptyState />}
        </div>
        <div className="table-bottom">
          <span>{fa(patients.length)} پرونده بیمار</span>
          <span>اطلاعات فقط در این مرورگر ذخیره شده‌اند</span>
        </div>
      </section>
    </>
  );
}

export function Queue() {
  const { data, role, setData, setModal, toast } = useClinic();
  const appointments = data.appointments.filter(
    (item) =>
      item.date === data.day &&
      (role !== "physician" || item.doctorId === currentDoctorId) &&
      ["waiting", "ready", "visiting"].includes(item.status),
  );
  const current = appointments.filter((item) => item.status === "visiting");
  function callNext() {
    const next = appointments.find(
      (item) =>
        item.status === "ready" &&
        data.doctors.find((doctor) => doctor.id === item.doctorId)?.status ===
          "available",
    );
    if (!next) {
      toast(
        "بیمار آماده‌ای برای پزشک آزاد وجود ندارد؛ تریاژ و وضعیت پزشکان را بررسی کنید.",
        true,
      );
      return;
    }
    setData((previous) => ({
      ...previous,
      appointments: previous.appointments.map((item) =>
        item.id === next.id ? { ...item, status: "visiting" } : item,
      ),
      doctors: previous.doctors.map((doctor) =>
        doctor.id === next.doctorId
          ? { ...doctor, status: "visiting" }
          : doctor,
      ),
      activities: [
        activity(
          "بیمار بعدی فراخوان شد",
          `شماره ${fa(next.number)} به اتاق پزشک مراجعه کند.`,
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    toast(`بیمار شماره ${fa(next.number)} فراخوان شد.`);
  }
  return (
    <>
      <PageHeader
        title="مدیریت صف انتظار"
        subtitle="از حضور در سالن انتظار تا ورود به اتاق پزشک، در یک نگاه."
      >
        <button
          className="button secondary"
          onClick={() => setModal({ type: "monitor" })}
        >
          <Activity size={17} />
          نمایشگر سالن
        </button>
        <button className="button primary" onClick={callNext}>
          <Megaphone size={18} />
          فراخوان بیمار بعدی
        </button>
      </PageHeader>
      <div className="queue-summary">
        {current.map((item) => {
          const doctor = data.doctors.find(
            (person) => person.id === item.doctorId,
          )!;
          return (
            <div key={item.id} className="queue-active">
              <span className="live-dot" />
              <div>
                <small>در حال ویزیت در اتاق {doctor.room}</small>
                <strong>
                  {
                    data.patients.find(
                      (patient) => patient.id === item.patientId,
                    )?.name
                  }
                </strong>
                <span>{doctor.name}</span>
              </div>
              <b>{fa(item.number)}</b>
            </div>
          );
        })}
      </div>
      <section className="panel">
        <PanelHeader
          title="بیماران حاضر در کلینیک"
          subtitle="بیماران با وضعیت «آماده ویزیت» امکان فراخوان دارند."
        />
        <AppointmentTable appointments={appointments} />
      </section>
    </>
  );
}

export function Nursing({
  mode = "triage",
}: {
  mode?: "triage" | "procedures" | "emergency";
}) {
  const { data, setData, setModal, toast } = useClinic();
  const appointments = data.appointments.filter(
    (item) =>
      item.date === data.day && ["waiting", "ready"].includes(item.status),
  );
  const procedures = data.procedures.filter((item) =>
    mode === "emergency" ? item.urgent : !item.urgent,
  );
  function complete(id: string) {
    setData((previous) => ({
      ...previous,
      procedures: previous.procedures.map((item) =>
        item.id === id ? { ...item, status: "done" } : item,
      ),
      activities: [
        activity(
          "خدمت بالینی انجام شد",
          "انجام خدمت پرستاری در پرونده بیمار ثبت شد.",
          "clinical",
        ),
        ...previous.activities,
      ],
    }));
    const service = data.procedures.find((item) => item.id === id);
    toast(
      service?.total
        ? "انجام خدمت ثبت شد و فاکتور به صندوق اضافه شد."
        : "انجام خدمت در پرونده ثبت شد.",
    );
  }
  return (
    <>
      <PageHeader
        title={
          mode === "triage"
            ? "تریاژ و علائم حیاتی"
            : mode === "emergency"
              ? "فوریت‌های سرپایی"
              : "خدمات بالینی سرپایی"
        }
        subtitle={
          mode === "triage"
            ? "ارزیابی اولیه بیمار، برای ویزیتی دقیق‌تر و ایمن‌تر."
            : "دستورات بالینی و اقدامات انجام‌شده را در پرونده ثبت کنید."
        }
      >
        {mode !== "triage" && (
          <button
            className={`button ${mode === "emergency" ? "danger" : "primary"}`}
            onClick={() =>
              setModal({ type: "service", urgent: mode === "emergency" })
            }
          >
            <Plus size={18} />
            {mode === "emergency" ? "ثبت مورد فوری" : "ثبت دستور خدمت"}
          </button>
        )}
      </PageHeader>
      {mode === "emergency" && (
        <div className="clinical-warning">
          <TriangleAlert size={21} />
          <div>
            <strong>در شرایط اضطراری با اورژانس بیمارستان تماس بگیرید.</strong>
            <p>
              این بخش صرفاً برای ثبت اقدامات است و جایگزین ارزیابی پزشکی یا
              سامانه پاسخ اضطراری نیست.
            </p>
          </div>
        </div>
      )}
      {mode === "triage" ? (
        <>
          <div className="nursing-overview">
            <HeartPulse size={28} />
            <div>
              <strong>
                {fa(appointments.filter((item) => !item.vitals).length)} بیمار
                در انتظار ارزیابی اولیه
              </strong>
              <p>
                فشار خون، نبض، دما و سایر علائم را پیش از ورود به اتاق پزشک ثبت
                کنید.
              </p>
            </div>
          </div>
          <section className="panel">
            <PanelHeader title="فهرست تریاژ امروز" />
            <AppointmentTable appointments={appointments} />
          </section>
        </>
      ) : (
        <section className="panel">
          <PanelHeader
            title={
              mode === "emergency"
                ? "موارد نیازمند اقدام فوری"
                : "دستورات خدمات امروز"
            }
          />
          <div className="service-list">
            {procedures.map((procedure) => (
              <div className="service-row" key={procedure.id}>
                <span
                  className={`service-symbol ${procedure.urgent ? "urgent" : ""}`}
                >
                  {procedure.urgent ? (
                    <HeartPulse size={24} />
                  ) : (
                    <Syringe size={24} />
                  )}
                </span>
                <div>
                  <strong>{procedure.name}</strong>
                  <p>
                    {
                      data.patients.find(
                        (patient) => patient.id === procedure.patientId,
                      )?.name
                    }{" "}
                    <span>•</span> {procedure.note}
                  </p>
                  <small>
                    {persianDate(procedure.date)}
                    {procedure.total
                      ? ` • تعرفه خدمت: ${money(procedure.total)} تومان`
                      : ""}
                  </small>
                </div>
                {procedure.status === "done" ? (
                  <span className="status-badge status-green">
                    <Check size={13} />
                    انجام شده
                  </span>
                ) : (
                  <button
                    className="button secondary small"
                    onClick={() => complete(procedure.id)}
                  >
                    <Check size={15} />
                    ثبت انجام خدمت
                  </button>
                )}
              </div>
            ))}
            {!procedures.length && (
              <EmptyState
                title="موردی ثبت نشده است"
                description="برای ثبت دستور جدید از دکمه بالای صفحه استفاده کنید."
              />
            )}
          </div>
        </section>
      )}
    </>
  );
}

export function Visits() {
  const { data, setModal } = useClinic();
  const appointments = data.appointments.filter(
    (item) =>
      item.doctorId === currentDoctorId &&
      item.date === data.day &&
      !["cancelled", "waitlisted"].includes(item.status),
  );
  const next =
    appointments.find((item) => item.status === "visiting") ||
    appointments.find((item) => item.status === "ready");
  return (
    <>
      <PageHeader
        title="ویزیت و نسخه‌نویسی"
        subtitle="شرح حال، تشخیص، نسخه و ارجاع را در یک مسیر ثبت کنید."
      />
      {next && (
        <section className="visit-next">
          <Avatar
            name={
              data.patients.find((patient) => patient.id === next.patientId)!
                .name
            }
            size="large"
          />
          <div>
            <span className="eyebrow">بیمار آماده ویزیت</span>
            <h2>
              {
                data.patients.find((patient) => patient.id === next.patientId)
                  ?.name
              }
            </h2>
            <p>
              نوبت {fa(next.number)} <span>•</span> {fa(next.time)}{" "}
              <span>•</span>{" "}
              {next.vitals
                ? "علائم حیاتی ثبت شده"
                : "نیازمند ارزیابی علائم حیاتی"}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => setModal({ type: "visit", appointmentId: next.id })}
          >
            <ClipboardPlus size={18} />
            ورود به اتاق ویزیت
          </button>
        </section>
      )}
      <section className="panel">
        <PanelHeader title="بیماران برنامه امروز من" />
        <AppointmentTable appointments={appointments} />
      </section>
      <div className="inline-note">
        <FileText size={16} />
        نسخه‌ها به‌صورت محلی ثبت می‌شوند و به سامانه‌های بیمه ارسال نخواهند شد.
      </div>
    </>
  );
}

export function Prescriptions() {
  const { data, role, toast, patientId } = useClinic();
  const prescriptions = data.prescriptions.filter((item) =>
    role === "patient"
      ? item.patientId === patientId
      : role === "physician"
        ? item.doctorId === currentDoctorId
        : true,
  );
  function download(id: string) {
    const prescription = prescriptions.find((item) => item.id === id)!;
    downloadFile(
      `nabz-prescription-${prescription.tracking}.txt`,
      `نسخه نمایشی نبض\nبیمار: ${data.patients.find((patient) => patient.id === prescription.patientId)?.name}\nپزشک: ${data.doctors.find((doctor) => doctor.id === prescription.doctorId)?.name}\nتاریخ: ${persianDate(prescription.date)}\nتشخیص: ${prescription.diagnosis}\nدارو / خدمت: ${prescription.medicine}\nدستور مصرف: ${prescription.directions}\nارجاع: ${prescription.referral || "ندارد"}\nکد رهگیری محلی: ${prescription.tracking}\nاین نسخه صرفاً نمایشی است و اعتبار پزشکی یا بیمه‌ای ندارد.`,
      "text/plain;charset=utf-8",
    );
    toast("نسخه نمایشی دانلود شد.");
  }
  return (
    <>
      <PageHeader
        title={
          role === "patient" ? "نسخه‌های الکترونیک من" : "نسخه‌های الکترونیک"
        }
        subtitle="داروها، دستورات و کدهای رهگیری نسخه‌ها در یک جا."
      />
      <div className="prescription-list">
        {prescriptions.map((item) => (
          <article className="panel prescription-panel" key={item.id}>
            <div className="prescription-head">
              <span className="prescription-icon">
                <FileText size={25} />
              </span>
              <div>
                <h2>
                  {
                    data.patients.find(
                      (patient) => patient.id === item.patientId,
                    )?.name
                  }
                </h2>
                <p>
                  {
                    data.doctors.find((doctor) => doctor.id === item.doctorId)
                      ?.name
                  }{" "}
                  <span>•</span> {persianDate(item.date)}
                </p>
              </div>
              <span className="status-badge status-blue">نسخه محلی</span>
            </div>
            <div className="prescription-body">
              <div>
                <small>تشخیص</small>
                <strong>{item.diagnosis}</strong>
              </div>
              <div>
                <small>دارو / خدمت تجویزشده</small>
                <strong>{item.medicine}</strong>
                <p>{item.directions}</p>
              </div>
              {item.referral && (
                <div>
                  <small>ارجاع و دستورات تکمیلی</small>
                  <p>{item.referral}</p>
                </div>
              )}
            </div>
            <div className="prescription-footer">
              <span>
                کد رهگیری نمایشی <b>{fa(item.tracking)}</b>
              </span>
              <button
                className="button secondary small"
                onClick={() => download(item.id)}
              >
                <Download size={15} />
                دریافت نسخه
              </button>
            </div>
          </article>
        ))}
        {!prescriptions.length && (
          <EmptyState
            title="هنوز نسخه‌ای ثبت نشده است"
            description="پس از ثبت نسخه توسط پزشک، اطلاعات آن در این بخش نمایش داده می‌شود."
          />
        )}
      </div>
      <div className="inline-note">
        <TriangleAlert size={16} />
        نسخه‌ها صرفاً نمونه‌اند و نباید مبنای مصرف دارو قرار گیرند.
      </div>
    </>
  );
}

export function PatientHistory() {
  const { patientId } = useClinic();
  return (
    <>
      <PageHeader
        title="پرونده سلامت من"
        subtitle="پرونده شما بر اساس سن، جنسیت، وضعیت تأهل و ویزیت پیش رو شخصی‌سازی شده است."
      />
      <HealthRecord patientId={patientId} />
    </>
  );
}
