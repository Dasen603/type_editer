import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import AppLayout from './AppLayout.jsx';
import Projects from './pages/Projects.jsx';
import TemplateLibrary from './pages/TemplateLibrary.jsx';
import EditorPage from './pages/EditorPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<Projects />} />
        <Route path="templates" element={<TemplateLibrary />} />
        <Route path="starred" element={<PlaceholderPage title="Starred" />} />
        <Route path="upgrade" element={<PlaceholderPage title="Upgrade" />} />
        <Route path="user" element={<PlaceholderPage title="User Profile" />} />
        <Route path="contact" element={<PlaceholderPage title="Contact Support" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
      <Route path="/editor/:projectId" element={<EditorPage />} />
    </Routes>
  </BrowserRouter>
);
