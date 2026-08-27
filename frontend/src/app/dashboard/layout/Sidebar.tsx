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
  LockIcon
} from "lucide-react";
import { AGENT_CATEGORIES } from "../../../data/agents";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { MOCK_SESSIONS } from "../data/mockSessions";
import { usePlan } from "../plan/PlanContext";

const needsAttentionCount = MOCK_SESSIONS.filter((s) => s.status === "needs_attention").length;

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  end?: boolean;
  locked?: boolean;
}

const SIMPLE_ITEMS_TOP: NavItem[] = [
{ label: "Overview", to: DASHBOARD_ROUTES.overview, icon: LayoutDashboardIcon, end: true }];


const SESSION_CHILDREN: NavItem[] = [
{ label: "All conversations", to: DASHBOARD_ROUTES.sessionsAll, icon: InboxIcon },
{ label: "Needs attention", to: DASHBOARD_ROUTES.sessionsNeedsAttention, icon: AlertCircleIcon, badge: needsAttentionCount }];


const SIMPLE_ITEMS_MID: NavItem[] = [
{ label: "Patients", to: DASHBOARD_ROUTES.patients, icon: UsersIcon },
{ label: "Doctors", to: DASHBOARD_ROUTES.doctors, icon: StethoscopeIcon }];


const SETTINGS_ITEMS: NavItem[] = [
{ label: "Agent settings", to: DASHBOARD_ROUTES.settingsAgents, icon: SettingsIcon },
{ label: "Profile", to: DASHBOARD_ROUTES.settingsProfile, icon: UserCircleIcon },
{ label: "Plan & billing", to: DASHBOARD_ROUTES.settingsBilling, icon: CreditCardIcon }];


function NavRow({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
      `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      item.locked ?
      "text-ink-muted/70 hover:bg-sand-100 hover:text-ink-muted" :
      isActive ?
      "bg-teal-600/8 text-teal-600" :
      "text-ink-soft hover:bg-sand-100 hover:text-ink"}`
      }>

      {({ isActive }) =>
      <>
          {isActive && !item.locked &&
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-teal-600" />
        }
          <item.icon className="h-4 w-4 shrink-0" />
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
    </NavLink>);

}

function CollapsibleNavGroup({
  label,
  icon: Icon,
  children,
  badge



}: {label: string;icon: React.ComponentType<{className?: string;}>;children: NavItem[];badge?: number;}) {
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
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        isWithin ? "text-ink" : "text-ink-soft hover:bg-sand-100 hover:text-ink"}`
        }>

        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{label}</span>
        {!!badge &&
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
            {badge}
          </span>
        }
        <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
      <div className="relative ml-[18px] mt-0.5 space-y-0.5 border-l border-sand-200 pl-3.5">
          {children.map((item) => <NavRow key={item.to} item={item} />)}
        </div>
      }
    </div>);

}

export function Sidebar() {
  const { allowsCategory, can } = usePlan();

  const agentChildren: NavItem[] = AGENT_CATEGORIES.map((c) => ({
    label: c.label,
    to: DASHBOARD_ROUTES.agentCategory(c.id),
    icon: ActivityIcon,
    locked: !allowsCategory(c.id)
  }));

  const bottomItems: NavItem[] = [
  { label: "Analytics", to: DASHBOARD_ROUTES.analytics, icon: BarChart3Icon, locked: !can("analytics") }];


  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-sand-200/80 bg-white/70 backdrop-blur-md lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sand-200/80 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
          <ActivityIcon className="h-4.5 w-4.5" strokeWidth={2.4} />
        </span>
        <span className="text-[15px] font-bold tracking-tight text-ink">
          Aesthetix<span className="text-teal-600">AI</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-0.5">
          {SIMPLE_ITEMS_TOP.map((item) => <NavRow key={item.to} item={item} />)}
        </div>

        <div className="mt-4">
          <CollapsibleNavGroup label="Agent Sessions" icon={InboxIcon} badge={needsAttentionCount} children={SESSION_CHILDREN} />
        </div>

        <div className="mt-4 space-y-0.5">
          {SIMPLE_ITEMS_MID.map((item) => <NavRow key={item.to} item={item} />)}
        </div>

        <div className="mt-4">
          <CollapsibleNavGroup label="Agents" icon={LayersIcon} children={agentChildren} />
        </div>

        <div className="mt-4 space-y-0.5">
          {bottomItems.map((item) => <NavRow key={item.to} item={item} />)}
        </div>

        <div className="mt-6">
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Settings
          </p>
          <div className="mt-2 space-y-0.5">
            {SETTINGS_ITEMS.map((item) => <NavRow key={item.to} item={item} />)}
          </div>
        </div>
      </nav>
    </aside>);

}
