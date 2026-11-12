import {
  currentDoctorId,
  currentPatientId,
  fa,
  latin,
  money,
  pageNames,
  persianDate,
  roleNames,
  rolePages,
  specialties,
  statuses,
} from "./data";
import { invoices } from "./invoices";
import { getIntake, getQuestions, intakeProgress } from "./intake";
import type {
  Appointment,
  ClinicData,
  Doctor,
  ModalState,
  Page,
  Patient,
  Role,
  Theme,
  Vitals,
} from "./types";

/*
 * Local, rule-based "smart" layer. Nothing here calls a model or a server:
 * every hint and answer is computed from the data stored in this browser.
 */

export type Tone = "info" | "warn" | "good";
export interface SmartAction {
  label: string;
  page?: Page;
  modal?: ModalState;
  theme?: Theme;
}
export interface Hint {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  action?: SmartAction;
  ask?: string;
}
export interface Reply {
  text: string;
  details?: string[];
  actions?: SmartAction[];
}
type Maybe<T> = T | false | null | undefined;
type Builder = () => Maybe<Hint>;

const active = (item: Appointment) =>
  !["cancelled", "waitlisted"].includes(item.status);
const pad = (value: number) => String(value).padStart(2, "0");
const sum = (items: { patientShare: number }[]) =>
  items.reduce((total, item) => total + item.patientShare, 0);
const shortDoc = (item: Doctor) => `دکتر ${item.name.split(" ").slice(-1)[0]}`;
const compact = (value: number) =>
  value >= 1000000
    ? `${fa((value / 1000000).toFixed(1).replace(".0", "")).replace(".", "٫")} میلیون`
    : `${fa(Math.round(value / 1000))} هزار`;
const mk = (
  id: string,
  tone: Tone,
  title: string,
  detail: string,
  action?: SmartAction,
  ask?: string,
): Hint => ({ id, tone, title, detail, action, ask });
const keep = (items: Maybe<Hint>[]) =>
  items.filter((item): item is Hint => Boolean(item));

function scope(data: ClinicData) {
  const patient = (id: string) => data.patients.find((item) => item.id === id);
  const doctor = (id: string) => data.doctors.find((item) => item.id === id);
  const pname = (id: string) => patient(id)?.name || "بیمار";
  const today = data.appointments.filter(
    (item) => item.date === data.day && active(item),
  );
  const names = (items: { patientId: string }[], max = 3) =>
    items
      .slice(0, max)
      .map((item) => pname(item.patientId))
      .join("، ") +
    (items.length > max ? ` و ${fa(items.length - max)} نفر دیگر` : "");
  return { patient, doctor, pname, today, names };
}

/** Flags values outside common adult ranges. A screening aid, not a diagnosis. */
export function vitalFlags(vitals?: Partial<Vitals>): string[] {
  if (!vitals) return [];
  const flags: string[] = [];
  const [systolic, diastolic] = (vitals.pressure || "").split("/").map(Number);
  if (systolic >= 140 || diastolic >= 90) flags.push("فشار خون بالا");
  else if (systolic > 0 && systolic < 90) flags.push("فشار خون پایین");
  const pulse = Number(vitals.pulse);
  if (pulse > 100) flags.push("نبض تند");
  else if (pulse > 0 && pulse < 50) flags.push("نبض کند");
  const temperature = Number(vitals.temperature);
  if (temperature >= 38) flags.push("تب");
  else if (temperature > 0 && temperature < 35.5) flags.push("دمای پایین");
  const glucose = Number(vitals.glucose);
  if (glucose > 180) flags.push("قند خون بالا");
  else if (glucose > 0 && glucose < 70) flags.push("قند خون پایین");
  return flags;
}

export function freeSlots(data: ClinicData, doctor: Doctor, date: string) {
  const [startHour, startMinute] = doctor.startTime.split(":").map(Number);
  const [endHour, endMinute] = doctor.endTime.split(":").map(Number);
  const taken = data.appointments.filter(
    (item) => item.doctorId === doctor.id && item.date === date && active(item),
  );
  if (taken.length >= doctor.capacity) return [];
  const times = new Set(taken.map((item) => item.time));
  const slots: string[] = [];
  for (
    let minute = startHour * 60 + startMinute;
    minute < endHour * 60 + endMinute;
    minute += 15
  ) {
    const slot = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
    if (!times.has(slot)) slots.push(slot);
  }
  return slots;
}

function earliestSlot(data: ClinicData, specialty?: string) {
  return data.doctors
    .filter(
      (item) =>
        item.status !== "off" && (!specialty || item.specialty === specialty),
    )
    .map((item) => ({ item, free: freeSlots(data, item, data.day) }))
    .filter((row) => row.free.length > 0)
    .sort((a, b) => a.free[0].localeCompare(b.free[0]));
}

/* ------------------------------------------------------------------ */
/* Page hints: at most four one-line insights per role and section.    */
/* ------------------------------------------------------------------ */

