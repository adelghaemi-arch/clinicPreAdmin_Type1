import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileUp,
  MessageCircle,
  Paperclip,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { fa, persianDate, uid } from "../data";
import {
  careFocus,
  exampleIntakeAnswers,
  getIntake,
  getQuestions,
  intakeAnswerHash,
  intakeProgress,
} from "../intake";
import { activity, useClinic } from "../store";
import type { Intake, IntakeAnalysis, IntakeAttachment } from "../types";
import { Avatar, Modal } from "./ui";

import AttachmentView from "./AttachmentView";
import { storeAttachment, removeAttachment, MAX_FILES, MAX_FILE_SIZE } from "../attachments";
import { analysisInput, checkAiConnection, createRemoteAnalysis, createLocalAnalysis } from "../intakeAi";

export default function IntakeModal({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const { data, role, patientId, setData, setModal, toast, storageHealthy } = useClinic();
  const appointment = data.appointments.find(
    (item) => item.id === appointmentId,
  );
  const patient = data.patients.find(
    (item) => item.id === appointment?.patientId,
  );
  const doctor = data.doctors.find((item) => item.id === appointment?.doctorId);
  const readOnly = role !== "patient" || appointment?.patientId !== patientId;
  const questions = useMemo(
    () => (patient ? getQuestions(patient, doctor, data) : []),
    [patient, doctor, data],
  );
  const existing = getIntake(data, appointmentId);

  const [mode, setMode] = useState<"chat" | "form">(readOnly ? "form" : "chat");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questions.forEach((question) => {
      initial[question.id] =
        existing?.answers[question.id]?.value ?? question.defaultValue ?? "";
    });
    return initial;
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questions.forEach((question) => {
      initial[question.id] = existing?.answers[question.id]?.note ?? "";
    });
    return initial;
  });
  const [attachments, setAttachments] = useState<IntakeAttachment[]>(
    () => existing?.attachments || [],
  );
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    existing?.updatedAt || null,
  );
  const [readingFiles, setReadingFiles] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const firstMissing = questions.findIndex(
    (question) => question.required && !values[question.id]?.trim(),
  );
  const [index, setIndex] = useState(
    firstMissing < 0 ? questions.length : firstMissing,
  );
  const bubblesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bubblesRef.current?.scrollTo({
      top: bubblesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [index, mode]);

  const latestHash = useRef("");
  const finished = useRef(false);
  const saveLatest = useRef<(() => void) | null>(null);
  useEffect(() => {
    const flush = () => { if (!finished.current) saveLatest.current?.(); };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

  const focus = patient ? careFocus(patient, doctor) : null;
  if (!appointment || !patient || !focus) return null;

  const answersForHash = Object.fromEntries(
    questions.map((question) => [
      question.id,
      { value: values[question.id] || "", note: notes[question.id] || "" },
    ]),
  );
  const currentHash = intakeAnswerHash(answersForHash, attachments);
  latestHash.current = currentHash;
  const storedAnalysis = existing?.analysis;
  const stale = !storedAnalysis || storedAnalysis.answerHash !== currentHash;
  const progressSource: Intake = {
    id: existing?.id || "draft",
    patientId: patient.id,
    appointmentId,
    specialty: doctor?.specialty || "عمومی",
    status: existing?.status || "draft",
    answers: Object.fromEntries(
      questions.map((question) => [
        question.id,
        {
          value: values[question.id] || "",
          note: notes[question.id] || undefined,
          updatedAt: new Date().toISOString(),
        },
      ]),
    ),
    attachments,
    analysis: storedAnalysis,
    updatedAt: new Date().toISOString(),
  };
  const progress = intakeProgress(progressSource, questions);
  const current = questions[index];
  const review = index >= questions.length;

  function persist(
    status: "draft" | "submitted",
    options: {
      withAnalysis?: IntakeAnalysis;
      vals?: Record<string, string>;
      nts?: Record<string, string>;
      files?: IntakeAttachment[];
    } = {},
  ) {
    const now = new Date().toISOString();
    const vals = options.vals ?? values;
    const nts = options.nts ?? notes;
    const files = options.files ?? attachments;
    const record: Intake = {
      id: existing?.id || uid("intake"),
      patientId: patient!.id,
      appointmentId,
      specialty: doctor?.specialty || "عمومی",
      status,
      answers: Object.fromEntries(
        questions.map((question) => [
          question.id,
          {
            value: (vals[question.id] || "").trim(),
            note: (nts[question.id] || "").trim() || undefined,
            updatedAt: now,
          },
        ]),
      ),
      attachments: files,
      analysis: options.withAnalysis ?? existing?.analysis,
      updatedAt: now,
      ...(status === "submitted" ? { submittedAt: now } : {}),
    };
    // Keep locally computed hash in sync when we store a fresh analysis.
    if (options.withAnalysis) {
      record.analysis = {
        ...options.withAnalysis,
        answerHash: intakeAnswerHash(
          Object.fromEntries(
            questions.map((question) => [
              question.id,
              {
                value: vals[question.id] || "",
                note: nts[question.id] || "",
              },
            ]),
          ),
          files,
        ),
      };
    }
    const saved = setData((previous) => ({
      ...previous,
      intakes: [...previous.intakes.filter((item) => item.appointmentId !== appointmentId), record],
      activities:
        status === "submitted"
          ? [
              activity(
                "پرسش‌های پیش از ویزیت ثبت شد",
                `${patient!.name} پاسخ‌های ${doctor?.specialty || "ویزیت"} را تکمیل کرد.`,
                "clinical",
              ),
              ...previous.activities,
            ]
          : previous.activities,
    }));
    if (saved) setLastSavedAt(now);
    return saved;
  }

  function persistDraftSilent(
    vals: Record<string, string> = values,
    nts: Record<string, string> = notes,
    files: IntakeAttachment[] = attachments,
  ) {
    persist("draft", { vals, nts, files });
  }

  saveLatest.current = () => {
    if (!readOnly && currentHash !== intakeAnswerHash(existing?.answers || {}, existing?.attachments || [])) persistDraftSilent();
  };

  function saveDraft() {
    if (persist("draft")) toast("پیش‌نویس در همین مرورگر ذخیره شد.");
    else toast("ذخیره در مرورگر ناموفق بود.", true);
  }

  async function computeAnalysis(): Promise<IntakeAnalysis> {
    const input = analysisInput(patient!, doctor, questions, answersForHash, attachments);
    let built;
    if (await checkAiConnection()) {
      // No silent downgrade after a configured service fails.
      built = await createRemoteAnalysis(input);
    } else {
      built = createLocalAnalysis(patient!, doctor, questions, answersForHash, attachments);
    }
    return { ...built, answerHash: currentHash, updatedAt: new Date().toISOString() };
  }

  async function runAnalysis() {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const analysis = await computeAnalysis();
      // Results for an earlier revision must never overwrite edits made in flight.
      if (latestHash.current !== analysis.answerHash) {
        toast("پاسخ‌ها تغییر کرد؛ دوباره تحلیل کنید.", true);
        return;
      }
      persist("draft", { withAnalysis: analysis });
      setAnalysisOpen(false);
    } catch {
      toast("تحلیل انجام نشد؛ پاسخ‌ها محفوظ است. دوباره تلاش کنید.", true);
    } finally { setAnalyzing(false); }
  }

  async function submit() {
    if (analyzing || readingFiles) return;
    if (!progress.complete) {
      toast(`هنوز ${fa(progress.missing.length)} پرسش ضروری بی‌پاسخ است.`, true);
      setMode("form");
      return;
    }
    setAnalyzing(true);
    try {
      const analysis = stale ? await computeAnalysis() : storedAnalysis!;
      if (latestHash.current !== analysis.answerHash) {
        toast("پاسخ‌ها تغییر کرد؛ دوباره ثبت کنید.", true);
        return;
      }
      if (!persist("submitted", { withAnalysis: analysis })) {
        toast("ذخیره در مرورگر ناموفق بود؛ فضای ذخیره‌سازی را بررسی کنید.", true);
        return;
      }
      toast("پاسخ‌ها و جمع‌بندی در پرونده ثبت شد.");
      finished.current = true;
      setModal(null);
    } catch { toast("تحلیل انجام نشد؛ پاسخ‌ها را دوباره ثبت کنید.", true); }
    finally { setAnalyzing(false); }
  }

  function setValue(id: string, value: string) {
    setValues((previous) => ({ ...previous, [id]: value }));
  }
  function setNote(id: string, value: string) {
    setNotes((previous) => ({ ...previous, [id]: value }));
  }

  function answer(value: string, advance = false) {
    if (!current) return;
    const next = { ...values, [current.id]: value };
    setValues(next);
    if (advance) {
      persist("draft", { vals: next });
      setIndex((previous) => previous + 1);
    }
  }

  function skip() {
    if (!current) return;
    const next = { ...values, [current.id]: "" };
    setValues(next);
    persist("draft", { vals: next });
    setIndex((previous) => previous + 1);
  }

  function fillExample() {
    const example = exampleIntakeAnswers(patient!, doctor);
    const nextValues: Record<string, string> = { ...values };
    const nextNotes: Record<string, string> = { ...notes };
    questions.forEach((question) => {
      if (example[question.id]) {
        nextValues[question.id] = example[question.id].value;
        nextNotes[question.id] = example[question.id].note;
      }
    });
    setValues(nextValues);
    setNotes(nextNotes);
    persist("draft", { vals: nextValues, nts: nextNotes });
    const first = questions.findIndex(
      (question) => question.required && !nextValues[question.id]?.trim(),
    );
    setIndex(first < 0 ? questions.length : first);
    toast("مثال ساده پر شد؛ لحن بیمار عادی است، ویرایش کنید.");
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || readOnly) return;
    const remaining = MAX_FILES - attachments.length;
    if (remaining <= 0) {
      toast("حداکثر ۵ فایل می‌توانید پیوست کنید.", true);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    const oversized = picked.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversized.length) {
      toast("هر فایل حداکثر ۲ مگابایت باشد.", true);
      return;
    }
    setReadingFiles(true);
    try {
      const loaded: IntakeAttachment[] = [];
      for (const file of picked) {
        const id = uid("file");
        await storeAttachment(id, patient!.id, appointmentId, file);
        loaded.push({
          id,
          name: file.name,
          size: file.size,
          mime: file.type || "فایل",
          storageKey: id,
          uploadedAt: new Date().toISOString(),
        });
      }
      const nextFiles = [...attachments, ...loaded];
      setAttachments(nextFiles);
      persist("draft", { files: nextFiles });
      toast(`${fa(loaded.length)} فایل پیوست و ذخیره شد.`);
    } catch {
      toast("خواندن فایل ناموفق بود.", true);
    } finally {
      setReadingFiles(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeFile(id: string) {
    const removed = attachments.find((file) => file.id === id);
    if (removed?.storageKey) void removeAttachment(removed.storageKey).catch(() => {});
    const nextFiles = attachments.filter((file) => file.id !== id);
    setAttachments(nextFiles);
    persist("draft", { files: nextFiles });
  }

  const analysisCard = (
    <section className="intake-analysis" aria-live="polite">
      <header>
        <span>
          <Sparkles size={15} />
          تحلیل اطلاعات با هوش
        </span>
        {storedAnalysis && !stale && (
          <small className="is-fresh">
            به‌روز • {fa(progress.answered)} پاسخ
          </small>
        )}
        {stale && storedAnalysis && (
          <small className="is-stale">تحلیل قبلی نامعتبر شد</small>
        )}
      </header>
      <small>{storedAnalysis?.engine === "ai" ? "تحلیل سرویس هوش مصنوعی" : "حالت محلی نمایشی؛ بدون اتصال به مدل هوش مصنوعی"} • جایگزین نظر پزشک نیست</small>
      {!storageHealthy && <p role="alert">ذخیره پایدار ناموفق است؛ این صفحه را نبندید و فضای مرورگر را بررسی کنید.</p>}
      {!storedAnalysis && (
        <p className="intake-analysis-empty">
          هنوز تحلیلی انجام نشده. با دکمه زیر یک جمع‌بندی خیلی خلاصه از همه
          پاسخ‌ها بگیرید؛ هنگام ثبت نهایی هم خودکار انجام می‌شود.
        </p>
      )}
      {storedAnalysis && (
        <div className={stale ? "is-dimmed" : ""}>
          <p className="intake-analysis-summary">{storedAnalysis.summary}</p>
          {!!storedAnalysis.flags.length && (
            <ul className="intake-analysis-flags">
              {storedAnalysis.flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          )}
          {analysisOpen && (
            <ul className="intake-analysis-topics">
              {storedAnalysis.topics.map((topic) => (
                <li key={topic.id} className={`tone-${topic.tone}`}>
                  <b>{topic.title}</b>
                  <span>{topic.summary}</span>
                  <details>
                    <summary>جزئیات</summary>
                    <p>{topic.detail}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="intake-analysis-actions">
        <button
          className="button primary small"
          onClick={runAnalysis}
          disabled={analyzing || readOnly}
        >
          <Wand2 size={14} />
          {analyzing
            ? "در حال تحلیل…"
            : storedAnalysis
              ? "تحلیل دوباره اطلاعات با هوش"
              : "تحلیل اطلاعات با هوش"}
        </button>
        {storedAnalysis && (
          <button
            className="button secondary small"
            onClick={() => setAnalysisOpen(!analysisOpen)}
          >
            {analysisOpen ? "بستن جزئیات" : "جزئیات"}
          </button>
        )}
      </div>
      {stale && storedAnalysis && (
        <p className="intake-stale-note">
          پاسخی تغییر کرده یا فایلی اضافه/حذف شده؛ تحلیل قبلی نامعتبر است.
        </p>
      )}
    </section>
  );

  return (
    <Modal
      title={
        readOnly ? "پاسخ‌های پیش از ویزیت" : "تکمیل پرونده برای ویزیت امروز"
      }
      subtitle={`${doctor?.name || "پزشک"} • ${doctor?.specialty || ""} • ${persianDate(appointment.date)}`}
      fullscreen
      className="intake-full"
      footer={
        <>
          <button className="button secondary" onClick={() => setModal(null)}>
            بستن
          </button>
          {!readOnly && (
            <button className="button secondary" onClick={saveDraft}>
              ذخیره پیش‌نویس
            </button>
          )}
          {!readOnly && (
            <button
              className="button primary"
              onClick={submit}
              disabled={!progress.complete}
            >
              <Send size={16} />
              ثبت برای پزشک
            </button>
          )}
        </>
      }
    >
      <div className="intake-page">
        <header className="intake-page-head">
          <div className="intake-context">
            <Avatar name={patient.name} />
            <div>
              <b>{patient.name}</b>
              <small>{focus.reasons.slice(0, 4).join(" • ")}</small>
            </div>
          </div>
          <div className="intake-page-progress">
            <div className="pd-progress">
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <small>
              {fa(progress.answered)} از {fa(progress.required)} ضروری • حدود ۳
              دقیقه
              {lastSavedAt ? " • ذخیره خودکار فعال" : ""}
            </small>
          </div>
          {!readOnly && (
            <div className="intake-page-tools">
              <div className="segmented-control intake-mode">
                <button
                  className={mode === "chat" ? "active" : ""}
                  onClick={() => setMode("chat")}
                >
                  <MessageCircle size={14} />
                  گفت‌وگو
                </button>
                <button
                  className={mode === "form" ? "active" : ""}
                  onClick={() => setMode("form")}
                >
                  <ClipboardList size={14} />
                  فرم سریع
                </button>
              </div>
              <button
                className="button secondary small"
                onClick={fillExample}
                title="پر کردن با لحن یک بیمار عادی"
              >
                <Wand2 size={14} />
                پر کردن با مثال ساده
              </button>
            </div>
          )}
        </header>

        <p className="intake-page-focus intake-focus">
          <Sparkles size={14} />
          {focus.title} — {focus.note}
        </p>

        <div className="intake-page-body">
          <div className="intake-page-main">
            {mode === "form" || readOnly ? (
              <div className="intake-form intake-form-cards">
                {questions.map((question, position) => (
                  <section
                    key={question.id}
                    className="intake-card"
                    data-question={question.id}
                  >
                    <header>
                      <span className="intake-card-num">
                        {fa(position + 1)}
                      </span>
                      <div>
                        <b>
                          {question.label}
                          {!question.required && <em> (اختیاری)</em>}
                        </b>
                        <small>{question.help}</small>
                      </div>
                      {question.required &&
                      (values[question.id] || "").trim() ? (
                        <span className="intake-card-done">
                          <Check size={12} />
                        </span>
                      ) : null}
                    </header>
                    <QuestionInput
                      question={question}
                      value={values[question.id] || ""}
                      onChange={(value) => setValue(question.id, value)}
                      onBlur={() => persistDraftSilent()}
                      disabled={readOnly}
                    />
                    <label className="intake-note-field">
                      <span>توضیح بیشتر (اختیاری، چندخطی)</span>
                      <textarea
                        aria-label={`یادداشت تکمیلی ${question.id}`}
                        rows={2}
                        maxLength={800}
                        value={notes[question.id] || ""}
                        disabled={readOnly}
                        placeholder="هر چیزی که فکر می‌کنید مهم است، به زبان خودتان بنویسید…"
                        onChange={(event) =>
                          setNote(question.id, event.target.value)
                        }
                        onBlur={() => persistDraftSilent()}
                      />
                    </label>
                  </section>
                ))}

                <section className="intake-card intake-files">
                  <header>
                    <span className="intake-card-num">
                      <Paperclip size={14} />
                    </span>
                    <div>
                      <b>آزمایش‌ها و مدارک اخیر</b>
                      <small>
                        عکس یا PDF آزمایش، سونوگرافی یا نسخه قبلی (حداکثر ۵
                        فایل، هر کدام تا ۲ مگابایت)
                      </small>
                    </div>
                  </header>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    aria-label="آپلود فایل پزشکی"
                    onChange={(event) => handleFiles(event.target.files)}
                    disabled={readOnly || readingFiles}
                  />
                  <div className="intake-file-actions">
                    <button
                      className="button secondary small"
                      onClick={() => fileInput.current?.click()}
                      disabled={readOnly || readingFiles}
                    >
                      <FileUp size={14} />
                      {readingFiles ? "در حال خواندن…" : "افزودن فایل"}
                    </button>
                    <small>{fa(attachments.length)} از ۵ فایل</small>
                  </div>
                  {!!attachments.length && (
                    <ul className="intake-file-list">
                      {attachments.map((file) => (
                        <AttachmentView key={file.id} file={file} onRemove={readOnly ? undefined : () => removeFile(file.id)} />
                      ))}
                    </ul>
                  )}
                </section>

                {analysisCard}

                {review || mode === "form" ? (
                  <section className="intake-review">
                    <h3>
                      <Check size={18} />
                      مرور پاسخ‌های شما
                    </h3>
                    <ul>
                      {questions.map((question) => (
                        <li
                          key={question.id}
                          className={
                            !values[question.id]?.trim() && question.required
                              ? "is-missing"
                              : ""
                          }
                        >
                          <span>{question.label}</span>
                          <div>
                            <b>
                              {values[question.id]?.trim() ||
                                (question.required
                                  ? "بی‌پاسخ"
                                  : "ترجیح می‌دهم حضوری بگویم")}
                            </b>
                            {notes[question.id]?.trim() && (
                              <p>{notes[question.id]}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : review ? (
              <div className="intake-review">
                <h3>
                  <Check size={18} />
                  مرور پاسخ‌های شما
                </h3>
                <p>
                  این پاسخ‌ها فقط در همین مرورگر ذخیره می‌شوند و در پرونده و
                  اتاق ویزیت دیده می‌شوند.
                </p>
                <ul>
                  {questions.map((question) => (
                    <li
                      key={question.id}
                      className={
                        !values[question.id]?.trim() && question.required
                          ? "is-missing"
                          : ""
                      }
                    >
                      <button
                        onClick={() => setIndex(questions.indexOf(question))}
                      >
                        {question.label}
                      </button>
                      <div>
                        <span>
                          {values[question.id]?.trim() ||
                            (question.required
                              ? "بی‌پاسخ"
                              : "ترجیح می‌دهم حضوری بگویم")}
                        </span>
                        {notes[question.id]?.trim() && (
                          <p>{notes[question.id]}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {!progress.complete && (
                  <p className="intake-warning">
                    {fa(progress.missing.length)} پرسش ضروری بی‌پاسخ مانده است.
                    برای ثبت نهایی، آن‌ها را کامل کنید.
                  </p>
                )}
                {analysisCard}
              </div>
            ) : (
              current && (
                <div className="intake-chat">
                  <div className="intake-bubbles" ref={bubblesRef}>
                    {questions.slice(0, index).map((question) => (
                      <div key={question.id} className="intake-bubble-pair">
                        <div className="intake-bubble bot">
                          {question.prompt}
                        </div>
                        <div className="intake-bubble user">
                          {values[question.id]?.trim() || "فعلاً پاسخ ندادم"}
                          {notes[question.id]?.trim() && (
                            <small>{notes[question.id]}</small>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="intake-bubble bot current">
                      <small>
                        {current.section} • پرسش {fa(index + 1)} از{" "}
                        {fa(questions.length)}
                      </small>
                      <strong>{current.prompt}</strong>
                      <p>{current.help}</p>
                    </div>
                  </div>
                  <div className="intake-answer">
                    <QuestionInput
                      question={current}
                      value={values[current.id] || ""}
                      onChange={(value) => answer(value)}
                      onChoice={(value) => answer(value, true)}
                      onBlur={() => persistDraftSilent()}
                    />
                    <label className="intake-note-field">
                      <span>توضیح بیشتر (اختیاری، چندخطی)</span>
                      <textarea
                        aria-label={`یادداشت تکمیلی ${current.id}`}
                        rows={2}
                        maxLength={800}
                        value={notes[current.id] || ""}
                        placeholder="مثلاً هفته پیش سرماخوردم…"
                        onChange={(event) =>
                          setNote(current.id, event.target.value)
                        }
                        onBlur={() => persistDraftSilent()}
                      />
                    </label>
                    <div className="intake-answer-actions">
                      <button
                        className="button secondary small"
                        onClick={() => setIndex(Math.max(0, index - 1))}
                        disabled={index === 0}
                      >
                        <ArrowRight size={14} />
                        قبلی
                      </button>
                      {!current.required && (
                        <button className="text-action" onClick={skip}>
                          فعلاً نمی‌دانم
                        </button>
                      )}
                      {current.type !== "choice" && (
                        <button
                          className="button primary small"
                          onClick={() => answer(values[current.id] || "", true)}
                          disabled={
                            current.required && !values[current.id]?.trim()
                          }
                        >
                          ثبت و ادامه
                          <ArrowLeft size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="intake-chat-files">
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      aria-label="آپلود فایل پزشکی"
                      onChange={(event) => handleFiles(event.target.files)}
                      disabled={readOnly || readingFiles}
                    />
                    <button
                      className="button secondary small"
                      onClick={() => fileInput.current?.click()}
                      disabled={readOnly || readingFiles}
                    >
                      <FileUp size={14} />
                      {readingFiles
                        ? "در حال خواندن…"
                        : attachments.length
                          ? `پیوست فایل (${fa(attachments.length)})`
                          : "پیوست آزمایش یا مدرک"}
                    </button>
                    {!!attachments.length && (
                      <div className="intake-chat-file-names">
                        {attachments.map((file) => (
                          <span key={file.id}>
                            {file.name}
                            {!readOnly && (
                              <button
                                aria-label={`حذف ${file.name}`}
                                onClick={() => removeFile(file.id)}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="intake-chat-analysis">{analysisCard}</div>
                </div>
              )
            )}
          </div>

          <aside className="intake-page-rail">
            <nav className="intake-nav intake-nav-cards" aria-label="پرسش‌ها">
              {questions.map((question, position) => {
                const done = !!values[question.id]?.trim();
                return (
                  <button
                    key={question.id}
                    className={`${position === index ? "is-current" : ""} ${done ? "is-done" : ""}`}
                    onClick={() => setIndex(position)}
                  >
                    <span>{done ? <Check size={12} /> : fa(position + 1)}</span>
                    <b>{question.label}</b>
                    {!question.required && <small>اختیاری</small>}
                  </button>
                );
              })}
              <button
                className={review ? "is-current" : ""}
                onClick={() => setIndex(questions.length)}
              >
                <span>
                  <ClipboardList size={12} />
                </span>
                <b>مرور و ثبت</b>
              </button>
            </nav>
            <div className="intake-rail-hint">
              <X size={0} aria-hidden="true" />
              هر فیلد با خروج خودکار ذخیره می‌شود؛ نیازی به دکمه جدا نیست.
            </div>
          </aside>
        </div>
      </div>
    </Modal>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  onChoice,
  onBlur,
  disabled,
}: {
  question: ReturnType<typeof getQuestions>[number];
  value: string;
  onChange: (value: string) => void;
  onChoice?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="intake-free-answer">
      {question.options && <div className="intake-options">
        {question.options.map((option) => <button type="button" key={option} aria-label={option} aria-pressed={value === option} className={value === option ? "chosen" : ""} disabled={disabled} onClick={() => (onChoice || onChange)(option)} onBlur={onBlur}>{option}</button>)}
      </div>}
      <textarea aria-label={question.label} rows={3} maxLength={5000} value={value} disabled={disabled} placeholder={question.placeholder || "هرچه لازم می‌دانید با زبان خودتان بنویسید…"} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
    </div>
  );
}
