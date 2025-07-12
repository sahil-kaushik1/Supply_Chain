import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, message, Button, Modal, Form, Input, Space, Descriptions, Spin } from 'antd';
import { ShopOutlined, ShoppingOutlined, CheckCircleOutlined, DollarOutlined, EditOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { TextArea } = Input;

const Retailers = () => {
    const [loading, setLoading] = useState(true);
    const [retailers, setRetailers] = useState([]);
    const [products, setProducts] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [saleModalVisible, setSaleModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [saleForm] = Form.useForm();

    useEffect(() => {
        loadRetailers();
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

    const loadRetailers = async () => {
        try {
            setLoading(true);

            const [retailersResult, productsResult] = await Promise.allSettled([
                loadRetailersData(),
                loadProductsData()
            ]);

            if (retailersResult.status === 'fulfilled' && Array.isArray(retailersResult.value)) {
                setRetailers(retailersResult.value);
            } else {
                console.warn('Failed to load retailers:', retailersResult.reason);
                setRetailers([]);
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
        } catch (error) {
            console.error('Failed to load retailers:', error);
            message.error('Failed to load retailers data');
        } finally {
            setLoading(false);
        }
    };

    const loadRetailersData = async () => {
        try {
            const userManagementActor = await AuthService.getUserManagementActor();
            const retailersData = await userManagementActor.get_users_by_role(
                AuthService.serializeEnumForCandid('Retailer')
            );
            return Array.isArray(retailersData) ? retailersData.map(retailer => ({
                ...retailer,
                role: AuthService.deserializeEnumFromCandid(retailer.role)
            })) : [];
        } catch (error) {
            console.error('Failed to load retailers data:', error);
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
            case 'mark_sold':
                return (userRole === 'Admin' || userRole === 'Retailer') &&
                    product?.current_owner?.toString() === currentUser?.id?.toString() &&
                    product?.status === 'Delivered';
            case 'view_inventory':
                return userRole === 'Admin' || userRole === 'Retailer';
            default:
                return false;
        }
    };

    const getRetailerStats = (retailerId) => {
        const retailerProducts = products.filter(p =>
            p.current_owner?.toString() === retailerId?.toString()
        );

        const soldProducts = retailerProducts.filter(p => p.status === 'Sold');
        const deliveredProducts = retailerProducts.filter(p => p.status === 'Delivered');

        const totalSales = soldProducts.reduce((sum, p) =>
            sum + (p.price * p.quantity), 0
        );

        const inventory = deliveredProducts.reduce((sum, p) =>
            sum + (p.price * p.quantity), 0
        );

        return {
            totalProducts: retailerProducts.length,
            soldProducts: soldProducts.length,
            inventory: deliveredProducts.length,
            totalSales,
            inventoryValue: inventory
        };
    };

    const getCurrentUserProducts = () => {
        if (!currentUser) return [];
        return products.filter(p =>
            p?.current_owner?.toString() === currentUser?.id?.toString()
        );
    };

    const getAvailableProducts = () => {
        if (!currentUser) return [];
        return products.filter(p =>
            p?.status === 'InTransit' &&
            p?.current_owner?.toString() !== currentUser?.id?.toString()
        );
    };

    const handleMarkAsSold = async (values) => {
        try {
            if (!canUserPerformAction('mark_sold', selectedProduct)) {
                message.error('You cannot mark this product as sold');
                return;
            }

            const supplyChainActor = await AuthService.getSupplyChainActor();
            const statusEnum = AuthService.serializeEnumForCandid('Sold');

            await supplyChainActor.update_product_status(
                selectedProduct.id,
                statusEnum,
                values.location || 'Retail Store',
                values.notes || `Product sold by ${currentUser.name}`
            );

            message.success('Product marked as sold successfully');
            setSaleModalVisible(false);
            setSelectedProduct(null);
            saleForm.resetFields();
            loadRetailers();
        } catch (error) {
            console.error('Failed to mark product as sold:', error);
            message.error('Failed to mark product as sold');
        }
    };

    const handleReceiveProduct = async (product) => {
        try {
            const supplyChainActor = await AuthService.getSupplyChainActor();
            const statusEnum = AuthService.serializeEnumForCandid('Delivered');

            await supplyChainActor.update_product_status(
                product.id,
                statusEnum,
                'Retail Store',
                `Product received at retail store by ${currentUser.name}`
            );

            message.success('Product received successfully');
            loadRetailers();
        } catch (error) {
            console.error('Failed to receive product:', error);
            message.error('Failed to receive product');
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

    const retailerColumns = [
        {
            title: 'Retailer',
            key: 'retailer',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div>{record.company_name}</div>
                    <div style={{ color: '#666' }}>{record.email}</div>
                </div>
            ),
        },
        {
            title: 'Sales Performance',
            key: 'sales',
            render: (_, record) => {
                const stats = getRetailerStats(record.id);
                return (
                    <div>
                        <div>Sold: {stats.soldProducts}</div>
                        <div>Revenue: ${stats.totalSales.toFixed(2)}</div>
                    </div>
                );
            },
        },
        {
            title: 'Inventory',
            key: 'inventory',
            render: (_, record) => {
                const stats = getRetailerStats(record.id);
                return (
                    <div>
                        <div>Products: {stats.inventory}</div>
                        <div>Value: ${stats.inventoryValue.toFixed(2)}</div>
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
            title: 'Batch',
            dataIndex: 'batch_number',
            key: 'batch_number',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const canSell = canUserPerformAction('mark_sold', record);
                const canReceive = record.status === 'InTransit' &&
                    currentUser?.role === 'Retailer';

                return (
                    <Space>
                        {canReceive && (
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => handleReceiveProduct(record)}
                            >
                                Receive
                            </Button>
                        )}
                        {canSell && (
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setSelectedProduct(record);
                                    setSaleModalVisible(true);
                                }}
                            >
                                Mark as Sold
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
                    <h1>Retailers Management</h1>
                </Col>
            </Row>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Total Retailers"
                            value={retailers.length}
                            prefix={<ShopOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Products Sold"
                            value={products.filter(p => p.status === 'Sold').length}
                            prefix={<ShoppingOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Products in Stores"
                            value={products.filter(p => p.status === 'Delivered').length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Total Sales"
                            value={products.filter(p => p.status === 'Sold')
                                .reduce((sum, p) => sum + (p.price * p.quantity), 0)}
                            prefix={<DollarOutlined />}
                            formatter={(value) => `$${value.toFixed(2)}`}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Current User Inventory (if user is a retailer) */}
            {currentUser?.role === 'Retailer' && (
                <Card title="My Store Inventory" style={{ marginBottom: 24 }}>
                    <Table
                        dataSource={getCurrentUserProducts()}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            )}

            {/* Incoming Products */}
            {currentUser?.role === 'Retailer' && (
                <Card title="Incoming Deliveries" style={{ marginBottom: 24 }}>
                    <Table
                        dataSource={getAvailableProducts()}
                        columns={productColumns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            )}

            {/* All Retailers Table */}
            <Card title="All Retailers">
                <Table
                    dataSource={retailers}
                    columns={retailerColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Mark as Sold Modal */}
            <Modal
                title="Mark Product as Sold"
                visible={saleModalVisible}
                onCancel={() => {
                    setSaleModalVisible(false);
                    setSelectedProduct(null);
                    saleForm.resetFields();
                }}
                footer={null}
            >
                {selectedProduct && (
                    <>
                        <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Product">{selectedProduct.name}</Descriptions.Item>
                            <Descriptions.Item label="Price">${selectedProduct.price}</Descriptions.Item>
                            <Descriptions.Item label="Quantity">{selectedProduct.quantity}</Descriptions.Item>
                            <Descriptions.Item label="Total Value">
                                ${(selectedProduct.price * selectedProduct.quantity).toFixed(2)}
                            </Descriptions.Item>
                        </Descriptions>

                        <Form form={saleForm} onFinish={handleMarkAsSold} layout="vertical">
                            <Form.Item
                                label="Sale Location"
                                name="location"
                                initialValue="Retail Store"
                            >
                                <Input placeholder="Enter sale location" />
                            </Form.Item>
                            <Form.Item
                                label="Sale Notes"
                                name="notes"
                            >
                                <TextArea placeholder="Enter sale details" rows={3} />
                            </Form.Item>
                            <Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        Mark as Sold
                                    </Button>
                                    <Button onClick={() => {
                                        setSaleModalVisible(false);
                                        setSelectedProduct(null);
                                        saleForm.resetFields();
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

export default Retailers;
