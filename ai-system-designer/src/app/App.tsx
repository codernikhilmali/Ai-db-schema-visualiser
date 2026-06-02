import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout'
import LandingPage from '../components/LandingPage/LandingPage'
import { authService } from '../services/authService';

function App() {    
  const [showEditor, setShowEditor] = useState(() => authService.isAuthenticated());

  if (!showEditor) {
    return <LandingPage onStart={() => setShowEditor(true)} />;
  }

  return (
    <MainLayout />
  )
}

export default App