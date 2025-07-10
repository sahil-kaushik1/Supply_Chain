import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, Progress, message, Button, Modal, Select, Space, Spin } from 'antd';
import { HomeOutlined, InboxOutlined, CheckCircleOutlined, AlertOutlined, ArrowRightOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;

const Warehouses = () => {
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        loadWarehouses();
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    };

    const loadWarehouses = async () => {
        try {
            setLoading(true);

            const [warehousesResult, productsResult] = await Promise.allSettled([
                loadWarehousesData(),
                loadProductsData()
            ]);

            if (warehousesResult.status === 'fulfilled' && Array.isArray(warehousesResult.value)) {
                setWarehouses(warehousesResult.value);
            } else {
                console.warn('Failed to load warehouses:', warehousesResult.reason);
                setWarehouses([]);
            }

            if (productsResult.status === 'fulfilled' && Array.isArray(productsResult.value)) {
                setProducts(productsResult.value);
            } else {
                console.warn('Failed to load products:', productsResult.reason);
                setProducts([]);
            }

        } catch (error) {
            console.error('Failed to load warehouses:', error);
            message.error('Failed to load warehouses data');
        } finally {
            setLoading(false);
        }
    };

    const loadWarehousesData = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const warehousesData = await userManagementActor.get_users_by_role({ Warehouse: null });
            return Array.isArray(warehousesData) ? warehousesData : [];
        } catch (error) {
            console.error('Failed to load warehouses data:', error);
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

    const canUserPerformAction = (action, product) => {
        if (!currentUser) return false;

        const userRole = currentUser.role;

        switch (action) {
            case 'update_status':
                return userRole === 'Warehouse' || userRole === 'Admin';
            case 'view_all':
                return ['Admin', 'Warehouse'].includes(userRole);
            default:
                return false;
        }
    };

    const handleUpdateStatus = async () => {
        try {
            if (!canUserPerformAction('update_status', selectedProduct)) {
                message.error('You do not have permission to update product status');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            await supplyChainActor.update_product_status(
                selectedProduct.id,
                { [newStatus]: null },
                'Warehouse Update',
                `Status updated to ${newStatus}`
            );

            message.success('Product status updated successfully');
            setStatusModalVisible(false);
            setSelectedProduct(null);
            setNewStatus('');
            loadWarehouses();
        } catch (error) {
            console.error('Failed to update product status:', error);
            message.error('Failed to update product status');
        }
    };

    const getWarehouseStats = (warehouseId) => {
        const warehouseProducts = products.filter(p =>
            p?.current_owner?.toString() === warehouseId?.toString() &&
            (p?.status === 'InWarehouse' || p?.status === 'Created')
        );

        const totalValue = warehouseProducts.reduce((sum, p) =>
            sum + ((p?.price || 0) * (p?.quantity || 0)), 0
        );
        const totalQuantity = warehouseProducts.reduce((sum, p) =>
            sum + (p?.quantity || 0), 0
        );

        return {
            totalProducts: warehouseProducts.length,
            totalValue,
            totalQuantity,
            utilizationRate: Math.min((totalQuantity / 1000) * 100, 100) // Assume 1000 capacity
        };
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

    const warehouseColumns = [
        {
            title: 'Warehouse',
            key: 'warehouse',
            render: (_, record) => (
                <div className="warehouse-info">
                    <div className="warehouse-name">{record?.name || 'Unknown'}</div>
                    <div className="warehouse-company">{record?.company_name || 'No Company'}</div>
                    <div className="warehouse-location">{record?.address || 'No Address'}</div>
                </div>
            ),
        },
        {
            title: 'Inventory',
            key: 'inventory',
            render: (_, record) => {
                const stats = getWarehouseStats(record.id);
                return (
                    <div>
                        <div>Products: {stats.totalProducts}</div>
                        <div>Value: ${stats.totalValue.toFixed(2)}</div>
                        <div>Quantity: {stats.totalQuantity}</div>
                    </div>
                );
            },
        },
        {
            title: 'Capacity Utilization',
            key: 'utilization',
            render: (_, record) => {
                const stats = getWarehouseStats(record.id);
                return (
                    <Progress
                        percent={stats.utilizationRate}
                        status={stats.utilizationRate > 80 ? 'exception' : 'active'}
                        size="small"
                    />
                );
            },
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_, record) => (
                <div>
                    <div>{record?.email || 'No Email'}</div>
                    <div>{record?.phone || 'No Phone'}</div>
                </div>
            ),
        },
    ];

    const productColumns = [
        {
            title: 'Product Name',
            dataIndex: 'name',
            key: 'name',
            render: (name) => name || 'Unknown Product',
        },
        {
            title: 'Batch Number',
            dataIndex: 'batch_number',
            key: 'batch_number',
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
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
        },
        {
            title: 'Value',
            key: 'value',
            render: (_, record) => `$${((record?.price || 0) * (record?.quantity || 0)).toFixed(2)}`,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {canUserPerformAction('update_status', record) && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<ArrowRightOutlined />}
                            onClick={() => {
                                setSelectedProduct(record);
                                setStatusModalVisible(true);
                            }}
                        >
                            Update Status
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // Filter products for warehouse user
    const warehouseProducts = currentUser?.role === 'Warehouse'
        ? products.filter(p =>
            p?.current_owner?.toString() === currentUser?.id?.toString() ||
            p?.status === 'Created' // New products that can be received
        )
        : products.filter(p =>
            p?.status === 'InWarehouse' || p?.status === 'Created'
        );

    if (loading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="warehouses-container">
            <div className="page-header">
                <h1>Warehouse Management</h1>
            </div>

            {/* Statistics Cards */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Total Warehouses"
                            value={warehouses.length}
                            prefix={<HomeOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Products in Warehouse"
                            value={warehouseProducts.filter(p => p?.status === 'InWarehouse').length}
                            prefix={<InboxOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Pending Receipt"
                            value={warehouseProducts.filter(p => p?.status === 'Created').length}
                            prefix={<AlertOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Ready for Shipment"
                            value={warehouseProducts.filter(p => p?.status === 'InWarehouse').length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Warehouses Table */}
            {canUserPerformAction('view_all') && (
                <Card title="Warehouses" className="warehouses-table-card">
                    <Table
                        dataSource={warehouses}
                        columns={warehouseColumns}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: 'No warehouses available' }}
                    />
                </Card>
            )}

            {/* Products Table */}
            <Card
                title={currentUser?.role === 'Warehouse' ? 'My Warehouse Inventory' : 'Warehouse Products'}
                style={{ marginTop: '24px' }}
                className="products-table-card"
            >
                <Table
                    dataSource={warehouseProducts}
                    columns={productColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'No products in warehouse' }}
                />
            </Card>

            {/* Update Status Modal */}
            <Modal
                title="Update Product Status"
                visible={statusModalVisible}
                onCancel={() => setStatusModalVisible(false)}
                onOk={handleUpdateStatus}
                okText="Update Status"
                okButtonProps={{ disabled: !newStatus }}
            >
                {selectedProduct && (
                    <div>
                        <p><strong>Product:</strong> {selectedProduct.name}</p>
                        <p><strong>Current Status:</strong>
                            <Tag color={getStatusColor(selectedProduct.status)} style={{ marginLeft: 8 }}>
                                {selectedProduct.status}
                            </Tag>
                        </p>
                        <p><strong>New Status:</strong></p>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Select new status"
                            value={newStatus}
                            onChange={setNewStatus}
                        >
                            {selectedProduct.status === 'Created' && (
                                <Option value="InWarehouse">Receive in Warehouse</Option>
                            )}
                            {selectedProduct.status === 'InWarehouse' && (
                                <>
                                    <Option value="InTransit">Ship Out</Option>
                                    <Option value="Damaged">Mark as Damaged</Option>
                                    <Option value="Lost">Mark as Lost</Option>
                                </>
                            )}
                        </Select>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Warehouses;
