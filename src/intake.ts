import type { ClinicData, Doctor, Intake, IntakeAnalysis, IntakeAnalysisTopic, IntakeAnswer, IntakeAttachment, Patient } from "./types";
import { localDate, shiftDate } from "./data";

export interface IntakeQuestion {
  id: string;
  section: string;
  label: string;
  prompt: string;
  help: string;
  type: "choice" | "text" | "textarea" | "date" | "number";
  options?: string[];
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
}

const q = (question: IntakeQuestion) => question;

/** Questions are chosen from the visit specialty and the patient's own profile. */
export function getQuestions(
  patient: Patient,
  doctor: Doctor | undefined,
  data: ClinicData,
): IntakeQuestion[] {
  const specialty = doctor?.specialty || "عمومی";
  const events = data.medicalEvents.filter(
    (event) => event.patientId === patient.id,
  );
  const surgeries = events
    .filter((event) => event.kind === "surgery")
    .map((event) => `${event.title} (${event.date})`)
    .join("؛ ");
  const lastEpisode = events
    .filter((event) => event.kind === "episode")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const common: IntakeQuestion[] = [
    q({
      id: "meds",
      section: "ایمنی دارویی",
      label: "داروهای فعلی",
      prompt: "الان چه داروهایی مصرف می‌کنید؟",
      help: "نام دارو و مقدار مصرف را بنویسید؛ اگر دارویی ندارید، «ندارم».",
      type: "textarea",
      required: true,
      defaultValue: patient.currentMedications,
      placeholder: "مثلاً لوزارتان ۵۰، صبح‌ها یک عدد",
    }),
    q({
      id: "allergy",
      section: "ایمنی دارویی",
      label: "حساسیت دارویی",
      prompt: "آیا به دارو یا ماده‌ای حساسیت دارید؟",
      help: "حساسیت‌های شناخته‌شده را بنویسید؛ این پاسخ در پرونده و ویزیت نمایش داده می‌شود.",
      type: "text",
      required: true,
      defaultValue: patient.allergy,
      placeholder: "ندارم / نام دارو و واکنش",
    }),
    q({
      id: "surgery",
      section: "سوابق",
      label: "عمل‌های قبلی",
      prompt: "قبلاً چه عمل جراحی داشته‌اید؟",
      help: "نام عمل و حدود سال را بنویسید؛ اگر نداشته‌اید، «ندارم».",
      type: "textarea",
      required: true,
      defaultValue: surgeries,
      placeholder: "ندارم / نام عمل و سال",
    }),
    q({
      id: "episode",
      section: "سوابق",
      label: "آخرین بار بدحالی",
      prompt:
        "آخرین باری که حال شما بد شد و به این موضوع مربوط بود، کی و چگونه بود؟",
      help: "تاریخ تقریبی، علائم و کاری که بهترتان کرد را کوتاه بنویسید.",
      type: "textarea",
      required: true,
      defaultValue: lastEpisode
        ? `${lastEpisode.date}: ${lastEpisode.description}`
        : "",
      placeholder: "مثلاً ۱۰ روز پیش، هنگام فعالیت...",
    }),
  ];
  const specific: Record<string, IntakeQuestion[]> = {
    "مغز و اعصاب": [
      q({
        id: "onset",
        section: "ویزیت مغز و اعصاب",
        label: "شروع سردرد",
        prompt: "سردرد یا علامت اصلی شما از چه زمانی شروع شده؟",
        help: "شروع ناگهانی یا تدریجی و مدت هر حمله مهم است.",
        type: "choice",
        options: ["کمتر از ۲۴ ساعت", "چند روز", "چند هفته", "چند ماه یا بیشتر"],
        required: true,
      }),
      q({
        id: "neuro",
        section: "ویزیت مغز و اعصاب",
        label: "علائم همراه",
        prompt: "کدام علامت همراه سردرد را داشته‌اید؟",
        help: "اگر چند مورد است، در توضیح تکمیلی بنویسید.",
        type: "choice",
        options: [
          "تهوع یا استفراغ",
          "حساسیت به نور/صدا",
          "تاری دید یا بی‌حسی",
          "هیچ‌کدام",
        ],
        required: true,
      }),
      q({
        id: "trigger",
        section: "ویزیت مغز و اعصاب",
        label: "محرک‌ها",
        prompt: "چه چیزی سردرد را بدتر یا بهتر می‌کند؟",
        help: "اختیاری؛ مثل کم‌خوابی، استرس، استراحت یا دارو.",
        type: "text",
        required: false,
        placeholder: "مثلاً کم‌خوابی بدتر می‌کند",
      }),
      q({
        id: "imaging",
        section: "ویزیت مغز و اعصاب",
        label: "تصویربرداری قبلی",
        prompt: "آیا MRI یا CT مغز داشته‌اید؟",
        help: "اختیاری؛ تاریخ و نتیجه کلی را بنویسید.",
        type: "text",
        required: false,
        defaultValue: events.find(
          (event) => event.kind === "document" && /MRI|CT/i.test(event.title),
        )?.title,
        placeholder: "ندارم / تاریخ و نتیجه",
      }),
    ],
    "قلب و عروق": [
      q({
        id: "chest",
        section: "ویزیت قلب",
        label: "درد یا تنگی نفس",
        prompt: "در روزهای اخیر درد قفسه سینه یا تنگی نفس داشته‌اید؟",
        help: "اگر بله، زمان و شرایط شروع را در توضیح بنویسید.",
        type: "choice",
        options: ["ندارم", "فقط هنگام فعالیت", "هنگام استراحت", "هر دو"],
        required: true,
      }),
      q({
        id: "homebp",
        section: "ویزیت قلب",
        label: "فشار خون خانگی",
        prompt: "آخرین فشار خونی که در خانه اندازه گرفتید چقدر بود؟",
        help: "اگر اندازه نگرفته‌اید، «اندازه نگرفته‌ام» را انتخاب کنید.",
        type: "text",
        required: true,
        placeholder: "مثلاً 135/85 یا اندازه نگرفته‌ام",
      }),
      q({
        id: "cardiac",
        section: "ویزیت قلب",
        label: "سابقه قلبی",
        prompt: "آیا سابقه آنژیوگرافی، استنت یا جراحی قلب دارید؟",
        help: "نام اقدام و حدود سال را بنویسید.",
        type: "textarea",
        required: true,
        placeholder: "ندارم / نوع اقدام و سال",
      }),
      q({
        id: "family",
        section: "ویزیت قلب",
        label: "سابقه خانوادگی",
        prompt: "آیا در خانواده درجه یک، بیماری قلبی زودرس وجود دارد؟",
        help: "اختیاری؛ پدر، مادر، خواهر یا برادر.",
        type: "text",
        required: false,
        defaultValue: patient.familyHistory,
        placeholder: "نمی‌دانم / توضیح کوتاه",
      }),
    ],
    اطفال: [
      q({
        id: "guardian",
        section: "ویزیت کودک",
        label: "همراه کودک",
        prompt: "چه کسی کودک را همراهی می‌کند؟",
        help: "نام و نسبت همراه.",
        type: "text",
        required: true,
        defaultValue: patient.emergencyContact.name
          ? `${patient.emergencyContact.name} (${patient.emergencyContact.relation})`
          : "",
      }),
      q({
        id: "fever",
        section: "ویزیت کودک",
        label: "تب یا بی‌حالی",
        prompt: "کودک در ۴۸ ساعت اخیر تب یا بی‌حالی داشته است؟",
        help: "در صورت تب، بیشترین دما را بنویسید.",
        type: "choice",
        options: ["نداشته", "تب خفیف", "تب بالا", "بی‌حالی"],
        required: true,
      }),
      q({
        id: "vaccine",
        section: "ویزیت کودک",
        label: "واکسیناسیون",
        prompt: "وضعیت واکسیناسیون کودک چگونه است؟",
        help: "اختیاری؛ طبق کارت واکسن.",
        type: "choice",
        options: ["کامل", "ناقص", "نمی‌دانم"],
        required: false,
      }),
    ],
    ارتوپدی: [
      q({
        id: "injury",
        section: "ویزیت ارتوپدی",
        label: "آسیب اخیر",
        prompt: "درد یا مشکل فعلی بعد از آسیب یا زمین خوردن شروع شد؟",
        help: "اگر بله، زمان و محل آسیب را بنویسید.",
        type: "choice",
        options: ["خیر", "بله، کمتر از یک هفته", "بله، بیشتر از یک هفته"],
        required: true,
      }),
      q({
        id: "pain",
        section: "ویزیت ارتوپدی",
        label: "شدت درد",
        prompt: "شدت درد را از ۰ تا ۱۰ انتخاب کنید.",
        help: "۰ بدون درد، ۱۰ شدیدترین درد.",
        type: "number",
        required: true,
        placeholder: "۰ تا ۱۰",
      }),
      q({
        id: "implant",
        section: "ویزیت ارتوپدی",
        label: "جراحی یا پروتز",
        prompt: "آیا جراحی مفصل، پلاتین یا پروتز دارید؟",
        help: "محل و حدود سال را بنویسید.",
        type: "text",
        required: true,
        placeholder: "ندارم / محل و سال",
      }),
    ],
    چشم‌پزشکی: [
      q({
        id: "vision",
        section: "ویزیت چشم",
        label: "تغییر بینایی",
        prompt: "تغییر بینایی شما ناگهانی بوده یا تدریجی؟",
        help: "یک یا هر دو چشم را مشخص کنید.",
        type: "choice",
        options: ["تغییری ندارم", "تدریجی", "ناگهانی"],
        required: true,
      }),
      q({
        id: "lens",
        section: "ویزیت چشم",
        label: "عینک یا لنز",
        prompt: "از عینک یا لنز تماسی استفاده می‌کنید؟",
        help: "اختیاری؛ آخرین نمره چشم را اگر می‌دانید بنویسید.",
        type: "text",
        required: false,
      }),
      q({
        id: "eyesurgery",
        section: "ویزیت چشم",
        label: "جراحی چشم",
        prompt: "آیا جراحی یا لیزر چشم داشته‌اید؟",
        help: "نوع اقدام و حدود سال.",
        type: "text",
        required: true,
        placeholder: "ندارم / نوع اقدام و سال",
      }),
    ],
    "زنان و زایمان": [
      q({
        id: "lmp",
        section: "ویزیت زنان",
        label: "آخرین قاعدگی",
        prompt: "تاریخ اولین روز آخرین قاعدگی چه زمانی بود؟",
        help: "اگر یادتان نیست، حدود آن را بنویسید.",
        type: "date",
        required: true,
      }),
      q({
        id: "pregnancy",
        section: "ویزیت زنان",
        label: "بارداری",
        prompt: "آیا باردار هستید یا احتمال بارداری می‌دهید؟",
        help: "این پرسش برای ایمنی دارو و تصویربرداری مهم است.",
        type: "choice",
        options: ["خیر", "بله", "احتمال می‌دهم", "نمی‌دانم"],
        required: true,
      }),
      q({
        id: "gyn",
        section: "ویزیت زنان",
        label: "سابقه زنان",
        prompt: "سابقه جراحی زنان یا زایمان را کوتاه بنویسید.",
        help: "اختیاری؛ نوع و سال.",
        type: "text",
        required: false,
      }),
    ],
  };
  const extra = specific[specialty] || [
    q({
      id: "reason",
      section: "ویزیت",
      label: "علت مراجعه",
      prompt: "مهم‌ترین دلیل مراجعه امروز شما چیست؟",
      help: "کوتاه و به زبان خودتان.",
      type: "textarea",
      required: true,
    }),
  ];
  // Age-specific safety question for older adults.
  if (patient.age >= 60)
    extra.push(
      q({
        id: "falls",
        section: "ایمنی سالمند",
        label: "زمین خوردن",
        prompt: "در شش ماه اخیر زمین خوردن یا سرگیجه داشته‌اید؟",
        help: "اختیاری؛ برای ارزیابی ایمنی.",
        type: "choice",
        options: ["خیر", "یک بار", "چند بار"],
        required: false,
      }),
    );
  return [...common, ...extra].map((question) => ({
    ...question,
    section: question.section || specialty,
  }));
}

