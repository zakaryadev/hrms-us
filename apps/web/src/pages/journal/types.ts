/** Журнал API жавоблари (apps/api/src/journal билан мос). */
export interface OptionRef { id: string; lat: string; cyr: string }
export type OptionKind = 'work_type' | 'channel' | 'priority' | 'client_group' | 'training_format' | 'category' | 'kb_type';
export interface OptionItem extends OptionRef { customCyr: string | null; sort: number; active: boolean; usage: number }
export interface Meta { options: Record<OptionKind, OptionItem[]>; normDays: number }

export type TicketStatus = 'registered' | 'in_progress' | 'forwarded' | 'resolved' | 'cancelled';
export type KbStatus = 'draft' | 'active' | 'needs_update' | 'archived';
export const OPEN_STATUSES: TicketStatus[] = ['registered', 'in_progress', 'forwarded'];

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export interface OrgRef { id: string; name: string; region: string }
export interface TicketRef { id: string; code: string }

export interface Ticket {
  id: string; code: string; received: string; org: OrgRef | null; orgId: string | null; person: string;
  channel: OptionRef | null; category: OptionRef | null; priority: OptionRef | null;
  channelId: string | null; categoryId: string | null; priorityId: string | null;
  problem: string; actions: string; dept: string; status: TicketStatus; resolvedAt: string | null; days: number | null; note: string;
  counts: { entries: number; kb: number; trainings: number };
}
export interface TicketList extends Page<Ticket> { counts: Record<TicketStatus, number> }
export interface TicketEvent { id: string; status: TicketStatus; at: string; by: string | null; note: string }
export interface TicketDetail extends Ticket {
  minutes: number; events: TicketEvent[];
  entries: Array<{ id: string; date: string; start: string; end: string; done: string; type: OptionRef | null; durationMin: number | null }>;
  kb: Array<{ id: string; code: string; question: string; status: KbStatus }>;
  trainings: Array<{ id: string; date: string; topic: string; count: number }>;
}

export interface Entry {
  id: string; date: string; start: string; end: string; type: OptionRef | null; typeId: string | null;
  org: OrgRef | null; orgId: string | null; ticket: TicketRef | null; ticketId: string | null;
  person: string; channel: OptionRef | null; channelId: string | null; done: string; result: string; durationMin: number | null;
}
export interface EntryList extends Page<Entry> { minutes: number }

export interface Training {
  id: string; date: string; org: OrgRef | null; orgId: string | null; topic: string; format: OptionRef | null; formatId: string | null;
  count: number; ticket: TicketRef | null; ticketId: string | null; link: string; trainer: string; result: string; note: string;
}
export interface TrainingList extends Page<Training> { participants: number }

export interface Kb {
  id: string; code: string; created: string; category: OptionRef | null; categoryId: string | null; type: OptionRef | null; typeId: string | null;
  question: string; solution: string; ticket: TicketRef | null; ticketId: string | null; link: string; version: string; status: KbStatus; review: string | null;
}

export interface Org {
  id: string; name: string; region: string; note: string; groupId: string | null; group: OptionRef | null;
  stats: { tickets: number; open: number; entries: number; trainings: number };
}
export interface OrgHistory extends Omit<Org, 'stats'> {
  tickets: Array<{ id: string; code: string; received: string; problem: string; status: TicketStatus; category: OptionRef | null }>;
  entries: Array<{ id: string; date: string; done: string; type: OptionRef | null; durationMin: number | null }>;
  trainings: Array<{ id: string; date: string; topic: string; count: number }>;
}

export interface Report {
  month: string; scope: 'user' | 'department'; normDays: number;
  kpi: {
    entries: number; minutes: number; received: number; resolved: number; forwarded: number; avgDays: number | null; inNormPct: number | null;
    entriesLinkedToTicket: number; trainings: number; trainedUsers: number; kb: number; kbFromTicket: number;
  };
  byWorkType: Array<{ name: OptionRef | null; count: number }>;
  byCategory: Array<{ name: OptionRef | null; count: number }>;
  byGroup: Array<{ name: OptionRef | null; count: number }>;
  byStatus: Array<{ status: TicketStatus; count: number }>;
  orgs: Array<{ id: string; name: string; region: string; tickets: number; resolved: number; entries: number; trainings: number; users: number }>;
  open: Array<{ id: string; code: string; received: string; org: string; problem: string; status: TicketStatus; ageDays: number }>;
}
