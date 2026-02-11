import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, ConfigProvider } from 'antd';
import SimCardList from './pages/SimCardList';
import SimCardForm from './pages/SimCardForm';
import Settings from './pages/Settings';
import 'antd/dist/reset.css';

const { Header, Content } = Layout;

// Logo SVG 组件
const SimnoticeLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="10" y="12" width="16" height="8" rx="1" fill="currentColor" />
    <circle cx="18" cy="24" r="2" fill="currentColor" />
  </svg>
);

function App() {
  return (
    <ConfigProvider
      theme={{
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