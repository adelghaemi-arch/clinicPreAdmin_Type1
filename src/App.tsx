import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileHeart,
  FileText,
  FolderHeart,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Inbox,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Sun,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import Auth from "./components/Auth";
import PatientInbox from "./components/PatientInbox";
import Dashboard from "./components/Dashboard";
import {
  Appointments,
  Doctors,
  Nursing,
  PatientHistory,
  Patients,
  Prescriptions,
  Queue,
  Visits,
} from "./components/Operations";
import {
  Finance,
  Insurance,
  Notifications,
  Reports,
  Settings,
  Tariffs,
} from "./components/Administration";
import ModalHost from "./components/Modals";
import { Avatar, IconButton, Logo } from "./components/ui";
import { Assistant, MobileNav } from "./components/Smart";
import PatientSwitcher from "./components/PatientSwitcher";
import { ClinicProvider, useClinic, usePersistentState } from "./store";
import {
  currentDoctorId,
  currentPatientId,
  fa,
  latin,
  pageNames,
  persianDate,
  roleNames,
  rolePages,
} from "./data";
import type { Page, Role, Session, Theme } from "./types";

const pageIcons: Record<Page, LucideIcon> = {
  dashboard: LayoutDashboard,
  inbox: Inbox,
  doctors: Stethoscope,
  appointments: CalendarClock,
  patients: FolderHeart,
  finance: WalletCards,
  reports: ChartNoAxesCombined,
  tariffs: ClipboardList,
  notifications: Bell,
  settings: Settings2,
  queue: UsersRound,
  visits: FileHeart,
  prescriptions: FileText,
  triage: HeartPulse,
  procedures: ClipboardList,
  emergency: HeartPulse,
  insurance: ShieldCheck,
  history: FolderHeart,
  payments: WalletCards,
  booking: CalendarDays,
};
const roleIcons: Record<Role, LucideIcon> = {
  management: Hospital,
  physician: Stethoscope,
  reception: CalendarClock,
  nursing: HeartPulse,
  finance: WalletCards,
  patient: UserRound,
};