export function getIntake(data: ClinicData, appointmentId: string) {
  return data.intakes.find((item) => item.appointmentId === appointmentId);
}

export function normalizeIntake(
  raw: Partial<Intake> & {
    id: string;
    patientId: string;
    appointmentId: string;
    specialty: string;
  },
): Intake {
  const { answers, attachments, analysis, ...rest } = raw;
  return {
    status: "draft",
    updatedAt: new Date().toISOString(),
    ...rest,
    answers: Object.fromEntries(
      Object.entries(answers || {}).map(([key, answer]) => [
        key,
        {
          value: typeof answer?.value === "string" ? answer.value : "",
          note: typeof answer?.note === "string" ? answer.note : undefined,
          skipped: Boolean(answer?.skipped),
          updatedAt: answer?.updatedAt || raw.updatedAt || new Date().toISOString(),
        },
      ]),
    ),
    attachments: (attachments || []).filter(
      (file) => file && typeof file.id === "string" && typeof file.name === "string",
    ),
    ...(analysis && typeof analysis.summary === "string"
      ? {
          analysis: {
            ...analysis,
            engine: analysis.engine === "ai" ? "ai" : "local",
            topics: Array.isArray(analysis.topics) ? analysis.topics : [],
            flags: Array.isArray(analysis.flags) ? analysis.flags : [],
          },
        }
      : {}),
  } as Intake;
}

