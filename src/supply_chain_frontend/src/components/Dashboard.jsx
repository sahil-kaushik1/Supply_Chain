import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Timeline, Spin, message, Button, Modal, Form, Input, Select, Space, Alert } from 'antd';
import {
    ShoppingCartOutlined,
    TruckOutlined,
    HomeOutlined,
    ShopOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
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
    const [form] = Form.useForm();

    useEffect(() => {
        loadDashboardData();
        loadCurrentUser();

        // Set up auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadDashboardData();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadCurrentUser = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Ensure agent is ready
            await AuthService.ensureReady();

            const [productsResult, statisticsResult, usersResult] = await Promise.allSettled([
                loadProducts(),
                loadStatistics(),
                loadUsers()
            ]);

            if (productsResult.status === 'fulfilled') {
                setProducts(productsResult.value);
                await loadRecentEvents(productsResult.value.slice(0, 5));
            } else {
                console.warn('Failed to load products:', productsResult.reason);
                setProducts([]);
            }

            if (statisticsResult.status === 'fulfilled') {
                setStatistics(statisticsResult.value);
            } else {
                console.warn('Failed to load statistics:', statisticsResult.reason);
            }

            if (usersResult.status === 'fulfilled') {
                setUsers(usersResult.value);
            } else {
                console.warn('Failed to load users:', usersResult.reason);
                setUsers([]);
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError('Failed to load dashboard data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const supplyChainActor = await AuthService.getSupplyChainActor();
            const allProducts = await supplyChainActor.get_all_products();
            return Array.isArray(allProducts) ? allProducts : [];
        } catch (error) {
            console.error('Failed to load products:', error);
            return [];
        }
    };

    const loadStatistics = async () => {
        try {
            const supplyChainActor = await AuthService.getSupplyChainActor();
            const stats = await supplyChainActor.get_statistics();
            return {
                totalProducts: Number(stats[0]) || 0,
                totalEvents: Number(stats[1]) || 0,
                totalTransfers: Number(stats[2]) || 0,
            };
        } catch (error) {
            console.error('Failed to load statistics:', error);
            return { totalProducts: 0, totalEvents: 0, totalTransfers: 0 };
        }
    };

    const loadUsers = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const allUsers = await userManagementActor.get_all_users();
            return Array.isArray(allUsers) ? allUsers : [];
        } catch (error) {
            console.error('Failed to load users:', error);
            return [];
        }
    };

    const loadRecentEvents = async (productList) => {
        try {
            if (!Array.isArray(productList) || productList.length === 0) {
                setRecentEvents([]);
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            const events = [];

            for (let i = 0; i < Math.min(productList.length, 5); i++) {
                try {
                    const productEvents = await supplyChainActor.get_product_tracking_history(productList[i].id);
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

    const handleQuickCreateProduct = async (values) => {
        try {
            const supplyChainActor = await AuthService.getSupplyChainActor();
            await supplyChainActor.create_product(
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
            message.error('Failed to create product');
        }
    };

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

    const getUserRoleColor = (role) => {
        const roleMap = {
            'Supplier': 'blue',
            'Transporter': 'purple',
            'Warehouse': 'orange',
            'Retailer': 'green',
            'Admin': 'red',
        };
        return roleMap[role] || 'default';
    };

    // Safe data for charts
    const chartData = [
        { name: 'Jan', products: 65, events: 45 },
        { name: 'Feb', products: 85, events: 62 },
        { name: 'Mar', products: 78, events: 58 },
        { name: 'Apr', products: 92, events: 71 },
        { name: 'May', products: 110, events: 89 },
        { name: 'Jun', products: 125, events: 95 },
    ];

    const safeProducts = Array.isArray(products) ? products : [];
    const pieData = [
        { name: 'Created', value: safeProducts.filter(p => p?.status === 'Created').length },
        { name: 'In Warehouse', value: safeProducts.filter(p => p?.status === 'InWarehouse').length },
        { name: 'In Transit', value: safeProducts.filter(p => p?.status === 'InTransit').length },
        { name: 'Delivered', value: safeProducts.filter(p => p?.status === 'Delivered').length },
        { name: 'Sold', value: safeProducts.filter(p => p?.status === 'Sold').length },
    ];

    const roleData = [
        { name: 'Suppliers', value: users.filter(u => u?.role === 'Supplier').length },
        { name: 'Transporters', value: users.filter(u => u?.role === 'Transporter').length },
        { name: 'Warehouses', value: users.filter(u => u?.role === 'Warehouse').length },
        { name: 'Retailers', value: users.filter(u => u?.role === 'Retailer').length },
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
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category) => category || 'N/A',
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `$${price?.toFixed(2) || '0.00'}`,
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (quantity) => quantity || 0,
        },
    ];

    const userColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={getUserRoleColor(role)}>
                    {role || 'Unknown'}
                </Tag>
            ),
        },
        {
            title: 'Company',
            dataIndex: 'company_name',
            key: 'company_name',
        },
        {
            title: 'Status',
            dataIndex: 'is_verified',
            key: 'is_verified',
            render: (verified) => (
                <Tag color={verified ? 'green' : 'orange'}>
                    {verified ? 'Verified' : 'Pending'}
                </Tag>
            ),
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Supply Chain Dashboard</h1>
                <Space>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalVisible(true)}
                    >
                        Quick Create Product
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadDashboardData}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                </Space>
            </div>

            {error && (
                <Alert
                    message="Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: '24px' }}
                    action={
                        <Button size="small" danger onClick={loadDashboardData}>
                            Retry
                        </Button>
                    }
                />
            )}

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Products"
                            value={statistics.totalProducts}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                            suffix={<ArrowUpOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Events"
                            value={statistics.totalEvents}
                            prefix={<TruckOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                            suffix={<ArrowUpOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Transfers"
                            value={statistics.totalTransfers}
                            prefix={<HomeOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                            suffix={<ArrowUpOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Users"
                            value={users.length}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                            suffix={<ArrowUpOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} lg={8}>
                    <Card title="Product Status Distribution">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="User Roles Distribution">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={roleData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Activity Over Time">
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="products" stroke="#8884d8" />
                                <Line type="monotone" dataKey="events" stroke="#82ca9d" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Tables */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Recent Products">
                        <Table
                            dataSource={safeProducts.slice(0, 10)}
                            columns={productColumns}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="System Users">
                        <Table
                            dataSource={users.slice(0, 10)}
                            columns={userColumns}
                            rowKey={(record) => record.id.toString()}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>

            {/* Recent Events Timeline */}
            {recentEvents.length > 0 && (
                <Card title="Recent Events" style={{ marginTop: '24px' }}>
                    <Timeline>
                        {recentEvents.map((event, index) => (
                            <Timeline.Item
                                key={index}
                                color={index % 2 === 0 ? 'blue' : 'green'}
                            >
                                <div>
                                    <strong>{event.event_type}</strong> - {event.description}
                                    <br />
                                    <small>
                                        Product: {event.product_id} |
                                        Location: {event.location} |
                                        Time: {new Date(Number(event.timestamp) / 1000000).toLocaleString()}
                                    </small>
                                </div>
                            </Timeline.Item>
                        ))}
                    </Timeline>
                </Card>
            )}

            {/* Quick Create Product Modal */}
            <Modal
                title="Quick Create Product"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleQuickCreateProduct}
                >
                    <Form.Item
                        name="name"
                        label="Product Name"
                        rules={[{ required: true, message: 'Please enter product name' }]}
                    >
                        <Input placeholder="Enter product name" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea rows={3} placeholder="Enter product description" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="price"
                                label="Price"
                                rules={[{ required: true, message: 'Please enter price' }]}
                            >
                                <Input type="number" placeholder="0.00" prefix="$" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="quantity"
                                label="Quantity"
                                rules={[{ required: true, message: 'Please enter quantity' }]}
                            >
                                <Input type="number" placeholder="1" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="category"
                        label="Category"
                    >
                        <Select placeholder="Select category">
                            <Option value="Electronics">Electronics</Option>
                            <Option value="Food">Food</Option>
                            <Option value="Clothing">Clothing</Option>
                            <Option value="Medicine">Medicine</Option>
                            <Option value="Raw Materials">Raw Materials</Option>
                            <Option value="Other">Other</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="origin"
                        label="Origin"
                    >
                        <Input placeholder="Product origin location" />
                    </Form.Item>

                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setModalVisible(false)}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Create Product
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Dashboard;