export default function App() {
  const [theme, setTheme] = usePersistentState<Theme>("nabz-theme", "winter");
  const [session, setSession] = usePersistentState<Session | null>(
    "nabz-session",
    { phone: "09121234567", role: "management", demo: true },
  );
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const patientId = session?.patientId || currentPatientId;
  function switchPatient(id: string) {
    setSession((previous) =>
      previous ? { ...previous, patientId: id } : previous,
    );
    setPage("dashboard");
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";
  }, [theme]);
  function navigate(next: Page) {
    if (
      session &&
      ![...rolePages[session.role], "settings", "notifications"].includes(next)
    )
      return;
    setPage(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function switchRole(role: Role) {
    setSession((previous) => (previous ? { ...previous, role } : previous));
    setPage("dashboard");
    setSidebarOpen(false);
  }
  if (!session)
    return (
      <Auth
        theme={theme}
        toggleTheme={() =>
          setTheme(theme === "night" || theme === "dim" ? "winter" : "night")
        }
        onLogin={(value) => {
          setSession(value);
          setPage("dashboard");
        }}
      />
    );
  const allowedPage = [
    ...rolePages[session.role],
    "settings",
    "notifications",
  ].includes(page)
    ? page
    : "dashboard";
  return (
    <ClinicProvider
      role={session.role}
      page={allowedPage}
      navigate={navigate}
      patientId={patientId}
      switchPatient={switchPatient}
      theme={theme}
      setTheme={setTheme}
    >
      <div className="app-shell" dir="rtl">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          switchRole={switchRole}
          onLogout={() => {
            setSession(null);
            setPage("dashboard");
          }}
          demo={session.demo}
        />
        <div className="main-shell">
          <Topbar
            onMenu={() => setSidebarOpen(!sidebarOpen)}
            onLogout={() => {
              setSession(null);
              setPage("dashboard");
            }}
          />
          <main
            className="main-content"
            id="main-content"
            key={`${session.role}-${allowedPage}`}
          >
            <PageContent page={allowedPage} />
          </main>
        </div>
        <MobileNav
          icons={pageIcons}
          moreOpen={sidebarOpen}
          setMore={setSidebarOpen}
        />
        <Assistant />
        <ModalHost />
      </div>
    </ClinicProvider>
  );
}

function Sidebar({
  open,
  onClose,
  switchRole,
  onLogout,
  demo,
}: {
  open: boolean;
  onClose: () => void;
  switchRole: (role: Role) => void;
  onLogout: () => void;
  demo: boolean;
}) {
  const { data, role, page, navigate, setModal, patientId } = useClinic();
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(event: MouseEvent) {
      if (!roleRef.current?.contains(event.target as Node)) setRoleOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    setModal(null);
  }, [role, setModal]);
  const RoleIcon = roleIcons[role];
  const waiting = data.appointments.filter(
    (item) =>
      item.date === data.day &&
      item.status !== "cancelled" &&
      (role !== "patient" || item.patientId === patientId),
  ).length;
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="بستن منو"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="mobile-close icon-button"
            aria-label="بستن منو"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        <div className="role-switcher popover-root" ref={roleRef}>
          <button
            className={`role-selector ${roleOpen ? "role-selector-open" : ""}`}
            aria-expanded={roleOpen}
            onClick={() => setRoleOpen(!roleOpen)}
          >
            <span className="role-symbol">
              <RoleIcon size={21} strokeWidth={1.7} />
            </span>
            <span>
              <small>فضای کاری شما</small>
              <strong>{roleNames[role]}</strong>
            </span>
            <ChevronDown size={15} />
          </button>
          {roleOpen && (
            <div className="role-popover">
              <div className="popover-label">تغییر نقش در نسخه نمایشی</div>
              {(Object.entries(roleNames) as [Role, string][]).map(
                ([value, label]) => {
                  const Icon = roleIcons[value];
                  return (
                    <button
                      className={role === value ? "selected" : ""}
                      key={value}
                      onClick={() => {
                        switchRole(value);
                        setRoleOpen(false);
                      }}
                    >
                      <Icon size={17} />
                      {label}
                      {role === value && <Check size={15} />}
                    </button>
                  );
                },
              )}
              <p>سطوح دسترسی فقط در رابط کاربری شبیه‌سازی شده‌اند.</p>
            </div>
          )}
        </div>
        <nav className="sidebar-navigation" aria-label="ناوبری اصلی">
          <span className="nav-label">مدیریت کلینیک</span>
          {rolePages[role].map((item) => {
            const Icon = pageIcons[item];
            return (
              <button
                key={item}
                className={`nav-item ${page === item ? "nav-active" : ""}`}
                onClick={() => navigate(item)}
              >
                <Icon size={20} strokeWidth={1.65} />
                <span>
                  {item === "dashboard" && role !== "management"
                    ? "نمای کلی"
                    : item === "appointments" && role === "patient"
                      ? "نوبت‌های من"
                      : pageNames[item]}
                </span>
                {item === "appointments" && (
                  <b className="nav-count">{fa(waiting)}</b>
                )}
                {item === "doctors" && (
                  <b className="nav-count neutral-count">
                    {fa(data.doctors.length)}
                  </b>
                )}
              </button>
            );
          })}
          <div className="nav-divider" />
          <span className="nav-label">مدیریت سامانه</span>
          {(["notifications", "settings"] as Page[]).map((item) => {
            const Icon = pageIcons[item];
            return (
              <button
                className={`nav-item ${page === item ? "nav-active" : ""}`}
                key={item}
                onClick={() => navigate(item)}
              >
                <Icon size={20} strokeWidth={1.65} />
                <span>{pageNames[item]}</span>
                {item === "notifications" &&
                  data.activities.some((entry) => !entry.read) && (
                    <span className="nav-unread" />
                  )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="support-link" onClick={() => navigate("settings")}>
            <span>
              <LifeBuoy size={22} strokeWidth={1.5} />
            </span>
            <div>
              <strong>کنار شما هستیم</strong>
              <small>راهنما و پشتیبانی</small>
            </div>
            <ChevronLeft size={15} />
          </button>
          <div className="local-status">
            <span className="live-dot" />
            {demo ? "نسخه نمایشی، کاملاً محلی" : "ورود نمایشی با کد پنج‌رقمی"}
          </div>
          <div className="sidebar-profile">
            <button
              className="sidebar-profile-button"
              onClick={() => navigate("settings")}
            >
              <Avatar
                name={
                  role === "patient"
                    ? data.patients.find((patient) => patient.id === patientId)
                        ?.name || "بیمار"
                    : role === "physician"
                      ? "امیرحسین رضایی"
                      : data.profile.name
                }
                index={role === "patient" && patientId === "p2" ? 1 : 4}
              />
              <span>
                <strong>
                  {role === "patient"
                    ? data.patients.find((patient) => patient.id === patientId)
                        ?.name || "بیمار"
                    : role === "physician"
                      ? "دکتر امیرحسین رضایی"
                      : data.profile.name}
                </strong>
                <small>{roleNames[role]}</small>
              </span>
            </button>
            <IconButton
              icon={LogOut}
              label="خروج و ورود با کد پنج‌رقمی"
              onClick={onLogout}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  onMenu,
  onLogout,
}: {
  onMenu: () => void;
  onLogout: () => void;
}) {
  const { data, page, role, navigate, setModal, theme, setTheme, patientId } =
    useClinic();
  const [search, setSearch] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setBellOpen(false);
        setProfileOpen(false);
      }
    }
    function keys(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearch("");
        setBellOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", keys);
    };
  }, []);
  const patients = search
    ? data.patients
        .filter(
          (patient) =>
            (role !== "patient" || patient.id === patientId) &&
            `${patient.name} ${patient.nationalCode}`.includes(latin(search)),
        )
        .slice(0, 4)
    : [];
  const doctors =
    search && ["management", "physician", "reception", "patient"].includes(role)
      ? data.doctors
          .filter(
            (doctor) =>
              (role !== "physician" || doctor.id === currentDoctorId) &&
              `${doctor.name} ${doctor.specialty}`.includes(search),
          )
          .slice(0, 3)
      : [];
  const notifications = data.activities.filter(
    (item) =>
      role !== "patient" ||
      item.kind === "system" ||
      item.description.includes(
        data.patients.find((patient) => patient.id === patientId)?.name ||
          "مریم احمدی",
      ),
  );
  const dark = theme === "night" || theme === "dim";
  return (
    <header className="topbar">
      <div className="topbar-start">
        <IconButton
          icon={Menu}
          label="باز کردن منو"
          className="mobile-menu"
          onClick={onMenu}
        />
        <div className="breadcrumbs">
          <span>{data.profile.clinicName}</span>
          <ChevronLeft size={14} />
          <strong>{page === "dashboard" ? "نمای کلی" : pageNames[page]}</strong>
        </div>
      </div>
      <div className="global-search">
        <Search size={17} />
        <input
          ref={searchRef}
          value={search}
          aria-label="جستجوی سراسری"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجو در سامانه..."
        />
        <kbd dir="ltr">Ctrl K</kbd>
        {search && (
          <div className="search-results">
            <div className="popover-label">نتایج جستجو</div>
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                  if (role === "finance") navigate("finance");
                  else setModal({ type: "record", patientId: patient.id });
                  setSearch("");
                }}
              >
                <Avatar name={patient.name} size="small" />
                <span>
                  <strong>{patient.name}</strong>
                  <small>پرونده بیمار • {fa(patient.nationalCode)}</small>
                </span>
                <ChevronLeft size={14} />
              </button>
            ))}
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => {
                  if (role === "management")
                    setModal({ type: "doctor", id: doctor.id });
                  else
                    navigate(role === "patient" ? "booking" : "appointments");
                  setSearch("");
                }}
              >
                <Avatar src={doctor.avatar} name={doctor.name} size="small" />
                <span>
                  <strong>{doctor.name}</strong>
                  <small>{doctor.specialty}</small>
                </span>
                <ChevronLeft size={14} />
              </button>
            ))}
            {!patients.length && !doctors.length && (
              <p className="search-empty">نتیجه‌ای برای «{search}» پیدا نشد.</p>
            )}
          </div>
        )}
      </div>
      <div className="topbar-actions" ref={ref}>
        <span className="header-date">
          <CalendarDays size={16} />
          {persianDate(data.day, true)}
        </span>
        <span className="header-divider" />
        <IconButton
          icon={dark ? Sun : Moon}
          label={dark ? "فعال کردن تم روشن" : "فعال کردن تم تیره"}
          onClick={() => setTheme(dark ? "winter" : "night")}
        />
        <div className="popover-root">
          <IconButton
            icon={Bell}
            label="اعلان‌های جدید"
            className={bellOpen ? "selected" : ""}
            onClick={() => {
              setBellOpen(!bellOpen);
              setProfileOpen(false);
            }}
          >
            {notifications.some((item) => !item.read) && (
              <span className="bell-dot" />
            )}
          </IconButton>
          {bellOpen && (
            <div className="header-popover notification-popover">
              <div className="popover-heading">
                <strong>اعلان‌های تازه</strong>
                <span>
                  {fa(notifications.filter((item) => !item.read).length)}{" "}
                  خوانده‌نشده
                </span>
              </div>
              {notifications.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate("notifications");
                    setBellOpen(false);
                  }}
                >
                  <span
                    className={`notification-mini ${item.kind === "payment" ? "icon-teal" : "icon-blue"}`}
                  >
                    {item.kind === "payment" ? (
                      <WalletCards size={17} />
                    ) : (
                      <CalendarClock size={17} />
                    )}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <small>{item.time}</small>
                  </span>
                  {!item.read && <i className="unread-dot" />}
                </button>
              ))}
              <button
                className="popover-footer"
                onClick={() => {
                  navigate("notifications");
                  setBellOpen(false);
                }}
              >
                مشاهده همه اعلان‌ها
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
        {role === "patient" ? (
          <PatientSwitcher />
        ) : (
          <div className="popover-root">
            <button
              className="topbar-avatar"
              aria-label="منوی حساب کاربری"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setBellOpen(false);
              }}
            >
              <Avatar name={data.profile.name} size="small" index={4} />
              <ChevronDown size={13} />
            </button>
            {profileOpen && (
              <div className="header-popover profile-popover">
                <div className="popover-label">حساب کاربری نمایشی</div>
                <button
                  onClick={() => {
                    navigate("settings");
                    setProfileOpen(false);
                  }}
                >
                  <Settings2 size={17} />
                  تنظیمات حساب
                </button>
                <button onClick={onLogout}>
                  <LogOut size={17} />
                  خروج و ورود با کد یک‌بارمصرف
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "inbox":
      return <PatientInbox />;
    case "appointments":
      return <Appointments />;
    case "doctors":
      return <Doctors />;
    case "booking":
      return <Doctors booking />;
    case "patients":
      return <Patients />;
    case "queue":
      return <Queue />;
    case "triage":
      return <Nursing />;
    case "procedures":
      return <Nursing mode="procedures" />;
    case "emergency":
      return <Nursing mode="emergency" />;
    case "visits":
      return <Visits />;
    case "prescriptions":
      return <Prescriptions />;
    case "history":
      return <PatientHistory />;
    case "finance":
      return <Finance />;
    case "payments":
      return <Finance personal />;
    case "insurance":
      return <Insurance />;
    case "tariffs":
      return <Tariffs />;
    case "reports":
      return <Reports />;
    case "notifications":
      return <Notifications />;
    case "settings":
      return <Settings />;
  }
}
