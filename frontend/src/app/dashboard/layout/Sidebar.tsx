import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  InboxIcon,
  AlertCircleIcon,
  UsersIcon,
  StethoscopeIcon,
  BarChart3Icon,
  SettingsIcon,
  UserCircleIcon,
  ActivityIcon,
  ChevronDownIcon,
  LayersIcon,
  CreditCardIcon,
  LockIcon,
  PhoneCallIcon,
  CalendarIcon,
  ScissorsIcon,
  WalletIcon,
  TrendingUpIcon,
  PackageIcon,
  MessageCircleIcon,
  SparklesIcon,
  FileTextIcon
} from "lucide-react";
import { AGENT_CATEGORIES } from "../../../data/agents";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { MOCK_SESSIONS } from "../data/mockSessions";
import { usePlan } from "../plan/PlanContext";
import type { Role } from "../../../data/roles";
import { Logo } from "../../../components/ui";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  imgSrc?: string;
  badge?: number;
  end?: boolean;
  locked?: boolean;
  // Omitted = visible to every role (every item today). This pass builds
  // only the Owner dashboard and applies no restrictions — the field exists
  // so a future Doctor/Receptionist dashboard is "tag an existing item,"
  // not a rearchitecture. See data/roles.ts.
  allowedRoles?: Role[];
  // Additional gate on top of allowedRoles, checked for role === "doctor" or
  // "receptionist" — either also needs this key in their granted permissions
  // (data/doctorPermissions.ts / data/receptionistPermissions.ts
  // respectively). Owner is never permission-gated: owning the practice is
  // the permission.
  requiresPermission?: string;
}

function visibleFor(items: NavItem[], role: Role, permissions: string[]): NavItem[] {
  return items.filter((item) => {
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    // Owner is never permission-gated (see NavItem.requiresPermission's own
    // comment) — Doctor and Receptionist both grant access via a per-record
    // permissions list an Owner assigns (doctorPermissions.ts /
    // receptionistPermissions.ts), so both need the same check here.
    if (item.requiresPermission && (role === "doctor" || role === "receptionist") && !permissions.includes(item.requiresPermission)) return false;
    return true;
  });
}

const SIMPLE_ITEMS_TOP: NavItem[] = [
{ label: "Overview", to: DASHBOARD_ROUTES.overview, icon: LayoutDashboardIcon, end: true, allowedRoles: ["owner"] },
{ label: "My Overview", to: DASHBOARD_ROUTES.doctorOverview, icon: LayoutDashboardIcon, end: true, allowedRoles: ["doctor"] },
{ label: "Front Desk", to: DASHBOARD_ROUTES.frontDesk, icon: LayoutDashboardIcon, end: true, allowedRoles: ["receptionist"], requiresPermission: "view_front_desk" }];


const SIMPLE_ITEMS_MID: NavItem[] = [
// Owner already has Main Agent front-and-center on their Overview page
// (AIInsightsPanel's embedded compact chat) — a second sidebar entry for
// them duplicated it. Doctor/Receptionist have no such widget anywhere, so
// the sidebar stays their only way in.
{ label: "Main Agent", to: DASHBOARD_ROUTES.commandCenter, icon: SparklesIcon, allowedRoles: ["doctor", "receptionist"] },
{ label: "Messages", to: DASHBOARD_ROUTES.messages, icon: MessageCircleIcon, allowedRoles: ["doctor", "receptionist"] },
{ label: "Patients", to: DASHBOARD_ROUTES.patients, icon: UsersIcon, allowedRoles: ["owner", "doctor", "receptionist"], requiresPermission: "view_patients" },
{ label: "Doctors", to: DASHBOARD_ROUTES.doctors, icon: StethoscopeIcon, allowedRoles: ["owner", "doctor"], requiresPermission: "view_doctors_crm" },
{ label: "Surgery", to: DASHBOARD_ROUTES.surgeries, icon: ScissorsIcon, allowedRoles: ["owner", "doctor"] },
{ label: "AI Receptionist", to: DASHBOARD_ROUTES.receptionistMonitor, icon: PhoneCallIcon, allowedRoles: ["owner", "receptionist"], requiresPermission: "view_ai_receptionist" },
{ label: "My Calendar", to: DASHBOARD_ROUTES.myCalendar, icon: CalendarIcon, allowedRoles: ["doctor"], requiresPermission: "view_own_calendar" },
{ label: "Front Desk", to: DASHBOARD_ROUTES.frontDesk, icon: LayoutDashboardIcon, allowedRoles: ["owner"] },
{ label: "Waiting Room", to: DASHBOARD_ROUTES.waitingRoom, icon: UsersIcon, allowedRoles: ["owner", "receptionist"], requiresPermission: "manage_waiting_room" },
{ label: "Staff", to: DASHBOARD_ROUTES.staff, icon: UsersIcon, allowedRoles: ["owner"] },
{ label: "Leads / Funnel", to: DASHBOARD_ROUTES.leadsFunnel, icon: TrendingUpIcon, allowedRoles: ["owner", "receptionist"] },
{ label: "Inventory", to: DASHBOARD_ROUTES.inventory, icon: PackageIcon, allowedRoles: ["owner", "receptionist"] }];


