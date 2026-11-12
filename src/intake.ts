import type { ClinicData, Doctor, Intake, Patient } from "./types";

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
  const { answers, attachments, ...rest } = raw as Partial<Intake>;
  return {
    status: "draft",
    updatedAt: new Date().toISOString(),
    ...rest,
    answers: answers || {},
    attachments: attachments || [],
  } as Intake;
}

export function intakeAnswerHash(
  answers: Record<string, { value?: string; note?: string; skipped?: boolean }>,
  attachments: { id: string; name: string; size: number }[] = [],
): string {
  const keys = Object.keys(answers).sort();
  const core = keys
    .map((key) => {
      const answer = answers[key] || {};
      return `${key}=${(answer.value || "").trim()}|${(answer.note || "").trim()}|${answer.skipped ? "1" : "0"}`;
    })
    .join("~");
  const files = attachments
    .map((file) => `${file.id}:${file.name}:${file.size}`)
    .sort()
    .join("~");
  return `${core}##${files}`;
}

export function isAnalysisStale(intake: Intake | undefined): boolean {
  if (!intake?.analysis) return true;
  return (
    intake.analysis.answerHash !==
    intakeAnswerHash(intake.answers, intake.attachments)
  );
}

const hasMeaning = (value = "") => {
  const text = value.trim();
  if (!text) return false;
  return !/^(ندارم|نه|خیر|هیچی|هیچ‌کدام|هیچکدام|nope?|-)$/i.test(text);
};

function short(value: string, max = 90) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Fully local, rule-based "AI-style" summary. It never calls a server;
 * it only rewrites what the patient already wrote into a very short
 * summary plus one line per topic with expandable details.
 */
