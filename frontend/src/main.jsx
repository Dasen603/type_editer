import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import AppLayout from './AppLayout.jsx';
import Projects from './pages/Projects.jsx';
import Start from './pages/Start.jsx';
import EditorPage from './pages/EditorPage.jsx';
import Starred from './pages/Starred.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/start" replace />} />
        <Route path="start" element={<Start />} />
        <Route path="projects" element={<Projects />} />
        <Route path="starred" element={<Starred />} />
        <Route path="upgrade" element={<PlaceholderPage title="Upgrade" />} />
        <Route path="user" element={<PlaceholderPage title="User Profile" />} />
        <Route path="contact" element={<PlaceholderPage title="Contact Support" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
      <Route path="/editor/:projectId" element={<EditorPage />} />
    </Routes>
  </BrowserRouter>
);
