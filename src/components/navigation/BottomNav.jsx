import { NavLink } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'home', icon: '🏠' },
  { to: '/surah', label: 'surahs', icon: '📖' },
  { to: '/listen', label: 'listen', icon: '🎧' },
  { to: '/search', label: 'search', icon: '🔍' },
  { to: '/settings', label: 'settings', icon: '⚙️' },
];

export default function BottomNav() {
  const { t } = useSettings();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav__icon">{icon}</span>
          <span className="bottom-nav__label">{t.nav[label]}</span>
        </NavLink>
      ))}
    </nav>
  );
}
