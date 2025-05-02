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
      name: s.attributes.friendly_name.split('Kontostand ').pop(),
      balance: parseFloat(s.state || 0)
    }));

  // Depotwerte
  const depots = states
    .filter(s => s.entity_id.startsWith('sensor.portfolio_performance_reader_depotwert'))
    .map(s => {
      const name = s.attributes.friendly_name.split('Depotwert ').pop();
      const baseName = name.replace('Portfolio Performance Reader ', '');
      
      // Zugehörige Gewinn-Sensoren finden
      const gainAbsState = states.find(x => 
        x.entity_id.startsWith('sensor.portfolio_performance_reader_kursgewinn_absolut_') &&
        x.attributes.friendly_name.includes(baseName)
      );
      
      const gainPctState = states.find(x => 
        x.entity_id.startsWith('sensor.portfolio_performance_reader_kursgewinn_') &&
        !x.entity_id.includes('absolut') &&
        x.attributes.friendly_name.includes(baseName)
      );

      return {
        name: baseName,
        count: s.attributes.anzahl_wertpapiere || 0,
        value: parseFloat(s.state || 0),
        gain_abs: gainAbsState ? parseFloat(gainAbsState.state || 0) : 0,
        gain_pct: gainPctState ? parseFloat(gainPctState.state || 0) : 0
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
