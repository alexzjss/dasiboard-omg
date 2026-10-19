export type IconName = 'home' | 'calendar' | 'book' | 'more' | 'bell' | 'arrow' | 'clock' | 'check' | 'shield' | 'trash' | 'people' | 'building' | 'sun' | 'moon' | 'monitor' | 'close'

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5', calendar: 'M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2ZM8 2v4M16 2v4M3 9h18',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16M8 7h8M8 11h8', more: 'M5 12h.01M12 12h.01M19 12h.01',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z', monitor: 'M3 4h18v12H3ZM8 20h8M12 16v4', close: 'M6 6l12 12M18 6 6 18',
    building: 'M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3L6 3ZM9 21v-6h6v6',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', arrow: 'M5 12h14M13 6l6 6-6 6', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    check: 'm5 12 4 4L19 6', shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  }
  const fillIcons: IconName[] = ['people']
  const isFill = fillIcons.includes(name)
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" style={isFill ? { fill: 'currentColor', stroke: 'none' } : undefined}><path d={paths[name]} /></svg>
}
