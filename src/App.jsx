import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext.jsx';
import BottomNav from './components/navigation/BottomNav.jsx';
import Sidebar from './components/navigation/Sidebar.jsx';
import { Home, SurahList, SurahReader, HifzMode, Listen, Search, Settings } from './pages/index.jsx';
import './styles/variables.css';
import './styles/reset.css';
import './App.css';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <main className="app__main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/surah" element={<SurahList />} />
              <Route path="/surah/:id" element={<SurahReader />} />
              <Route path="/surah/:id/hifz" element={<HifzMode />} />
              <Route path="/listen" element={<Listen />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </SettingsProvider>
  );
}
