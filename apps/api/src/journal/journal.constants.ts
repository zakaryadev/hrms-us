import type { JournalOptionKind, TicketStatus } from '@prisma/client';

export const OPTION_KINDS: JournalOptionKind[] = ['work_type', 'channel', 'priority', 'client_group', 'training_format', 'category', 'kb_type'];

/** Ёпиқ ҳолатлар. Ҳисобот шу қийматга таянади; рўйхат элементларининг номи ҳисобга таъсир қилмайди. */
export const CLOSED_STATUSES: TicketStatus[] = ['resolved', 'cancelled'];
export const OPEN_STATUSES: TicketStatus[] = ['registered', 'in_progress', 'forwarded'];

export const SETTING_NORM = 'journal.normDays';
