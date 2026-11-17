import { useCallback } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { OrgDialog } from './ui/OrgDialog';
import { TicketDrawer } from './ui/TicketDrawer';

/** Журнал саҳифалари учун умумий қобиқ: мурожаат ва ташкилот тафсилоти URL орқали (?ticket=…, ?org=…) исталган саҳифада очилади. */
export function useJournalLinks() {
  const [params, setParams] = useSearchParams();
  const set = useCallback((key: string, id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set(key, id); else next.delete(key);
    setParams(next);
  }, [params, setParams]);
  return { openTicket: (id: string) => set('ticket', id), openOrg: (id: string) => set('org', id), close: (key: 'ticket' | 'org') => set(key, null), params };
}

export default function JournalShell() {
  const { params, openTicket, openOrg, close } = useJournalLinks();
  const ticket = params.get('ticket'), org = params.get('org');
  return (
    <>
      <Outlet />
      {ticket && <TicketDrawer id={ticket} onClose={() => close('ticket')} onOrg={openOrg} />}
      {org && <OrgDialog id={org} onClose={() => close('org')} onTicket={openTicket} />}
    </>
  );
}
