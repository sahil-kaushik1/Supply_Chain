import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Modal, Row, Col, Statistic, Progress, Rate } from 'antd';
import { TruckOutlined, ClockCircleOutlined, CheckCircleOutlined, StarOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const Transporters = () => {
    const [loading, setLoading] = useState(true);
    const [transporters, setTransporters] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [ratings, setRatings] = useState([]);
    const [performanceMetrics, setPerformanceMetrics] = useState([]);

    useEffect(() => {
        loadTransporters();
    }, []);

    const loadTransporters = async () => {
        try {
            setLoading(true);
            const userManagementActor = await AuthService.getUserManagementActor();
            const supplyChainActor = await AuthService.getSupplyChainActor();
            const ratingActor = await AuthService.getRatingActor();
            const reportingActor = await AuthService.getReportingActor();

            // Load transporters
            const transportersData = await userManagementActor.get_users_by_role({ Transporter: null });
            setTransporters(transportersData);

            // Load performance metrics
            const metricsData = await reportingActor.get_all_performance_metrics();
            setPerformanceMetrics(metricsData);

            // Load ratings for transporters
            const ratingsData = await ratingActor.get_top_rated_users(100);
            setRatings(ratingsData);

        } catch (error) {
            console.error('Failed to load transporters:', error);
            message.error('Failed to load transporters data');
        } finally {
            setLoading(false);
        }
    };

    const getTransporterMetrics = (transporterId) => {
        const metrics = performanceMetrics.find(m => m.user_id.toString() === transporterId.toString());
        return metrics || {
            total_transactions: 0,
            successful_transactions: 0,
            reliability_score: 0,
            average_delivery_time: 0,
            customer_satisfaction: 0
        };
    };

    const getTransporterRating = (transporterId) => {
        const rating = ratings.find(r => r.user_id.toString() === transporterId.toString());
        return rating ? rating.average_rating : 0;
    };

    const columns = [
        {
            title: 'Transporter',
            key: 'transporter',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div style={{ color: '#666' }}>{record.company_name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{record.phone}</div>
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
            title: 'Rating',
            key: 'rating',
            render: (_, record) => {
                const rating = getTransporterRating(record.id);
                return (
                    <div>
                        <Rate disabled defaultValue={rating} />
                        <div style={{ fontSize: '12px' }}>({rating.toFixed(1)})</div>
                    </div>
                );
            },
        },
        {
            title: 'Reliability',
            key: 'reliability',
            render: (_, record) => {
                const metrics = getTransporterMetrics(record.id);
                return (
                    <div>
                        <Progress
                            percent={metrics.reliability_score}
                            size="small"
                            status={metrics.reliability_score >= 90 ? 'success' : 'normal'}
                        />
                        <div style={{ fontSize: '12px' }}>{metrics.reliability_score.toFixed(1)}%</div>
                    </div>
                );
            },
        },
        {
            title: 'Deliveries',
            key: 'deliveries',
            render: (_, record) => {
                const metrics = getTransporterMetrics(record.id);
                return (
                    <div>
                        <div>Total: {metrics.total_transactions}</div>
                        <div>Success: {metrics.successful_transactions}</div>
                    </div>
                );
            },
        },
        {
            title: 'Avg. Delivery Time',
            key: 'delivery_time',
            render: (_, record) => {
                const metrics = getTransporterMetrics(record.id);
                return `${metrics.average_delivery_time.toFixed(1)} days`;
            },
        },
        {
            title: 'Location',
            dataIndex: 'address',
            key: 'address',
        },
    ];

    const totalTransporters = transporters.length;
    const verifiedTransporters = transporters.filter(t => t.is_verified).length;
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.average_rating, 0) / ratings.length : 0;
    const avgReliability = performanceMetrics.length > 0 ?
        performanceMetrics.reduce((sum, m) => sum + m.reliability_score, 0) / performanceMetrics.length : 0;

    return (
        <div style={{ padding: '24px' }}>
            <h1>Transporters Management</h1>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Transporters"
                            value={totalTransporters}
                            prefix={<TruckOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Verified Transporters"
                            value={verifiedTransporters}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Average Rating"
                            value={avgRating}
                            prefix={<StarOutlined />}
                            precision={1}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Average Reliability"
                            value={avgReliability}
                            suffix="%"
                            precision={1}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Table
                    columns={columns}
                    dataSource={transporters}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default Transporters;
