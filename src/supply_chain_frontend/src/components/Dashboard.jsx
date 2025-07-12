import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Timeline, Spin, message, Button, Modal, Form, Input, Select, Space, Alert, Tooltip, Descriptions } from 'antd';
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
    ArrowRightOutlined,
    EditOutlined,
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
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [healthStatus, setHealthStatus] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [form] = Form.useForm();
    const [statusForm] = Form.useForm();
    const [transferForm] = Form.useForm();

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
                const processedUsers = Array.isArray(usersData) ? usersData.map(user => ({
                    ...user,
                    role: AuthService.deserializeEnumFromCandid(user.role)
                })) : [];
                setUsers(processedUsers);
                setAvailableUsers(processedUsers);
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

    // Simplified - all users have full access (Admin powers)
    const canUserPerformAction = (action) => {
        return currentUser !== null; // All authenticated users can perform all actions
    };

    // Get available status transitions (simplified - all transitions available)
    const getAvailableStatusTransitions = (product) => {
        if (!currentUser || !product) return [];

        const transitions = [
            { value: 'InTransit', label: 'Mark as In Transit' },
            { value: 'InWarehouse', label: 'Mark as In Warehouse' },
            { value: 'Delivered', label: 'Mark as Delivered' },
            { value: 'Sold', label: 'Mark as Sold' }
        ];

        return transitions;
    };

    // Get users filtered by role for transfers
    const getUsersByRole = (role) => {
        return availableUsers.filter(user => user.role === role);
    };

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

    const handleUpdateProductStatus = async (values) => {
        try {
            const actor = await AuthService.getSupplyChainActor();
            const statusEnum = AuthService.serializeEnumForCandid(values.status);

            await AuthService.callCanisterSafely(
                Promise.resolve(actor),
                'update_product_status',
                selectedProduct.id,
                statusEnum,
                values.location || 'Unknown',
                values.notes || `Status updated to ${values.status} by Admin`
            );

            message.success('Product status updated successfully');
            setStatusModalVisible(false);
            setSelectedProduct(null);
            statusForm.resetFields();
            loadDashboardData();
        } catch (error) {
            console.error('Failed to update product status:', error);
            message.error(`Failed to update product status: ${error.message}`);
        }
    };

    const handleTransferProduct = async (values) => {
        try {
            const actor = await AuthService.getSupplyChainActor();

            await AuthService.callCanisterSafely(
                Promise.resolve(actor),
                'transfer_product',
                selectedProduct.id,
                values.to_user,
                values.transfer_type,
                values.notes || 'Product transferred by Admin'
            );

            message.success('Product transferred successfully');
            setTransferModalVisible(false);
            setSelectedProduct(null);
            transferForm.resetFields();
            loadDashboardData();
        } catch (error) {
            console.error('Failed to transfer product:', error);
            message.error(`Failed to transfer product: ${error.message}`);
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
        { name: 'Admins', value: safeUsers.filter(u => u?.role === 'Admin').length },
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
            title: 'Batch Number',
            dataIndex: 'batch_number',
            key: 'batch_number',
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
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setSelectedProduct(record);
                            setStatusModalVisible(true);
                        }}
                    >
                        Update Status
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<ArrowRightOutlined />}
                        onClick={() => {
                            setSelectedProduct(record);
                            setTransferModalVisible(true);
                        }}
                    >
                        Transfer
                    </Button>
                </Space>
            ),
        },
    ];

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                message="Dashboard Loading Error"
                description={error}
                type="error"
                showIcon
                action={
                    <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
                        Retry
                    </Button>
                }
            />
        );
    }

    return (
        <div style={{ padding: '0px' }}>
            {/* Welcome Header */}
            <Card style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                            {currentUser && `Welcome back, ${currentUser.name}! (Full Admin Access)`}
                        </h1>
                        <p style={{ margin: '8px 0 0', color: '#666' }}>
                            Manage your complete supply chain operations from suppliers to retailers
                        </p>
                    </div>
                    <Space>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setModalVisible(true)}
                        >
                            Create Product
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleRefresh}
                        >
                            Refresh
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Products"
                            value={statistics.totalProducts}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Users"
                            value={safeUsers.length}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Active Transfers"
                            value={statistics.totalTransfers}
                            prefix={<TruckOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Events Tracked"
                            value={statistics.totalEvents}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} lg={12}>
                    <Card title="Product Status Distribution" style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
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
                    <Card title="User Roles Distribution" style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={roleData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#1890ff" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Products Table and Recent Events */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title="Recent Products" extra={
                        <Button type="link" onClick={() => setModalVisible(true)}>
                            View All
                        </Button>
                    }>
                        <Table
                            dataSource={safeProducts.slice(0, 10)}
                            columns={productColumns}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Recent Events">
                        <Timeline
                            items={recentEvents.slice(0, 8).map((event, index) => ({
                                key: index,
                                children: (
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {event.event_type || 'Unknown Event'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            {event.description || 'No description'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#999' }}>
                                            {new Date(Number(event.timestamp) / 1000000).toLocaleDateString()}
                                        </div>
                                    </div>
                                ),
                                color: index === 0 ? 'green' : 'blue'
                            }))}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Create Product Modal */}
            <Modal
                title="Create New Product"
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleQuickCreateProduct}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Product Name"
                                name="name"
                                rules={[{ required: true, message: 'Please enter product name' }]}
                            >
                                <Input placeholder="Enter product name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Category"
                                name="category"
                                rules={[{ required: true, message: 'Please select category' }]}
                            >
                                <Select placeholder="Select category">
                                    <Option value="Electronics">Electronics</Option>
                                    <Option value="Food">Food</Option>
                                    <Option value="Clothing">Clothing</Option>
                                    <Option value="Medical">Medical</Option>
                                    <Option value="General">General</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Description"
                        name="description"
                    >
                        <Input.TextArea placeholder="Enter product description" rows={3} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                label="Price ($)"
                                name="price"
                                rules={[{ required: true, message: 'Please enter price' }]}
                            >
                                <Input type="number" placeholder="0.00" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Quantity"
                                name="quantity"
                                rules={[{ required: true, message: 'Please enter quantity' }]}
                            >
                                <Input type="number" placeholder="1" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Origin"
                                name="origin"
                                rules={[{ required: true, message: 'Please enter origin' }]}
                            >
                                <Input placeholder="Manufacturing location" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Batch Number"
                        name="batch_number"
                    >
                        <Input placeholder="Auto-generated if empty" />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Create Product
                            </Button>
                            <Button onClick={() => {
                                setModalVisible(false);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Update Status Modal */}
            <Modal
                title="Update Product Status"
                open={statusModalVisible}
                onCancel={() => {
                    setStatusModalVisible(false);
                    setSelectedProduct(null);
                    statusForm.resetFields();
                }}
                footer={null}
            >
                {selectedProduct && (
                    <div>
                        <Descriptions style={{ marginBottom: '20px' }}>
                            <Descriptions.Item label="Product">{selectedProduct.name}</Descriptions.Item>
                            <Descriptions.Item label="Current Status">
                                <Tag color={getStatusColor(selectedProduct.status)}>
                                    {selectedProduct.status}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Form
                            form={statusForm}
                            layout="vertical"
                            onFinish={handleUpdateProductStatus}
                        >
                            <Form.Item
                                label="New Status"
                                name="status"
                                rules={[{ required: true, message: 'Please select new status' }]}
                            >
                                <Select placeholder="Select new status">
                                    {getAvailableStatusTransitions(selectedProduct).map(transition => (
                                        <Option key={transition.value} value={transition.value}>
                                            {transition.label}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label="Location"
                                name="location"
                            >
                                <Input placeholder="Current location" />
                            </Form.Item>

                            <Form.Item
                                label="Notes"
                                name="notes"
                            >
                                <Input.TextArea placeholder="Additional notes" rows={3} />
                            </Form.Item>

                            <Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        Update Status
                                    </Button>
                                    <Button onClick={() => {
                                        setStatusModalVisible(false);
                                        setSelectedProduct(null);
                                        statusForm.resetFields();
                                    }}>
                                        Cancel
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Modal>

            {/* Transfer Product Modal */}
            <Modal
                title="Transfer Product"
                open={transferModalVisible}
                onCancel={() => {
                    setTransferModalVisible(false);
                    setSelectedProduct(null);
                    transferForm.resetFields();
                }}
                footer={null}
            >
                {selectedProduct && (
                    <div>
                        <Descriptions style={{ marginBottom: '20px' }}>
                            <Descriptions.Item label="Product">{selectedProduct.name}</Descriptions.Item>
                            <Descriptions.Item label="Current Status">
                                <Tag color={getStatusColor(selectedProduct.status)}>
                                    {selectedProduct.status}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Form
                            form={transferForm}
                            layout="vertical"
                            onFinish={handleTransferProduct}
                        >
                            <Form.Item
                                label="Transfer Type"
                                name="transfer_type"
                                rules={[{ required: true, message: 'Please select transfer type' }]}
                            >
                                <Select placeholder="Select transfer type">
                                    <Option value="TO_WAREHOUSE">To Warehouse</Option>
                                    <Option value="TO_TRANSPORTER">To Transporter</Option>
                                    <Option value="TO_RETAILER">To Retailer</Option>
                                    <Option value="INTERNAL">Internal Transfer</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label="Recipient"
                                name="to_user"
                                rules={[{ required: true, message: 'Please select recipient' }]}
                            >
                                <Select
                                    placeholder="Select recipient"
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {availableUsers.map(user => (
                                        <Option key={user.id.toString()} value={user.id.toString()}>
                                            {user.name} ({user.role})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label="Transfer Notes"
                                name="notes"
                            >
                                <Input.TextArea placeholder="Transfer notes and instructions" rows={3} />
                            </Form.Item>

                            <Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        Transfer Product
                                    </Button>
                                    <Button onClick={() => {
                                        setTransferModalVisible(false);
                                        setSelectedProduct(null);
                                        transferForm.resetFields();
                                    }}>
                                        Cancel
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Dashboard;
