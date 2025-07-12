import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Timeline, Spin, message, Button, Modal, Form, Input, Select, Space, Alert, Tooltip } from 'antd';
import {
    ShoppingCartOutlined,
    TruckOutlined,
    HomeOutlined,
    ShopOutlined,
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import AuthService from '../services/AuthService';

const { Option } = Select;

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [statistics, setStatistics] = useState({
        totalProducts: 0,
        totalEvents: 0,
        totalTransfers: 0,
    });
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [healthStatus, setHealthStatus] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [form] = Form.useForm();

    const loadDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const health = await AuthService.healthCheck();
            setHealthStatus(health);

            if (!health.authenticated) {
                setError('Not authenticated. Please login first.');
                return;
            }

            if (!health.connectionOk) {
                setError('Cannot connect to IC network. Please check your connection.');
                return;
            }

            const results = await Promise.allSettled([
                loadProductsData(),
                loadUsersData(),
                loadStatisticsData()
            ]);

            if (results[0].status === 'fulfilled') {
                const productsData = results[0].value;
                setProducts(Array.isArray(productsData) ? productsData : []);
                await loadRecentEventsData(productsData.slice(0, 5));
            } else {
                console.warn('Failed to load products:', results[0].reason);
                setProducts([]);
            }

            if (results[1].status === 'fulfilled') {
                const usersData = results[1].value;
                // FIXED: Properly deserialize enum data
                const processedUsers = Array.isArray(usersData) ? usersData.map(user => ({
                    ...user,
                    role: AuthService.deserializeEnumFromCandid(user.role)
                })) : [];
                setUsers(processedUsers);
            } else {
                console.warn('Failed to load users:', results[1].reason);
                setUsers([]);
            }

            if (results[2].status === 'fulfilled') {
                setStatistics(results[2].value);
            } else {
                console.warn('Failed to load statistics:', results[2].reason);
                setStatistics({ totalProducts: 0, totalEvents: 0, totalTransfers: 0 });
            }

            setRetryCount(0);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError(`Failed to load dashboard data: ${error.message}`);

            if (retryCount < 3) {
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    loadDashboardData();
                }, 2000 * (retryCount + 1));
            }
        } finally {
            setLoading(false);
        }
    }, [retryCount]);

    const loadProductsData = async () => {
        try {
            const actor = await AuthService.getSupplyChainActor();
            const result = await AuthService.callCanisterSafely(
                Promise.resolve(actor),
                'get_all_products'
            );

            // FIXED: Properly handle product status enums
            const processedProducts = Array.isArray(result) ? result.map(product => ({
                ...product,
                status: AuthService.deserializeEnumFromCandid(product.status)
            })) : [];

            return processedProducts;
        } catch (error) {
            console.error('Failed to load products:', error);
            throw error;
        }
    };

    const loadUsersData = async () => {
        try {
            const actor = await AuthService.getUserManagementActor();
            const result = await AuthService.callCanisterSafely(
                Promise.resolve(actor),
                'get_all_users'
            );
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('Failed to load users:', error);
            throw error;
        }
    };

    const loadStatisticsData = async () => {
        try {
            const actor = await AuthService.getSupplyChainActor();
            const result = await AuthService.callCanisterSafely(
                Promise.resolve(actor),
                'get_statistics'
            );
            return {
                totalProducts: Number(result[0]) || 0,
                totalEvents: Number(result[1]) || 0,
                totalTransfers: Number(result[2]) || 0,
            };
        } catch (error) {
            console.error('Failed to load statistics:', error);
            throw error;
        }
    };

    const loadRecentEventsData = async (productList) => {
        try {
            if (!Array.isArray(productList) || productList.length === 0) {
                setRecentEvents([]);
                return;
            }

            const actor = await AuthService.getSupplyChainActor();
            const events = [];

            for (let i = 0; i < Math.min(productList.length, 5); i++) {
                try {
                    const productEvents = await AuthService.callCanisterSafely(
                        Promise.resolve(actor),
                        'get_product_tracking_history',
                        productList[i].id
                    );
                    if (Array.isArray(productEvents)) {
                        events.push(...productEvents);
                    }
                } catch (error) {
                    console.warn(`Failed to load events for product ${productList[i].id}:`, error);
                }
            }

            const sortedEvents = events
                .filter(event => event && event.timestamp)
                .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                .slice(0, 10);

            setRecentEvents(sortedEvents);
        } catch (error) {
            console.error('Failed to load recent events:', error);
            setRecentEvents([]);
        }
    };

    const loadCurrentUser = useCallback(async () => {
        try {
            const result = await AuthService.getCurrentUser();
            if (result && 'Ok' in result) {
                setCurrentUser(result.Ok);
            } else {
                setCurrentUser(null);
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
            setCurrentUser(null);
        }
    }, []);

    const handleQuickCreateProduct = async (values) => {
        try {
            const actor = await AuthService.getSupplyChainActor();

            await AuthService.callCanisterSafely(
                Promise.resolve(actor),
                'create_product',
                values.name,
                values.description || '',
                values.batch_number || `BATCH-${Date.now()}`,
                [],
                parseFloat(values.price) || 0,
                parseInt(values.quantity) || 1,
                values.category || 'General',
                values.origin || 'Unknown',
                []
            );

            message.success('Product created successfully');
            setModalVisible(false);
            form.resetFields();
            loadDashboardData();
        } catch (error) {
            console.error('Failed to create product:', error);
            message.error(`Failed to create product: ${error.message}`);
        }
    };

    const handleRefresh = () => {
        setRetryCount(0);
        loadDashboardData();
    };

    useEffect(() => {
        loadDashboardData();
        loadCurrentUser();

        const interval = setInterval(() => {
            loadDashboardData();
        }, 30000);

        return () => clearInterval(interval);
    }, [loadDashboardData, loadCurrentUser]);

    const getStatusColor = (status) => {
        const statusMap = {
            'Created': 'blue',
            'InWarehouse': 'orange',
            'InTransit': 'purple',
            'Delivered': 'green',
            'Sold': 'cyan',
            'Lost': 'red',
            'Damaged': 'red',
        };
        return statusMap[status] || 'default';
    };

    const canUserCreateProduct = () => {
        return currentUser && ['Admin', 'Supplier'].includes(currentUser.role);
    };

    const safeProducts = Array.isArray(products) ? products : [];
    const safeUsers = Array.isArray(users) ? users : [];

    const pieData = [
        { name: 'Created', value: safeProducts.filter(p => p?.status === 'Created').length },
        { name: 'In Warehouse', value: safeProducts.filter(p => p?.status === 'InWarehouse').length },
        { name: 'In Transit', value: safeProducts.filter(p => p?.status === 'InTransit').length },
        { name: 'Delivered', value: safeProducts.filter(p => p?.status === 'Delivered').length },
        { name: 'Sold', value: safeProducts.filter(p => p?.status === 'Sold').length },
    ];

    const roleData = [
        { name: 'Suppliers', value: safeUsers.filter(u => u?.role === 'Supplier').length },
        { name: 'Transporters', value: safeUsers.filter(u => u?.role === 'Transporter').length },
        { name: 'Warehouses', value: safeUsers.filter(u => u?.role === 'Warehouse').length },
        { name: 'Retailers', value: safeUsers.filter(u => u?.role === 'Retailer').length },
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    const productColumns = [
        {
            title: 'Product Name',
            dataIndex: 'name',
            key: 'name',
            render: (name) => name || 'Unknown Product',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status || 'Unknown'}
                </Tag>
            ),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `$${(price || 0).toFixed(2)}`,
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (quantity) => quantity || 0,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category) => category || 'General',
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Spin size="large" />
                <span style={{ marginLeft: 16 }}>Loading dashboard data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24 }}>
                <Alert
                    message="Dashboard Error"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Space>
                            <Button onClick={handleRefresh} type="primary">
                                Retry
                            </Button>
                        </Space>
                    }
                />
                {healthStatus && (
                    <Card title="Connection Status" style={{ marginTop: 16 }}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Authenticated"
                                    value={healthStatus.authenticated ? 'Yes' : 'No'}
                                    prefix={healthStatus.authenticated ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                                    valueStyle={{ color: healthStatus.authenticated ? '#3f8600' : '#cf1322' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Connection"
                                    value={healthStatus.connectionOk ? 'OK' : 'Failed'}
                                    prefix={healthStatus.connectionOk ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                                    valueStyle={{ color: healthStatus.connectionOk ? '#3f8600' : '#cf1322' }}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Environment"
                                    value={healthStatus.environment}
                                    prefix={<ExclamationCircleOutlined />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Host"
                                    value={healthStatus.host}
                                    prefix={<ExclamationCircleOutlined />}
                                />
                            </Col>
                        </Row>
                    </Card>
                )}
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <h1>Supply Chain Dashboard</h1>
                    {currentUser && (
                        <p>Welcome back, {currentUser.name}! ({currentUser.role})</p>
                    )}
                </Col>
                <Col>
                    <Space>
                        <Tooltip title="Refresh Data">
                            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
                        </Tooltip>
                        {canUserCreateProduct() && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setModalVisible(true)}
                            >
                                Quick Create Product
                            </Button>
                        )}
                    </Space>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Products"
                            value={statistics.totalProducts}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Active Users"
                            value={safeUsers.length}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Events"
                            value={statistics.totalEvents}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Transfers"
                            value={statistics.totalTransfers}
                            prefix={<TruckOutlined />}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="Product Status Distribution">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="User Role Distribution">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={roleData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} lg={14}>
                    <Card title="Recent Products" extra={<Button type="link">View All</Button>}>
                        <Table
                            dataSource={safeProducts.slice(0, 5)}
                            columns={productColumns}
                            pagination={false}
                            size="small"
                            rowKey="id"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card title="Recent Events" extra={<Button type="link">View All</Button>}>
                        <Timeline size="small">
                            {recentEvents.map((event, index) => (
                                <Timeline.Item
                                    key={index}
                                    color={event.event_type === 'PRODUCT_CREATED' ? 'green' : 'blue'}
                                >
                                    <div>
                                        <strong>{event.event_type}</strong>
                                        <br />
                                        {event.description}
                                        <br />
                                        <small>{new Date(Number(event.timestamp) / 1000000).toLocaleString()}</small>
                                    </div>
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Quick Create Product"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleQuickCreateProduct} layout="vertical">
                    <Form.Item
                        label="Product Name"
                        name="name"
                        rules={[{ required: true, message: 'Please enter product name' }]}
                    >
                        <Input placeholder="Enter product name" />
                    </Form.Item>
                    <Form.Item
                        label="Description"
                        name="description"
                    >
                        <Input.TextArea placeholder="Enter description" rows={3} />
                    </Form.Item>
                    <Form.Item
                        label="Price"
                        name="price"
                        rules={[{ required: true, message: 'Please enter price' }]}
                    >
                        <Input type="number" placeholder="Enter price" prefix="$" />
                    </Form.Item>
                    <Form.Item
                        label="Quantity"
                        name="quantity"
                        rules={[{ required: true, message: 'Please enter quantity' }]}
                    >
                        <Input type="number" placeholder="Enter quantity" />
                    </Form.Item>
                    <Form.Item
                        label="Category"
                        name="category"
                    >
                        <Select placeholder="Select category">
                            <Option value="Electronics">Electronics</Option>
                            <Option value="Food">Food</Option>
                            <Option value="Clothing">Clothing</Option>
                            <Option value="Books">Books</Option>
                            <Option value="General">General</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        label="Origin"
                        name="origin"
                    >
                        <Input placeholder="Enter origin location" />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Create Product
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Dashboard;
