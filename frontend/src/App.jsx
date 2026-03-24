import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/Toast/Toast';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;