/** Canonical fingerprint of every answer, note and attachment, independent of order. */
export function intakeAnswerHash(
  answers: Record<string, { value?: string; note?: string; skipped?: boolean }>,
  attachments: Pick<IntakeAttachment, "id" | "name" | "size" | "mime" | "uploadedAt">[] = [],
): string {
  const clean = Object.keys(answers)
    .sort()
    .map((key) => [
      key,
      (answers[key]?.value || "").trim().replace(/\r\n/g, "\n"),
      (answers[key]?.note || "").trim().replace(/\r\n/g, "\n"),
      Boolean(answers[key]?.skipped),
    ]);
  const files = attachments
    .map((file) => [file.id, file.name, file.size, file.mime, file.uploadedAt])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify({ answers: clean, files });
}

export function isAnalysisStale(intake: Intake | undefined): boolean {
  return (
    !intake?.analysis ||
    intake.analysis.answerHash !== intakeAnswerHash(intake.answers, intake.attachments)
  );
}

export function hasIntakeResponse(answer?: Partial<Pick<IntakeAnswer, "value" | "note" | "skipped">>) {
  return Boolean(
    answer && !answer.skipped && (answer.value?.trim() || answer.note?.trim()),
  );
}

const negative = /^(ندارم|نداشته[‌ام]*|نه|خیر|هیچی|هیچ[‌کدام]*|هیچ‌کدام|هیچکدام|no|none|-)\s*[.!؟]?$/i;
const hasMeaning = (value = "") => {
  const text = value.trim();
  return Boolean(text) && !negative.test(text);
};