const SETTINGS_ITEMS: NavItem[] = [
{ label: "Agent settings", to: DASHBOARD_ROUTES.settingsAgents, icon: SettingsIcon, allowedRoles: ["owner", "doctor"] },
{ label: "Profile", to: DASHBOARD_ROUTES.settingsProfile, icon: UserCircleIcon, allowedRoles: ["owner", "doctor"] },
{ label: "Procedures", to: DASHBOARD_ROUTES.settingsProcedures, icon: ScissorsIcon, allowedRoles: ["owner", "doctor"] },
{ label: "Consent templates", to: DASHBOARD_ROUTES.settingsConsentTemplates, icon: FileTextIcon, allowedRoles: ["owner"] },
{ label: "Plan & billing", to: DASHBOARD_ROUTES.settingsBilling, icon: CreditCardIcon, allowedRoles: ["owner"] }];


function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
      `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      collapsed ? "justify-center" : ""} ${
      item.locked ?
      "text-ink-muted/70 hover:bg-sand-100 hover:text-ink-muted" :
      isActive ?
      "bg-accent-500/10 text-accent-700" :
      "text-ink-soft hover:bg-sand-100 hover:text-ink"}`
      }>

      {({ isActive }) =>
      <>
          {isActive && !item.locked &&
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent-500" />
        }
          {item.imgSrc ? (
            <img src={item.imgSrc} alt="" className="h-4 w-4 shrink-0 rounded object-contain" />
          ) : (
            <item.icon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed &&
        <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.locked ?
          <LockIcon className="h-3 w-3 shrink-0 text-ink-muted/60" /> :
          !!item.badge &&
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                {item.badge}
              </span>
          }
          </>
        }
        </>
      }
    </NavLink>);

}

