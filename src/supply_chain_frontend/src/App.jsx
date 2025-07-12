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

// Error Boundary Component
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
        <div style={{ padding: '20px' }}>
          <Alert
            message="Application Error"
            description="Something went wrong. Please refresh the page or check the console for details."
            type="error"
            showIcon
            action={
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            }
          />
          {this.state.error && (
            <Card style={{ marginTop: '20px' }}>
              <Typography.Paragraph>
                <strong>Error Details:</strong><br />
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </Typography.Paragraph>
            </Card>
          )}
          <Alert
            style={{ marginTop: '20px' }}
            message="Development Setup Required"
            description={
              <div>
                <p>Make sure your local IC development environment is running:</p>
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                  {`dfx start\ndfx deploy\ndfx generate\nnpm start`}
                </pre>
                <p>And that your application is connecting to: <code>http://localhost:4943</code></p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check health status
      const health = await AuthService.healthCheck();
      setHealthStatus(health);

      if (!health.connectionOk) {
        setError('Cannot connect to IC network. Please ensure DFX is running.');
        setIsAuthenticated(false);
        return;
      }

      const isAuth = await AuthService.isAuthenticated();
      setIsAuthenticated(isAuth);

      if (isAuth) {
        const userResult = await AuthService.getCurrentUser();
        if (userResult && 'Ok' in userResult) {
          setCurrentUser(userResult.Ok);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError(`Authentication check failed: ${error.message}`);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    try {
      setAuthLoading(true);
      setError(null);

      await AuthService.login();
      await checkAuthStatus();

      if (location.pathname === '/') {
        navigate('/dashboard');
      }

      message.success('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      setError(`Login failed: ${error.message}`);
      message.error('Login failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setAuthLoading(true);
      await AuthService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      navigate('/');
      message.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      message.error('Logout failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleRetry = () => {
    setError(null);
    checkAuthStatus();
  };

  useEffect(() => {
    checkAuthStatus();

    // Set up periodic health checks
    const interval = setInterval(checkAuthStatus, 30000);
    return () => clearInterval(interval);
  }, [checkAuthStatus]);

  // Menu items for authenticated users (simplified - all access)
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
      label: 'Task Management',
    },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Profile
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

  // Loading screen
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <Typography.Text style={{ marginTop: 16 }}>
          Initializing Supply Chain Management System...
        </Typography.Text>
        {healthStatus && (
          <Typography.Text type="secondary" style={{ marginTop: 8 }}>
            Environment: {healthStatus.environment} | Host: {healthStatus.host}
          </Typography.Text>
        )}
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Connection Error"
          description={error}
          type="error"
          showIcon
          action={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRetry}>
                Retry
              </Button>
              <Button type="primary" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </Space>
          }
        />

        {healthStatus && (
          <Card style={{ marginTop: '20px' }}>
            <Typography.Title level={4}>System Status</Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Badge
                  status={healthStatus.connectionOk ? "success" : "error"}
                  text={`Connection: ${healthStatus.connectionOk ? 'OK' : 'Failed'}`}
                />
              </div>
              <div>
                <Badge
                  status={healthStatus.authenticated ? "success" : "warning"}
                  text={`Authentication: ${healthStatus.authenticated ? 'Authenticated' : 'Not Authenticated'}`}
                />
              </div>
              <div>
                <Badge
                  status={healthStatus.initialized ? "success" : "error"}
                  text={`Initialization: ${healthStatus.initialized ? 'Ready' : 'Failed'}`}
                />
              </div>
              <Typography.Text type="secondary">
                Environment: {healthStatus.environment} | Host: {healthStatus.host}
              </Typography.Text>
            </Space>
          </Card>
        )}

        <Alert
          style={{ marginTop: '20px' }}
          message="Development Setup Instructions"
          description={
            <div>
              <p>Make sure your local IC development environment is running:</p>
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                {`dfx start\ndfx deploy\ndfx generate\nnpm start`}
              </pre>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: 400, textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <ApiOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            <Title level={2} style={{ marginTop: '16px' }}>
              Supply Chain Management
            </Title>
            <Text type="secondary">
              Blockchain-powered supply chain tracking
            </Text>
          </div>

          {healthStatus && (
            <div style={{ marginBottom: '24px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Badge
                  status={healthStatus.connectionOk ? "success" : "error"}
                  text={`IC Network: ${healthStatus.connectionOk ? 'Connected' : 'Disconnected'}`}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {healthStatus.environment} mode - {healthStatus.host}
                </Text>
              </Space>
            </div>
          )}

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              size="large"
              style={{ width: '100%' }}
              loading={authLoading}
              onClick={handleLogin}
              icon={<WalletOutlined />}
            >
              Connect Wallet & Login
            </Button>

            <Button
              size="large"
              style={{ width: '100%' }}
              onClick={handleRegister}
              icon={<UserOutlined />}
            >
              Register New User
            </Button>
          </Space>

          <div style={{ marginTop: '24px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Supports Internet Identity and Plug Wallet
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  // Main application
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
          <div style={{
            height: '32px',
            margin: '16px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? '14px' : '16px',
            fontWeight: 'bold'
          }}>
            {collapsed ? 'SCM' : 'Supply Chain'}
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
          <Header style={{
            padding: '0 16px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px', width: 64, height: 64 }}
              />

              {healthStatus && !healthStatus.connectionOk && (
                <Alert
                  message="Connection Issue"
                  type="warning"
                  showIcon
                  style={{ marginLeft: '16px' }}
                />
              )}
            </div>

            <Space>
              {healthStatus && (
                <Badge
                  status={healthStatus.connectionOk ? "success" : "error"}
                  text={healthStatus.environment}
                />
              )}

              <Dropdown overlay={userMenu} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  <span>
                    {currentUser ? currentUser.name : 'User'} (Admin)
                  </span>
                </Space>
              </Dropdown>
            </Space>
          </Header>

          <Content style={{
            margin: '16px',
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 112px)'
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
    </ErrorBoundary>
  );
};

export default App;
