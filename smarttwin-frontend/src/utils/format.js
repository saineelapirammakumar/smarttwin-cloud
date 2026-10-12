export const fmtTime = (t, range) => {
  const d = new Date(t), long = typeof range === 'object' ? range.ms >= 1728e5 : range === '7d';
  return long ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.getHours() + ':00'
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
export const fmtDateTime = (t) => new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const ago = (s) => (s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`);
export const toInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16); // for <input type="datetime-local">
