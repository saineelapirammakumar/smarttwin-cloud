const ITEMS = [['state', '🗺️', 'Tamil Nadu'], ['overview', '🏙️', 'City overview'], ['zones', '📍', 'Zones'], ['traffic', '🚦', 'Traffic'], ['environment', '🌿', 'Environment'], ['energy', '⚡', 'Energy'], ['alerts', '🔔', 'Alerts'], ['sensors', '📡', 'Sensors'], ['compare', '⚖️', 'Compare cities']];
export default function Sidebar({ page, onNav, alertCount }) {
  return (
    <aside className="side">
      <div className="brand"><div className="logo">🛰️</div><div>SmartTwin Cloud<small>Smart city digital twin</small></div></div>
      {ITEMS.map(([id, ico, label]) => (
        <button key={id} className={'nav' + (page === id ? ' on' : '')} onClick={() => onNav(id)}>
          <span>{ico}</span>{label}{id === 'alerts' && alertCount > 0 && <span className="badge">{alertCount}</span>}
        </button>))}
      <div className="side-foot"><b>Data mode</b><br />Simulated sensors<br />No hardware connected</div>
    </aside>
  );
}
