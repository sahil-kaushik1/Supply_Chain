import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Modal, Row, Col, Statistic, Progress, Rate, Form, Input, Select, message, Space, Descriptions, Spin } from 'antd';
import { TruckOutlined, ClockCircleOutlined, CheckCircleOutlined, StarOutlined, EditOutlined, ArrowRightOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;
const { TextArea } = Input;

const Transporters = () => {
    const [loading, setLoading] = useState(true);
    const [transporters, setTransporters] = useState([]);
    const [products, setProducts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [ratings, setRatings] = useState([]);
    const [performanceMetrics, setPerformanceMetrics] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [statusForm] = Form.useForm();
    const [transferForm] = Form.useForm();

    useEffect(() => {
        loadTransporters();
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const result = await AuthService.getCurrentUser();
            if (result && 'Ok' in result) {
                setCurrentUser(result.Ok);
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    };

    const loadTransporters = async () => {
        try {
            setLoading(true);

            const [transportersResult, productsResult, usersResult] = await Promise.allSettled([
                loadTransportersData(),
                loadProductsData(),
                loadAllUsers()
            ]);

            // Handle transporters
            if (transportersResult.status === 'fulfilled' && Array.isArray(transportersResult.value)) {
                setTransporters(transportersResult.value);
            } else {
                console.warn('Failed to load transporters:', transportersResult.reason);
                setTransporters([]);
            }

            // Handle products
            if (productsResult.status === 'fulfilled' && Array.isArray(productsResult.value)) {
                const processedProducts = productsResult.value.map(product => ({
                    ...product,
                    status: AuthService.deserializeEnumFromCandid(product.status)
                }));
                setProducts(processedProducts);
            } else {
                console.warn('Failed to load products:', productsResult.reason);
                setProducts([]);
            }

            // Handle users
            if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
                const processedUsers = usersResult.value.map(user => ({
                    ...user,
                    role: AuthService.deserializeEnumFromCandid(user.role)
                }));
                setAvailableUsers(processedUsers);
            } else {
                console.warn('Failed to load users:', usersResult.reason);
                setAvailableUsers([]);
            }

            // Load additional data with error handling
            try {
                const ratingActor = await AuthService.getRatingActor();
                const ratingsData = await ratingActor.get_top_rated_users(100);
                setRatings(Array.isArray(ratingsData) ? ratingsData : []);
            } catch (error) {
                console.warn('Failed to load ratings:', error);
                setRatings([]);
            }

            try {
                const reportingActor = await AuthService.getReportingActor();
                const metricsData = await reportingActor.get_all_performance_metrics();
                setPerformanceMetrics(Array.isArray(metricsData) ? metricsData : []);
            } catch (error) {
                console.warn('Failed to load performance metrics:', error);
                setPerformanceMetrics([]);
            }

        } catch (error) {
            console.error('Failed to load transporters:', error);
            message.error('Failed to load transporters data');
        } finally {
            setLoading(false);
        }
    };

    const loadTransportersData = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const transportersData = await userManagementActor.get_users_by_role(
                AuthService.serializeEnumForCandid('Transporter')
            );
            return Array.isArray(transportersData) ? transportersData.map(transporter => ({
                ...transporter,
                role: AuthService.deserializeEnumFromCandid(transporter.role)
            })) : [];
        } catch (error) {
            console.error('Failed to load transporters data:', error);
            return [];
        }
    };

    const loadProductsData = async () => {
        try {
            const supplyChainActor = await AuthService.getSupplyChainActor();
            const allProducts = await supplyChainActor.get_all_products();
            return Array.isArray(allProducts) ? allProducts : [];
        } catch (error) {
            console.error('Failed to load products data:', error);
            return [];
        }
    };

    const loadAllUsers = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const allUsers = await userManagementActor.get_all_users();
            return Array.isArray(allUsers) ? allUsers : [];
        } catch (error) {
            console.error('Failed to load users data:', error);
            return [];
        }
    };

    const canUserPerformAction = (action, product) => {
        if (!currentUser) return false;
        const userRole = currentUser.role;

        switch (action) {
            case 'mark_in_transit':
                return (userRole === 'Admin' || userRole === 'Transporter') &&
                    (product?.current_owner?.toString() === currentUser?.id?.toString() ||
                        product?.status === 'Created' || product?.status === 'InWarehouse');
            case 'mark_delivered':
                return (userRole === 'Admin' || userRole === 'Transporter') &&
                    product?.current_owner?.toString() === currentUser?.id?.toString() &&
                    product?.status === 'InTransit';
            case 'transfer_product':
                return (userRole === 'Admin' || userRole === 'Transporter') &&
                    product?.current_owner?.toString() === currentUser?.id?.toString();
            case 'accept_transfer':
                return userRole === 'Transporter' &&
                    (product?.status === 'Created' || product?.status === 'InWarehouse');
            default:
                return false;
        }
    };

    const getTransporterMetrics = (transporterId) => {
        const metrics = performanceMetrics.find(m =>
            m.user_id.toString() === transporterId.toString()
        );
        return metrics || {
            total_transactions: 0,
            successful_transactions: 0,
            reliability_score: 0,
            average_delivery_time: 0,
            customer_satisfaction: 0
        };
    };

    const getTransporterRating = (transporterId) => {
        const rating = ratings.find(r =>
            r.user_id.toString() === transporterId.toString()
        );
        return rating ? rating.average_rating : 0;
    };

    const getProductsForTransporter = (transporterId) => {
        return products.filter(p =>
            p?.current_owner?.toString() === transporterId?.toString() ||
            (currentUser?.id?.toString() === transporterId?.toString() &&
                (p?.status === 'Created' || p?.status === 'InWarehouse'))
        );
    };

    const getCurrentUserProducts = () => {
        if (!currentUser) return [];
        return products.filter(p =>
            p?.current_owner?.toString() === currentUser?.id?.toString() ||
            (currentUser.role === 'Transporter' &&
                (p?.status === 'Created' || p?.status === 'InWarehouse'))
        );
    };

    const handleUpdateProductStatus = async (values) => {
        try {
            if (!canUserPerformAction('mark_in_transit', selectedProduct) &&
                !canUserPerformAction('mark_delivered', selectedProduct)) {
                message.error('You do not have permission to update this product status');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            const statusEnum = AuthService.serializeEnumForCandid(values.status);

            await supplyChainActor.update_product_status(
                selectedProduct.id,
                statusEnum,
                values.location || 'In Transit',
                values.notes || `Status updated to ${values.status} by Transporter`
            );

            message.success('Product status updated successfully');
            setStatusModalVisible(false);
            setSelectedProduct(null);
            statusForm.resetFields();
            loadTransporters();
        } catch (error) {
            console.error('Failed to update product status:', error);
            message.error('Failed to update product status');
        }
    };

    const handleAcceptForTransport = async (product) => {
        try {
            if (!canUserPerformAction('accept_transfer', product)) {
                message.error('You cannot accept this product for transport');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();

            // Transfer product to current transporter and mark as in transit
            await supplyChainActor.transfer_product(
                product.id,
                currentUser.id,
                'TO_TRANSPORTER',
                'Product accepted for transport'
            );

            message.success('Product accepted for transport');
            loadTransporters();
        } catch (error) {
            console.error('Failed to accept product for transport:', error);
            message.error('Failed to accept product for transport');
        }
    };

    const handleTransferProduct = async (values) => {
        try {
            if (!canUserPerformAction('transfer_product', selectedProduct)) {
                message.error('You do not have permission to transfer this product');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();

            await supplyChainActor.transfer_product(
                selectedProduct.id,
                values.to_user,
                values.transfer_type,
                values.notes || 'Product transferred for delivery'
            );

            message.success('Product transferred successfully');
            setTransferModalVisible(false);
            setSelectedProduct(null);
            transferForm.resetFields();
            loadTransporters();
        } catch (error) {
            console.error('Failed to transfer product:', error);
            message.error('Failed to transfer product');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Created': 'blue',
            'InWarehouse': 'orange',
            'InTransit': 'purple',
            'Delivered': 'green',
            'Sold': 'cyan',
            'Lost': 'red',
            'Damaged': 'red'
        };
        return colors[status] || 'default';
    };

    const getAvailableStatusTransitions = (product) => {
        if (!product) return [];

        const transitions = [];
        if (canUserPerformAction('mark_in_transit', product)) {
            transitions.push({ value: 'InTransit', label: 'Mark as In Transit' });
        }
        if (canUserPerformAction('mark_delivered', product)) {
            transitions.push({ value: 'Delivered', label: 'Mark as Delivered' });
        }
        return transitions;
    };

    const transporterColumns = [
        {
            title: 'Transporter',
            key: 'transporter',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div>{record.company_name}</div>
                    <div style={{ color: '#666' }}>{record.email}</div>
                </div>
            ),
        },
        {
            title: 'Rating',
            key: 'rating',
            render: (_, record) => {
                const rating = getTransporterRating(record.id);
                return (
                    <div>
                        <Rate disabled value={rating} allowHalf />
                        <div>{rating.toFixed(1)}/5</div>
                    </div>
                );
            },
        },
        {
            title: 'Performance',
            key: 'performance',
            render: (_, record) => {
                const metrics = getTransporterMetrics(record.id);
                return (
                    <div>
                        <div>Reliability: {metrics.reliability_score.toFixed(1)}%</div>
                        <div>Avg. Time: {metrics.average_delivery_time.toFixed(1)} days</div>
                        <Progress
                            percent={metrics.reliability_score}
                            size="small"
                            showInfo={false}
                        />
                    </div>
                );
            },
        },
        {
            title: 'Active Shipments',
            key: 'shipments',
            render: (_, record) => {
                const transporterProducts = getProductsForTransporter(record.id);
                const inTransit = transporterProducts.filter(p => p.status === 'InTransit').length;
                return (
                    <div>
                        <div>In Transit: {inTransit}</div>
                        <div>Total: {transporterProducts.length}</div>
                    </div>
                );
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Tag color={record.is_verified ? 'green' : 'orange'}>
                    {record.is_verified ? 'Verified' : 'Pending'}
                </Tag>
            ),
        },
    ];

    const productColumns = [
        {
            title: 'Product',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status}
                </Tag>
            ),
        },
        {
            title: 'Batch',
            dataIndex: 'batch_number',
            key: 'batch_number',
        },
        {
            title: 'Origin',
            dataIndex: 'origin',
            key: 'origin',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const availableTransitions = getAvailableStatusTransitions(record);
                const canTransfer = canUserPerformAction('transfer_product', record);
                const canAccept = canUserPerformAction('accept_transfer', record);

                return (
                    <Space>
                        {canAccept && record.status !== 'InTransit' && (
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => handleAcceptForTransport(record)}
                            >
                                Accept for Transport
                            </Button>
                        )}
                        {availableTransitions.length > 0 && (
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setSelectedProduct(record);
                                    setStatusModalVisible(true);
                                }}
                            >
                                Update Status
                            </Button>
                        )}
                        {canTransfer && (
                            <Button
                                size="small"
                                icon={<ArrowRightOutlined />}
                                onClick={() => {
                                    setSelectedProduct(record);
                                    setTransferModalVisible(true);
                                }}
                            >
                                Transfer
                            </Button>
                        )}
                    </Space>
                );
            },
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <h1>Transporters Management</h1>
                </Col>
            </Row>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Total Transporters"
                            value={transporters.length}
                            prefix={<TruckOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Products in Transit"
                            value={products.filter(p => p.status === 'InTransit').length}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Delivered Today"
                            value={products.filter(p => p.status === 'Delivered').length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Available for Pickup"
                            value={products.filter(p => p.status === 'Created' || p.status === 'InWarehouse').length}
                            prefix={<StarOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Current User Products (if user is a transporter) */}
            {currentUser?.role === 'Transporter' && (
                <Card title="My Shipments" style={{ marginBottom: 24 }}>
                    <Table
                        dataSource={getCurrentUserProducts()}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            )}

            {/* Available Products for Transport */}
            {currentUser?.role === 'Transporter' && (
                <Card title="Available for Transport" style={{ marginBottom: 24 }}>
                    <Table
                        dataSource={products.filter(p =>
                            (p.status === 'Created' || p.status === 'InWarehouse') &&
                            p.current_owner?.toString() !== currentUser?.id?.toString()
                        )}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            )}

            {/* All Transporters Table */}
            <Card title="All Transporters">
                <Table
                    dataSource={transporters}
                    columns={transporterColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Update Status Modal */}
            <Modal
                title="Update Product Status"
                visible={statusModalVisible}
                onCancel={() => {
                    setStatusModalVisible(false);
                    setSelectedProduct(null);
                    statusForm.resetFields();
                }}
                footer={null}
            >
                {selectedProduct && (
                    <>
                        <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Product">{selectedProduct.name}</Descriptions.Item>
                            <Descriptions.Item label="Current Status">
                                <Tag color={getStatusColor(selectedProduct.status)}>
                                    {selectedProduct.status}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Form form={statusForm} onFinish={handleUpdateProductStatus} layout="vertical">
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
                                label="Current Location"
                                name="location"
                            >
                                <Input placeholder="Enter current location" />
                            </Form.Item>
                            <Form.Item
                                label="Notes"
                                name="notes"
                            >
                                <TextArea placeholder="Enter additional notes" rows={3} />
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
                    </>
                )}
            </Modal>

            {/* Transfer Product Modal */}
            <Modal
                title="Transfer Product"
                visible={transferModalVisible}
                onCancel={() => {
                    setTransferModalVisible(false);
                    setSelectedProduct(null);
                    transferForm.resetFields();
                }}
                footer={null}
            >
                {selectedProduct && (
                    <>
                        <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Product">{selectedProduct.name}</Descriptions.Item>
                            <Descriptions.Item label="Current Status">
                                <Tag color={getStatusColor(selectedProduct.status)}>
                                    {selectedProduct.status}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Form form={transferForm} onFinish={handleTransferProduct} layout="vertical">
                            <Form.Item
                                label="Transfer Type"
                                name="transfer_type"
                                rules={[{ required: true, message: 'Please select transfer type' }]}
                            >
                                <Select placeholder="Select transfer type">
                                    <Option value="TO_WAREHOUSE">To Warehouse</Option>
                                    <Option value="TO_RETAILER">To Retailer</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="Transfer To"
                                name="to_user"
                                rules={[{ required: true, message: 'Please select recipient' }]}
                            >
                                <Select placeholder="Select recipient">
                                    {availableUsers.filter(user =>
                                        user.role === 'Warehouse' || user.role === 'Retailer'
                                    ).map(user => (
                                        <Option key={user.id.toString()} value={user.id}>
                                            {user.name} ({user.role}) - {user.company_name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="Notes"
                                name="notes"
                            >
                                <TextArea placeholder="Enter transfer notes" rows={3} />
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
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Transporters;
