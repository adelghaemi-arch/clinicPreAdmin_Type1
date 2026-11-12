import type {
  ClinicData,
  Page,
  Role,
  AppointmentStatus,
  Patient,
  MedicalEvent,
} from "./types";

export const roleNames: Record<Role, string> = {
  management: "مدیریت کلینیک",
  physician: "پزشک متخصص",
  reception: "پذیرش و نوبت‌دهی",
  nursing: "پرستاری و خدمات",
  finance: "مالی و بیمه",
  patient: "پنل بیمار",
};

export const pageNames: Record<Page, string> = {
  dashboard: "داشبورد مدیریتی",
  inbox: "کارتابل من",
  doctors: "مدیریت پزشکان",
  appointments: "نوبت‌ها و پذیرش",
  patients: "پرونده بیماران",
  finance: "امور مالی و بیمه",
  reports: "گزارش‌ها و آمار",
  tariffs: "تعرفه‌ها و خدمات",
  notifications: "اعلان‌ها",
  settings: "تنظیمات",
  queue: "مدیریت صف انتظار",
  visits: "ویزیت و نسخه‌نویسی",
  prescriptions: "نسخه‌های الکترونیک",
  triage: "تریاژ و علائم حیاتی",
  procedures: "خدمات سرپایی",
  emergency: "فوریت‌های سرپایی",
  insurance: "اسناد بیمه‌ای",
  history: "سوابق پزشکی من",
  payments: "پرداخت‌های من",
  booking: "رزرو نوبت آنلاین",
};

export const rolePages: Record<Role, Page[]> = {
  management: [
    "dashboard",
    "doctors",
    "appointments",
    "patients",
    "finance",
    "reports",
    "tariffs",
  ],
  physician: [
    "dashboard",
    "appointments",
    "queue",
    "visits",
    "patients",
    "prescriptions",
  ],
  reception: ["dashboard", "appointments", "patients", "queue"],
  nursing: ["dashboard", "triage", "procedures", "emergency", "patients"],
  finance: ["dashboard", "finance", "insurance", "reports", "tariffs"],
  patient: [
    "dashboard",
    "inbox",
    "booking",
    "appointments",
    "history",
    "prescriptions",
    "payments",
  ],
};

export const statuses: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  waitlisted: { label: "لیست انتظار", className: "status-slate" },
  scheduled: { label: "رزرو شده", className: "status-blue" },
  waiting: { label: "در انتظار", className: "status-amber" },
  ready: { label: "آماده ویزیت", className: "status-violet" },
  visiting: { label: "در حال ویزیت", className: "status-blue" },
  completed: { label: "ویزیت شده", className: "status-green" },
  cancelled: { label: "لغو شده", className: "status-red" },
};

