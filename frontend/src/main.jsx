import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './styles/index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'Poppins, sans-serif',
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        success: {
          style: { background: '#1A5D3D', color: '#fff' },
          iconTheme: { primary: '#FAF5F0', secondary: '#1A5D3D' },
        },
        error: {
          style: { background: '#E74C3C', color: '#fff' },
        },
      }}
    />
  </React.StrictMode>
);
