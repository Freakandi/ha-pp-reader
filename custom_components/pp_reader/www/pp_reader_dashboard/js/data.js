import { fetchStates } from './api.js';

export async function prepareDashboardData() {
  const states = await fetchStates();

  // Erste Konto-Entity für Zeitstempel
  const firstAccount = states.find(s => s.entity_id.startsWith('sensor.portfolio_performance_reader_kontostand'));
  const fileUpdated = firstAccount?.attributes?.letzte_aktualisierung || 'Unbekannt';
  const lastUpdatedRaw = firstAccount?.last_updated;
  const lastUpdated = lastUpdatedRaw
    ? new Date(lastUpdatedRaw).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'Unbekannt';

  // Kontostände
  const konten = states
    .filter(s => s.entity_id.startsWith('sensor.portfolio_performance_reader_kontostand'))
    .map(s => ({
      name: s.attributes.friendly_name.replace('Kontostand ', ''),
      balance: parseFloat(s.state)
    }));

  // Depotwerte
  const depots = states
    .filter(s => s.entity_id.startsWith('sensor.portfolio_performance_reader_depotwert'))
    .map(s => {
      const name = s.attributes.friendly_name.replace('Depotwert ', '');
      const slug = s.entity_id.split('_').pop(); // Letztes Segment der Entity-ID
      
      // Zugehörige Gewinn-Sensoren finden
      const absId = `sensor.portfolio_performance_reader_kursgewinn_absolut_${slug}`;
      const pctId = `sensor.portfolio_performance_reader_kursgewinn_${slug}`;
      const gainAbsState = states.find(x => x.entity_id === absId);
      const gainPctState = states.find(x => x.entity_id === pctId);

      return {
        name: name,
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