export const specialties = [
  "قلب و عروق",
  "مغز و اعصاب",
  "اطفال",
  "ارتوپدی",
  "چشم‌پزشکی",
  "زنان و زایمان",
];
export const insurances = [
  "تأمین اجتماعی",
  "بیمه سلامت",
  "نیروهای مسلح",
  "بیمه دی",
  "آزاد",
];
export const weekdays = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
];
export const currentPatientId = "p1";
export const currentDoctorId = "d1";

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}
export function fa(value: string | number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}
export function latin(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
export function money(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}
export function persianDate(date: string, full = false) {
  return new Intl.DateTimeFormat(
    "fa-IR",
    full
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(`${date}T12:00:00`));
}
export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createSeed(): ClinicData {
  const day = localDate();
  type SeedPatient = Pick<
    Patient,
    | "id"
    | "name"
    | "nationalCode"
    | "phone"
    | "age"
    | "gender"
    | "insurance"
    | "bloodType"
    | "allergy"
    | "history"
  > &
    Partial<Patient>;
  const patients: SeedPatient[] = [
    {
      id: "p1",
      name: "مریم احمدی",
      nationalCode: "0012376451",
      phone: "09123456789",
      age: 34,
      gender: "زن",
      insurance: "تأمین اجتماعی",
      bloodType: "A+",
      allergy: "حساسیت به پنی‌سیلین",
      history: "سابقه میگرن و کم‌خونی خفیف",
    },
    {
      id: "p2",
      name: "علی رضایی",
      nationalCode: "0089712345",
      phone: "09124567890",
      age: 52,
      gender: "مرد",
      insurance: "بیمه سلامت",
      bloodType: "O+",
      allergy: "ندارد",
      history: "فشار خون بالا، تحت درمان از سال ۱۳۹۹",
    },
    {
      id: "p3",
      name: "فاطمه محمدی",
      nationalCode: "0445678912",
      phone: "09125678901",
      age: 28,
      gender: "زن",
      insurance: "تأمین اجتماعی",
      bloodType: "B+",
      allergy: "ندارد",
      history: "بدون سابقه بیماری زمینه‌ای",
    },
    {
      id: "p4",
      name: "محمد حسینی",
      nationalCode: "0456789123",
      phone: "09126789012",
      age: 45,
      gender: "مرد",
      insurance: "آزاد",
      bloodType: "AB+",
      allergy: "ندارد",
      history: "درد مزمن زانو، جراحی رباط در سال ۱۳۹۸",
    },
    {
      id: "p5",
      name: "زهرا کریمی",
      nationalCode: "0067891234",
      phone: "09127890123",
      age: 8,
      gender: "زن",
      insurance: "بیمه دی",
      bloodType: "O-",
      allergy: "حساسیت فصلی",
      history: "آسم خفیف دوران کودکی",
    },
    {
      id: "p6",
      name: "حسین موسوی",
      nationalCode: "0078912345",
      phone: "09128901234",
      age: 61,
      gender: "مرد",
      insurance: "نیروهای مسلح",
      bloodType: "A-",
      allergy: "ندارد",
      history: "دیابت نوع دو، مصرف متفورمین",
    },
    {
      id: "p7",
      name: "نرگس صادقی",
      nationalCode: "0089123456",
      phone: "09129012345",
      age: 31,
      gender: "زن",
      insurance: "تأمین اجتماعی",
      bloodType: "B-",
      allergy: "ندارد",
      history: "پیگیری مراقبت‌های دوره‌ای",
    },
    {
      id: "p8",
      name: "رضا جعفری",
      nationalCode: "0091234567",
      phone: "09120123456",
      age: 40,
      gender: "مرد",
      insurance: "بیمه سلامت",
      bloodType: "O+",
      allergy: "حساسیت به سولفونامید",
      history: "سردردهای تنشی",
    },
    {
      id: "p9",
      name: "سارا عباسی",
      nationalCode: "0011234567",
      phone: "09351234567",
      age: 26,
      gender: "زن",
      insurance: "آزاد",
      bloodType: "A+",
      allergy: "ندارد",
      history: "بدون سابقه بیماری زمینه‌ای",
    },
    {
      id: "p10",
      name: "امیر کاظمی",
      nationalCode: "0022345678",
      phone: "09352345678",
      age: 12,
      gender: "مرد",
      insurance: "تأمین اجتماعی",
      bloodType: "B+",
      allergy: "ندارد",
      history: "کنترل رشد سالانه",
    },
    {
      id: "p11",
      name: "الهام نوری",
      nationalCode: "0033456789",
      phone: "09353456789",
      age: 37,
      gender: "زن",
      insurance: "بیمه دی",
      bloodType: "AB-",
      allergy: "ندارد",
      history: "کم‌کاری تیروئید",
    },
    {
      id: "p12",
      name: "مجید مرادی",
      nationalCode: "0044567890",
      phone: "09354567890",
      age: 56,
      gender: "مرد",
      insurance: "بیمه سلامت",
      bloodType: "A+",
      allergy: "ندارد",
      history: "معاینه دوره‌ای قلب",
    },
  ];
  const normalizedPatients: Patient[] = patients.map((patient) => ({
    maritalStatus: patient.age < 18 ? "مجرد" : "نامشخص",
    occupation: "",
    smoking: "نامشخص",
    emergencyContact: { name: "", phone: "", relation: "" },
    familyHistory: "",
    currentMedications: "",
    conditions: /بدون سابقه/.test(patient.history) ? [] : [patient.history],
    ...patient,
  }));
  Object.assign(
    normalizedPatients.find((patient) => patient.id === "p1")!,
    {
      maritalStatus: "متأهل",
      occupation: "طراح گرافیک",
      smoking: "هرگز",
      emergencyContact: {
        name: "سامان احمدی",
        phone: "09121112233",
        relation: "همسر",
      },
      familyHistory: "میگرن در مادر",
      currentMedications: "فروس سولفات ۵۰ میلی‌گرم، روزی یک عدد",
      conditions: ["میگرن", "کم‌خونی خفیف"],
    } satisfies Partial<Patient>,
  );
  Object.assign(
    normalizedPatients.find((patient) => patient.id === "p2")!,
    {
      maritalStatus: "متأهل",
      occupation: "حسابدار",
      smoking: "ترک کرده",
      emergencyContact: {
        name: "مینا رضایی",
        phone: "09124445566",
        relation: "همسر",
      },
      familyHistory: "بیماری قلبی زودرس در پدر",
      currentMedications: "لوزارتان ۵۰ میلی‌گرم، روزی یک عدد",
      conditions: ["فشار خون بالا", "چربی خون مرزی"],
    } satisfies Partial<Patient>,
  );
  const medicalEvents: MedicalEvent[] = [
    {
      id: "ev-p1-surgery",
      patientId: "p1",
      kind: "surgery",
      title: "آپاندکتومی",
      date: shiftDate(day, -2900),
      description: "جراحی آپاندیس، بدون عارضه گزارش‌شده",
      source: "patient",
      createdAt: day,
    },
    {
      id: "ev-p1-episode",
      patientId: "p1",
      kind: "episode",
      title: "سردرد میگرنی شدید",
      date: shiftDate(day, -5),
      description:
        "سردرد یک‌طرفه همراه با تهوع، حدود ۶ ساعت؛ با استراحت بهتر شد",
      source: "patient",
      createdAt: day,
    },
    {
      id: "ev-p1-doc",
      patientId: "p1",
      kind: "document",
      title: "گزارش MRI مغز",
      date: shiftDate(day, -40),
      description:
        "گزارش نمونه: بدون ضایعه حاد؛ فایل اصلی در بایگانی بیمارستان",
      source: "clinician",
      createdAt: day,
    },
    {
      id: "ev-p2-hospital",
      patientId: "p2",
      kind: "hospitalization",
      title: "بستری کوتاه برای تنظیم فشار خون",
      date: shiftDate(day, -240),
      description: "یک شب تحت نظر؛ با تنظیم دارو ترخیص شد",
      source: "patient",
      createdAt: day,
    },
    {
      id: "ev-p2-episode",
      patientId: "p2",
      kind: "episode",
      title: "احساس فشار در قفسه سینه",
      date: shiftDate(day, -10),
      description: "هنگام بالا رفتن از پله، حدود ۱۰ دقیقه؛ با استراحت برطرف شد",
      source: "patient",
      createdAt: day,
    },
    {
      id: "ev-p2-doc",
      patientId: "p2",
      kind: "document",
      title: "نوار قلب و اکو",
      date: shiftDate(day, -45),
      description: "گزارش نمونه: ریتم سینوسی، عملکرد بطن چپ در محدوده طبیعی",
      source: "clinician",
      createdAt: day,
    },
  ];
  const doctors: ClinicData["doctors"] = [
    {
      id: "d1",
      name: "دکتر امیرحسین رضایی",
      specialty: "قلب و عروق",
      avatar: "/avatars/doctor-1.jpg",
      room: "۲۰۱",
      status: "visiting",
      startTime: "08:00",
      endTime: "14:00",
      capacity: 24,
      days: ["شنبه", "دوشنبه", "چهارشنبه"],
    },
    {
      id: "d2",
      name: "دکتر نازنین محمدی",
      specialty: "مغز و اعصاب",
      avatar: "/avatars/doctor-2.jpg",
      room: "۲۰۳",
      status: "available",
      startTime: "09:00",
      endTime: "15:00",
      capacity: 20,
      days: ["یکشنبه", "سه‌شنبه", "پنجشنبه"],
    },
    {
      id: "d3",
      name: "دکتر محمد پارسا",
      specialty: "اطفال",
      avatar: "/avatars/doctor-3.jpg",
      room: "۱۰۲",
      status: "available",
      startTime: "08:00",
      endTime: "13:00",
      capacity: 28,
      days: ["شنبه", "دوشنبه", "چهارشنبه"],
    },
    {
      id: "d4",
      name: "دکتر مهدی نادری",
      specialty: "ارتوپدی",
      avatar: "/avatars/doctor-4.jpg",
      room: "۲۰۵",
      status: "visiting",
      startTime: "09:00",
      endTime: "14:00",
      capacity: 20,
      days: ["شنبه", "یکشنبه", "سه‌شنبه"],
    },
    {
      id: "d5",
      name: "دکتر سارا یوسفی",
      specialty: "چشم‌پزشکی",
      avatar: "/avatars/doctor-5.jpg",
      room: "۱۰۵",
      status: "available",
      startTime: "10:00",
      endTime: "16:00",
      capacity: 18,
      days: ["یکشنبه", "دوشنبه", "پنجشنبه"],
    },
    {
      id: "d6",
      name: "دکتر نگار شریفی",
      specialty: "زنان و زایمان",
      avatar: "/avatars/doctor-6.jpg",
      room: "۱۰۳",
      status: "off",
      startTime: "14:00",
      endTime: "19:00",
      capacity: 22,
      days: ["شنبه", "سه‌شنبه", "چهارشنبه"],
    },
  ];
  const tariffs = specialties.map((specialty, index) => ({
    id: `t${index + 1}`,
    name: `ویزیت متخصص ${specialty}`,
    specialty,
    amount: [680000, 720000, 520000, 650000, 580000, 560000][index],
    insurancePercent: 70,
  }));
  const times = [
    "08:00",
    "08:15",
    "08:30",
    "08:45",
    "09:00",
    "09:15",
    "09:30",
    "09:45",
    "10:00",
    "10:15",
    "10:30",
    "10:45",
  ];
  const stateList: AppointmentStatus[] = [
    "waiting",
    "visiting",
    "scheduled",
    "completed",
    "waiting",
    "completed",
    "ready",
    "scheduled",
    "waiting",
    "scheduled",
    "ready",
    "scheduled",
  ];
  const appointments: ClinicData["appointments"] = patients.map(
    (patient, index) => {
      const doctor = doctors[[1, 0, 5, 3, 2, 0, 5, 1, 4, 2, 4, 0][index]];
      const total = tariffs.find(
        (tariff) => tariff.specialty === doctor.specialty,
      )!.amount;
      return {
        id: `a${index + 1}`,
        patientId: patient.id,
        doctorId: doctor.id,
        date: day,
        time: times[index],
        number: index + 21,
        status: stateList[index],
        total,
        patientShare:
          patient.insurance === "آزاد" ? total : Math.round(total * 0.3),
        paid: [1, 3, 5, 6, 10].includes(index),
        ...([1, 3, 5].includes(index)
          ? { paymentMethod: "کارت‌خوان", receipt: `NBZ-1405${100 + index}` }
          : {}),
        ...([1, 6, 10].includes(index)
          ? {
              vitals: {
                pressure: "120/80",
                pulse: "76",
                temperature: "36.7",
                weight: "68",
                height: "170",
                glucose: "95",
                note: "علائم حیاتی پایدار",
              },
            }
          : {}),
      };
    },
  );
  appointments[1].vitals = {
    pressure: "132/84",
    pulse: "78",
    temperature: "36.7",
    weight: "82",
    height: "176",
    glucose: "104",
    note: "فشار خون در حال کنترل؛ ادامه ثبت خانگی",
  };
  appointments.push({
    id: "a-history",
    patientId: "p1",
    doctorId: "d1",
    date: shiftDate(day, -21),
    time: "10:00",
    number: 12,
    status: "completed",
    total: 680000,
    patientShare: 204000,
    paid: true,
    paymentMethod: "آنلاین نمایشی",
    receipt: "NBZ-1405009",
    diagnosis: "کم‌خونی خفیف",
    notes: "تکرار آزمایش CBC در یک ماه آینده",
    vitals: {
      pressure: "118/76",
      pulse: "74",
      temperature: "36.6",
      weight: "61",
      height: "165",
      glucose: "92",
      note: "علائم حیاتی پایدار",
    },
  });
  appointments.push({
    id: "a-future",
    patientId: "p1",
    doctorId: "d1",
    date: shiftDate(day, 2),
    time: "11:00",
    number: 1,
    status: "scheduled",
    total: 680000,
    patientShare: 204000,
    paid: false,
  });
  appointments.push(
    {
      id: "a-p2-history-1",
      patientId: "p2",
      doctorId: "d1",
      date: shiftDate(day, -45),
      time: "09:00",
      number: 8,
      status: "completed",
      total: 680000,
      patientShare: 204000,
      paid: true,
      paymentMethod: "کارت‌خوان",
      receipt: "NBZ-P2-001",
      diagnosis: "فشار خون کنترل‌نشده",
      notes: "شروع لوزارتان و ثبت فشار خون در منزل",
      vitals: {
        pressure: "150/95",
        pulse: "82",
        temperature: "36.7",
        weight: "84",
        height: "176",
        glucose: "104",
        note: "فشار خون بالا؛ آموزش ثبت خانگی",
      },
    },
    {
      id: "a-p2-history-2",
      patientId: "p2",
      doctorId: "d1",
      date: shiftDate(day, -14),
      time: "09:30",
      number: 10,
      status: "completed",
      total: 680000,
      patientShare: 204000,
      paid: true,
      paymentMethod: "کارت‌خوان",
      receipt: "NBZ-P2-002",
      diagnosis: "پیگیری فشار خون",
      notes: "ادامه دارو؛ پیگیری درد قفسه سینه در صورت تکرار",
      vitals: {
        pressure: "138/86",
        pulse: "78",
        temperature: "36.6",
        weight: "83",
        height: "176",
        glucose: "101",
        note: "بهبود نسبت به ویزیت قبل",
      },
    },
  );
  const p2Prescriptions: ClinicData["prescriptions"] = [
    {
      id: "rx-p2-1",
      patientId: "p2",
      doctorId: "d1",
      appointmentId: "a-p2-history-1",
      date: shiftDate(day, -45),
      diagnosis: "فشار خون بالا",
      medicine: "قرص لوزارتان ۵۰ میلی‌گرم",
      directions: "روزی یک عدد صبح، طبق دستور پزشک",
      tracking: "52110",
      referral: "ثبت فشار خون خانگی",
    },
    {
      id: "rx-p2-2",
      patientId: "p2",
      doctorId: "d1",
      appointmentId: "a-p2-history-2",
      date: shiftDate(day, -14),
      diagnosis: "پیگیری فشار خون",
      medicine: "ادامه لوزارتان ۵۰ میلی‌گرم",
      directions: "همان دستور قبلی؛ بدون تغییر خودسرانه دوز",
      tracking: "52111",
      referral: "نوار قلب در صورت تکرار درد",
    },
  ];
  return {
    version: 2,
    day,
    patients: normalizedPatients,
    doctors,
    appointments,
    tariffs: [
      ...tariffs,
      {
        id: "ts1",
        name: "تزریقات سرپایی",
        specialty: "خدمات سرپایی",
        amount: 85000,
        insurancePercent: 70,
      },
      {
        id: "ts2",
        name: "پانسمان ساده",
        specialty: "خدمات سرپایی",
        amount: 120000,
        insurancePercent: 70,
      },
      {
        id: "ts3",
        name: "نمونه‌گیری و آزمایش پایه",
        specialty: "خدمات سرپایی",
        amount: 180000,
        insurancePercent: 70,
      },
      {
        id: "ts4",
        name: "کنترل قند خون",
        specialty: "خدمات سرپایی",
        amount: 80000,
        insurancePercent: 70,
      },
    ],
    prescriptions: [
      ...p2Prescriptions,
      {
        id: "rx1",
        patientId: "p1",
        doctorId: "d1",
        appointmentId: "a-history",
        date: shiftDate(day, -21),
        diagnosis: "کم‌خونی خفیف",
        medicine: "قرص فروس سولفات ۵۰ میلی‌گرم",
        directions: "روزی یک عدد، بعد از ناهار به مدت ۳۰ روز",
        tracking: "84521",
        referral: "آزمایش CBC و فریتین",
      },
      {
        id: "rx2",
        patientId: "p4",
        doctorId: "d4",
        appointmentId: "a4",
        date: day,
        diagnosis: "درد مفصل زانو",
        medicine: "قرص استامینوفن ۵۰۰ میلی‌گرم",
        directions: "در صورت درد، هر ۸ ساعت یک عدد",
        tracking: "62138",
        referral: "فیزیوتراپی زانو، ۱۰ جلسه",
      },
      {
        id: "rx3",
        patientId: "p6",
        doctorId: "d1",
        appointmentId: "a6",
        date: day,
        diagnosis: "پیگیری فشار خون",
        medicine: "قرص لوزارتان ۲۵ میلی‌گرم",
        directions: "هر روز صبح یک عدد، مطابق نظر پزشک",
        tracking: "79143",
        referral: "کنترل فشار خون در منزل",
      },
    ],
    procedures: [
      {
        id: "s1",
        total: 180000,
        patientShare: 54000,
        paid: false,
        patientId: "p1",
        name: "نمونه‌گیری آزمایش CBC",
        date: day,
        status: "pending",
        urgent: false,
        note: "با دستور دکتر رضایی",
      },
      {
        id: "s2",
        total: 120000,
        patientShare: 120000,
        paid: false,
        patientId: "p4",
        name: "پانسمان زخم زانو",
        date: day,
        status: "pending",
        urgent: false,
        note: "پانسمان استریل و آموزش مراقبت",
      },
      {
        id: "s3",
        total: 80000,
        patientShare: 24000,
        paid: false,
        patientId: "p6",
        name: "کنترل قند خون",
        date: day,
        status: "done",
        urgent: false,
        note: "قند خون ناشتا: ۱۰۵",
      },
      {
        id: "s4",
        total: 0,
        patientShare: 0,
        paid: false,
        patientId: "p2",
        name: "بررسی فوری درد قفسه سینه",
        date: day,
        status: "pending",
        urgent: true,
        note: "اولویت فوری؛ ارزیابی بالینی و در صورت نیاز انتقال به اورژانس",
      },
    ],
    activities: [
      {
        id: "n1",
        title: "برنامه امروز کلینیک آماده است",
        description: "۵ پزشک در ۶ کلینیک تخصصی، آماده خدمت‌رسانی هستند.",
        time: "همین امروز",
        kind: "system",
        read: false,
      },
      {
        id: "n2",
        title: "نوبت جدید ثبت شد",
        description: "مریم احمدی برای کلینیک مغز و اعصاب پذیرش شد.",
        time: "۵ دقیقه پیش",
        kind: "appointment",
        read: false,
      },
      {
        id: "n3",
        title: "پرداخت موفق",
        description: "پرداخت حسین موسوی به مبلغ ۲۰۴٬۰۰۰ تومان ثبت شد.",
        time: "۱۲ دقیقه پیش",
        kind: "payment",
        read: false,
      },
      {
        id: "n4",
        title: "علائم حیاتی ثبت شد",
        description: "نرگس صادقی آماده ورود به اتاق پزشک است.",
        time: "۲۰ دقیقه پیش",
        kind: "clinical",
        read: true,
      },
    ],
    claims: [],
    medicalEvents,
    intakes: [],
    profile: {
      name: "سارا محمدی",
      clinicName: "کلینیک تخصصی مهر",
      phone: "09121234567",
    },
    cashClosedDate: null,
  };
}

/** Keep older browser snapshots usable while adding the richer patient record. */
export function normalizeClinicData(raw: ClinicData): ClinicData {
  const normalizeIntakes = (items: ClinicData["intakes"]) =>
    (items || []).map((item) => ({
      ...item,
      attachments:
        (item as Partial<ClinicData["intakes"][number]>).attachments || [],
      answers: Object.fromEntries(
        Object.entries(item.answers || {}).map(([key, answer]) => [
          key,
          {
            value: "",
            note: undefined,
            skipped: false,
            updatedAt: raw.day,
            ...(answer as object),
          },
        ]),
      ),
    }));
  if (raw.version >= 2)
    return {
      ...raw,
      medicalEvents: raw.medicalEvents || [],
      intakes: normalizeIntakes(raw.intakes),
    };
  const base = createSeed();
  const patients = raw.patients.map((patient) => {
    const seed = base.patients.find((item) => item.id === patient.id);
    return {
      ...(seed || base.patients[0]),
      ...patient,
      id: patient.id,
      name: patient.name,
      nationalCode: patient.nationalCode,
      phone: patient.phone,
    } as Patient;
  });
  const extraAppointments = base.appointments.filter(
    (item) =>
      item.patientId === "p2" &&
      item.id.startsWith("a-p2-") &&
      !raw.appointments.some((old) => old.id === item.id),
  );
  const extraPrescriptions = base.prescriptions.filter(
    (item) =>
      item.patientId === "p2" &&
      !raw.prescriptions.some((old) => old.id === item.id),
  );
  return {
    ...raw,
    version: 2,
    patients,
    medicalEvents: base.medicalEvents,
    intakes: [],
    appointments: [...raw.appointments, ...extraAppointments],
    prescriptions: [...raw.prescriptions, ...extraPrescriptions],
  };
}
