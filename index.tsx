
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import QueueDisplay from './components/QueueDisplay';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isDisplayRoute = window.location.pathname.startsWith('/display');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isDisplayRoute ? <QueueDisplay /> : <App />}
  </React.StrictMode>
);
