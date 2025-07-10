import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, message, Avatar, Dropdown, Space, Spin, Alert } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  ShopOutlined,
  HomeOutlined,
  StarOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  WalletOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CalendarOutlined,
  SettingOutlined,
} from '@ant-design/icons';

// Import components
import Dashboard from './components/Dashboard';
import Suppliers from './components/Suppliers';
import Transporters from './components/Transporters';
import Warehouses from './components/Warehouses';
import Retailers from './components/Retailers';
import Ratings from './components/Ratings';
import Reports from './components/Reports';
import TaskManagement from './components/TaskManagement';
import UserRegistration from './components/UserRegistration';

// Import AuthService
import AuthService from './services/AuthService';

const { Header, Sider, Content } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      // Add a delay to ensure environment is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const isAuth = await AuthService.isAuthenticated();
      setAuthenticated(isAuth);

      if (isAuth) {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);

        if (!user) {
          // User is authenticated but not registered
          navigate('/register');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError('Failed to check authentication status. Please ensure DFX is running.');
      setAuthenticated(false);

      // Retry mechanism
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkAuthStatus();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const success = await AuthService.login();
      if (success) {
        setAuthenticated(true);
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);

        if (user) {
          message.success('Login successful!');
          navigate('/dashboard');
        } else {
          message.info('Please complete your registration');
          navigate('/register');
        }
      } else {
        setAuthError('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);

      if (error.message.includes('Content Security Policy') ||
        error.message.includes('connect-src') ||
        error.message.includes('127.0.0.1')) {
        setAuthError('CSP Error: Please ensure your development server allows connections to localhost. Try using localhost:4943 instead of 127.0.0.1:4943');
      } else if (error.message.includes('fetch') || error.message.includes('connection')) {
        setAuthError('Cannot connect to local development environment. Please ensure DFX is running with: dfx start');
      } else {
        setAuthError('Login failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      setAuthenticated(false);
      setCurrentUser(null);
      setAuthError(null);
      setRetryCount(0);
      message.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Logout failed');
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    checkAuthStatus();
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/suppliers',
      icon: <ShoppingCartOutlined />,
      label: 'Suppliers',
    },
    {
      key: '/transporters',
      icon: <TruckOutlined />,
      label: 'Transporters',
    },
    {
      key: '/warehouses',
      icon: <HomeOutlined />,
      label: 'Warehouses',
    },
    {
      key: '/retailers',
      icon: <ShopOutlined />,
      label: 'Retailers',
    },
    {
      key: '/ratings',
      icon: <StarOutlined />,
      label: 'Ratings',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/tasks',
      icon: <CalendarOutlined />,
      label: 'Tasks',
    },
  ];

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        {currentUser?.name || 'Profile'}
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Settings
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <Spin size="large" />
        <p>Loading Supply Chain Management System...</p>
        {retryCount > 0 && <p>Retry attempt: {retryCount}/3</p>}
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{ color: '#fff', marginBottom: '20px' }}>
            Supply Chain Management System
          </h1>
          <p style={{ color: '#fff', marginBottom: '30px' }}>
            Connect your wallet to access the decentralized supply chain platform
          </p>

          {authError && (
            <Alert
              message="Connection Error"
              description={authError}
              type="error"
              style={{ marginBottom: '20px' }}
              showIcon
              action={
                <Button size="small" danger onClick={handleRetry}>
                  Retry
                </Button>
              }
            />
          )}

          <Button
            type="primary"
            size="large"
            icon={<WalletOutlined />}
            onClick={handleLogin}
            loading={loading}
            style={{ width: '100%', marginBottom: '10px' }}
          >
            Connect Wallet
          </Button>

          <div style={{ marginTop: '20px', fontSize: '12px', color: '#ccc' }}>
            <p>Supports Plug Wallet and Internet Identity</p>
            <p>Make sure DFX is running: <code>dfx start</code></p>
            <p>Access via: <code>http://localhost:4943</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{
          padding: '16px',
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h3 style={{ color: '#fff', margin: 0 }}>
            {collapsed ? 'SCM' : 'Supply Chain'}
          </h3>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 16px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          />

          <Space>
            <span>Welcome, {currentUser?.name || 'User'}</span>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: '24px 16px',
          padding: 24,
          minHeight: 280,
          background: '#fff'
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/transporters" element={<Transporters />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/retailers" element={<Retailers />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/register" element={<UserRegistration />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