export function buildIntakeAnalysis(
  patient: Patient,
  doctor: Doctor | undefined,
  questions: IntakeQuestion[],
  answers: Record<string, { value?: string; note?: string }>,
  attachments: { name: string }[] = [],
): {
  summary: string;
  topics: Intake["analysis"] extends { topics: infer T } | undefined
    ? T
    : never;
  flags: string[];
} {
  const get = (id: string) => (answers[id]?.value || "").trim();
  const note = (id: string) => (answers[id]?.note || "").trim();
  const withNote = (id: string) => {
    const extra = note(id);
    return extra ? ` — توضیح شما: ${short(extra, 110)}` : "";
  };
  const topics: {
    id: string;
    title: string;
    summary: string;
    detail: string;
    tone: "info" | "warn" | "good";
  }[] = [];
  const flags: string[] = [];

  const meds = get("meds");
  if (hasMeaning(meds)) {
    topics.push({
      id: "meds",
      title: "داروها",
      summary: short(meds, 70),
      detail: `داروهایی که نوشتید: ${meds}${withNote("meds")} این فهرست در ویزیت برای بررسی تداخل دارویی استفاده می‌شود.`,
      tone: "info",
    });
  } else {
    topics.push({
      id: "meds",
      title: "داروها",
      summary: "داروی خاصی ثبت نشده",
      detail: `نوشتید دارویی مصرف نمی‌کنید.${withNote("meds")} اگر هفته پیش برای سرماخوردگی چیزی خوردید، همین‌جا اضافه کنید.`,
      tone: "good",
    });
  }

  const allergy = get("allergy");
  if (hasMeaning(allergy) && !/ندارم/.test(allergy)) {
    flags.push(`حساسیت: ${short(allergy, 60)}`);
    topics.push({
      id: "allergy",
      title: "حساسیت",
      summary: short(allergy, 70),
      detail: `حساسیت ثبت‌شده: ${allergy}${withNote("allergy")} این مورد در پرونده و اتاق ویزیت برجسته می‌شود.`,
      tone: "warn",
    });
  } else {
    topics.push({
      id: "allergy",
      title: "حساسیت",
      summary: "حساسیت خاصی گفته نشده",
      detail: `پاسخ شما: ${allergy || "—"}${withNote("allergy")}`,
      tone: "good",
    });
  }

  const surgery = get("surgery");
  topics.push({
    id: "surgery",
    title: "عمل‌های قبلی",
    summary: hasMeaning(surgery) ? short(surgery, 70) : "عملی گفته نشده",
    detail: hasMeaning(surgery)
      ? `سوابقی که نوشتید: ${surgery}${withNote("surgery")}`
      : `نوشتید عملی نداشته‌اید.${withNote("surgery")} مثال عامیانه قابل قبول است: «پارسال عمل آپاندیس داشتم».`,
    tone: hasMeaning(surgery) ? "info" : "good",
  });

  const episode = get("episode");
  topics.push({
    id: "episode",
    title: "آخرین بدحالی",
    summary: hasMeaning(episode)
      ? short(episode, 70)
      : "بدحالی مرتبطی گفته نشده",
    detail: hasMeaning(episode)
      ? `شرح شما: ${episode}${withNote("episode")} زمان، علائم و چیزی که بهترتان کرد برای پزشک مهم است.`
      : `چیزی ثبت نشده.${withNote("episode")} مثال: «هفته پیش سرماخوردم، سه روز تب خفیف داشتم».`,
    tone: hasMeaning(episode) ? "info" : "good",
  });

  const specialty = doctor?.specialty || "عمومی";
  const specialtyAnswers = questions
    .filter(
      (question) =>
        !["meds", "allergy", "surgery", "episode"].includes(question.id),
    )
    .map((question) => ({ question, value: get(question.id) }))
    .filter((row) => row.value || note(row.question.id));
  if (specialtyAnswers.length) {
    const headline = specialtyAnswers
      .slice(0, 2)
      .map(
        (row) =>
          `${row.question.label}: ${short(row.value || "توضیح ثبت شده", 48)}`,
      )
      .join("؛ ");
    topics.push({
      id: "specialty",
      title: `ویزیت ${specialty}`,
      summary: headline || `پاسخ‌های ${specialty}`,
      detail: specialtyAnswers
        .map(
          (row) =>
            `${row.question.label}: ${row.value || "—"}${withNote(row.question.id)}`,
        )
        .join("\n"),
      tone: "info",
    });
  }

  // Simple red-flag language detection (informational only, not a diagnosis).
  const allText = Object.values(answers)
    .map((answer) => `${answer.value || ""} ${answer.note || ""}`)
    .join(" ");
  if (/درد قفسه سینه|تنگی نفس|فشار.*سینه|بیهوش|غش/.test(allText))
    flags.push("درد قفسه سینه یا تنگی نفس گفته شده؛ در ویزیت حتماً مطرح شود.");
  if (/باردار|احتمال.*باردار/.test(allText))
    flags.push(
      "احتمال بارداری گفته شده؛ برای ایمنی دارو و تصویربرداری مهم است.",
    );
  if (/فشار.*(۱۹|۲۰|۲[0-9]{2})|200\//.test(allText))
    flags.push("عدد فشار خون بالا دیده شد؛ اندازه‌گیری تکرار شود.");

  if (attachments.length) {
    topics.push({
      id: "files",
      title: "مدارک",
      summary: `${attachments.length} فایل پیوست شد`,
      detail: `فایل‌ها: ${attachments.map((file) => file.name).join("، ")}. پزشک می‌تواند آن‌ها را در پرونده ببیند.`,
      tone: "info",
    });
  }

  const name = patient.name.split(" ")[0];
  const summary = `${name} ${patient.age} ساله؛ ${topics
    .slice(0, 3)
    .map((topic) => `${topic.title}: ${topic.summary}`)
    .join(" • ")}${flags.length ? ` • نیازمند توجه: ${flags[0]}` : ""}`;
  return { summary, topics, flags };
}

/** Colloquial, non-clinical example answers a real patient might write. */
export function exampleIntakeAnswers(
  patient: Patient,
  doctor: Doctor | undefined,
): Record<string, { value: string; note: string }> {
  const neuro = doctor?.specialty === "مغز و اعصاب";
  const cardio = doctor?.specialty === "قلب و عروق";
  const base: Record<string, { value: string; note: string }> = {
    meds: {
      value: "هفته پیش سرماخوردم، فقط استامینوفن خوردم؛ الان قرص خاصی نمی‌خورم",
      note: "اگه سردردم شدید بشه یه استامینوفن می‌خورم، حدود ماهی دو سه بار",
    },
    allergy: {
      value: "فکر کنم به پنی‌سیلین حساسیت دارم، بچگی که بودم کهیر زدم",
      note: "مطمئن نیستم، ولی ترجیح می‌دم ننویسید برام",
    },
    surgery: {
      value: "پارسال عمل آپاندیس داشتم، دو سه روز بیمارستان بودم",
      note: "بعدش مشکلی نداشتم، فقط جای بخیه گاهی می‌خاره",
    },
    episode: {
      value: neuro
        ? "پنجشنبه هفته پیش از ظهر یه سردرد بد گرفتم، حدود ۶ ساعت طول کشید، با تهوع بود؛ خوابیدم بهتر شدم"
        : cardio
          ? "هفته پیش وقتی از پله‌ها بالا رفتم قفسه سینه‌م سنگین شد، حدود ده دقیقه؛ نشستم بهتر شد"
          : "هفته پیش سرماخوردم، سه روز تب خفیف و بدن‌درد داشتم؛ با استراحت خوب شدم",
      note: "قبلش کم خوابیده بودم و استرس داشتم",
    },
  };
  if (neuro) {
    base.onset = {
      value: "چند هفته",
      note: "اولش ماهی یه بار بود، الان هفته‌ای یه بار می‌شه",
    };
    base.neuro = {
      value: "تهوع یا استفراغ",
      note: "نور هم اذیتم می‌کنه، مجبور می‌شم برم تو اتاق تاریک",
    };
    base.trigger = {
      value: "کم‌خوابی و استرس بدترش می‌کنه، خواب بهترش می‌کنه",
      note: "قهوه هم اگه زیاد بخورم بدتر می‌شم",
    };
    base.imaging = { value: "ندارم", note: "" };
  }
  if (cardio) {
    base.chest = {
      value: "فقط هنگام فعالیت",
      note: "موقع تند راه رفتن یا پله، موقع نشستن خوبم",
    };
    base.homebp = {
      value: "دیشب ۱۴۵ روی ۹۰ بود",
      note: "دستگاه خونه‌م قدیمیه، نمی‌دونم دقیق باشه یا نه",
    };
    base.cardiac = {
      value: "ندارم، فقط پارسال یه نوار قلب گرفتم گفتن مشکلی نیست",
      note: "",
    };
    base.family = { value: "بابام فشار خون داشت", note: "" };
  }
  if (patient.age >= 60) base.falls = { value: "خیر", note: "" };
  return base;
}

export function intakeProgress(
  intake: Intake | undefined,
  questions: IntakeQuestion[],
) {
  const required = questions.filter((question) => question.required);
  const answered = required.filter((question) => {
    const answer = intake?.answers[question.id];
    return answer && !answer.skipped && answer.value.trim().length > 0;
  });
  const optionalAnswered = questions.filter(
    (question) =>
      !question.required && intake?.answers[question.id]?.value.trim(),
  ).length;
  return {
    required: required.length,
    answered: answered.length,
    optionalAnswered,
    percent: required.length
      ? Math.round((answered.length / required.length) * 100)
      : 100,
    complete: answered.length === required.length,
    missing: required.filter((question) => !answered.includes(question)),
  };
}

export function careFocus(patient: Patient, doctor: Doctor | undefined) {
  const specialty = doctor?.specialty || "عمومی";
  const reasons = [
    `${patient.age} سال`,
    patient.gender,
    patient.maritalStatus,
    specialty,
  ];
  const focus: Record<string, { title: string; note: string; tags: string[] }> =
    {
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
      چشم‌پزشکی: {
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