function short(value: string, max = 90) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Offline demo fallback. This is deliberately not presented as a language model. */
export function buildIntakeAnalysis(
  _patient: Patient,
  doctor: Doctor | undefined,
  questions: IntakeQuestion[],
  answers: Record<string, { value?: string; note?: string; skipped?: boolean }>,
  attachments: { name: string }[] = [],
): Pick<IntakeAnalysis, "summary" | "topics" | "flags" | "engine"> {
  const topics: IntakeAnalysisTopic[] = [];
  const flags: string[] = [];
  let answered = 0;
  for (const question of questions) {
    const answer = answers[question.id];
    const value = (answer?.value || "").trim();
    const note = (answer?.note || "").trim();
    if (!value && !note) continue;
    answered += 1;
    const text = value || note;
    const uncertain = /نمی‌دانم|مطمئن نیستم|فکر کنم|احتمال|شاید/.test(text);
    topics.push({
      id: question.id,
      title: question.label,
      summary: short(text, 100),
      detail: [
        value ? `پاسخ بیمار:\n${value}` : "",
        note ? `توضیح بیمار:\n${note}` : "",
        answer?.skipped ? "بیمار فعلاً پاسخ قطعی نداده است." : "",
        uncertain ? "این مورد با عدم قطعیت بیان شده و باید در ویزیت روشن شود." : "",
      ].filter(Boolean).join("\n\n"),
      tone: uncertain ? "warn" : "info",
    });
    if (question.id === "allergy" && hasMeaning(value || note) && !/ندارم|نداشته/.test(text)) {
      flags.push(`حساسیت گزارش‌شده: ${short(text, 65)}${uncertain ? " (نیازمند تأیید)" : ""}`);
    }
    if (question.id === "pregnancy" && /بله|احتمال|باردار/.test(text)) {
      flags.push("بارداری یا احتمال آن گزارش شده؛ بررسی ایمنی دارو و تصویربرداری لازم است.");
    }
  }
  const missing = questions.filter(
    (question) => question.required && !hasIntakeResponse(answers[question.id]),
  );
  if (missing.length) flags.push(`${missing.length} پرسش ضروری هنوز پاسخ کامل ندارد.`);
  if (attachments.length) {
    topics.push({
      id: "files",
      title: "آزمایش‌ها و مدارک",
      summary: `${attachments.length} فایل پیوست شده؛ محتوای فایل در تحلیل محلی خوانده نمی‌شود.`,
      detail: `فایل‌های پیوست‌شده:\n${attachments.map((file) => `• ${file.name}`).join("\n")}\n\nاین خلاصه فقط وجود فایل را ثبت می‌کند؛ نتیجه آزمایش از نام فایل یا تصویر حدس زده نمی‌شود. پزشک باید اصل مدرک را بررسی کند.`,
      tone: "info",
    });
  }
  const allergy = topics.find((topic) => topic.id === "allergy");
  const summary = !answered
    ? "هنوز پاسخی برای جمع‌بندی ثبت نشده است. توضیح‌های خود را به زبان ساده بنویسید."
    : short(
        `${answered} مورد از شرح حال شما مرور شد.${allergy && hasMeaning(`${answers.allergy?.value || ""} ${answers.allergy?.note || ""}`) && !/ندارم|نداشته/.test(`${answers.allergy?.value || ""} ${answers.allergy?.note || ""}`) ? " حساسیت گزارش‌شده برای بررسی پزشک جدا شد." : ` نکته‌های مربوط به ویزیت ${doctor?.specialty || "پیش رو"} در جزئیات آمده است.`}`,
        220,
      );
  return { summary, topics, flags, engine: "local" };
}