function CollapsibleNavGroup({
  label,
  icon: Icon,
  imgSrc,
  children,
  badge,
  collapsed

}: {label: string;icon: React.ComponentType<{className?: string;}>;imgSrc?: string;children: NavItem[];badge?: number;collapsed: boolean;}) {
  const location = useLocation();
  const isWithin = children.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + "/"));
  const [open, setOpen] = useState(isWithin);

  useEffect(() => {
    if (isWithin) setOpen(true);
  }, [isWithin]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? label : undefined}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : ""} ${
        isWithin ? "text-ink" : "text-ink-soft hover:bg-sand-100 hover:text-ink"}`
        }>

        {imgSrc ? (
          <img src={imgSrc} alt="" className="h-4 w-4 shrink-0 rounded object-contain" />
        ) : (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        {!collapsed &&
        <>
            <span className="flex-1 truncate text-left">{label}</span>
            {!!badge &&
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
              {badge}
            </span>
          }
            <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        }
      </button>
      {!collapsed && open &&
      <div className="relative ml-[18px] mt-0.5 space-y-0.5 border-l border-sand-200 pl-3.5">
          {children.map((item) => <NavRow key={item.to} item={item} collapsed={collapsed} />)}
        </div>
      }
    </div>);

}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { allowsCategory, can, role, permissions } = usePlan();
  const needsAttentionCount = MOCK_SESSIONS.filter((s) => s.status === "needs_attention").length;

  const sessionChildren: NavItem[] = [
  { label: "All conversations", to: DASHBOARD_ROUTES.sessionsAll, icon: InboxIcon },
  { label: "Needs attention", to: DASHBOARD_ROUTES.sessionsNeedsAttention, icon: AlertCircleIcon, badge: needsAttentionCount }];


  // Money — the owner's finance/sales hub lives in a single entry; every
  // invoice / payment / salary screen is reached from inside Finance, so the
  // sidebar stays clean.
  const moneyChildren: NavItem[] = [
  { label: "Finance", to: DASHBOARD_ROUTES.financeOverview, icon: WalletIcon, allowedRoles: ["owner", "receptionist"] }];


  const CATEGORY_LOGOS: Record<string, string> = {
    "front-desk": "/agent-logos/Front Desk & Intake.png",
    "consultation": "/agent-logos/Consultation & Screening.png",
    "surgery": "/agent-logos/Surgery Management.png",
    "post-care": "/agent-logos/Post-Surgery Care.png",
    "business": "/agent-logos/Business & Operations.png",
  };

  const agentChildren: NavItem[] = AGENT_CATEGORIES.map((c) => ({
    label: c.label,
    to: DASHBOARD_ROUTES.agentCategory(c.id),
    icon: ActivityIcon,
    imgSrc: CATEGORY_LOGOS[c.id],
    locked: !allowsCategory(c.id)
  }));

  const bottomItems: NavItem[] = [
  { label: "Analytics", to: DASHBOARD_ROUTES.analytics, icon: BarChart3Icon, locked: !can("analytics"), allowedRoles: ["owner", "doctor"], requiresPermission: "view_analytics" }];


  return (
    <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sand-200/80 bg-white/70 backdrop-blur-md lg:flex ${collapsed ? "w-[72px]" : "w-[280px]"}`}>
      <div className={`flex h-16 items-center gap-2.5 border-b border-sand-200/80 ${collapsed ? "justify-center px-2" : "px-6"}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-sand-200 bg-white">
          <Logo className="h-5 w-5" />
        </span>
        {!collapsed &&
        <span className="text-[15px] font-bold tracking-tight text-ink">Aiaceone</span>
        }
      </div>

      <nav className={`flex-1 overflow-y-auto py-5 ${collapsed ? "px-3" : "px-4"}`}>
        <div className="space-y-0.5">
          {visibleFor(SIMPLE_ITEMS_TOP, role, permissions).map((item) => <NavRow key={item.to} item={item} collapsed={collapsed} />)}
        </div>

        <div className="mt-4">
          <CollapsibleNavGroup label="Agent Sessions" icon={InboxIcon} badge={needsAttentionCount} collapsed={collapsed} children={visibleFor(sessionChildren, role, permissions)} />
        </div>

        <div className="mt-4 space-y-0.5">
          {visibleFor(SIMPLE_ITEMS_MID, role, permissions).map((item) => <NavRow key={item.to} item={item} collapsed={collapsed} />)}
        </div>

        {visibleFor(moneyChildren, role, permissions).length > 0 &&
        <div className="mt-4">
            <CollapsibleNavGroup label="Money" icon={WalletIcon} collapsed={collapsed} children={visibleFor(moneyChildren, role, permissions)} />
          </div>
        }

        <div className="mt-4">
          <CollapsibleNavGroup label="Agents" icon={LayersIcon} imgSrc="/agent-logos/agents.png" collapsed={collapsed} children={visibleFor(agentChildren, role, permissions)} />
        </div>

        <div className="mt-4 space-y-0.5">
          {visibleFor(bottomItems, role, permissions).map((item) => <NavRow key={item.to} item={item} collapsed={collapsed} />)}
        </div>

        <div className="mt-6">
          {!collapsed &&
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Settings
          </p>
          }
          <div className={collapsed ? "space-y-0.5" : "mt-2 space-y-0.5"}>
            {visibleFor(SETTINGS_ITEMS, role, permissions).map((item) => <NavRow key={item.to} item={item} collapsed={collapsed} />)}
          </div>
        </div>
      </nav>
    </aside>);

}
