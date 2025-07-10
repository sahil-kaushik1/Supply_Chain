import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, message } from 'antd';
import { ShopOutlined, ShoppingOutlined, CheckCircleOutlined, DollarOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const Retailers = () => {
    const [loading, setLoading] = useState(true);
    const [retailers, setRetailers] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        loadRetailers();
    }, []);

    const loadRetailers = async () => {
        try {
            setLoading(true);
            const userManagementActor = await AuthService.getUserManagementActor();
            const supplyChainActor = await AuthService.getSupplyChainActor();

            // Load retailers
            const retailersData = await userManagementActor.get_users_by_role({ Retailer: null });
            setRetailers(retailersData);

            // Load products
            const allProducts = await supplyChainActor.get_all_products();
            setProducts(allProducts);

        } catch (error) {
            console.error('Failed to load retailers:', error);
            message.error('Failed to load retailers data');
        } finally {
            setLoading(false);
        }
    };

    const getRetailerStats = (retailerId) => {
        const retailerProducts = products.filter(p =>
            p.current_owner.toString() === retailerId.toString()
        );
        const soldProducts = retailerProducts.filter(p => p.status === 'Sold');
        const deliveredProducts = retailerProducts.filter(p => p.status === 'Delivered');

        const totalSales = soldProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const inventory = deliveredProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

        return {
            totalProducts: retailerProducts.length,
            soldProducts: soldProducts.length,
            inventory: deliveredProducts.length,
            totalSales,
            inventoryValue: inventory
        };
    };

    const columns = [
        {
            title: 'Retailer',
            key: 'retailer',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div style={{ color: '#666' }}>{record.company_name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{record.email}</div>
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_verified',
            key: 'status',
            render: (verified) => (
                <Tag color={verified ? 'green' : 'orange'}>
                    {verified ? 'Verified' : 'Pending'}
                </Tag>
            ),
        },
        {
            title: 'Products',
            key: 'products',
            render: (_, record) => {
                const stats = getRetailerStats(record.id);
                return (
                    <div>
                        <div>Total: {stats.totalProducts}</div>
                        <div>Sold: {stats.soldProducts}</div>
                        <div>Inventory: {stats.inventory}</div>
                    </div>
                );
            },
        },
        {
            title: 'Sales',
            key: 'sales',
            render: (_, record) => {
                const stats = getRetailerStats(record.id);
                return `$${stats.totalSales.toFixed(2)}`;
            },
        },
        {
            title: 'Inventory Value',
            key: 'inventory_value',
            render: (_, record) => {
                const stats = getRetailerStats(record.id);
                return `$${stats.inventoryValue.toFixed(2)}`;
            },
        },
        {
            title: 'Success Rate',
            key: 'success_rate',
            render: (_, record) => {
                const stats = getRetailerStats(record.id);
                const rate = stats.totalProducts > 0 ? (stats.soldProducts / stats.totalProducts) * 100 : 0;
                return `${rate.toFixed(1)}%`;
            },
        },
        {
            title: 'Location',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'Contact',
            dataIndex: 'phone',
            key: 'phone',
        },
    ];

    const totalRetailers = retailers.length;
    const verifiedRetailers = retailers.filter(r => r.is_verified).length;
    const totalSales = retailers.reduce((sum, r) => sum + getRetailerStats(r.id).totalSales, 0);
    const totalInventory = retailers.reduce((sum, r) => sum + getRetailerStats(r.id).inventoryValue, 0);

    return (
        <div style={{ padding: '24px' }}>
            <h1>Retailers Management</h1>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Retailers"
                            value={totalRetailers}
                            prefix={<ShopOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Verified Retailers"
                            value={verifiedRetailers}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Sales"
                            value={totalSales}
                            prefix={<DollarOutlined />}
                            precision={2}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Inventory"
                            value={totalInventory}
                            prefix={<ShoppingOutlined />}
                            precision={2}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Table
                    columns={columns}
                    dataSource={retailers}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default Retailers;