/** A complete, fictional, lay-person example for every supported visit type. */
export function exampleIntakeAnswers(
  patient: Patient,
  doctor: Doctor | undefined,
): Record<string, { value: string; note: string }> {
  const neuro = doctor?.specialty === "مغز و اعصاب";
  const cardio = doctor?.specialty === "قلب و عروق";
  const child = doctor?.specialty === "اطفال";
  const base: Record<string, { value: string; note: string }> = {
    meds: {
      value: child
        ? "هفته پیش سرما خوردگی داشت و دکتر شربت استامینوفن داده بود.\nالان داروی دیگری نمی‌خورد."
        : "هفته پیش سرماخوردم و چند تا استامینوفن خوردم.\nالان قرص خاصی نمی‌خورم؛ اگر درد داشته باشم گاهی استامینوفن می‌خورم.",
      note: "اسم دقیق داروها را همیشه یادم نمی‌ماند.\nجعبه دارو را می‌توانم روز ویزیت نشان بدهم.",
    },
    allergy: {
      value: "فکر کنم به پنی‌سیلین حساسیت دارم.\nبچگی یک بار بعد از دارو بدنم کهیر زد.",
      note: "مطمئن نیستم اسم دارو پنی‌سیلین بوده یا نه.\nپزشک اگر لازم بداند دوباره بررسی کند.",
    },
    surgery: {
      value: child
        ? "تا حالا عمل جراحی نداشته.\nفقط یک بار موقع سرماخوردگی دکتر بستری‌اش کرد."
        : "پارسال عمل آپاندیس داشتم.\nدو سه روز بیمارستان بودم و بعدش خوب شدم.",
      note: child ? "منظورم بستری کوتاه بود، عمل نکردند." : "جای بخیه گاهی می‌خارد ولی درد ندارد.",
    },
    episode: {
      value: neuro
        ? "پنجشنبه هفته پیش سردرد بدی گرفتم.\nنور اذیتم می‌کرد و کمی حالت تهوع داشتم. خوابیدم بهتر شدم."
        : cardio
          ? "هفته پیش وقتی از پله بالا رفتم سینه‌ام سنگین شد.\nنشستم و بعد از چند دقیقه بهتر شدم."
          : "هفته پیش سرماخوردم.\nسه روز تب خفیف و بدن‌درد داشتم؛ با استراحت خوب شدم.",
      note: "قبلش کم خوابیده بودم و کارهایم زیاد بود.\nاز وقتی یادم هست این اتفاق گاهی می‌افتد.",
    },
    onset: { value: "چند هفته", note: "اولش ماهی یک بار بود.\nالان هفته‌ای یک بار می‌شود." },
    neuro: { value: "تهوع یا استفراغ", note: "نور هم اذیتم می‌کند.\nمی‌روم اتاق تاریک تا بهتر شوم." },
    trigger: { value: "کم‌خوابی و استرس بدترش می‌کند.\nخوابیدن بهترش می‌کند.", note: "قهوه زیاد هم انگار اثر دارد." },
    imaging: { value: "تا حالا MRI یا CT مغز نداشتم.", note: "دکتر قبلی فقط با معاینه دارو داد." },
    chest: { value: "فقط هنگام فعالیت", note: "موقع تند راه رفتن یا پله.\nوقتی می‌نشینم بهتر می‌شوم." },
    homebp: { value: "دیشب دستگاه خانه ۱۴۵ روی ۹۰ نشان داد.", note: "دستگاه قدیمی است.\nنمی‌دانم دقیق اندازه می‌گیرد یا نه." },
    cardiac: { value: "عمل قلب نداشتم.\nپارسال نوار قلب گرفتم و گفتند مشکلی نیست.", note: "برگه نوار قلب را دارم." },
    family: { value: "بابام فشار خون داشت.", note: "برادرم هم گاهی فشارش بالا می‌رود." },
    guardian: { value: `من ${patient.emergencyContact.name || "مادر کودک"} هستم، ${patient.emergencyContact.relation || "مادر"}ش.`, note: "کارت واکسن را هم آورده‌ام." },
    fever: { value: "نداشته", note: "دیروز تب نداشت.\nامروز هم بازی می‌کند و غذا می‌خورد." },
    vaccine: { value: "کامل", note: "طبق کارت واکسن همه را زده‌ایم." },
    injury: { value: "خیر", note: "یادم نیست زمین خورده باشم.\nکم‌کم دردش شروع شد." },
    pain: { value: "5", note: "موقع راه رفتن بیشتر می‌شود.\nاستراحت که می‌کنم کمتر است." },
    implant: { value: "پلاتین و مفصل مصنوعی ندارم.", note: "تا حالا دکتر برای پایم عمل نکرده." },
    vision: { value: "تدریجی", note: "چند ماه است تابلوها را تار می‌بینم.\nبا عینک قبلی بهتر نمی‌شود." },
    lens: { value: "عینک می‌زنم، لنز نه.", note: "نمره عینکم را یادم نیست.\nخود عینک را می‌آورم." },
    eyesurgery: { value: "تا حالا چشمم را عمل نکرده‌ام.", note: "لیزر هم نرفته‌ام." },
    lmp: { value: shiftDate(localDate(), -18), note: "تقریباً دو سه هفته پیش بود.\nروز دقیقش یادم نیست." },
    pregnancy: { value: "خیر", note: "پریودم را داشته‌ام.\nفکر نمی‌کنم باردار باشم." },
    gyn: { value: "عمل زنان نداشتم.\nزایمان هم نداشتم.", note: "معاینه معمولی قبلاً رفته‌ام." },
    reason: { value: "چند روزی است حالم خیلی خوب نیست.\nمی‌خواهم دکتر بررسی کند.", note: "هفته پیش سرماخوردم.\nالان بهترم ولی خسته‌ام." },
    falls: { value: "خیر", note: "این چند ماه زمین نخورده‌ام.\nموقع بلند شدن هم سرگیجه ندارم." },
  };
  return base;
}

