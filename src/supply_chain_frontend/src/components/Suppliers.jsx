import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Modal, Form, Input, Select, message, Spin, Row, Col, Statistic, DatePicker, Space, Descriptions } from 'antd';
import { UserOutlined, ShoppingCartOutlined, CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, EditOutlined, ArrowRightOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;
const { TextArea } = Input;

const Suppliers = () => {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [form] = Form.useForm();
    const [productForm] = Form.useForm();
    const [transferForm] = Form.useForm();

    // FIXED: Proper useEffect with cleanup to prevent auto-refresh loops
    const loadSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const [suppliersResult, productsResult, usersResult] = await Promise.allSettled([
                loadSuppliersData(),
                loadProductsData(),
                loadAllUsers()
            ]);

            if (suppliersResult.status === 'fulfilled' && Array.isArray(suppliersResult.value)) {
                setSuppliers(suppliersResult.value);
            } else {
                console.warn('Failed to load suppliers:', suppliersResult.reason);
                setSuppliers([]);
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
            console.error('Failed to load suppliers:', error);
            message.error('Failed to load suppliers data');
        } finally {
            setLoading(false);
        }
    }, []); // FIXED: Empty dependency array to prevent loops

    const loadCurrentUser = useCallback(async () => {
        try {
            const result = await AuthService.getCurrentUser();
            if (result && 'Ok' in result) {
                setCurrentUser(result.Ok);
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    }, []);

    // FIXED: Proper useEffect with cleanup
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await Promise.all([loadSuppliers(), loadCurrentUser()]);
            }
        };

        loadData();

        // FIXED: Longer interval to prevent excessive API calls
        const interval = setInterval(() => {
            if (isMounted) {
                loadData();
            }
        }, 60000); // FIXED: 60 seconds instead of 30

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [loadSuppliers, loadCurrentUser]);

    const loadSuppliersData = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const suppliersData = await AuthService.callCanisterSafely(
                Promise.resolve(userManagementActor),
                'get_users_by_role',
                AuthService.serializeEnumForCandid('Supplier')
            );

            return Array.isArray(suppliersData) ? suppliersData.map(supplier => ({
                ...supplier,
                role: AuthService.deserializeEnumFromCandid(supplier.role)
            })) : [];
        } catch (error) {
            console.error('Failed to load suppliers data:', error);
            return [];
        }
    };

    const loadProductsData = async () => {
        try {
            const supplyChainActor = await AuthService.getSupplyChainActor();
            const allProducts = await AuthService.callCanisterSafely(
                Promise.resolve(supplyChainActor),
                'get_all_products'
            );
            return Array.isArray(allProducts) ? allProducts : [];
        } catch (error) {
            console.error('Failed to load products data:', error);
            return [];
        }
    };

    const loadAllUsers = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const allUsers = await AuthService.callCanisterSafely(
                Promise.resolve(userManagementActor),
                'get_all_users'
            );
            return Array.isArray(allUsers) ? allUsers : [];
        } catch (error) {
            console.error('Failed to load users data:', error);
            return [];
        }
    };

    const getSupplierStats = (supplierId) => {
        const supplierProducts = products.filter(p => p?.supplier_id?.toString() === supplierId?.toString());
        return {
            totalProducts: supplierProducts.length,
            activeProducts: supplierProducts.filter(p => p?.status !== 'Sold').length,
            totalValue: supplierProducts.reduce((sum, p) => sum + ((p?.price || 0) * (p?.quantity || 0)), 0)
        };
    };

    const canUserPerformAction = (action, product) => {
        if (!currentUser) return false;
        const userRole = currentUser.role;

        switch (action) {
            case 'create_product':
                return ['Admin', 'Supplier'].includes(userRole);
            case 'verify_supplier':
                return userRole === 'Admin';
            case 'transfer_product':
                return (userRole === 'Admin' || (userRole === 'Supplier' && product?.supplier_id?.toString() === currentUser?.id?.toString()));
            case 'manage_own_products':
                return product?.supplier_id?.toString() === currentUser?.id?.toString() || userRole === 'Admin';
            default:
                return false;
        }
    };

    const getSupplierProducts = (supplierId) => {
        return products.filter(p => p?.supplier_id?.toString() === supplierId?.toString());
    };

    const getCurrentUserProducts = () => {
        if (!currentUser) return [];
        return products.filter(p => p?.supplier_id?.toString() === currentUser?.id?.toString());
    };

    const handleCreateProduct = async (values) => {
        try {
            if (!canUserPerformAction('create_product')) {
                message.error('You do not have permission to create products');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            await AuthService.callCanisterSafely(
                Promise.resolve(supplyChainActor),
                'create_product',
                values.name,
                values.description || '',
                values.batchNumber || `BATCH-${Date.now()}`,
                values.expiryDate ? [new Date(values.expiryDate).getTime() * 1000000] : [],
                parseFloat(values.price) || 0,
                parseInt(values.quantity) || 1,
                values.category || 'General',
                values.origin || 'Unknown',
                values.certifications ? values.certifications.split(',').map(c => c.trim()) : []
            );

            message.success('Product created successfully');
            setProductModalVisible(false);
            productForm.resetFields();
            loadSuppliers();
        } catch (error) {
            console.error('Failed to create product:', error);
            message.error('Failed to create product');
        }
    };

    const handleTransferProduct = async (values) => {
        try {
            if (!canUserPerformAction('transfer_product', selectedProduct)) {
                message.error('You do not have permission to transfer this product');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            await AuthService.callCanisterSafely(
                Promise.resolve(supplyChainActor),
                'transfer_product',
                selectedProduct.id,
                values.to_user,
                values.transfer_type,
                values.notes || `Product transferred by ${currentUser.role}`
            );

            message.success('Product transferred successfully');
            setTransferModalVisible(false);
            setSelectedProduct(null);
            transferForm.resetFields();
            loadSuppliers();
        } catch (error) {
            console.error('Failed to transfer product:', error);
            message.error('Failed to transfer product');
        }
    };

    const handleVerifySupplier = async (supplierId) => {
        try {
            if (!canUserPerformAction('verify_supplier')) {
                message.error('You do not have permission to verify suppliers');
                return;
            }

            const userManagementActor = await AuthService.getUserManagementActor();
            await AuthService.callCanisterSafely(
                Promise.resolve(userManagementActor),
                'verify_user',
                supplierId
            );

            message.success('Supplier verified successfully');
            loadSuppliers();
        } catch (error) {
            console.error('Failed to verify supplier:', error);
            message.error('Failed to verify supplier');
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

    const supplierColumns = [
        {
            title: 'Supplier',
            key: 'supplier',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <UserOutlined style={{ marginRight: '8px' }} />
                        {record.name}
                        {record.is_verified && <CheckCircleOutlined style={{ color: 'green', marginLeft: '8px' }} />}
                        {!record.is_verified && <CloseCircleOutlined style={{ color: 'red', marginLeft: '8px' }} />}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{record.company_name}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{record.email}</div>
                </div>
            ),
        },
        {
            title: 'Products',
            key: 'products',
            render: (_, record) => {
                const stats = getSupplierStats(record.id);
                return (
                    <div>
                        <div><strong>Total:</strong> {stats.totalProducts}</div>
                        <div><strong>Active:</strong> {stats.activeProducts}</div>
                        <div><strong>Value:</strong> ${stats.totalValue.toFixed(2)}</div>
                    </div>
                );
            },
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_, record) => (
                <div>
                    <div>{record.phone}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{record.address}</div>
                </div>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <div>
                    <Tag color={record.is_verified ? 'green' : 'red'}>
                        {record.is_verified ? 'Verified' : 'Unverified'}
                    </Tag>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Since: {new Date(Number(record.created_at) / 1000000).toLocaleDateString()}
                    </div>
                </div>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<ShoppingCartOutlined />}
                        onClick={() => {
                            setSelectedSupplier(record);
                            setProductModalVisible(true);
                        }}
                        disabled={!canUserPerformAction('create_product')}
                    >
                        Add Product
                    </Button>
                    {!record.is_verified && canUserPerformAction('verify_supplier') && (
                        <Button
                            type="link"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleVerifySupplier(record.id)}
                        >
                            Verify
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const productColumns = [
        {
            title: 'Product',
            key: 'product',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>Batch: {record.batch_number}</div>
                </div>
            ),
        },
        {
            title: 'Details',
            key: 'details',
            render: (_, record) => (
                <div>
                    <div><strong>Price:</strong> ${record.price}</div>
                    <div><strong>Quantity:</strong> {record.quantity}</div>
                    <div><strong>Category:</strong> {record.category}</div>
                </div>
            ),
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
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<ArrowRightOutlined />}
                        onClick={() => {
                            setSelectedProduct(record);
                            setTransferModalVisible(true);
                        }}
                        disabled={!canUserPerformAction('transfer_product', record)}
                    >
                        Transfer
                    </Button>
                </Space>
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
        <div style={{ padding: '0px' }}>
            {/* Header */}
            <Card style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                            Suppliers Management
                        </h1>
                        <p style={{ margin: '8px 0 0', color: '#666' }}>
                            Manage suppliers, their products, and verification status
                        </p>
                    </div>
                    <Space>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setProductModalVisible(true)}
                            disabled={!canUserPerformAction('create_product')}
                        >
                            Add Product
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Suppliers"
                            value={suppliers.length}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Verified Suppliers"
                            value={suppliers.filter(s => s.is_verified).length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Products"
                            value={products.length}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="My Products"
                            value={getCurrentUserProducts().length}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Suppliers Table */}
            <Card title="All Suppliers" style={{ marginBottom: '24px' }}>
                <Table
                    dataSource={suppliers}
                    columns={supplierColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </Card>

            {/* Products Table */}
            <Card title="All Products">
                <Table
                    dataSource={products}
                    columns={productColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </Card>

            {/* Create Product Modal */}
            <Modal
                title="Create New Product"
                open={productModalVisible}
                onCancel={() => {
                    setProductModalVisible(false);
                    productForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={productForm}
                    layout="vertical"
                    onFinish={handleCreateProduct}
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
                        <TextArea placeholder="Enter product description" rows={3} />
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
                        name="batchNumber"
                    >
                        <Input placeholder="Auto-generated if empty" />
                    </Form.Item>

                    <Form.Item
                        label="Certifications (comma-separated)"
                        name="certifications"
                    >
                        <Input placeholder="ISO9001, FDA, etc." />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Create Product
                            </Button>
                            <Button onClick={() => {
                                setProductModalVisible(false);
                                productForm.resetFields();
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
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
                                <TextArea placeholder="Transfer notes and instructions" rows={3} />
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

export default Suppliers;
