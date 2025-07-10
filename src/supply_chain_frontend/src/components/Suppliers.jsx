import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Modal, Form, Input, Select, message, Spin, Row, Col, Statistic, DatePicker, Space } from 'antd';
import { UserOutlined, ShoppingCartOutlined, CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
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
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [form] = Form.useForm();
    const [productForm] = Form.useForm();

    useEffect(() => {
        loadSuppliers();
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

    const loadSuppliers = async () => {
        try {
            setLoading(true);

            const [suppliersResult, productsResult] = await Promise.allSettled([
                loadSuppliersData(),
                loadProductsData()
            ]);

            if (suppliersResult.status === 'fulfilled' && Array.isArray(suppliersResult.value)) {
                setSuppliers(suppliersResult.value);
            } else {
                console.warn('Failed to load suppliers:', suppliersResult.reason);
                setSuppliers([]);
            }

            if (productsResult.status === 'fulfilled' && Array.isArray(productsResult.value)) {
                setProducts(productsResult.value);
            } else {
                console.warn('Failed to load products:', productsResult.reason);
                setProducts([]);
            }

        } catch (error) {
            console.error('Failed to load suppliers:', error);
            message.error('Failed to load suppliers data');
        } finally {
            setLoading(false);
        }
    };

    const loadSuppliersData = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const suppliersData = await userManagementActor.get_users_by_role({ Supplier: null });
            return Array.isArray(suppliersData) ? suppliersData : [];
        } catch (error) {
            console.error('Failed to load suppliers data:', error);
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

    const getSupplierStats = (supplierId) => {
        const supplierProducts = products.filter(p =>
            p?.supplier_id?.toString() === supplierId?.toString()
        );
        return {
            totalProducts: supplierProducts.length,
            activeProducts: supplierProducts.filter(p => p?.status !== 'Sold').length,
            totalValue: supplierProducts.reduce((sum, p) => sum + ((p?.price || 0) * (p?.quantity || 0)), 0)
        };
    };

    const canUserPerformAction = (action) => {
        if (!currentUser) return false;

        const userRole = currentUser.role;

        switch (action) {
            case 'create_product':
                return ['Admin', 'Supplier'].includes(userRole);
            case 'verify_supplier':
                return userRole === 'Admin';
            default:
                return false;
        }
    };

    const handleCreateProduct = async (values) => {
        try {
            if (!canUserPerformAction('create_product')) {
                message.error('You do not have permission to create products');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            await supplyChainActor.create_product(
                values.name,
                values.description,
                values.batchNumber,
                values.expiryDate ? [new Date(values.expiryDate).getTime() * 1000000] : [],
                parseFloat(values.price),
                parseInt(values.quantity),
                values.category,
                values.origin,
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

    const handleVerifySupplier = async (supplierId) => {
        try {
            if (!canUserPerformAction('verify_supplier')) {
                message.error('You do not have permission to verify suppliers');
                return;
            }

            const userManagementActor = await AuthService.getUserManagementActor();
            await userManagementActor.verify_user(supplierId);
            message.success('Supplier verified successfully');
            loadSuppliers();
        } catch (error) {
            console.error('Failed to verify supplier:', error);
            message.error('Failed to verify supplier');
        }
    };

    const supplierColumns = [
        {
            title: 'Supplier',
            key: 'supplier',
            render: (_, record) => (
                <div className="supplier-info">
                    <div className="supplier-name">{record?.name || 'Unknown'}</div>
                    <div className="supplier-company">{record?.company_name || 'No Company'}</div>
                    <Tag color={record?.is_verified ? 'green' : 'orange'}>
                        {record?.is_verified ? 'Verified' : 'Pending'}
                    </Tag>
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
                        <div>Total: {stats.totalProducts}</div>
                        <div>Active: {stats.activeProducts}</div>
                    </div>
                );
            },
        },
        {
            title: 'Total Value',
            key: 'value',
            render: (_, record) => {
                const stats = getSupplierStats(record.id);
                return `$${stats.totalValue.toFixed(2)}`;
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
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {!record?.is_verified && canUserPerformAction('verify_supplier') && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleVerifySupplier(record.id)}
                        >
                            Verify
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setSelectedSupplier(record);
                            setModalVisible(true);
                        }}
                    >
                        View
                    </Button>
                </Space>
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
            render: (status) => {
                const colors = {
                    'Created': 'blue',
                    'InWarehouse': 'orange',
                    'InTransit': 'purple',
                    'Delivered': 'green',
                    'Sold': 'cyan'
                };
                return <Tag color={colors[status] || 'default'}>{status}</Tag>;
            },
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
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
        },
    ];

    // Filter products for current user if they're a supplier
    const userProducts = currentUser?.role === 'Supplier'
        ? products.filter(p => p?.supplier_id?.toString() === currentUser?.id?.toString())
        : products;

    if (loading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="suppliers-container">
            <div className="page-header">
                <h1>Supplier Management</h1>
                {canUserPerformAction('create_product') && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setProductModalVisible(true)}
                        className="create-product-btn"
                    >
                        Create Product
                    </Button>
                )}
            </div>

            {/* Statistics Cards */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Total Suppliers"
                            value={suppliers.length}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Verified Suppliers"
                            value={suppliers.filter(s => s?.is_verified).length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Total Products"
                            value={userProducts.length}
                            prefix={<ShoppingCartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Active Products"
                            value={userProducts.filter(p => p?.status !== 'Sold').length}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Suppliers Table */}
            <Card title="Suppliers" className="suppliers-table-card">
                <Table
                    dataSource={suppliers}
                    columns={supplierColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'No suppliers available' }}
                />
            </Card>

            {/* Products Table (for suppliers to see their products) */}
            {currentUser?.role === 'Supplier' && (
                <Card title="My Products" style={{ marginTop: '24px' }} className="products-table-card">
                    <Table
                        dataSource={userProducts}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: 'No products created yet' }}
                    />
                </Card>
            )}

            {/* Create Product Modal */}
            <Modal
                title="Create New Product"
                visible={productModalVisible}
                onCancel={() => setProductModalVisible(false)}
                onOk={() => productForm.submit()}
                okText="Create Product"
                width={600}
                className="create-product-modal"
            >
                <Form
                    form={productForm}
                    layout="vertical"
                    onFinish={handleCreateProduct}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Product Name"
                                rules={[{ required: true, message: 'Please enter product name' }]}
                            >
                                <Input placeholder="Enter product name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="batchNumber"
                                label="Batch Number"
                                rules={[{ required: true, message: 'Please enter batch number' }]}
                            >
                                <Input placeholder="Enter batch number" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="description"
                        label="Description"
                        rules={[{ required: true, message: 'Please enter description' }]}
                    >
                        <TextArea rows={3} placeholder="Enter product description" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="price"
                                label="Price ($)"
                                rules={[{ required: true, message: 'Please enter price' }]}
                            >
                                <Input type="number" step="0.01" placeholder="0.00" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="quantity"
                                label="Quantity"
                                rules={[{ required: true, message: 'Please enter quantity' }]}
                            >
                                <Input type="number" placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="category"
                                label="Category"
                                rules={[{ required: true, message: 'Please select category' }]}
                            >
                                <Select placeholder="Select category">
                                    <Option value="Electronics">Electronics</Option>
                                    <Option value="Food">Food</Option>
                                    <Option value="Clothing">Clothing</Option>
                                    <Option value="Pharmaceuticals">Pharmaceuticals</Option>
                                    <Option value="Automotive">Automotive</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="origin"
                                label="Origin"
                                rules={[{ required: true, message: 'Please enter origin' }]}
                            >
                                <Input placeholder="Enter origin location" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="expiryDate"
                                label="Expiry Date (Optional)"
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="certifications"
                        label="Certifications (Optional)"
                        help="Enter certifications separated by commas"
                    >
                        <Input placeholder="ISO 9001, FDA Approved, etc." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Supplier Detail Modal */}
            <Modal
                title="Supplier Details"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
            >
                {selectedSupplier && (
                    <div className="supplier-details">
                        <Row gutter={16}>
                            <Col span={12}>
                                <p><strong>Name:</strong> {selectedSupplier.name}</p>
                                <p><strong>Company:</strong> {selectedSupplier.company_name}</p>
                                <p><strong>Email:</strong> {selectedSupplier.email}</p>
                            </Col>
                            <Col span={12}>
                                <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                                <p><strong>Address:</strong> {selectedSupplier.address}</p>
                                <p><strong>Status:</strong>
                                    <Tag color={selectedSupplier.is_verified ? 'green' : 'orange'}>
                                        {selectedSupplier.is_verified ? 'Verified' : 'Pending'}
                                    </Tag>
                                </p>
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Suppliers;