export function intakeProgress(intake: Intake | undefined, questions: IntakeQuestion[]) {
  const required = questions.filter((question) => question.required);
  const answered = required.filter((question) => hasIntakeResponse(intake?.answers[question.id]));
  const optionalAnswered = questions.filter(
    (question) => !question.required && hasIntakeResponse(intake?.answers[question.id]),
  ).length;
  return {
    required: required.length,
    answered: answered.length,
    optionalAnswered,
    percent: required.length ? Math.round((answered.length / required.length) * 100) : 100,
    complete: answered.length === required.length,
    missing: required.filter((question) => !answered.includes(question)),
  };
}

export function careFocus(patient: Patient, doctor: Doctor | undefined) {
  const specialty = doctor?.specialty || "عمومی";
  const reasons = [`${patient.age} سال`, patient.gender, patient.maritalStatus, specialty];
  const focus: Record<string, { title: string; note: string; tags: string[] }> = {
    "مغز و اعصاب": {
      title: "تمرکز امروز: سردرد و میگرن",
      note: "سوابق سردرد، محرک‌ها و تصویربرداری قبلی برای این ویزیت مهم‌ترند.",
      tags: ["سردرد", "MRI قبلی", "محرک‌ها"],
    },
    "قلب و عروق": {
      title: "تمرکز امروز: قلب و فشار خون",
      note: "فشار خون خانگی، درد قفسه سینه و سابقه خانوادگی در اولویت‌اند.",
      tags: ["فشار خون", "درد سینه", "سابقه خانوادگی"],
    },
    اطفال: {
      title: "تمرکز امروز: رشد و علائم کودک",
      note: "تب، تغذیه و وضعیت واکسیناسیون مرور می‌شود.",
      tags: ["تب", "واکسن", "رشد"],
    },
    ارتوپدی: {
      title: "تمرکز امروز: درد و حرکت",
      note: "آسیب اخیر، شدت درد و جراحی‌های قبلی مرور می‌شود.",
      tags: ["درد", "آسیب", "جراحی"],
    },
    "چشم‌پزشکی": {
      title: "تمرکز امروز: بینایی",
      note: "تغییر بینایی و جراحی‌های چشم در اولویت‌اند.",
      tags: ["بینایی", "عینک", "جراحی چشم"],
    },
    "زنان و زایمان": {
      title: "تمرکز امروز: سلامت زنان",
      note: "تاریخ قاعدگی و وضعیت بارداری برای ایمنی مراقبت مهم است.",
      tags: ["قاعدگی", "بارداری", "سوابق"],
    },
  };
  const base = focus[specialty] || {
    title: "تمرکز امروز: شرح حال شما",
    note: "علت مراجعه و داروهای فعلی مرور می‌شود.",
    tags: ["شرح حال", "داروها"],
  };
  if (patient.age >= 60) base.tags.push("ایمنی سالمند");
  return { ...base, reasons };
}
