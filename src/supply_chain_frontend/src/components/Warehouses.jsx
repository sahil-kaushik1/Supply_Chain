import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, Progress, message, Button, Modal, Select, Space, Spin, Form, Input, Descriptions } from 'antd';
import { HomeOutlined, InboxOutlined, CheckCircleOutlined, AlertOutlined, ArrowRightOutlined, EditOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;
const { TextArea } = Input;

const Warehouses = () => {
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [statusForm] = Form.useForm();
    const [transferForm] = Form.useForm();

    useEffect(() => {
        loadWarehouses();
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

    const loadWarehouses = async () => {
        try {
            setLoading(true);

            const [warehousesResult, productsResult, usersResult] = await Promise.allSettled([
                loadWarehousesData(),
                loadProductsData(),
                loadAllUsers()
            ]);

            if (warehousesResult.status === 'fulfilled' && Array.isArray(warehousesResult.value)) {
                setWarehouses(warehousesResult.value);
            } else {
                console.warn('Failed to load warehouses:', warehousesResult.reason);
                setWarehouses([]);
            }

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
            const warehousesData = await userManagementActor.get_users_by_role(
                AuthService.serializeEnumForCandid('Warehouse')
            );
            return Array.isArray(warehousesData) ? warehousesData.map(warehouse => ({
                ...warehouse,
                role: AuthService.deserializeEnumFromCandid(warehouse.role)
            })) : [];
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
            case 'receive_product':
                return (userRole === 'Admin' || userRole === 'Warehouse') &&
                    (product?.status === 'Created' || product?.status === 'InTransit');
            case 'mark_in_warehouse':
                return (userRole === 'Admin' || userRole === 'Warehouse') &&
                    product?.current_owner?.toString() === currentUser?.id?.toString();
            case 'release_product':
                return (userRole === 'Admin' || userRole === 'Warehouse') &&
                    product?.current_owner?.toString() === currentUser?.id?.toString() &&
                    product?.status === 'InWarehouse';
            case 'transfer_product':
                return (userRole === 'Admin' || userRole === 'Warehouse') &&
                    product?.current_owner?.toString() === currentUser?.id?.toString();
            default:
                return false;
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

    const getProductsForWarehouse = (warehouseId) => {
        return products.filter(p =>
            p?.current_owner?.toString() === warehouseId?.toString() ||
            (currentUser?.id?.toString() === warehouseId?.toString() &&
                (p?.status === 'Created' || p?.status === 'InTransit'))
        );
    };

    const getCurrentUserProducts = () => {
        if (!currentUser) return [];
        return products.filter(p =>
            p?.current_owner?.toString() === currentUser?.id?.toString() ||
            (currentUser.role === 'Warehouse' &&
                (p?.status === 'Created' || p?.status === 'InTransit'))
        );
    };

    const handleReceiveProduct = async (product) => {
        try {
            if (!canUserPerformAction('receive_product', product)) {
                message.error('You cannot receive this product');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();

            // Transfer product to current warehouse and mark as in warehouse
            await supplyChainActor.transfer_product(
                product.id,
                currentUser.id,
                'TO_WAREHOUSE',
                'Product received at warehouse'
            );

            message.success('Product received successfully');
            loadWarehouses();
        } catch (error) {
            console.error('Failed to receive product:', error);
            message.error('Failed to receive product');
        }
    };

    const handleUpdateProductStatus = async (values) => {
        try {
            if (!canUserPerformAction('mark_in_warehouse', selectedProduct)) {
                message.error('You do not have permission to update this product status');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            const statusEnum = AuthService.serializeEnumForCandid(values.status);

            await supplyChainActor.update_product_status(
                selectedProduct.id,
                statusEnum,
                values.location || 'Warehouse',
                values.notes || `Status updated to ${values.status} by Warehouse`
            );

            message.success('Product status updated successfully');
            setStatusModalVisible(false);
            setSelectedProduct(null);
            statusForm.resetFields();
            loadWarehouses();
        } catch (error) {
            console.error('Failed to update product status:', error);
            message.error('Failed to update product status');
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
                values.notes || 'Product released from warehouse'
            );

            message.success('Product transferred successfully');
            setTransferModalVisible(false);
            setSelectedProduct(null);
            transferForm.resetFields();
            loadWarehouses();
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
        if (canUserPerformAction('mark_in_warehouse', product) && product.status !== 'InWarehouse') {
            transitions.push({ value: 'InWarehouse', label: 'Mark as In Warehouse' });
        }
        return transitions;
    };

    const warehouseColumns = [
        {
            title: 'Warehouse',
            key: 'warehouse',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div>{record.company_name}</div>
                    <div style={{ color: '#666' }}>{record.address}</div>
                </div>
            ),
        },
        {
            title: 'Capacity',
            key: 'capacity',
            render: (_, record) => {
                const stats = getWarehouseStats(record.id);
                return (
                    <div>
                        <div>Products: {stats.totalProducts}</div>
                        <div>Quantity: {stats.totalQuantity}</div>
                        <Progress
                            percent={stats.utilizationRate}
                            size="small"
                            status={stats.utilizationRate > 80 ? 'exception' : 'normal'}
                        />
                    </div>
                );
            },
        },
        {
            title: 'Inventory Value',
            key: 'value',
            render: (_, record) => {
                const stats = getWarehouseStats(record.id);
                return `$${stats.totalValue.toFixed(2)}`;
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
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
        },
        {
            title: 'Value',
            key: 'value',
            render: (_, record) => `$${((record.price || 0) * (record.quantity || 0)).toFixed(2)}`,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const availableTransitions = getAvailableStatusTransitions(record);
                const canTransfer = canUserPerformAction('transfer_product', record);
                const canReceive = canUserPerformAction('receive_product', record);

                return (
                    <Space>
                        {canReceive && record.current_owner?.toString() !== currentUser?.id?.toString() && (
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => handleReceiveProduct(record)}
                            >
                                Receive
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
                        {canTransfer && record.status === 'InWarehouse' && (
                            <Button
                                size="small"
                                icon={<ArrowRightOutlined />}
                                onClick={() => {
                                    setSelectedProduct(record);
                                    setTransferModalVisible(true);
                                }}
                            >
                                Release
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
                    <h1>Warehouse Management</h1>
                </Col>
            </Row>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Total Warehouses"
                            value={warehouses.length}
                            prefix={<HomeOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Products in Warehouses"
                            value={products.filter(p => p.status === 'InWarehouse').length}
                            prefix={<InboxOutlined />}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Available for Pickup"
                            value={products.filter(p => p.status === 'InWarehouse').length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Incoming Shipments"
                            value={products.filter(p =>
                                (p.status === 'Created' || p.status === 'InTransit') &&
                                availableUsers.find(u => u.id.toString() === p.current_owner?.toString())?.role !== 'Warehouse'
                            ).length}
                            prefix={<AlertOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Current User Inventory (if user is a warehouse) */}
            {currentUser?.role === 'Warehouse' && (
                <Card title="My Warehouse Inventory" style={{ marginBottom: 24 }}>
                    <Table
                        dataSource={getCurrentUserProducts()}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            )}

            {/* Incoming Products */}
            {currentUser?.role === 'Warehouse' && (
                <Card title="Incoming Products" style={{ marginBottom: 24 }}>
                    <Table
                        dataSource={products.filter(p =>
                            (p.status === 'Created' || p.status === 'InTransit') &&
                            p.current_owner?.toString() !== currentUser?.id?.toString()
                        )}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            )}

            {/* All Warehouses Table */}
            <Card title="All Warehouses">
                <Table
                    dataSource={warehouses}
                    columns={warehouseColumns}
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
                                label="Location in Warehouse"
                                name="location"
                            >
                                <Input placeholder="Enter storage location" />
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

            {/* Transfer/Release Product Modal */}
            <Modal
                title="Release Product from Warehouse"
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
                                    <Option value="TO_TRANSPORTER">To Transporter</Option>
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
                                        user.role === 'Transporter' || user.role === 'Retailer'
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
                                <TextArea placeholder="Enter release notes" rows={3} />
                            </Form.Item>
                            <Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        Release Product
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

export default Warehouses;
