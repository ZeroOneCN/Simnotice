import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Switch, ConfigProvider, theme } from 'antd';
import SimCardList from './pages/SimCardList';
import SimCardForm from './pages/SimCardForm';
import Settings from './pages/Settings';
import 'antd/dist/reset.css';

const { Header, Content } = Layout;

// SVG 图标组件
const LightModeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" />
    <path d="M12 1V3M12 21V23M23 12H21M3 12H1M20.071 3.929L18.657 5.343M5.343 18.657L3.929 20.071M20.071 20.071L18.657 18.657M5.343 5.343L3.929 3.929" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const DarkModeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.53 15.93C20.07 16.7 18.39 17.13 16.6 17.13C11.98 17.13 8.25 13.39 8.25 8.77C8.25 7.23 8.69 5.8 9.4 4.56C5.48 5.82 2.72 9.49 2.72 13.85C2.72 19.22 7.04 23.54 12.4 23.54C16.32 23.54 19.66 20.54 21.53 15.93Z" />
  </svg>
);

// Logo SVG 组件
const SimnoticeLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="10" y="12" width="16" height="8" rx="1" fill="currentColor" />
    <circle cx="18" cy="24" r="2" fill="currentColor" />
  </svg>
);

function App() {
  // 暗黑模式状态
  const [darkMode, setDarkMode] = useState(false);
  
  // 初始化时从localStorage获取主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);
  
  // 切换暗黑模式 - 使用CSS变量实现立即切换
  const toggleDarkMode = (checked) => {
    // 立即更新状态
    setDarkMode(checked);
    const theme = checked ? 'dark' : 'light';
    
    // 更新localStorage
    localStorage.setItem('theme', theme);
    
    // 更新HTML属性
    document.documentElement.setAttribute('data-theme', theme);
    
    // 更新浏览器标签栏颜色
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', checked ? '#141414' : '#1890ff');
    }
    
    // 触发storage事件以更新其他组件
    window.dispatchEvent(new Event('storage'));
  };

  // 主题配置
  const { defaultAlgorithm, darkAlgorithm } = theme;

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <Router>
        <Layout className="layout" style={{ minHeight: '100vh' }}>
          <Header 
            style={{ 
              padding: '0 20px',
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div className="logo" style={{ lineHeight: '64px', display: 'flex', alignItems: 'center' }}>
              <SimnoticeLogo />
              <span style={{ marginLeft: '10px' }}>Simnotice</span>
            </div>
            <Menu
              mode="horizontal"
              defaultSelectedKeys={['1']}
              style={{ border: 'none', flex: '1' }}
              items={[
                {
                  key: '1',
                  label: <Link to="/">号卡管理</Link>,
                },
                {
                  key: '2',
                  label: <Link to="/settings">系统设置</Link>,
                },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checkedChildren={<DarkModeIcon />}
                unCheckedChildren={<LightModeIcon />}
                checked={darkMode}
                onChange={toggleDarkMode}
              />
            </div>
          </Header>
          <Content className="container" style={{ padding: '20px 50px', marginTop: 20 }}>
            <div className="site-layout-content" style={{ 
              padding: 24, 
              minHeight: 380, 
              borderRadius: '8px',
            }}>
              <Routes>
                <Route path="/" element={<SimCardList />} />
                <Route path="/sim/add" element={<SimCardForm />} />
                <Route path="/sim/edit/:id" element={<SimCardForm />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App; 