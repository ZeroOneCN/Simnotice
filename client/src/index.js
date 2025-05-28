import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 监听主题变化并在body上设置data-theme属性
const updateTheme = () => {
  const theme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', theme);
};

// 初始设置主题
updateTheme();

// 监听存储变化以实时更新主题
window.addEventListener('storage', updateTheme);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 