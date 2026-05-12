import { NavLink } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'home', icon: '🏠' },
  { to: '/surah', label: 'surahs', icon: '📖' },
  { to: '/listen', label: 'listen', icon: '🎧' },
  { to: '/search', label: 'search', icon: '🔍' },
  { to: '/settings', label: 'settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { t } = useSettings();

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <span className="sidebar__logo-arabic">القرآن</span>
        <span className="sidebar__logo-text">Qur'on</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar__item${isActive ? ' active' : ''}`}
          >
            <span className="sidebar__icon">{icon}</span>
            <span className="sidebar__label">{t.nav[label]}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
