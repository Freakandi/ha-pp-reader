import { fetchStates } from './api.js';

export async function prepareDashboardData() {
  const states = await fetchStates();

  const firstAccount = states.find(s => s.entity_id.startsWith('sensor.kontostand_'));
  const fileUpdated = firstAccount?.attributes?.letzte_aktualisierung || 'Unbekannt';
  const lastUpdatedRaw = firstAccount?.last_updated;
  const lastUpdated = lastUpdatedRaw
    ? new Date(lastUpdatedRaw).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'Unbekannt';

  const konten = states
    .filter(s => s.entity_id.startsWith('sensor.kontostand_'))
    .map(s => ({
      name: s.attributes.friendly_name,
      balance: parseFloat(s.state)
    }));

  const depots = states
    .filter(s => s.entity_id.startsWith('sensor.depotwert_'))
    .map(s => {
      const slug = s.entity_id.replace('sensor.depotwert_', '');
      const absId = `sensor.kursgewinn_absolut_${slug}`;
      const pctId = `sensor.kursgewinn_${slug}`;
      const gainAbsState = states.find(x => x.entity_id === absId);
      const gainPctState = states.find(x => x.entity_id === pctId);
      return {
        name: s.attributes.friendly_name,
        count: s.attributes.anzahl_wertpapiere,
        value: parseFloat(s.state),
        gain_abs: gainAbsState ? parseFloat(gainAbsState.state) : 0,
        gain_pct: gainPctState ? parseFloat(gainPctState.state) : 0
      };
    });

  const totalKonten = konten.reduce((acc, k) => acc + (isNaN(k.balance) ? 0 : k.balance), 0);
  const totalDepots = depots.reduce((acc, d) => acc + (isNaN(d.value) ? 0 : d.value), 0);
  const totalVermoegen = totalKonten + totalDepots;

  return {
    konten,
    depots,
    totalKonten,
    totalDepots,
    totalVermoegen,
    fileUpdated,
    lastUpdated,
    states
  };
}
