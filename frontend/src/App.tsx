import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { CreditCard, Settings, Menu, X, Smartphone } from 'lucide-react';
import { useState } from 'react';

import SimCardList from '@/pages/SimCardList';
import SimCardForm from '@/pages/SimCardForm';
import SettingsPage from '@/pages/Settings';

function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: '号卡管理', icon: Smartphone },
    { to: '/settings', label: '系统设置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-primary" />
            <span className="font-semibold text-lg">SIM卡管理系统</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {link.icon && <link.icon className="h-4 w-4 mr-2" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-background">
            <div className="container mx-auto px-4 py-2 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.icon && <link.icon className="h-4 w-4 mr-3" />}
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<SimCardList />} />
          <Route path="/sim/add" element={<SimCardForm id={null} carriers={[]} onSuccess={() => {}} onCancel={() => {}} />} />
          <Route path="/sim/edit/:id" element={<SimCardForm id={null} carriers={[]} onSuccess={() => {}} onCancel={() => {}} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          SIM卡管理系统 © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;