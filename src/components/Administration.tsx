import { useState, type FormEvent } from "react";
import {
  Bell,
  CalendarCheck2,
  Check,
  CheckCheck,
  CircleHelp,
  Download,
  FileCheck2,
  FileText,
  LockKeyhole,
  Monitor,
  Moon,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  createSeed,
  fa,
  latin,
  money,
  persianDate,
  shiftDate,
  uid,
} from "../data";
import { activity, csv, downloadFile, useClinic } from "../store";
import { invoices as getInvoices } from "../invoices";
import { AreaChart, SpecialtyChart } from "./Dashboard";
import { EmptyState, Field, PageHeader, PanelHeader, SearchInput } from "./ui";
import type { Patient, Theme } from "../types";

export function Finance({ personal = false }: { personal?: boolean }) {
  const { data, role, setData, setModal, toast, patientId } = useClinic();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const owned = getInvoices(data).filter((item) =>
    personal || role === "patient"
      ? item.patientId === patientId
      : item.date === data.day,
  );
  const invoices = owned.filter(
    (item) =>
      (filter === "all" || (filter === "paid" ? item.paid : !item.paid)) &&
      data.patients
        .find((patient) => patient.id === item.patientId)
        ?.name.includes(search),
  );
  const collected = owned
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.patientShare, 0);
  const outstanding = owned
    .filter((item) => !item.paid)
    .reduce((sum, item) => sum + item.patientShare, 0);
  function exportInvoices() {
    downloadFile(
      `nabz-invoices-${data.day}.csv`,
      csv([
        [
          "بیمار",
          "تاریخ",
          "تعرفه کل",
          "سهم بیمه",
          "سهم بیمار",
          "وضعیت",
          "شماره رسید",
        ],
        ...invoices.map((item) => [
          data.patients.find((patient) => patient.id === item.patientId)
            ?.name || "",
          item.date,
          item.total,
          item.total - item.patientShare,
          item.patientShare,
          item.paid ? "پرداخت شده" : "پرداخت نشده",
          item.receipt || "",
        ]),
      ]),
    );
    toast("خروجی فاکتورها دانلود شد.");
  }
  function closeCash() {
    const closed = data.cashClosedDate === data.day;
    setModal({
      type: "confirm",
      title: closed ? "بازگشایی صندوق روز" : "بستن صندوق روز",
      description: closed
        ? "با تأیید، امکان ثبت پرداخت‌های جدید برای امروز فعال می‌شود."
        : `مجموع وصولی ${money(collected)} تومان است. ${fa(owned.filter((item) => !item.paid).length)} فاکتور پرداخت‌نشده باقی می‌ماند و از گزارش وصولی کنار گذاشته می‌شود. پس از بستن صندوق، ثبت پرداخت جدید نیازمند بازگشایی است.`,
      onConfirm: () => {
        setData((previous) => ({
          ...previous,
          cashClosedDate: closed ? null : data.day,
          activities: [
            activity(
              closed ? "صندوق بازگشایی شد" : "صندوق روز بسته شد",
              `وصولی ثبت‌شده: ${money(collected)} تومان`,
              "payment",
            ),
            ...previous.activities,
          ],
        }));
        setModal(null);
        toast(closed ? "صندوق بازگشایی شد." : "صندوق روز با موفقیت بسته شد.");
      },
    });
  }
  return (
    <>
      <PageHeader
        title={personal ? "پرداخت‌ها و رسیدهای من" : "امور مالی و صندوق"}
        subtitle={
          personal
            ? "فاکتورها، سهم بیمه و رسید پرداخت‌هایتان را بررسی کنید."
            : "مدیریت وصولی‌ها، سهم بیمه و تسویه‌حساب مراجعین."
        }
      >
        <button className="button secondary" onClick={exportInvoices}>
          <Download size={17} />
          خروجی فاکتورها
        </button>
        {!personal && (
          <button className="button primary" onClick={closeCash}>
            <LockKeyhole size={17} />
            {data.cashClosedDate === data.day
              ? "بازگشایی صندوق"
              : "بستن صندوق روز"}
          </button>
        )}
      </PageHeader>
      <div className="finance-summary">
        <button onClick={() => setFilter("paid")}>
          <span className="summary-symbol icon-teal">
            <Wallet size={23} />
          </span>
          <span>
            <small>{personal ? "مجموع پرداخت‌های من" : "وصولی امروز"}</small>
            <strong>
              {money(collected)} <small>تومان</small>
            </strong>
          </span>
        </button>
        <button onClick={() => setFilter("unpaid")}>
          <span className="summary-symbol icon-amber">
            <FileText size={23} />
          </span>
          <span>
            <small>در انتظار پرداخت</small>
            <strong>
              {money(outstanding)} <small>تومان</small>
            </strong>
          </span>
        </button>
        <button onClick={() => setFilter("all")}>
          <span className="summary-symbol icon-blue">
            <ShieldCheck size={23} />
          </span>
          <span>
            <small>سهم سازمان‌های بیمه‌گر</small>
            <strong>
              {money(
                owned.reduce(
                  (sum, item) => sum + item.total - item.patientShare,
                  0,
                ),
              )}{" "}
              <small>تومان</small>
            </strong>
          </span>
        </button>
      </div>
      {!personal && data.cashClosedDate === data.day && (
        <div className="inline-banner">
          <LockKeyhole size={17} />
          صندوق امروز بسته است. برای ثبت پرداخت جدید، صندوق را بازگشایی کنید.
        </div>
      )}
      <section className="panel">
        <div className="filter-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در نام صاحب فاکتور..."
          />
          <div className="segmented-control">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              همه فاکتورها
            </button>
            <button
              className={filter === "paid" ? "active" : ""}
              onClick={() => setFilter("paid")}
            >
              پرداخت شده
            </button>
            <button
              className={filter === "unpaid" ? "active" : ""}
              onClick={() => setFilter("unpaid")}
            >
              پرداخت نشده
            </button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>بیمار / شماره فاکتور</th>
                <th>خدمت و تاریخ</th>
                <th>مبلغ کل</th>
                <th>سهم بیمه</th>
                <th>سهم بیمار</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <strong className="cell-primary">
                      {
                        data.patients.find(
                          (patient) => patient.id === item.patientId,
                        )?.name
                      }
                    </strong>
                    <small className="cell-secondary">
                      NBZ-{fa(1000 + index)}
                    </small>
                  </td>
                  <td>
                    <span className="cell-primary">{item.serviceName}</span>
                    <small className="cell-secondary">
                      {persianDate(item.date)}
                    </small>
                  </td>
                  <td>{money(item.total)}</td>
                  <td>{money(item.total - item.patientShare)}</td>
                  <td>
                    <strong>{money(item.patientShare)}</strong>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${item.paid ? "status-green" : "status-amber"}`}
                    >
                      <i />
                      {item.paid ? "تسویه شده" : "پرداخت نشده"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-action"
                      onClick={() => {
                        if (!item.paid && data.cashClosedDate === data.day) {
                          toast(
                            "صندوق بسته است؛ ابتدا صندوق را بازگشایی کنید.",
                            true,
                          );
                          return;
                        }
                        setModal({
                          type: item.paid ? "receipt" : "pay",
                          appointmentId: item.id,
                        });
                      }}
                    >
                      {item.paid ? "دریافت رسید" : "تسویه فاکتور"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices.length && <EmptyState />}
        </div>
        <div className="table-bottom">
          <span>{fa(invoices.length)} فاکتور</span>
          <span>تمام مبلغ‌ها به تومان است</span>
        </div>
      </section>
      <div className="inline-note">
        <ShieldCheck size={16} />
        پرداخت‌ها نمایشی هستند و هیچ تراکنش بانکی واقعی انجام نمی‌شود.
      </div>
    </>
  );
}

export function Insurance() {
  const { data, setData, toast, setModal } = useClinic();
  const [verified, setVerified] = useState<string[]>([]);
  const names = Array.from(
    new Set(data.patients.map((patient) => patient.insurance)),
  ).filter((name) => name !== "آزاد");
  const submitted = new Set(
    data.claims.flatMap((claim) => claim.appointmentIds),
  );
  function submit(insurance: string) {
    const appointments = getInvoices(data).filter(
      (item) =>
        item.paid &&
        item.date === data.day &&
        !submitted.has(item.id) &&
        data.patients.find((patient) => patient.id === item.patientId)
          ?.insurance === insurance,
    );
    if (!appointments.length) {
      toast("سند پرداخت‌شده جدیدی برای این بیمه وجود ندارد.", true);
      return;
    }
    setModal({
      type: "confirm",
      title: "ثبت بسته اسناد بیمه (نمایشی)",
      description: `${fa(appointments.length)} سند برای ${insurance} بسته‌بندی می‌شود. هیچ اطلاعاتی به سازمان بیمه ارسال نخواهد شد و بسته فقط در مرورگر ذخیره می‌شود.`,
      onConfirm: () => {
        setData((previous) => ({
          ...previous,
          claims: [
            {
              id: uid("claim"),
              insurance,
              date: data.day,
              appointmentIds: appointments.map((item) => item.id),
              total: appointments.reduce(
                (sum, item) => sum + item.total - item.patientShare,
                0,
              ),
              status: "submitted",
            },
            ...previous.claims,
          ],
          activities: [
            activity(
              "بسته اسناد بیمه ساخته شد",
              `بسته نمایشی ${insurance} در مرورگر ذخیره شد.`,
              "payment",
            ),
            ...previous.activities,
          ],
        }));
        setModal(null);
        toast("بسته اسناد به‌صورت محلی ثبت شد.");
      },
    });
  }
  return (
    <>
      <PageHeader
        title="رسیدگی به اسناد بیمه‌ای"
        subtitle="اعتبار بیمه، سهم سازمان و بسته‌های اسناد را مدیریت کنید."
      />
      <div className="insurance-grid">
        {names.map((name) => {
          const appointments = getInvoices(data).filter(
            (item) =>
              item.date === data.day &&
              item.paid &&
              !submitted.has(item.id) &&
              data.patients.find((patient) => patient.id === item.patientId)
                ?.insurance === name,
          );
          return (
            <article className="panel insurance-panel" key={name}>
              <span className="insurance-emblem">
                <ShieldCheck size={27} />
              </span>
              <h2>{name}</h2>
              <p>{fa(appointments.length)} سند آماده بسته‌بندی</p>
              <strong className="insurance-total">
                {money(
                  appointments.reduce(
                    (sum, item) => sum + item.total - item.patientShare,
                    0,
                  ),
                )}
                <small> تومان</small>
              </strong>
              <button
                className="button secondary full-width"
                onClick={() => {
                  setVerified((previous) => [...previous, name]);
                  toast(
                    "اعتبار بیمه در داده‌های نمونه تأیید شد؛ استعلام واقعی انجام نشده است.",
                  );
                }}
              >
                <RefreshCw size={15} />
                {verified.includes(name)
                  ? "اعتبار نمونه تأیید شد"
                  : "استعلام نمایشی اعتبار"}
              </button>
              <button
                className="button primary full-width"
                onClick={() => submit(name)}
              >
                <Send size={15} />
                ساخت بسته اسناد
              </button>
            </article>
          );
        })}
      </div>
      <section className="panel">
        <PanelHeader
          title="بسته‌های اسناد ثبت‌شده"
          subtitle="این بسته‌ها فقط به‌صورت محلی نگهداری می‌شوند."
        />
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>سازمان بیمه‌گر</th>
                <th>تاریخ</th>
                <th>تعداد اسناد</th>
                <th>مجموع مطالبات</th>
                <th>وضعیت</th>
                <th>خروجی</th>
              </tr>
            </thead>
            <tbody>
              {data.claims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.insurance}</td>
                  <td>{persianDate(claim.date)}</td>
                  <td>{fa(claim.appointmentIds.length)}</td>
                  <td>{money(claim.total)} تومان</td>
                  <td>
                    <span className="status-badge status-blue">بسته محلی</span>
                  </td>
                  <td>
                    <button
                      className="text-action"
                      onClick={() =>
                        downloadFile(
                          `nabz-claim-${claim.id}.csv`,
                          csv([
                            ["بیمه", "تاریخ", "تعداد اسناد", "جمع مطالبات"],
                            [
                              claim.insurance,
                              claim.date,
                              claim.appointmentIds.length,
                              claim.total,
                            ],
                          ]),
                        )
                      }
                    >
                      <Download size={15} />
                      دریافت
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.claims.length && (
            <EmptyState
              title="هنوز بسته‌ای ثبت نشده است"
              description="اسناد پرداخت‌شده را از بخش بالا در یک بسته قرار دهید."
            />
          )}
        </div>
      </section>
    </>
  );
}

export function Tariffs() {
  const { data, setModal, role } = useClinic();
  const [search, setSearch] = useState("");
  const tariffs = data.tariffs.filter((tariff) => tariff.name.includes(search));
  return (
    <>
      <PageHeader
        title="تعرفه‌ها و خدمات"
        subtitle="تعرفه ویزیت و درصد پوشش پایه بیمه را برای نوبت‌های جدید تنظیم کنید."
      >
        {role === "management" && (
          <button
            className="button primary"
            onClick={() => setModal({ type: "tariff" })}
          >
            <SlidersHorizontal size={17} />
            تعریف خدمت جدید
          </button>
        )}
      </PageHeader>
      <section className="panel">
        <div className="filter-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در خدمات و تعرفه‌ها..."
          />
          <span className="muted">
            تعرفه‌های نمونه سال{" "}
            {fa(
              new Intl.DateTimeFormat("en-u-ca-persian", {
                year: "numeric",
              }).format(new Date()),
            )}
          </span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>عنوان خدمت</th>
                <th>تخصص</th>
                <th>تعرفه آزاد</th>
                <th>پوشش بیمه پایه</th>
                <th>سهم بیمار بیمه‌شده</th>
                <th>ویرایش</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((tariff) => (
                <tr key={tariff.id}>
                  <td>
                    <span className="insurance-label">
                      <FileCheck2 size={17} />
                      {tariff.name}
                    </span>
                  </td>
                  <td>{tariff.specialty}</td>
                  <td>{money(tariff.amount)} تومان</td>
                  <td>
                    <span className="status-badge status-blue">
                      {fa(tariff.insurancePercent)}٪
                    </span>
                  </td>
                  <td>
                    {money(
                      Math.round(
                        (tariff.amount * (100 - tariff.insurancePercent)) / 100,
                      ),
                    )}{" "}
                    تومان
                  </td>
                  <td>
                    <button
                      className="text-action"
                      onClick={() =>
                        setModal({ type: "tariff", id: tariff.id })
                      }
                    >
                      <Pencil size={15} />
                      ویرایش
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tariffs.length && <EmptyState />}
        </div>
      </section>
      <div className="inline-note">
        <CircleHelp size={16} />
        تغییر تعرفه، مبلغ فاکتورهای قبلی را تغییر نمی‌دهد. درصد پوشش در این
        نمونه برای همه بیمه‌ها یکسان است.
      </div>
    </>
  );
}

export function Reports() {
  const { data, toast } = useClinic();
  const [period, setPeriod] = useState("week");
  const from = shiftDate(
    data.day,
    period === "today" ? 0 : period === "week" ? -6 : -29,
  );
  const appointments = data.appointments.filter(
    (item) =>
      item.date >= from &&
      item.date <= data.day &&
      !["cancelled", "waitlisted"].includes(item.status),
  );
  const rows = data.doctors.map((doctor) => {
    const visits = appointments.filter((item) => item.doctorId === doctor.id);
    return {
      doctor,
      visits,
      income: visits
        .filter((item) => item.paid)
        .reduce((sum, item) => sum + item.patientShare, 0),
    };
  });
  function exportReport() {
    downloadFile(
      `nabz-performance-${period}.csv`,
      csv([
        ["پزشک", "تخصص", "تعداد مراجعه", "ویزیت تکمیل‌شده", "وصولی"],
        ...rows.map((row) => [
          row.doctor.name,
          row.doctor.specialty,
          row.visits.length,
          row.visits.filter((item) => item.status === "completed").length,
          row.income,
        ]),
      ]),
    );
    toast("گزارش عملکرد دانلود شد.");
  }
  return (
    <>
      <PageHeader
        title="گزارش‌ها و آمار"
        subtitle="تصمیم‌های بهتر، با تصویری روشن از عملکرد کلینیک."
      >
        <select
          aria-label="بازه گزارش عملکرد"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="today">امروز</option>
          <option value="week">هفت روز گذشته</option>
          <option value="month">سی روز گذشته</option>
        </select>
        <button className="button primary" onClick={exportReport}>
          <Download size={17} />
          دانلود گزارش
        </button>
      </PageHeader>
      <div className="analytics-grid">
        <AreaChart expanded />
        <SpecialtyChart />
      </div>
      <section className="panel report-table">
        <PanelHeader
          title="عملکرد پزشکان در بازه انتخاب‌شده"
          subtitle={`${persianDate(from)} تا ${persianDate(data.day)}`}
        />
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>پزشک</th>
                <th>تخصص</th>
                <th>مراجعه</th>
                <th>ویزیت تکمیل‌شده</th>
                <th>ضریب تکمیل</th>
                <th>وصولی بیمار (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.doctor.id}>
                  <td>
                    <strong>{row.doctor.name}</strong>
                  </td>
                  <td>{row.doctor.specialty}</td>
                  <td>{fa(row.visits.length)}</td>
                  <td>
                    {fa(
                      row.visits.filter((item) => item.status === "completed")
                        .length,
                    )}
                  </td>
                  <td>
                    <div className="report-progress">
                      <span
                        style={{
                          width: `${row.visits.length ? (row.visits.filter((item) => item.status === "completed").length / row.visits.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td>{money(row.income)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="inline-note">
        <FileText size={16} />
        جدول و خروجی از پرونده‌های محلی محاسبه می‌شوند؛ روندهای تاریخی نمودار،
        داده‌های نمونه‌اند.
      </div>
    </>
  );
}

export function Notifications() {
  const { data, role, setData, patientId } = useClinic();
  const [unread, setUnread] = useState(false);
  const visible = data.activities.filter(
    (item) =>
      role !== "patient" ||
      item.kind === "system" ||
      item.description.includes(
        data.patients.find((patient) => patient.id === patientId)?.name ||
          "مریم احمدی",
      ),
  );
  const items = visible.filter((item) => !unread || !item.read);
  const icons = {
    appointment: CalendarCheck2,
    payment: Wallet,
    clinical: FileCheck2,
    system: Bell,
  };
  return (
    <>
      <PageHeader
        title="مرکز اعلان‌ها"
        subtitle="از آخرین تغییرات و اتفاق‌های کلینیک باخبر بمانید."
      >
        <button
          className="button secondary"
          onClick={() =>
            setData((previous) => ({
              ...previous,
              activities: previous.activities.map((item) =>
                visible.some((entry) => entry.id === item.id)
                  ? { ...item, read: true }
                  : item,
              ),
            }))
          }
        >
          <CheckCheck size={17} />
          خواندن همه اعلان‌ها
        </button>
      </PageHeader>
      <section className="panel">
        <div className="table-tabs">
          <button
            className={!unread ? "active" : ""}
            onClick={() => setUnread(false)}
          >
            همه اعلان‌ها
          </button>
          <button
            className={unread ? "active" : ""}
            onClick={() => setUnread(true)}
          >
            خوانده‌نشده
            <span>{fa(visible.filter((item) => !item.read).length)}</span>
          </button>
        </div>
        <div className="notification-list">
          {items.map((item) => {
            const Icon = icons[item.kind];
            return (
              <button
                className={`notification-row ${!item.read ? "unread" : ""}`}
                key={item.id}
                onClick={() =>
                  setData((previous) => ({
                    ...previous,
                    activities: previous.activities.map((entry) =>
                      entry.id === item.id ? { ...entry, read: true } : entry,
                    ),
                  }))
                }
              >
                <span
                  className={`notification-symbol icon-${item.kind === "payment" ? "teal" : item.kind === "clinical" ? "violet" : "blue"}`}
                >
                  <Icon size={21} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <small>{item.time}</small>
                </span>
                {!item.read && <span className="unread-dot" />}
              </button>
            );
          })}
          {!items.length && (
            <EmptyState
              title="همه چیز به‌روز است"
              description="اعلان خوانده‌نشده‌ای ندارید."
            />
          )}
        </div>
      </section>
    </>
  );
}

const themes: {
  id: Theme;
  name: string;
  subtitle: string;
  colors: string[];
  dark?: boolean;
}[] = [
  {
    id: "winter",
    name: "زمستان",
    subtitle: "روشن و آرام",
    colors: ["#ffffff", "#edf2fa", "#3479ef"],
  },
  {
    id: "night",
    name: "شب",
    subtitle: "تیره و متمرکز",
    colors: ["#192231", "#253348", "#55a9ee"],
    dark: true,
  },
  {
    id: "corporate",
    name: "سازمانی",
    subtitle: "رسمی و یکپارچه",
    colors: ["#ffffff", "#eff2f5", "#4e6de7"],
  },
  {
    id: "emerald",
    name: "زمرد",
    subtitle: "سبز و زنده",
    colors: ["#ffffff", "#eff5f1", "#4bb89b"],
  },
  {
    id: "nord",
    name: "نورد",
    subtitle: "ملایم و مینیمال",
    colors: ["#eceff4", "#d8dee9", "#81a1c1"],
  },
  {
    id: "dim",
    name: "گرگ‌ومیش",
    subtitle: "تیره و متعادل",
    colors: ["#2a303c", "#353d4a", "#9fe9b4"],
    dark: true,
  },
];

export function Settings() {
  const { role } = useClinic();
  if (role === "patient") return <PatientSettings />;
  return <StaffSettings />;
}

function PatientSettings() {
  const { data, patientId, setData, theme, setTheme, toast } = useClinic();
  const me = data.patients.find((item) => item.id === patientId);
  const [form, setForm] = useState<Patient | undefined>(me);
  if (!me || !form) return null;
  const change = <K extends keyof Patient>(key: K, value: Patient[K]) =>
    setForm((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const patient = {
      ...form,
      name: form.name.trim(),
      conditions: form.conditions.map((item) => item.trim()).filter(Boolean),
    };
    setData((previous) => ({
      ...previous,
      patients: previous.patients.map((item) =>
        item.id === patient.id ? patient : item,
      ),
    }));
    toast("مشخصات پرونده شما ذخیره شد.");
  }
  return (
    <>
      <PageHeader
        title="مشخصات من"
        subtitle="این اطلاعات برای شخصی‌سازی پرونده و پرسش‌های پیش از ویزیت استفاده می‌شود."
      />
      <div className="settings-layout">
        <section className="panel">
          <PanelHeader
            title="اطلاعات فردی"
            subtitle="سن، جنسیت و وضعیت تأهل روی پرسش‌های پیشنهادی اثر دارد."
          />
          <form className="settings-form" onSubmit={save}>
            <Field label="نام و نام خانوادگی">
              <input
                required
                minLength={3}
                maxLength={70}
                value={form.name}
                onChange={(event) => change("name", event.target.value)}
              />
            </Field>
            <Field label="شماره همراه">
              <input
                required
                dir="ltr"
                pattern="09[0-9]{9}"
                maxLength={11}
                value={form.phone}
                onChange={(event) =>
                  change("phone", latin(event.target.value).replace(/\D/g, ""))
                }
              />
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
            <Field label="گروه خون">
              <select
                value={form.bloodType}
                onChange={(event) => change("bloodType", event.target.value)}
              >
                {[
                  "نامشخص",
                  "A+",
                  "A-",
                  "B+",
                  "B-",
                  "O+",
                  "O-",
                  "AB+",
                  "AB-",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="بیمه پایه">
              <input
                value={form.insurance}
                onChange={(event) => change("insurance", event.target.value)}
              />
            </Field>
            <Field label="حساسیت دارویی" className="span-2">
              <input
                maxLength={200}
                value={form.allergy}
                onChange={(event) => change("allergy", event.target.value)}
              />
            </Field>
            <Field
              label="بیماری‌های زمینه‌ای (با ویرگول جدا کنید)"
              className="span-2"
            >
              <input
                value={form.conditions.join("، ")}
                onChange={(event) =>
                  change("conditions", event.target.value.split(/[،,]/))
                }
              />
            </Field>
            <Field label="داروهای فعلی" className="span-2">
              <textarea
                rows={2}
                value={form.currentMedications}
                onChange={(event) =>
                  change("currentMedications", event.target.value)
                }
              />
            </Field>
            <Field label="سابقه خانوادگی" className="span-2">
              <input
                value={form.familyHistory}
                onChange={(event) =>
                  change("familyHistory", event.target.value)
                }
              />
            </Field>
            <Field label="تماس اضطراری">
              <input
                value={form.emergencyContact.name}
                onChange={(event) =>
                  change("emergencyContact", {
                    ...form.emergencyContact,
                    name: event.target.value,
                  })
                }
                placeholder="نام"
              />
            </Field>
            <Field label="نسبت">
              <input
                value={form.emergencyContact.relation}
                onChange={(event) =>
                  change("emergencyContact", {
                    ...form.emergencyContact,
                    relation: event.target.value,
                  })
                }
                placeholder="همسر، والدین..."
              />
            </Field>
            <Field label="تلفن تماس اضطراری">
              <input
                dir="ltr"
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
            <Field label="سیگار">
              <select
                value={form.smoking}
                onChange={(event) =>
                  change("smoking", event.target.value as Patient["smoking"])
                }
              >
                {["هرگز", "ترک کرده", "گاهی", "روزانه", "نامشخص"].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </Field>
            <button className="button primary" type="submit">
              <Check size={17} />
              ذخیره مشخصات
            </button>
          </form>
        </section>
        <section className="panel">
          <PanelHeader
            title="ظاهر و رنگ‌بندی"
            subtitle="تم انتخابی در همین مرورگر ذخیره می‌شود."
          />
          <div className="theme-grid">
            {themes.map((item) => (
              <button
                className={`theme-option ${theme === item.id ? "theme-selected" : ""}`}
                key={item.id}
                onClick={() => setTheme(item.id)}
              >
                <span
                  className="theme-preview"
                  style={{ background: item.colors[1] }}
                >
                  <span style={{ background: item.colors[0] }}>
                    <i style={{ background: item.colors[2] }} />
                    <i style={{ background: item.colors[1] }} />
                    <i style={{ background: item.colors[1] }} />
                  </span>
                  <b style={{ background: item.colors[2] }} />
                </span>
                <span className="theme-name">
                  {item.dark ? <Moon size={15} /> : <Sun size={15} />}
                  <strong>{item.name}</strong>
                  {theme === item.id && (
                    <Check size={16} className="text-accent" />
                  )}
                </span>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function StaffSettings() {
  const { data, setData, theme, setTheme, setModal, toast, role } = useClinic();
  const [name, setName] = useState(data.profile.name);
  const [clinicName, setClinicName] = useState(data.profile.clinicName);
  const [phone, setPhone] = useState(data.profile.phone);
  function save(event: FormEvent) {
    event.preventDefault();
    setData((previous) => ({
      ...previous,
      profile: { name: name.trim(), clinicName: clinicName.trim(), phone },
    }));
    toast("تنظیمات با موفقیت ذخیره شد.");
  }
  function reset() {
    setModal({
      type: "confirm",
      title: "بازنشانی تمام داده‌های نمایشی",
      description:
        "بیماران، نوبت‌ها و تغییرات این مرورگر حذف می‌شوند و اطلاعات اولیه دوباره بارگذاری خواهند شد. این کار قابل بازگشت نیست؛ در صورت نیاز، ابتدا نسخه پشتیبان بگیرید.",
      onConfirm: () => {
        setData(createSeed());
        setModal(null);
        toast("داده‌های اولیه بازگردانی شدند.");
      },
    });
  }
  return (
    <>
      <PageHeader
        title="تنظیمات سامانه"
        subtitle="فضای کاری نبض را مطابق نیاز و سلیقه خود تنظیم کنید."
      />
      <div className="settings-layout">
        <section className="panel">
          <PanelHeader
            title="ظاهر و رنگ‌بندی"
            subtitle="شش تم رسمی DaisyUI؛ انتخاب شما در مرورگر ذخیره می‌شود."
          />
          <div className="theme-grid">
            {themes.map((item) => (
              <button
                className={`theme-option ${theme === item.id ? "theme-selected" : ""}`}
                key={item.id}
                onClick={() => setTheme(item.id)}
              >
                <span
                  className="theme-preview"
                  style={{ background: item.colors[1] }}
                >
                  <span style={{ background: item.colors[0] }}>
                    <i style={{ background: item.colors[2] }} />
                    <i style={{ background: item.colors[1] }} />
                    <i style={{ background: item.colors[1] }} />
                  </span>
                  <b style={{ background: item.colors[2] }} />
                </span>
                <span className="theme-name">
                  {item.dark ? <Moon size={15} /> : <Sun size={15} />}
                  <strong>{item.name}</strong>
                  {theme === item.id && (
                    <Check size={16} className="text-accent" />
                  )}
                </span>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelHeader
            title="اطلاعات فضای کاری"
            subtitle={
              role === "management"
                ? "مشخصات نمایشی مسئول و کلینیک"
                : "مشخصات فضای کاری؛ ویرایش فقط برای مدیر فعال است"
            }
          />
          <form className="settings-form" onSubmit={save}>
            <Field label="نام و نام خانوادگی">
              <input
                required
                minLength={3}
                readOnly={role !== "management"}
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="نام کلینیک">
              <input
                required
                minLength={3}
                readOnly={role !== "management"}
                maxLength={80}
                value={clinicName}
                onChange={(event) => setClinicName(event.target.value)}
              />
            </Field>
            <Field label="شماره تماس">
              <input
                required
                dir="ltr"
                readOnly={role !== "management"}
                pattern="09[0-9]{9}"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <button
              className="button primary"
              type="submit"
              disabled={role !== "management"}
            >
              <Check size={17} />
              ذخیره تغییرات
            </button>
          </form>
        </section>
      </div>
      {role === "management" && (
        <section className="panel data-management">
          <PanelHeader
            title="مدیریت داده‌های مرورگر"
            subtitle="هیچ پایگاه داده یا سروری در این سامانه استفاده نمی‌شود."
          />
          <div className="data-actions">
            <div>
              <Monitor size={23} />
              <span>
                <strong>نسخه پشتیبان محلی</strong>
                <small>
                  دریافت تمام داده‌های نمونه و تغییرات، با فرمت JSON
                </small>
              </span>
              <button
                className="button secondary small"
                onClick={() => {
                  downloadFile(
                    `nabz-backup-${data.day}.json`,
                    JSON.stringify(data, null, 2),
                    "application/json",
                  );
                  toast("نسخه پشتیبان دانلود شد.");
                }}
              >
                <Download size={15} />
                دریافت پشتیبان
              </button>
            </div>
            <div>
              <Trash2 size={23} />
              <span>
                <strong>بازنشانی اطلاعات</strong>
                <small>حذف تغییرات و بازگشت به داده‌های اولیه</small>
              </span>
              <button className="button danger-outline small" onClick={reset}>
                بازنشانی داده‌ها
              </button>
            </div>
          </div>
        </section>
      )}
      <section className="help-section">
        <CircleHelp size={24} />
        <div>
          <h2>نبض، همراه تیم مراقبت شما</h2>
          <p>
            برای آزمودن گردش کار، از منوی بالای سایدبار بین نقش‌ها جابه‌جا شوید.
            برای ورود نمایشی، از حساب کاربری خارج شوید و از کد پنج‌رقمی ۱۲۳۴۵
            استفاده کنید. این پروژه فاقد احراز هویت امن، پیامک واقعی، استعلام
            بیمه و درگاه بانکی است.
          </p>
        </div>
      </section>
    </>
  );
}
