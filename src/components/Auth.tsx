import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ClipboardEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  LockKeyhole,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { fa, latin, roleNames } from "../data";
import type { Role, Session, Theme } from "../types";
import { Logo } from "./ui";

export default function Auth({
  onLogin,
  theme,
  toggleTheme,
}: {
  onLogin: (session: Session) => void;
  theme: Theme;
  toggleTheme: () => void;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("management");
  const [demoPatient, setDemoPatient] = useState<"p1" | "p2">("p1");
  const [digits, setDigits] = useState(["", "", "", "", ""]);
  const [error, setError] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (!deadline) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => {
    if (step === "otp") inputs.current[0]?.focus();
  }, [step]);
  function requestCode(event: FormEvent) {
    event.preventDefault();
    if (!/^09\d{9}$/.test(phone)) {
      setError("یک شماره همراه معتبر ۱۱ رقمی وارد کنید.");
      return;
    }
    setError("");
    setDigits(["", "", "", "", ""]);
    setStep("otp");
    setDeadline(Date.now() + 60000);
  }
  function verify(event: FormEvent) {
    event.preventDefault();
    if (digits.join("") !== "12345") {
      setError("کد واردشده صحیح نیست. کد نمایشی ۱۲۳۴۵ است.");
      inputs.current[0]?.focus();
      return;
    }
    onLogin({
      phone,
      role,
      demo: false,
      patientId:
        role === "patient"
          ? phone === "09124567890"
            ? "p2"
            : "p1"
          : undefined,
    });
  }
  function paste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const value = latin(event.clipboardData.getData("text"))
      .replace(/\D/g, "")
      .slice(0, 5);
    if (!value) return;
    setDigits(Array.from({ length: 5 }, (_, index) => value[index] || ""));
    inputs.current[Math.min(value.length, 4)]?.focus();
    setError("");
  }
  const dark = theme === "night" || theme === "dim";
  return (
    <main className="auth-screen" dir="rtl">
      <section className="auth-main">
        <div className="auth-top">
          <Logo />
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label="تغییر تم"
          >
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>
        </div>
        <div className="auth-form-wrap">
          <span className="auth-form-icon">
            {step === "phone" ? (
              <HeartPulse size={28} strokeWidth={1.6} />
            ) : (
              <LockKeyhole size={28} strokeWidth={1.6} />
            )}
          </span>
          <span className="eyebrow">به فضای مراقبت خود خوش آمدید</span>
          <h1>
            {step === "phone" ? "ورود به سامانه نبض" : "کد ورود را وارد کنید"}
          </h1>
          <p>
            {step === "phone" ? (
              "برای دریافت کد ورود، شماره همراه خود را وارد کنید."
            ) : (
              <>
                کد پنج‌رقمی برای شماره <b dir="ltr">{fa(phone)}</b> آماده است.
              </>
            )}
          </p>
          {step === "phone" ? (
            <form onSubmit={requestCode} className="auth-form">
              <label className="form-field">
                <span>شماره تلفن همراه</span>
                <div className="phone-input">
                  <Phone size={19} />
                  <input
                    required
                    autoFocus
                    aria-label="شماره تلفن همراه"
                    dir="ltr"
                    inputMode="tel"
                    maxLength={11}
                    value={phone}
                    onChange={(event) => {
                      setPhone(latin(event.target.value).replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="09xxxxxxxxx"
                  />
                </div>
              </label>
              <label className="form-field">
                <span>انتخاب پنل نمایشی</span>
                <select
                  aria-label="نقش ورود"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  {Object.entries(roleNames).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {role === "patient" && (
                <div className="auth-patients">
                  <span>حساب‌های نمونه بیمار</span>
                  <div>
                    <button
                      type="button"
                      className={demoPatient === "p1" ? "chosen" : ""}
                      onClick={() => {
                        setDemoPatient("p1");
                        setPhone("09123456789");
                      }}
                    >
                      <b>مریم احمدی</b>
                      <small>۳۴ ساله • اعصاب</small>
                    </button>
                    <button
                      type="button"
                      className={demoPatient === "p2" ? "chosen" : ""}
                      onClick={() => {
                        setDemoPatient("p2");
                        setPhone("09124567890");
                      }}
                    >
                      <b>علی رضایی</b>
                      <small>۵۲ ساله • قلب</small>
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary auth-submit" type="submit">
                دریافت کد ورود
                <ArrowLeft size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="auth-form">
              <div className="otp-inputs" dir="ltr" onPaste={paste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputs.current[index] = element;
                    }}
                    aria-label={`رقم ${fa(index + 1)} کد ورود`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    className={error ? "otp-error" : ""}
                    onChange={(event) => {
                      const value = latin(event.target.value)
                        .replace(/\D/g, "")
                        .slice(-1);
                      setDigits((previous) =>
                        previous.map((item, position) =>
                          position === index ? value : item,
                        ),
                      );
                      setError("");
                      if (value && index < 4)
                        inputs.current[index + 1]?.focus();
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Backspace" &&
                        !digits[index] &&
                        index > 0
                      )
                        inputs.current[index - 1]?.focus();
                      if (event.key === "ArrowLeft" && index > 0)
                        inputs.current[index - 1]?.focus();
                      if (event.key === "ArrowRight" && index < 4)
                        inputs.current[index + 1]?.focus();
                    }}
                  />
                ))}
              </div>
              <div className="demo-code">
                <ShieldCheck size={18} />
                کد ورود نمایشی: <strong dir="ltr">۱۲۳۴۵</strong>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary auth-submit" type="submit">
                تأیید و ورود به پنل
                <ArrowLeft size={18} />
              </button>
              <div className="resend-row">
                <button
                  type="button"
                  className="text-action"
                  onClick={() => {
                    setStep("phone");
                    setError("");
                  }}
                >
                  <ArrowRight size={14} />
                  ویرایش شماره
                </button>
                <button
                  type="button"
                  disabled={remaining > 0}
                  className="text-action"
                  onClick={() => {
                    setDeadline(Date.now() + 60000);
                    setDigits(["", "", "", "", ""]);
                    setError("");
                    inputs.current[0]?.focus();
                  }}
                >
                  {remaining > 0
                    ? `ارسال مجدد در ${fa(remaining)} ثانیه`
                    : "ارسال مجدد کد نمایشی"}
                </button>
              </div>
            </form>
          )}
          <div className="auth-divider">
            <span>یا تجربه بدون ورود</span>
          </div>
          <button
            className="button secondary full-width"
            onClick={() =>
              onLogin({
                phone:
                  role === "patient"
                    ? demoPatient === "p2"
                      ? "09124567890"
                      : "09123456789"
                    : "09121234567",
                role,
                demo: true,
                patientId: role === "patient" ? demoPatient : undefined,
              })
            }
          >
            مشاهده نسخه نمایشی
            <ArrowLeft size={17} />
          </button>
          <p className="auth-privacy">
            <LockKeyhole size={14} />
            اطلاعات فقط در مرورگر شما باقی می‌مانند.
          </p>
        </div>
        <footer className="auth-footer">
          نسخه نمایشی؛ بدون پیامک، سرور و احراز هویت واقعی.
        </footer>
      </section>
      <section className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-content">
          <span className="auth-visual-eyebrow">یک کلینیک، یک تیم، یک نبض</span>
          <h2>
            مراقبت بهتر،
            <br />
            با یک <span>نبض</span> هماهنگ.
          </h2>
          <p>
            همه آنچه تیم شما برای مدیریت یکپارچه کلینیک نیاز دارد، در یک فضای
            آرام و هوشمند.
          </p>
          <div className="auth-hospital">
            <svg viewBox="0 0 420 280" fill="none" aria-hidden="true">
              <path d="M25 249h370" stroke="white" strokeOpacity=".35" />
              <rect
                x="70"
                y="118"
                width="280"
                height="130"
                rx="4"
                fill="white"
                fillOpacity=".1"
                stroke="white"
                strokeOpacity=".45"
              />
              <path
                d="M136 248V57a7 7 0 0 1 7-7h134a7 7 0 0 1 7 7v191"
                fill="#2e68da"
                stroke="white"
                strokeOpacity=".75"
              />
              <rect
                x="187"
                y="192"
                width="47"
                height="56"
                rx="3"
                stroke="white"
                strokeOpacity=".7"
              />
              <path d="M210 193v54" stroke="white" strokeOpacity=".4" />
              <path
                d="M201 72h18v17h17v18h-17v17h-18v-17h-17V89h17V72Z"
                fill="white"
              />
              <path
                d="M158 147h24v21h-24v-21Zm40 0h24v21h-24v-21Zm40 0h24v21h-24v-21ZM88 141h26v25H88v-25Zm0 46h26v25H88v-25Zm219-46h25v25h-25v-25Zm0 46h25v25h-25v-25Z"
                fill="white"
                fillOpacity=".25"
              />
              <circle cx="48" cy="211" r="18" fill="#8ad5d0" />
              <path d="M48 222v26" stroke="#8ad5d0" strokeWidth="5" />
              <circle cx="372" cy="203" r="22" fill="#9adfd7" />
              <path d="M372 217v32" stroke="#9adfd7" strokeWidth="5" />
              <path
                d="M30 85h48l15-19 14 40 17-25h19M298 65h30l11-15 12 31 12-18h29"
                stroke="white"
                strokeOpacity=".35"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="auth-visual-foot">
            <ShieldCheck size={19} />
            <span>طراحی‌شده برای کلینیک‌های تخصصی بیمارستان</span>
          </div>
        </div>
      </section>
    </main>
  );
}