export function getHints(
  data: ClinicData,
  role: Role,
  page: Page,
  patientId = currentPatientId,
): Hint[] {
  const { patient, doctor, pname, today, names } = scope(data);
  const can = (target: Page) =>
    rolePages[role].includes(target) ||
    target === "settings" ||
    target === "notifications";
  const link = (label: string, target: Page): SmartAction | undefined =>
    target !== page && can(target) ? { label, page: target } : undefined;

  const bills = invoices(data);
  const todayBills = bills.filter((item) => item.date === data.day);
  const open = todayBills.filter((item) => !item.paid);
  const untriaged = today.filter(
    (item) => item.status === "waiting" && !item.vitals,
  );
  const scheduled = today.filter((item) => item.status === "scheduled");
  const waitlisted = data.appointments.filter(
    (item) => item.status === "waitlisted",
  );
  const abnormal = today.filter(
    (item) => item.status !== "completed" && vitalFlags(item.vitals).length > 0,
  );
  const urgent = data.procedures.filter(
    (item) => item.urgent && item.status === "pending",
  );
  const pending = data.procedures.filter(
    (item) => !item.urgent && item.status === "pending",
  );
  const offBusy = data.doctors.filter(
    (item) =>
      item.status === "off" &&
      today.some((a) => a.doctorId === item.id && a.status !== "completed"),
  );
  const allergic = data.patients.filter(
    (item) => item.allergy && item.allergy !== "ندارد",
  );
  const incomplete = data.patients.filter(
    (item) => !item.history.trim() || item.bloodType === "نامشخص",
  );
  const done = today.filter((item) => item.status === "completed").length;
  const loads = data.doctors
    .filter((item) => item.status !== "off")
    .map((item) => ({
      item,
      count: today.filter((a) => a.doctorId === item.id).length,
    }))
    .sort((a, b) => b.count / b.item.capacity - a.count / a.item.capacity);
  const submitted = new Set(data.claims.flatMap((item) => item.appointmentIds));
  const docs = todayBills.filter(
    (item) =>
      item.paid &&
      !submitted.has(item.id) &&
      patient(item.patientId)?.insurance !== "آزاد",
  );
  const groups = specialties
    .map((name) => ({
      name,
      count: today.filter((a) => doctor(a.doctorId)?.specialty === name).length,
    }))
    .sort((a, b) => b.count - a.count);
  const callable = today.filter(
    (item) =>
      item.status === "ready" && doctor(item.doctorId)?.status === "available",
  );
  const blocked = today.filter(
    (item) =>
      item.status === "ready" && doctor(item.doctorId)?.status !== "available",
  );
  const unread = data.activities.filter(
    (item) =>
      !item.read &&
      (role !== "patient" ||
        item.kind === "system" ||
        item.description.includes(pname(patientId))),
  );

  /* Shared clinic-wide hints */
  const s = {
    untriaged: () =>
      untriaged.length > 0 &&
      mk(
        "untriaged",
        "warn",
        `${fa(untriaged.length)} بیمار منتظر تریاژ`,
        `${names(untriaged)}؛ علائم حیاتی پیش از ویزیت ثبت شود.`,
        role === "nursing"
          ? {
              label: "ثبت علائم نفر اول",
              modal: { type: "triage", appointmentId: untriaged[0].id },
            }
          : undefined,
        "منتظران تریاژ",
      ),
    abnormal: () =>
      abnormal.length > 0 &&
      mk(
        "abnormal",
        "warn",
        `${fa(abnormal.length)} علامت حیاتی غیرمعمول`,
        `${abnormal
          .slice(0, 3)
          .map(
            (item) =>
              `${pname(item.patientId)}: ${vitalFlags(item.vitals).join("، ")}`,
          )
          .join(" | ")}؛ به پزشک اطلاع دهید.`,
        undefined,
        "وضعیت تریاژ",
      ),
    urgent: () =>
      urgent.length > 0 &&
      mk(
        "urgent",
        "warn",
        `${fa(urgent.length)} مورد فوری باز`,
        `${urgent[0].name} برای ${pname(urgent[0].patientId)}؛ هماهنگی با اورژانس را بررسی کنید.`,
        link("فوریت‌ها", "emergency"),
        "موارد فوری",
      ),
    pending: () =>
      pending.length > 0 &&
      mk(
        "pending",
        "info",
        `${fa(pending.length)} خدمت در انتظار`,
        `${pending
          .slice(0, 3)
          .map((item) => item.name)
          .join("، ")}؛ پس از انجام، فاکتور صادر می‌شود.`,
        link("خدمات سرپایی", "procedures"),
        "خدمات در انتظار",
      ),
    off: () => {
      const target = offBusy[0];
      return (
        !!target &&
        mk(
          "off",
          "warn",
          `${shortDoc(target)} خارج از شیفت`,
          `${fa(today.filter((item) => item.doctorId === target.id && item.status !== "completed").length)} نوبت فعال امروز دارد؛ جابه‌جایی یا اطلاع به بیماران لازم است.`,
          role === "management"
            ? { label: "برنامه پزشک", modal: { type: "doctor", id: target.id } }
            : link("نوبت‌ها", "appointments"),
          target.name,
        )
      );
    },
    open: () => {
      const top = [...open].sort((a, b) => b.patientShare - a.patientShare)[0];
      return (
        !!top &&
        mk(
          "open",
          "info",
          `${fa(open.length)} فاکتور باز`,
          `جمع سهم بیماران ${money(sum(open))} تومان؛ بیشترین: ${pname(top.patientId)} با ${money(top.patientShare)} تومان.`,
          link("صندوق", "finance"),
          "فاکتورهای باز",
        )
      );
    },
    cash: () =>
      data.cashClosedDate === data.day &&
      mk(
        "cash",
        "warn",
        "صندوق امروز بسته است",
        "تا بازگشایی صندوق، پرداخت جدید ثبت نمی‌شود.",
        link("صندوق", "finance"),
        "وضعیت صندوق",
      ),
    docs: () =>
      docs.length > 0 &&
      mk(
        "docs",
        "info",
        `${fa(docs.length)} سند بیمه آماده`,
        `مطالبات ${money(docs.reduce((total, item) => total + item.total - item.patientShare, 0))} تومان هنوز بسته‌بندی نشده است.`,
        link("اسناد بیمه", "insurance"),
        "اسناد بیمه",
      ),
    scheduled: () =>
      scheduled.length > 0 &&
      mk(
        "scheduled",
        "info",
        `${fa(scheduled.length)} نوبت پذیرش‌نشده`,
        `${names(scheduled)}؛ با مراجعه بیمار، پذیرش را ثبت کنید.`,
        link("نوبت‌ها", "appointments"),
        "خلاصه نوبت‌ها",
      ),
    waitlist: () =>
      waitlisted.length > 0 &&
      mk(
        "waitlist",
        "info",
        `${fa(waitlisted.length)} نفر در لیست انتظار`,
        `${names(waitlisted)}؛ با آزاد شدن ظرفیت، زمان تخصیص دهید.`,
        link("نوبت‌ها", "appointments"),
        "اولین نوبت خالی",
      ),
    callable: () =>
      callable.length > 0 &&
      mk(
        "callable",
        "good",
        `آماده فراخوان: ${pname(callable[0].patientId)}`,
        `نوبت ${fa(callable[0].number)} • ${doctor(callable[0].doctorId)?.name} • اتاق ${doctor(callable[0].doctorId)?.room}.`,
        link("صف انتظار", "queue"),
        "صف انتظار",
      ),
    blocked: () =>
      blocked.length > 0 &&
      mk(
        "blocked",
        "info",
        `${fa(blocked.length)} آماده، پزشک در دسترس نیست`,
        `${names(blocked)}؛ پس از آزاد شدن پزشک فراخوان می‌شوند.`,
      ),
    topSpec: () =>
      groups[0].count > 0 &&
      mk(
        "spec",
        "good",
        `پرمراجعه‌ترین: ${groups[0].name}`,
        `${fa(groups[0].count)} از ${fa(today.length)} مراجعه امروز؛ ظرفیت این تخصص را پایش کنید.`,
        link("گزارش‌ها", "reports"),
        "گزارش تخصص‌ها",
      ),
    done: () =>
      today.length > 0 &&
      mk(
        "done",
        "good",
        `${fa(Math.round((done / today.length) * 100))}٪ ویزیت‌ها تکمیل شد`,
        `${fa(done)} از ${fa(today.length)} نوبت امروز به پایان رسیده است.`,
        undefined,
        "خلاصه امروز",
      ),
    load: () => {
      const high = loads[0];
      const low = loads[loads.length - 1];
      return (
        !!high &&
        mk(
          "load",
          high.count / high.item.capacity >= 0.8 ? "warn" : "info",
          `پرترین برنامه: ${shortDoc(high.item)}`,
          `${fa(high.count)} از ${fa(high.item.capacity)} ظرفیت؛ کم‌بارترین: ${low.item.name} با ${fa(low.count)} نوبت.`,
          link("پزشکان", "doctors"),
          "وضعیت پزشکان",
        )
      );
    },
    allergy: () =>
      allergic.length > 0 &&
      mk(
        "allergy",
        "warn",
        `${fa(allergic.length)} بیمار با حساسیت ثبت‌شده`,
        `${allergic
          .slice(0, 3)
          .map(
            (item) =>
              `${item.name} (${item.allergy.replace("حساسیت به ", "")})`,
          )
          .join("، ")}.`,
      ),
    incomplete: () =>
      incomplete.length > 0 &&
      mk(
        "incomplete",
        "info",
        `${fa(incomplete.length)} پرونده ناقص`,
        `${incomplete
          .slice(0, 3)
          .map((item) => item.name)
          .join("، ")}؛ سابقه بیماری یا گروه خون ثبت نشده است.`,
      ),
    tariff: () => {
      const amounts = data.tariffs
        .filter((item) => specialties.includes(item.specialty))
        .map((item) => item.amount);
      return (
        amounts.length > 0 &&
        mk(
          "tariff",
          "info",
          `ویزیت: ${compact(Math.min(...amounts))} تا ${compact(Math.max(...amounts))}`,
          `${fa(data.tariffs.length)} تعرفه فعال به تومان؛ تغییر تعرفه روی فاکتورهای قبلی اثر ندارد.`,
          undefined,
          "تعرفه‌ها",
        )
      );
    },
    unread: () =>
      unread.length > 0 &&
      mk(
        "unread",
        "info",
        `${fa(unread.length)} اعلان خوانده‌نشده`,
        `تازه‌ترین: ${unread[0].title} — ${unread[0].description}`,
        link("اعلان‌ها", "notifications"),
        "اعلان‌ها",
      ),
    theme: () =>
      mk(
        "theme",
        "info",
        "تم شب برای نور کم",
        "شش تم DaisyUI در دسترس است و انتخاب شما در همین مرورگر می‌ماند.",
        { label: "فعال‌سازی تم شب", theme: "night" },
      ),
    backup: () =>
      role === "management" &&
      mk(
        "backup",
        "warn",
        "پشتیبان JSON بگیرید",
        "داده‌ها فقط در این مرورگر ذخیره‌اند؛ پیش از بازنشانی، خروجی بگیرید.",
      ),
  };

  /* Physician: only the signed-in doctor's own schedule */
  const mine = today.filter((item) => item.doctorId === currentDoctorId);
  const visiting = mine.find((item) => item.status === "visiting");
  const focus =
    visiting ||
    mine.find((item) => item.status === "ready") ||
    mine.find((item) => item.status === "waiting");
  const d = {
    focus: () => {
      if (!focus) return false;
      const person = patient(focus.patientId);
      const flags = vitalFlags(focus.vitals);
      const allergy = !!person && person.allergy !== "ندارد";
      return mk(
        "focus",
        allergy || flags.length > 0 || !focus.vitals ? "warn" : "info",
        `${visiting ? "در ویزیت" : "بیمار بعدی"}: ${pname(focus.patientId)}`,
        [
          person?.history,
          allergy ? `⚠ ${person?.allergy}` : "بدون حساسیت ثبت‌شده",
          focus.vitals
            ? `فشار ${fa(focus.vitals.pressure)}${flags.length ? ` (${flags.join("، ")})` : ""}`
            : "علائم حیاتی ثبت نشده",
        ]
          .filter(Boolean)
          .join(" • "),
        {
          label: visiting ? "ادامه ویزیت" : "شروع ویزیت",
          modal: { type: "visit", appointmentId: focus.id },
        },
        pname(focus.patientId),
      );
    },
    late: () => {
      const late = mine.filter((item) => item.status === "scheduled");
      return (
        late.length > 0 &&
        mk(
          "late",
          "info",
          `${fa(late.length)} بیمار هنوز نرسیده`,
          `${names(late)}؛ پس از پذیرش و تریاژ وارد صف شما می‌شوند.`,
          undefined,
          "صف انتظار",
        )
      );
    },
    progress: () => {
      const rest = mine.filter((item) => item.status !== "completed");
      return (
        mine.length > 0 &&
        mk(
          "progress",
          "good",
          `${fa(mine.length - rest.length)} از ${fa(mine.length)} ویزیت انجام شد`,
          rest.length
            ? `باقی‌مانده: ${names(rest)}.`
            : "برنامه امروز شما کامل شده است.",
          undefined,
          "خلاصه امروز",
        )
      );
    },
    rx: () => {
      const list = data.prescriptions.filter(
        (item) => item.doctorId === currentDoctorId && item.date === data.day,
      );
      return mk(
        "rx",
        "info",
        `${fa(list.length)} نسخه امروز`,
        list.length
          ? `آخرین: ${pname(list[0].patientId)} • ${list[0].diagnosis}.`
          : "هنوز نسخه‌ای برای امروز ثبت نشده است.",
        link("نسخه‌ها", "prescriptions"),
        "نسخه‌های امروز",
      );
    },
    allergy: () => {
      const list = mine
        .filter((item) => item.status !== "completed")
        .map((item) => patient(item.patientId))
        .filter((item): item is Patient => !!item && item.allergy !== "ندارد");
      return (
        list.length > 0 &&
        mk(
          "my-allergy",
          "warn",
          `${fa(list.length)} بیمار امروز با حساسیت`,
          `${list.map((item) => `${item.name}: ${item.allergy}`).join(" | ")}.`,
        )
      );
    },
    roster: () =>
      mine.length > 0 &&
      mk(
        "roster",
        "info",
        `${fa(mine.length)} بیمار در برنامه امروز`,
        `${names(mine, 4)}؛ نام هر بیمار را از دستیار بپرسید تا خلاصه پرونده بیاید.`,
        undefined,
        "خلاصه امروز",
      ),
  };

  /* Patient: only the signed-in patient's own record */
  const me = patient(patientId);
  const myAppointments = data.appointments.filter(
    (item) => item.patientId === patientId,
  );
  const upcoming = myAppointments
    .filter(
      (item) =>
        item.date >= data.day &&
        !["cancelled", "completed"].includes(item.status),
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
  const myOpen = bills.filter(
    (item) => item.patientId === patientId && !item.paid,
  );
  const u = {
    intake: () => {
      const next = upcoming[0];
      if (!next) return false;
      const doc = doctor(next.doctorId);
      const me = patient(patientId);
      if (!me) return false;
      const intake = getIntake(data, next.id);
      const progress = intakeProgress(intake, getQuestions(me, doc, data));
      if (intake?.status === "submitted" && progress.complete) return false;
      return mk(
        "intake",
        "warn",
        `تکمیل پرونده ویزیت ${doc?.specialty || ""}`,
        progress.missing.length
          ? `${fa(progress.missing.length)} پرسش ضروری باقی مانده؛ اولین: ${progress.missing[0].prompt}`
          : "پاسخ‌ها را مرور و برای پزشک ثبت کنید.",
        {
          label: intake ? "ادامه پرسش‌ها" : "شروع پرسش‌ها",
          modal: { type: "intake", appointmentId: next.id },
        },
        "خلاصه این بخش",
      );
    },
    next: () => {
      const next = upcoming[0];
      if (!next)
        return mk(
          "next",
          "info",
          "نوبت فعالی ندارید",
          "برای پیگیری درمان، نوبت تازه رزرو کنید.",
          link("رزرو نوبت", "booking"),
          "اولین نوبت خالی",
        );
      const day =
        next.date === data.day
          ? "امروز"
          : persianDate(next.date).split(" ").slice(0, 2).join(" ");
      return mk(
        "next",
        "info",
        next.status === "waitlisted"
          ? "در لیست انتظار هستید"
          : `نوبت بعدی: ${day} ${fa(next.time)}`,
        `${doctor(next.doctorId)?.name || "پزشک"} • ${doctor(next.doctorId)?.specialty || ""} • ${statuses[next.status].label}.`,
        link("نوبت‌های من", "appointments"),
        "نوبت بعدی من",
      );
    },
    open: () =>
      myOpen.length > 0 &&
      mk(
        "my-open",
        "warn",
        `${fa(myOpen.length)} پرداخت باز`,
        `جمعاً ${money(sum(myOpen))} تومان؛ پرداخت آنلاین نمایشی در دسترس است.`,
        {
          label: "پرداخت",
          modal: { type: "pay", appointmentId: myOpen[0].id },
        },
        "پرداخت‌های من",
      ),
    allergy: () =>
      !!me &&
      me.allergy !== "ندارد" &&
      mk(
        "me-allergy",
        "warn",
        "حساسیت را یادآوری کنید",
        `${me.allergy}؛ پیش از هر تجویز به پزشک و پرستار بگویید.`,
      ),
    follow: () => {
      const last = myAppointments
        .filter((item) => item.status === "completed" && item.notes)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      return (
        !!last &&
        mk(
          "follow",
          "info",
          "یادآوری پیگیری درمان",
          `${last.notes} (ویزیت ${persianDate(last.date)}).`,
          link("رزرو نوبت", "booking"),
          "نوبت بعدی من",
        )
      );
    },
    rx: () => {
      const last = data.prescriptions.filter(
        (item) => item.patientId === patientId,
      )[0];
      return (
        !!last &&
        mk(
          "me-rx",
          "info",
          `آخرین نسخه: ${last.diagnosis}`,
          `${last.medicine} — ${last.directions}. مصرف فقط طبق دستور پزشک.`,
          link("نسخه‌ها", "prescriptions"),
          "نسخه‌های من",
        )
      );
    },
    earliest: () => {
      const first = earliestSlot(data)[0];
      return (
        !!first &&
        mk(
          "earliest",
          "good",
          `زودترین نوبت امروز: ${fa(first.free[0])}`,
          `${first.item.name} • ${first.item.specialty} • ${fa(first.free.length)} زمان آزاد.`,
          {
            label: "رزرو",
            modal: {
              type: "appointment",
              patientId: patientId,
              doctorId: first.item.id,
            },
          },
          "اولین نوبت خالی",
        )
      );
    },
    cover: () =>
      !!me &&
      mk(
        "cover",
        "info",
        me.insurance === "آزاد" ? "بدون بیمه پایه" : `بیمه: ${me.insurance}`,
        me.insurance === "آزاد"
          ? "هزینه ویزیت به‌صورت آزاد محاسبه می‌شود."
          : "حدود ۷۰٪ تعرفه ویزیت را بیمه پایه پوشش می‌دهد.",
        undefined,
        "بیمه من",
      ),
  };

  const common: Partial<Record<Page, Builder[]>> = {
    notifications: [s.unread],
    settings: [s.theme, s.backup],
  };
  const byRole: Record<Role, Partial<Record<Page, Builder[]>>> = {
    management: {
      dashboard: [s.off, s.untriaged, s.open, s.topSpec],
      doctors: [s.off, s.load],
      appointments: [s.scheduled, s.waitlist, s.untriaged, s.off],
      patients: [s.allergy, s.incomplete],
      finance: [s.cash, s.open, s.docs],
      reports: [s.topSpec, s.done, s.load],
      tariffs: [s.tariff],
    },
    physician: {
      dashboard: [d.focus, d.late, d.progress],
      appointments: [d.late, d.focus, d.progress],
      queue: [d.focus, d.late],
      visits: [d.focus, d.rx],
      patients: [d.allergy, d.roster],
      prescriptions: [d.rx],
    },
    reception: {
      dashboard: [s.scheduled, s.callable, s.waitlist, s.off],
      appointments: [s.scheduled, s.waitlist, s.off],
      patients: [s.incomplete, s.allergy],
      queue: [s.callable, s.blocked, s.untriaged],
    },
    nursing: {
      dashboard: [s.untriaged, s.urgent, s.abnormal, s.pending],
      triage: [s.untriaged, s.abnormal],
      procedures: [s.pending, s.urgent],
      emergency: [s.urgent],
      patients: [s.allergy, s.abnormal],
    },
    finance: {
      dashboard: [s.cash, s.open, s.docs],
      finance: [s.cash, s.open],
      insurance: [s.docs],
      reports: [s.done, s.topSpec],
      tariffs: [s.tariff],
    },
    patient: {
      // The dashboard already shows the next visit, so lead with what needs action.
      dashboard: [u.intake, u.open, u.follow, u.next, u.allergy],
      inbox: [u.intake, u.open, u.follow],
      booking: [u.earliest, u.cover],
      appointments: [u.next, u.open],
      history: [u.follow, u.allergy],
      prescriptions: [u.rx],
      payments: [u.open, u.cover],
    },
  };

  const hints = keep(
    (common[page] || byRole[role][page] || []).map((build) => build()),
  ).slice(0, 4);
  return hints.length
    ? hints
    : [
        mk(
          "ok",
          "good",
          "همه‌چیز مرتب است",
          "مورد نیازمند اقدامی در این بخش دیده نشد.",
        ),
      ];
}

/* ------------------------------------------------------------------ */
/* Modal hints: up to two context lines at the top of every form.      */
/* ------------------------------------------------------------------ */

export function getModalHints(
  data: ClinicData,
  role: Role,
  modal: ModalState,
  patientId = currentPatientId,
): Hint[] {
  if (!modal) return [];
  if (
    role === "patient" &&
    modal.type === "record" &&
    modal.patientId !== patientId
  )
    return [];
  const { patient, doctor, today } = scope(data);
  const out: Maybe<Hint>[] = [];
  switch (modal.type) {
    case "appointment": {
      const existing = data.appointments.find(
        (item) => item.id === modal.appointmentId,
      );
      const target = doctor(modal.doctorId || existing?.doctorId || "");
      if (target) {
        const free =
          target.status === "off" ? [] : freeSlots(data, target, data.day);
        out.push(
          free.length
            ? mk(
                "m-slot",
                "good",
                `اولین زمان خالی امروز: ${fa(free[0])}`,
                `${target.name} • ${fa(free.length)} زمان آزاد؛ هر نوبت ۱۵ دقیقه است.`,
              )
            : mk(
                "m-full",
                "warn",
                "امروز زمان خالی ندارد",
                "تاریخ دیگری انتخاب کنید یا «لیست انتظار» را فعال کنید.",
              ),
        );
      } else {
        const quiet = earliestSlot(data).sort(
          (a, b) => b.free.length - a.free.length,
        )[0];
        out.push(
          quiet &&
            mk(
              "m-quiet",
              "info",
              `خلوت‌ترین برنامه: ${shortDoc(quiet.item)}`,
              `${quiet.item.specialty} • ${fa(quiet.free.length)} زمان آزاد امروز؛ اولین: ${fa(quiet.free[0])}.`,
            ),
        );
      }
      break;
    }
    case "patient":
      out.push(
        mk(
          "m-patient",
          "info",
          "حساسیت دارویی را دقیق ثبت کنید",
          "این فیلد در تریاژ و ویزیت به‌صورت هشدار دیده می‌شود؛ کد ملی تکراری پذیرفته نمی‌شود.",
        ),
      );
      break;
    case "record": {
      const person = patient(modal.patientId);
      const latest = data.appointments
        .filter((item) => item.patientId === modal.patientId && item.vitals)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const flags = vitalFlags(latest?.vitals);
      const unpaid = invoices(data).filter(
        (item) => item.patientId === modal.patientId && !item.paid,
      );
      out.push(
        !!person &&
          person.allergy !== "ندارد" &&
          mk(
            "m-allergy",
            "warn",
            person.allergy,
            "پیش از هر تجویز یا تزریق بررسی شود.",
          ),
        flags.length > 0 &&
          mk(
            "m-vitals",
            "warn",
            `آخرین تریاژ: ${flags.join("، ")}`,
            "خارج از محدوده معمول بزرگسالان؛ نیازمند توجه پزشک.",
          ),
        ["management", "patient"].includes(role) &&
          unpaid.length > 0 &&
          mk(
            "m-unpaid",
            "info",
            `${fa(unpaid.length)} فاکتور باز`,
            `جمعاً ${money(sum(unpaid))} تومان؛ از زبانه «نوبت‌ها و عملیات» قابل پرداخت است.`,
          ),
      );
      break;
    }
    case "doctor": {
      const target = modal.id ? doctor(modal.id) : undefined;
      if (!target) {
        out.push(
          mk(
            "m-new-doctor",
            "info",
            "ظرفیت پیشنهادی: ۲۴ نوبت",
            "شیفت ۶ ساعته با نوبت‌های ۱۵ دقیقه‌ای، ۲۴ بیمار را پوشش می‌دهد.",
          ),
        );
        break;
      }
      const load = today.filter((item) => item.doctorId === target.id);
      const left = load.filter((item) => item.status !== "completed").length;
      out.push(
        mk(
          "m-load",
          left > 0 && target.status === "off" ? "warn" : "info",
          `امروز ${fa(load.length)} از ${fa(target.capacity)} ظرفیت پر است`,
          left
            ? `${fa(left)} نوبت فعال دارد؛ ثبت مرخصی بدون جابه‌جایی، تداخل ایجاد می‌کند.`
            : "نوبت فعالی ندارد؛ تغییر برنامه بدون تداخل است.",
        ),
      );
      break;
    }
    case "triage": {
      const appointment = data.appointments.find(
        (item) => item.id === modal.appointmentId,
      );
      const person = appointment && patient(appointment.patientId);
      if (!person) break;
      out.push(
        /فشار/.test(person.history) &&
          mk(
            "m-bp",
            "warn",
            "سابقه فشار خون بالا",
            "اگر عدد ۱۴۰/۹۰ یا بیشتر بود، پس از ۵ دقیقه استراحت دوباره اندازه بگیرید.",
          ),
        /دیابت/.test(person.history) &&
          mk(
            "m-glucose",
            "warn",
            "سابقه دیابت؛ قند خون ثبت شود",
            "فیلد قند خون برای این بیمار اختیاری نیست.",
          ),
        person.age < 12 &&
          mk(
            "m-child",
            "info",
            "بیمار کودک است",
            "محدوده طبیعی نبض و فشار در کودکان متفاوت است؛ هشدارها بر اساس بزرگسالان است.",
          ),
      );
      if (!keep(out).length)
        out.push(
          mk(
            "m-triage",
            "info",
            "مقادیر غیرمعمول علامت می‌خورند",
            "هم‌زمان با ورود اعداد، هشدار زیر فرم نمایش داده می‌شود.",
          ),
        );
      break;
    }
    case "visit": {
      const appointment = data.appointments.find(
        (item) => item.id === modal.appointmentId,
      );
      if (!appointment) break;
      const flags = vitalFlags(appointment.vitals);
      const last = data.prescriptions.filter(
        (item) => item.patientId === appointment.patientId,
      )[0];
      out.push(
        flags.length > 0 &&
          mk(
            "m-flags",
            "warn",
            `تریاژ امروز: ${flags.join("، ")}`,
            "خارج از محدوده معمول؛ پیش از تجویز مرور شود.",
          ),
        !!last &&
          mk(
            "m-last",
            "info",
            `آخرین تشخیص: ${last.diagnosis}`,
            `${last.medicine} • ${persianDate(last.date)}`,
          ),
      );
      break;
    }
    case "pay": {
      const bills = invoices(data);
      const bill = bills.find((item) => item.id === modal.appointmentId);
      if (!bill) break;
      const others = bills.filter(
        (item) =>
          item.patientId === bill.patientId &&
          !item.paid &&
          item.id !== bill.id,
      );
      out.push(
        bill.total > bill.patientShare &&
          mk(
            "m-share",
            "good",
            `بیمه ${money(bill.total - bill.patientShare)} تومان می‌پردازد`,
            `از تعرفه ${money(bill.total)} تومان، فقط سهم بیمار دریافت می‌شود.`,
          ),
        others.length > 0 &&
          mk(
            "m-others",
            "info",
            `${fa(others.length)} فاکتور باز دیگر`,
            `همین بیمار ${money(sum(others))} تومان بدهی دیگر دارد.`,
          ),
      );
      break;
    }
    case "receipt":
      out.push(
        mk(
          "m-receipt",
          "info",
          "رسید را برای بیمه تکمیلی نگه دارید",
          "فایل متنی رسید قابل دانلود است؛ این سند نمایشی است.",
        ),
      );
      break;
    case "service":
      out.push(
        modal.urgent
          ? mk(
              "m-urgent",
              "warn",
              "این فرم اورژانس را خبر نمی‌کند",
              "تماس و هماهنگی حضوری با اورژانس بیمارستان ضروری است.",
            )
          : mk(
              "m-service",
              "info",
              "پس از انجام، فاکتور صادر می‌شود",
              "خدمت تعرفه‌دار با ثبت «انجام خدمت» به صندوق اضافه می‌شود.",
            ),
      );
      break;
    case "tariff": {
      const amounts = data.tariffs
        .filter((item) => specialties.includes(item.specialty))
        .map((item) => item.amount);
      out.push(
        amounts.length > 0 &&
          mk(
            "m-tariff",
            "info",
            `میانگین ویزیت: ${compact(amounts.reduce((a, b) => a + b, 0) / amounts.length)} تومان`,
            "تغییر فقط روی نوبت‌های جدید اعمال می‌شود.",
          ),
      );
      break;
    }
    default:
      break;
  }
  return keep(out).slice(0, 2);
}

/* ------------------------------------------------------------------ */
/* Assistant: keyword intents answered from local data, per role.      */
/* ------------------------------------------------------------------ */

const starters: Record<Role, string[]> = {
  management: [
    "خلاصه امروز",
    "فاکتورهای باز",
    "وضعیت پزشکان",
    "صف انتظار",
    "اسناد بیمه",
  ],
  physician: [
    "بیمار بعدی کیست؟",
    "خلاصه امروز",
    "نسخه‌های امروز",
    "موارد فوری",
  ],
  reception: ["صف انتظار", "اولین نوبت خالی", "خلاصه امروز", "وضعیت پزشکان"],
  nursing: ["منتظران تریاژ", "خدمات در انتظار", "موارد فوری", "خلاصه امروز"],
  finance: ["فاکتورهای باز", "اسناد بیمه", "وضعیت صندوق", "تعرفه‌ها"],
  patient: ["نوبت بعدی من", "اولین نوبت خالی", "پرداخت‌های من", "نسخه‌های من"],
};
export const suggestions = (role: Role) => ["خلاصه این بخش", ...starters[role]];

const aliases: [string, string][] = [
  ["قلب", "قلب و عروق"],
  ["اعصاب", "مغز و اعصاب"],
  ["مغز", "مغز و اعصاب"],
  ["اطفال", "اطفال"],
  ["کودک", "اطفال"],
  ["ارتوپد", "ارتوپدی"],
  ["چشم", "چشم‌پزشکی"],
  ["زنان", "زنان و زایمان"],
  ["زایمان", "زنان و زایمان"],
];
const pageKeys: Record<Page, string[]> = {
  dashboard: ["داشبورد", "خانه", "نمای کلی"],
  inbox: ["کارتابل"],
  doctors: ["پزشکان"],
  appointments: ["نوبت"],
  patients: ["بیماران", "پرونده"],
  finance: ["مالی", "صندوق"],
  reports: ["گزارش"],
  tariffs: ["تعرفه"],
  notifications: ["اعلان"],
  settings: ["تنظیمات"],
  queue: ["صف"],
  visits: ["ویزیت"],
  prescriptions: ["نسخه"],
  triage: ["تریاژ"],
  procedures: ["خدمات"],
  emergency: ["فوریت", "اورژانس"],
  insurance: ["بیمه", "اسناد"],
  history: ["سوابق"],
  payments: ["پرداخت"],
  booking: ["رزرو"],
};

const norm = (value: string) =>
  latin(value)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/[؟?!.،,:؛«»()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const squash = (value: string) => norm(value).replace(/ /g, "");

export function answer(
  data: ClinicData,
  role: Role,
  page: Page,
  raw: string,
  patientId = currentPatientId,
): Reply {
  const q = norm(raw);
  const flat = q.replace(/ /g, "");
  const tokens = q.split(" ");
  const has = (...words: string[]) => words.some((word) => q.includes(word));
  const { patient, doctor, pname, today } = scope(data);
  const can = (target: Page) =>
    rolePages[role].includes(target) ||
    target === "settings" ||
    target === "notifications";
  const go = (label: string, target: Page): SmartAction[] =>
    can(target) ? [{ label, page: target }] : [];
  const deny = (topic: string): Reply => ({
    text: `${topic} در پنل «${roleNames[role]}» در دسترس نیست.`,
  });
  const mine = (item: Appointment) =>
    role !== "physician" || item.doctorId === currentDoctorId;
  const me = patient(patientId);
  const bills = invoices(data);
  const todayBills = bills.filter((item) => item.date === data.day);
  const when = (item: Appointment) =>
    item.status === "waitlisted"
      ? "لیست انتظار"
      : `${item.date === data.day ? "امروز" : persianDate(item.date)} ساعت ${fa(item.time)}`;
  const share = (amount: number, percent: number) =>
    role === "patient" && me?.insurance === "آزاد"
      ? amount
      : Math.round((amount * (100 - percent)) / 100);
  const book = (target: Doctor): SmartAction[] =>
    role === "patient"
      ? [
          {
            label: "رزرو نوبت",
            modal: {
              type: "appointment",
              patientId: patientId,
              doctorId: target.id,
            },
          },
        ]
      : role === "management" || role === "reception"
        ? [
            {
              label: "ثبت نوبت",
              modal: { type: "appointment", doctorId: target.id },
            },
          ]
        : [];
  const upcomingMine = () =>
    data.appointments
      .filter(
        (item) =>
          item.patientId === patientId &&
          item.date >= data.day &&
          !["cancelled", "completed"].includes(item.status),
      )
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      );

  const fallback = (): Reply => ({
    text: "پاسخ آماده‌ای برای این پرسش ندارم؛ یکی از این‌ها را امتحان کنید.",
    details: suggestions(role),
  });
  const help = (): Reply => ({
    text: "از داده‌های همین مرورگر پاسخ کوتاه می‌دهم؛ جزئیات با یک لمس باز می‌شود.",
    details: [
      ...suggestions(role),
      role === "patient"
        ? "نام پزشک یا تخصص را بنویسید تا اولین نوبت خالی بیاید."
        : "نام بیمار یا پزشک را بنویسید تا خلاصه‌اش بیاید.",
      "«برو به …» برای جابه‌جایی بین بخش‌ها.",
    ],
  });
  const medical = (): Reply => ({
    text: "توصیه پزشکی یا تشخیص ارائه نمی‌کنم؛ برای علائم خود از پزشک نوبت بگیرید. در شرایط اضطراری با ۱۱۵ تماس بگیرید.",
    actions: role === "patient" ? go("رزرو نوبت", "booking") : [],
  });

  const summary = (): Reply => {
    const hints = getHints(data, role, page, patientId);
    const list = today.filter(mine);
    const count = (...states: string[]) =>
      list.filter((item) => states.includes(item.status)).length;
    const open = todayBills.filter((item) => !item.paid);
    const text =
      role === "patient"
        ? `${fa(upcomingMine().length)} نوبت فعال و ${fa(bills.filter((item) => item.patientId === patientId && !item.paid).length)} پرداخت باز دارید.`
        : role === "finance"
          ? `وصولی امروز ${money(sum(todayBills.filter((item) => item.paid)))} تومان؛ ${fa(open.length)} فاکتور باز.`
          : role === "nursing"
            ? `${fa(list.filter((item) => item.status === "waiting" && !item.vitals).length)} منتظر تریاژ، ${fa(count("ready"))} آماده ویزیت، ${fa(data.procedures.filter((item) => item.status === "pending").length)} خدمت در انتظار.`
            : `امروز ${fa(list.length)} نوبت: ${fa(count("waiting", "ready"))} در انتظار، ${fa(count("visiting"))} در ویزیت، ${fa(count("completed"))} انجام‌شده.`;
    return {
      text,
      details: hints.map((item) => `${item.title} — ${item.detail}`),
      actions: hints
        .flatMap((item) => (item.action ? [item.action] : []))
        .slice(0, 2),
    };
  };

  const myAppointments = (): Reply => {
    const list = upcomingMine();
    const next = list[0];
    if (!next)
      return {
        text: "نوبت فعالی ندارید.",
        actions: go("رزرو نوبت", "booking"),
      };
    const ahead = today.filter(
      (item) =>
        item.doctorId === next.doctorId &&
        ["waiting", "ready", "visiting"].includes(item.status) &&
        item.time < next.time,
    ).length;
    return {
      text: `نوبت بعدی: ${when(next)} با ${doctor(next.doctorId)?.name || "پزشک"}.`,
      details: [
        ...(next.date === data.day
          ? [`${fa(ahead)} نفر پیش از شما در صف این پزشک هستند.`]
          : []),
        ...list.map(
          (item) =>
            `${when(item)} • ${doctor(item.doctorId)?.name} • ${statuses[item.status].label}${item.paid || item.status === "waitlisted" ? "" : " • پرداخت‌نشده"}`,
        ),
      ],
      actions: [
        ...(!next.paid && next.status !== "waitlisted"
          ? [
              {
                label: "پرداخت این نوبت",
                modal: { type: "pay" as const, appointmentId: next.id },
              },
            ]
          : []),
        ...go("نوبت‌های من", "appointments"),
      ],
    };
  };

  const queue = (): Reply => {
    if (role === "patient") return myAppointments();
    if (role === "finance") return deny("صف انتظار");
    const list = today
      .filter(mine)
      .filter((item) => ["waiting", "ready", "visiting"].includes(item.status))
      .sort((a, b) => a.time.localeCompare(b.time));
    if (!list.length) return { text: "صف انتظار خالی است." };
    const visiting = list.filter((item) => item.status === "visiting");
    const ready = list.filter((item) => item.status === "ready");
    const waiting = list.filter((item) => item.status === "waiting");
    const next = ready[0] || waiting[0];
    const target = visiting[0] || next;
    return {
      text:
        role === "physician"
          ? `${visiting[0] ? `در ویزیت: ${pname(visiting[0].patientId)}؛ ` : ""}${next ? `بعدی: ${pname(next.patientId)} (${statuses[next.status].label}).` : "بیمار دیگری در صف نیست."}`
          : `${fa(waiting.length)} در انتظار، ${fa(ready.length)} آماده ویزیت، ${fa(visiting.length)} در حال ویزیت.`,
      details: list
        .slice(0, 6)
        .map(
          (item) =>
            `نوبت ${fa(item.number)} • ${pname(item.patientId)} • ${doctor(item.doctorId)?.name} • ${statuses[item.status].label}`,
        ),
      actions:
        role === "physician" && target
          ? [
              {
                label: visiting[0] ? "ادامه ویزیت" : "شروع ویزیت",
                modal: { type: "visit", appointmentId: target.id },
              },
            ]
          : role === "reception"
            ? go("مدیریت صف", "queue")
            : role === "nursing"
              ? go("تریاژ", "triage")
              : go("نوبت‌ها", "appointments"),
    };
  };

  const triage = (): Reply => {
    if (role === "finance") return deny("اطلاعات تریاژ");
    if (role === "patient") {
      const last = data.appointments
        .filter((item) => item.patientId === patientId && item.vitals)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.vitals;
      return last
        ? {
            text: `آخرین علائم ثبت‌شده: فشار ${fa(last.pressure)}، نبض ${fa(last.pulse)}.`,
            details: [
              `دما ${fa(last.temperature)} • وزن ${fa(last.weight)} کیلوگرم`,
              "تفسیر این اعداد با پزشک معالج است.",
            ],
          }
        : { text: "علائم حیاتی برای شما ثبت نشده است." };
    }
    const list = today.filter(mine);
    const waiting = list.filter(
      (item) => item.status === "waiting" && !item.vitals,
    );
    const flagged = list.filter(
      (item) =>
        item.status !== "completed" && vitalFlags(item.vitals).length > 0,
    );
    return {
      text: `${waiting.length ? `${fa(waiting.length)} بیمار منتظر تریاژ` : "همه بیماران حاضر تریاژ شده‌اند"}${flagged.length ? `؛ ${fa(flagged.length)} مورد خارج از محدوده معمول.` : "."}`,
      details: [
        ...waiting.map(
          (item) =>
            `${pname(item.patientId)} • نوبت ${fa(item.number)} • ${fa(item.time)}`,
        ),
        ...flagged.map(
          (item) =>
            `${pname(item.patientId)}: ${vitalFlags(item.vitals).join("، ")}`,
        ),
      ],
      actions: [
        ...(role === "nursing" && waiting[0]
          ? [
              {
                label: `ثبت علائم ${pname(waiting[0].patientId)}`,
                modal: {
                  type: "triage" as const,
                  appointmentId: waiting[0].id,
                },
              },
            ]
          : []),
        ...(role === "nursing" ? go("تریاژ", "triage") : []),
      ],
    };
  };

  const finance = (): Reply => {
    if (role === "patient") {
      const own = bills.filter((item) => item.patientId === patientId);
      const unpaid = own.filter((item) => !item.paid);
      return {
        text: unpaid.length
          ? `${fa(unpaid.length)} فاکتور پرداخت‌نشده، جمعاً ${money(sum(unpaid))} تومان.`
          : "فاکتور پرداخت‌نشده‌ای ندارید.",
        details: own
          .slice(0, 5)
          .map(
            (item) =>
              `${item.serviceName} • ${persianDate(item.date)} • ${money(item.patientShare)} تومان • ${item.paid ? "پرداخت‌شده" : "باز"}`,
          ),
        actions: [
          ...(unpaid[0]
            ? [
                {
                  label: "پرداخت فاکتور",
                  modal: { type: "pay" as const, appointmentId: unpaid[0].id },
                },
              ]
            : []),
          ...go("پرداخت‌های من", "payments"),
        ],
      };
    }
    if (!["management", "finance"].includes(role)) return deny("اطلاعات مالی");
    const open = todayBills
      .filter((item) => !item.paid)
      .sort((a, b) => b.patientShare - a.patientShare);
    return {
      text: `وصولی امروز ${money(sum(todayBills.filter((item) => item.paid)))} تومان؛ ${fa(open.length)} فاکتور باز (${money(sum(open))} تومان). صندوق ${data.cashClosedDate === data.day ? "بسته" : "باز"} است.`,
      details: open
        .slice(0, 5)
        .map(
          (item) =>
            `${pname(item.patientId)} • ${item.serviceName} • ${money(item.patientShare)} تومان`,
        ),
      actions: go("صندوق", "finance"),
    };
  };

  const insurance = (): Reply => {
    if (role === "patient")
      return {
        text:
          !me || me.insurance === "آزاد"
            ? "بیمه پایه ثبت نشده؛ هزینه‌ها آزاد محاسبه می‌شود."
            : `بیمه پایه شما «${me.insurance}» است؛ حدود ۷۰٪ تعرفه ویزیت پوشش داده می‌شود.`,
        details: ["برای بیمه تکمیلی، رسید پرداخت را دانلود کنید."],
        actions: go("پرداخت‌های من", "payments"),
      };
    if (!["management", "finance"].includes(role)) {
      const counts = new Map<string, number>();
      today.forEach((item) => {
        const name = patient(item.patientId)?.insurance || "نامشخص";
        counts.set(name, (counts.get(name) || 0) + 1);
      });
      return {
        text: `بیماران امروز از ${fa(counts.size)} نوع پوشش بیمه‌ای هستند.`,
        details: [...counts].map(
          ([name, count]) => `${name}: ${fa(count)} بیمار`,
        ),
      };
    }
    const submitted = new Set(
      data.claims.flatMap((item) => item.appointmentIds),
    );
    const ready = todayBills.filter(
      (item) =>
        item.paid &&
        !submitted.has(item.id) &&
        patient(item.patientId)?.insurance !== "آزاد",
    );
    const groups = new Map<string, { count: number; total: number }>();
    ready.forEach((item) => {
      const name = patient(item.patientId)?.insurance || "نامشخص";
      const row = groups.get(name) || { count: 0, total: 0 };
      groups.set(name, {
        count: row.count + 1,
        total: row.total + item.total - item.patientShare,
      });
    });
    return {
      text: ready.length
        ? `${fa(ready.length)} سند آماده بسته‌بندی؛ مطالبات ${money([...groups.values()].reduce((total, row) => total + row.total, 0))} تومان.`
        : "سند پرداخت‌شده تازه‌ای برای بسته‌بندی نیست.",
      details: [...groups].map(
        ([name, row]) =>
          `${name}: ${fa(row.count)} سند • ${money(row.total)} تومان`,
      ),
      actions: go("اسناد بیمه", "insurance"),
    };
  };

  const doctors = (): Reply => {
    const rows = data.doctors.map((item) => ({
      item,
      load: today.filter((a) => a.doctorId === item.id).length,
    }));
    const on = rows.filter((row) => row.item.status !== "off");
    const top = [...on].sort((a, b) => b.load - a.load)[0];
    return {
      text: `${fa(on.length)} پزشک فعال از ${fa(rows.length)}${top ? `؛ پرمراجعه‌ترین: ${top.item.name} با ${fa(top.load)} نوبت.` : "."}`,
      details: rows.map(
        (row) =>
          `${row.item.name} • ${row.item.specialty} • ${fa(row.load)} از ${fa(row.item.capacity)} • ${row.item.status === "off" ? "خارج از شیفت" : row.item.status === "visiting" ? "در ویزیت" : "آماده"}`,
      ),
      actions:
        role === "management"
          ? go("مدیریت پزشکان", "doctors")
          : go("رزرو نوبت", "booking"),
    };
  };

  const slots = (specialty?: string): Reply => {
    const rows = earliestSlot(data, specialty);
    if (!rows.length)
      return {
        text: specialty
          ? `امروز نوبت خالی برای ${specialty} نیست؛ لیست انتظار را امتحان کنید.`
          : "امروز نوبت خالی وجود ندارد.",
      };
    const first = rows[0];
    const tariff = data.tariffs.find(
      (item) => item.specialty === first.item.specialty,
    );
    return {
      text: `زودترین نوبت: ${first.item.name}، امروز ساعت ${fa(first.free[0])}.`,
      details: [
        ...rows
          .slice(0, 6)
          .map(
            (row) =>
              `${row.item.name} • ${row.item.specialty} • اولین ${fa(row.free[0])} • ${fa(row.free.length)} زمان آزاد`,
          ),
        ...(tariff
          ? [
              `تعرفه ${money(tariff.amount)} تومان؛ سهم بیمه‌شده ${money(share(tariff.amount, tariff.insurancePercent))} تومان.`,
            ]
          : []),
      ],
      actions: book(first.item),
    };
  };

  const doctorBrief = (target: Doctor): Reply => {
    const load = today.filter((item) => item.doctorId === target.id).length;
    const free =
      target.status === "off" ? [] : freeSlots(data, target, data.day);
    return {
      text: `${target.name} • ${target.specialty} • اتاق ${target.room}؛ ${target.status === "off" ? "امروز خارج از شیفت است" : free.length ? `اولین نوبت خالی ${fa(free[0])}` : "ظرفیت امروز تکمیل است"}.`,
      details: [
        `روزهای حضور: ${target.days.join("، ")}`,
        `ساعت کاری: ${fa(target.startTime)} تا ${fa(target.endTime)}`,
        `امروز ${fa(load)} از ${fa(target.capacity)} نوبت`,
      ],
      actions: [
        ...(free.length ? book(target) : []),
        ...(role === "management"
          ? [
              {
                label: "برنامه پزشک",
                modal: { type: "doctor" as const, id: target.id },
              },
            ]
          : []),
      ],
    };
  };

  const patientBrief = (person: Patient): Reply => {
    const unpaid = bills.filter(
      (item) => item.patientId === person.id && !item.paid,
    );
    if (role === "finance")
      return {
        text: `${person.name} • ${person.insurance}؛ ${fa(unpaid.length)} فاکتور باز (${money(sum(unpaid))} تومان).`,
        details: unpaid.map(
          (item) =>
            `${item.serviceName} • ${persianDate(item.date)} • ${money(item.patientShare)} تومان`,
        ),
        actions: unpaid[0]
          ? [
              {
                label: "تسویه فاکتور",
                modal: { type: "pay", appointmentId: unpaid[0].id },
              },
            ]
          : [],
      };
    const list = data.appointments.filter(
      (item) => item.patientId === person.id,
    );
    const next = list
      .filter(
        (item) =>
          item.date >= data.day &&
          !["cancelled", "completed"].includes(item.status),
      )
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      )[0];
    const vitals = [...list]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find((item) => item.vitals)?.vitals;
    const flags = vitalFlags(vitals);
    const last = data.prescriptions.filter(
      (item) => item.patientId === person.id,
    )[0];
    const nextLine = next
      ? `نوبت بعدی: ${when(next)} • ${statuses[next.status].label}`
      : "نوبت فعالی ندارد";
    return {
      text: `${person.name} • ${fa(person.age)} ساله • ${person.insurance}${person.allergy !== "ندارد" ? `؛ ⚠ ${person.allergy}` : ""}.`,
      details:
        role === "reception"
          ? [
              `تلفن: ${fa(person.phone)}`,
              nextLine,
              `${fa(unpaid.length)} فاکتور باز`,
            ]
          : [
              `سابقه: ${person.history || "ثبت نشده"}`,
              ...(last ? [`آخرین تشخیص: ${last.diagnosis}`] : []),
              ...(vitals
                ? [
                    `آخرین علائم: فشار ${fa(vitals.pressure)}، نبض ${fa(vitals.pulse)}، دما ${fa(vitals.temperature)}${flags.length ? ` (${flags.join("، ")})` : ""}`,
                  ]
                : []),
              nextLine,
            ],
      actions: [
        {
          label: "باز کردن پرونده",
          modal: { type: "record", patientId: person.id },
        },
      ],
    };
  };

  const prescriptions = (): Reply => {
    if (["reception", "finance"].includes(role)) return deny("نسخه‌ها");
    const list = data.prescriptions
      .filter((item) =>
        role === "patient"
          ? item.patientId === patientId
          : role === "physician"
            ? item.doctorId === currentDoctorId
            : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!list.length) return { text: "نسخه‌ای ثبت نشده است." };
    return {
      text:
        role === "patient"
          ? `آخرین نسخه: ${list[0].medicine}.`
          : `${fa(list.filter((item) => item.date === data.day).length)} نسخه امروز از مجموع ${fa(list.length)} نسخه.`,
      details:
        role === "patient"
          ? [
              ...list
                .slice(0, 3)
                .map((item) => `${item.medicine} — ${item.directions}`),
              "مصرف فقط طبق دستور پزشک؛ نسخه‌ها نمایشی هستند.",
            ]
          : list
              .slice(0, 4)
              .map(
                (item) =>
                  `${pname(item.patientId)} • ${item.diagnosis} • کد ${fa(item.tracking)}`,
              ),
      actions: go("نسخه‌ها", "prescriptions"),
    };
  };

  const services = (urgentOnly: boolean): Reply => {
    if (["reception", "finance"].includes(role)) return deny("خدمات بالینی");
    const list = data.procedures.filter(
      (item) =>
        item.status === "pending" &&
        (!urgentOnly || item.urgent) &&
        (role !== "patient" || item.patientId === patientId),
    );
    return {
      text: list.length
        ? `${fa(list.length)} ${urgentOnly ? "مورد فوری" : "خدمت"} در انتظار انجام.`
        : urgentOnly
          ? "مورد فوری بازی ثبت نشده است."
          : "خدمت در انتظاری وجود ندارد.",
      details: list
        .slice(0, 5)
        .map(
          (item) =>
            `${item.urgent ? "فوری • " : ""}${item.name}${role === "patient" ? "" : ` • ${pname(item.patientId)}`}`,
        ),
      actions:
        role === "nursing"
          ? go(
              urgentOnly ? "فوریت‌ها" : "خدمات سرپایی",
              urgentOnly ? "emergency" : "procedures",
            )
          : [],
    };
  };

  const tariffs = (specialty?: string): Reply => {
    const list = data.tariffs.filter(
      (item) => !specialty || item.specialty === specialty,
    );
    if (!list.length) return { text: "تعرفه‌ای برای این مورد ثبت نشده است." };
    const amounts = list.map((item) => item.amount);
    return {
      text: specialty
        ? `${list[0].name}: ${money(list[0].amount)} تومان؛ سهم بیمه‌شده ${money(share(list[0].amount, list[0].insurancePercent))} تومان.`
        : `${fa(list.length)} تعرفه فعال؛ از ${money(Math.min(...amounts))} تا ${money(Math.max(...amounts))} تومان.`,
      details: list
        .slice(0, 8)
        .map(
          (item) =>
            `${item.name}: ${money(item.amount)} • سهم بیمار ${money(share(item.amount, item.insurancePercent))}`,
        ),
      actions: go("تعرفه‌ها", "tariffs"),
    };
  };

  const reports = (): Reply => {
    if (!["management", "finance"].includes(role)) return summary();
    const groups = specialties
      .map((name) => ({
        name,
        count: today.filter((a) => doctor(a.doctorId)?.specialty === name)
          .length,
      }))
      .sort((a, b) => b.count - a.count);
    const done = today.filter((item) => item.status === "completed").length;
    return {
      text: `پرمراجعه‌ترین تخصص: ${groups[0].name} (${fa(groups[0].count)})؛ ${fa(done)} از ${fa(today.length)} ویزیت تکمیل شده.`,
      details: groups.map((item) => `${item.name}: ${fa(item.count)} مراجعه`),
      actions: go("گزارش‌ها", "reports"),
    };
  };

  const appointments = (): Reply => {
    if (role === "patient") return myAppointments();
    if (role === "finance") return finance();
    const list = today.filter(mine);
    const count = (...states: string[]) =>
      list.filter((item) => states.includes(item.status)).length;
    return {
      text: `امروز ${fa(list.length)} نوبت: ${fa(count("scheduled"))} رزرو، ${fa(count("waiting", "ready"))} در انتظار، ${fa(count("visiting"))} در ویزیت، ${fa(count("completed"))} انجام‌شده.`,
      details: [
        `لیست انتظار: ${fa(data.appointments.filter((item) => item.status === "waitlisted" && mine(item)).length)} نفر`,
        ...list
          .filter((item) => item.status === "scheduled")
          .slice(0, 4)
          .map(
            (item) =>
              `${fa(item.time)} • ${pname(item.patientId)} • ${doctor(item.doctorId)?.name}`,
          ),
      ],
      actions: go("نوبت‌ها", "appointments"),
    };
  };

  const notifications = (): Reply => {
    const unread = data.activities.filter(
      (item) =>
        !item.read &&
        (role !== "patient" ||
          item.kind === "system" ||
          item.description.includes(me?.name || "—")),
    );
    return {
      text: unread.length
        ? `${fa(unread.length)} اعلان خوانده‌نشده دارید.`
        : "اعلان خوانده‌نشده‌ای ندارید.",
      details: unread
        .slice(0, 4)
        .map((item) => `${item.title} — ${item.description}`),
      actions: go("اعلان‌ها", "notifications"),
    };
  };

  /* Entity lookup. Patients may only ever resolve their own record. */
  const pool =
    role === "patient"
      ? data.patients.filter((item) => item.id === patientId)
      : data.patients;
  const full = <T extends { name: string }>(items: T[]) =>
    items.filter((item) =>
      flat.includes(squash(item.name.replace("دکتر ", ""))),
    );
  const last = <T extends { name: string }>(items: T[]) =>
    items.filter((item) =>
      tokens.includes(norm(item.name).split(" ").slice(-1)[0]),
    );
  const code = q.match(/\d{10}/)?.[0];
  const doctorHit =
    full(data.doctors)[0] ||
    (has("دکتر", "پزشک") ? last(data.doctors)[0] : undefined);
  const patientHits = code
    ? pool.filter((item) => item.nationalCode === code)
    : full(pool).length
      ? full(pool)
      : doctorHit
        ? []
        : last(pool);

  if (!q) return fallback();
  const themed = tokens.includes("تم") || tokens.includes("حالت");
  if (themed && has("تیره", "تاریک", "شب", "دارک"))
    return {
      text: "تم تیره «شب» آماده فعال‌سازی است.",
      actions: [{ label: "فعال‌سازی تم تیره", theme: "night" }],
    };
  if (themed && has("روشن", "لایت"))
    return {
      text: "تم روشن «زمستان» آماده فعال‌سازی است.",
      actions: [{ label: "فعال‌سازی تم روشن", theme: "winter" }],
    };
  if (
    has(
      "درد",
      "تب دارم",
      "سرگیجه",
      "تنگی نفس",
      "چه دارویی",
      "دوز دارو",
      "تشخیص بده",
    )
  )
    return medical();
  if (has("راهنما", "کمک", "چه کار", "چکار", "قابلیت")) return help();
  if (has("برو", "باز کن", "بازکن", "نمایش بده", "صفحه")) {
    const rest = q.replace(/برو به|برو|باز کن|بازکن|نمایش بده|صفحه/g, " ");
    const target = (Object.keys(pageKeys) as Page[])
      .filter(can)
      .find((item) => pageKeys[item].some((key) => rest.includes(key)));
    if (target)
      return {
        text: `«${pageNames[target]}» آماده است.`,
        actions: [{ label: `رفتن به ${pageNames[target]}`, page: target }],
      };
  }
  if (doctorHit) return doctorBrief(doctorHit);
  if (patientHits.length === 1) return patientBrief(patientHits[0]);
  if (patientHits.length > 1)
    return {
      text: `${fa(patientHits.length)} بیمار با این نام پیدا شد؛ نام کامل را بنویسید.`,
      details: patientHits.map(
        (item) => `${item.name} • ${fa(item.nationalCode)}`,
      ),
    };
  if (role === "patient" && me && has("پرونده", "سوابق", "سابقه", "حساسیت"))
    return patientBrief(me);
  const specialty = aliases.find(([key]) => q.includes(key))?.[1];
  if (specialty)
    return has("تعرفه", "هزینه", "قیمت")
      ? tariffs(specialty)
      : slots(specialty);
  if (has("تریاژ", "علائم", "حیاتی", "فشار")) return triage();
  if (has("فوری", "اورژانس")) return services(true);
  if (has("خدمت", "خدمات", "تزریق", "پانسمان")) return services(false);
  if (has("نسخه", "دارو")) return prescriptions();
  if (has("بیمه", "اسناد", "سند")) return insurance();
  if (
    has("صندوق", "درآمد", "وصول", "فاکتور", "پرداخت", "بدهی", "مالی", "تسویه")
  )
    return finance();
  if (has("تعرفه", "قیمت", "هزینه")) return tariffs();
  if (has("صف", "انتظار", "بعدی", "فراخوان")) return queue();
  if (has("خالی", "رزرو", "وقت")) return slots();
  if (has("پزشک", "دکتر", "شیفت", "ظرفیت")) return doctors();
  if (has("گزارش", "آمار", "تخصص", "پرمراجعه")) return reports();
  if (has("نوبت")) return appointments();
  if (has("اعلان")) return notifications();
  if (has("خلاصه", "امروز", "وضعیت", "چه خبر", "سلام", "نکته"))
    return summary();
  return fallback();
}
