import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, message, Avatar, Dropdown, Space, Spin, Alert, Card, Typography, Badge } from 'antd';
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
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ApiOutlined,
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
const { Title, Text } = Typography;

// CRITICAL FIX: Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <Alert
            message="Application Error"
            description="Something went wrong. Please refresh the page."
            type="error"
            showIcon
            action={
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            }
          />
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: 20 }}>
              <summary>Error Details (Development Only)</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [healthStatus, setHealthStatus] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced authentication check with health monitoring
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const health = await AuthService.healthCheck();
      setHealthStatus(health);

      console.log('🔍 Health check result:', health);

      if (health.error) {
        setAuthError(`System Error: ${health.error}`);
        setAuthenticated(false);
        return;
      }

      if (!health.connectionOk) {
        setConnectionStatus('disconnected');
        setAuthError('Cannot connect to IC network. Please ensure DFX is running on port 4943.');
        setAuthenticated(false);
        return;
      }

      setConnectionStatus('connected');
      setAuthenticated(health.authenticated);

      if (health.authenticated) {
        try {
          const result = await AuthService.getCurrentUser();
          if (result && 'Ok' in result) {
            // FIXED: Properly handle user data with enum deserialization
            const user = result.Ok;
            setCurrentUser(user);
            if (location.pathname === '/') {
              navigate('/dashboard');
            }
          } else {
            setCurrentUser(null);
            if (location.pathname !== '/register') {
              navigate('/register');
            }
          }
        } catch (userError) {
          console.warn('Failed to get current user:', userError);
          setCurrentUser(null);
        }
      }

      setRetryCount(0);
    } catch (error) {
      console.error('Auth check failed:', error);

      let errorMessage = 'Authentication check failed.';

      if (error.message.includes('certificate') || error.message.includes('Certificate')) {
        errorMessage = 'Certificate verification failed. Please ensure DFX is running with "dfx start".';
      } else if (error.message.includes('fetchRootKey') || error.message.includes('root key')) {
        errorMessage = 'Certificate error: Please ensure DFX is running correctly.';
      } else if (error.message.includes('Connection refused') || error.message.includes('fetch')) {
        errorMessage = 'Connection error: Please ensure DFX is running on port 4943.';
      } else if (error.message.includes('Agent') || error.message.includes('agent')) {
        errorMessage = 'Agent error: Please refresh the page and try again.';
      }

      setAuthError(errorMessage);
      setAuthenticated(false);
      setConnectionStatus('error');

      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkAuthStatus();
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount, navigate, location.pathname]);

  const handleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const health = await AuthService.healthCheck();
      if (!health.connectionOk) {
        setAuthError('Cannot connect to IC network. Please ensure DFX is running.');
        setLoading(false);
        return;
      }

      const success = await AuthService.login();
      if (success) {
        setAuthenticated(true);

        const result = await AuthService.getCurrentUser();
        if (result && 'Ok' in result) {
          const user = result.Ok;
          setCurrentUser(user);
          message.success('Login successful!');
          navigate('/dashboard');
        } else {
          setCurrentUser(null);
          message.info('Please complete your registration');
          navigate('/register');
        }
      } else {
        setAuthError('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please try again.';

      if (error.message.includes('certificate') || error.message.includes('Certificate')) {
        errorMessage = 'Certificate verification failed. Please ensure DFX is running.';
      } else if (error.message.includes('fetchRootKey') || error.message.includes('root key')) {
        errorMessage = 'Certificate error: Please restart DFX with "dfx start --clean".';
      } else if (error.message.includes('Agent') || error.message.includes('agent')) {
        errorMessage = 'Agent configuration error: Please refresh the page and try again.';
      } else if (error.message.includes('rejected') || error.message.includes('User')) {
        errorMessage = 'Login was cancelled by user.';
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Network error: Please check your connection and try again.';
      }

      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await AuthService.logout();
      setAuthenticated(false);
      setCurrentUser(null);
      setAuthError(null);
      setRetryCount(0);
      setConnectionStatus('checking');
      setHealthStatus(null);
      message.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Logout failed');
    }
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

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

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'green';
      case 'disconnected': return 'red';
      case 'error': return 'red';
      default: return 'orange';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return 'Checking...';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
        <span style={{ marginLeft: 16 }}>Loading...</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: 20 }}>
        <Card style={{ maxWidth: 800, width: '100%' }}>
          <Alert
            message="Connection Error"
            description={authError}
            type="error"
            showIcon
            action={
              <Space>
                <Button onClick={handleRetry} type="primary">
                  Retry
                </Button>
                <Button onClick={handleLogin}>
                  Login
                </Button>
              </Space>
            }
          />

          {healthStatus && (
            <div style={{ marginTop: 20 }}>
              <Title level={4}>System Status</Title>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {healthStatus.authenticated ? <CheckCircleOutlined style={{ color: 'green' }} /> : <CloseCircleOutlined style={{ color: 'red' }} />}
                    <span>Authentication: {healthStatus.authenticated ? 'OK' : 'Failed'}</span>
                  </div>
                </Card>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {healthStatus.connectionOk ? <CheckCircleOutlined style={{ color: 'green' }} /> : <CloseCircleOutlined style={{ color: 'red' }} />}
                    <span>Connection: {healthStatus.connectionOk ? 'OK' : 'Failed'}</span>
                  </div>
                </Card>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ApiOutlined />
                    <span>Environment: {healthStatus.environment}</span>
                  </div>
                </Card>
                <Card size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ExclamationCircleOutlined />
                    <span>Host: {healthStatus.host}</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Title level={4}>Local Development Setup</Title>
            <Text>
              Please ensure your local IC development environment is running:
            </Text>
            <pre style={{ backgroundColor: '#f5f5f5', padding: 10, marginTop: 10, borderRadius: 4 }}>
              dfx start{'\n'}
              dfx deploy{'\n'}
              dfx generate{'\n'}
              npm start
            </pre>
            <Text>
              The application should connect to: <code>http://localhost:4943</code>
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Card style={{ maxWidth: 400, width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>Supply Chain Management</Title>
            <Text>Please connect your wallet to continue</Text>
            <div style={{ marginTop: 20 }}>
              <Button
                type="primary"
                size="large"
                icon={<WalletOutlined />}
                onClick={handleLogin}
                loading={loading}
              >
                Connect Wallet
              </Button>
            </div>
            {healthStatus && (
              <div style={{ marginTop: 20, textAlign: 'left' }}>
                <Title level={5}>System Status</Title>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Connection:</span>
                  <Badge status={getConnectionStatusColor()} text={getConnectionStatusText()} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Environment:</span>
                  <span>{healthStatus.environment}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            background: '#001529',
          }}
        >
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              {collapsed ? 'SCM' : 'Supply Chain'}
            </Title>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  width: 64,
                  height: 64,
                }}
              />
              <Badge
                status={getConnectionStatusColor()}
                text={getConnectionStatusText()}
                style={{ marginLeft: 16 }}
              />
            </div>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                title="Refresh Connection"
              />
              {currentUser && (
                <Dropdown
                  menu={{
                    items: userMenuItems,
                  }}
                  placement="bottomRight"
                >
                  <Space style={{ cursor: 'pointer' }}>
                    <Avatar icon={<UserOutlined />} />
                    <span>{currentUser.name}</span>
                    <Badge
                      status={currentUser.is_verified ? 'success' : 'warning'}
                      text={currentUser.is_verified ? 'Verified' : 'Unverified'}
                    />
                  </Space>
                </Dropdown>
              )}
            </Space>
          </Header>
          <Content style={{ margin: '16px', padding: 24, background: '#fff', minHeight: 280 }}>
            <ErrorBoundary>
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
            </ErrorBoundary>
          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
};

export default App;
