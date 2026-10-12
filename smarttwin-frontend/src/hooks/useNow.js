import { useEffect, useState } from 'react';
// Re-renders every `ms` so the dashboard refreshes like a live feed.
export default function useNow(ms = 5000) {
  const [now, set] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => set(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return now;
}
