import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Rate, Input, Select, message, Row, Col, Statistic, Tag } from 'antd';
import { StarOutlined, UserOutlined, TrophyOutlined, WarningOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;
const { TextArea } = Input;

const Ratings = () => {
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState([]);
    const [ratingStats, setRatingStats] = useState([]);
    const [topRatedUsers, setTopRatedUsers] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [selectedRating, setSelectedRating] = useState(null);
    const [users, setUsers] = useState([]);
    const [form] = Form.useForm();
    const [reportForm] = Form.useForm();

    useEffect(() => {
        loadRatings();
    }, []);

    const loadRatings = async () => {
        try {
            setLoading(true);
            const ratingActor = await AuthService.getRatingActor();
            const userManagementActor = await AuthService.getUserManagementActor();

            // Load top rated users
            const topUsers = await ratingActor.get_top_rated_users(10);
            setTopRatedUsers(topUsers);

            // Load all users for dropdown
            const allUsers = await userManagementActor.get_all_users();
            setUsers(allUsers);

            // Load ratings by category
            const qualityRatings = await ratingActor.get_ratings_by_category('quality');
            const deliveryRatings = await ratingActor.get_ratings_by_category('delivery');
            const communicationRatings = await ratingActor.get_ratings_by_category('communication');
            const overallRatings = await ratingActor.get_ratings_by_category('overall');

            const allRatings = [...qualityRatings, ...deliveryRatings, ...communicationRatings, ...overallRatings];
            setRatings(allRatings);

        } catch (error) {
            console.error('Failed to load ratings:', error);
            message.error('Failed to load ratings data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRating = async (values) => {
        try {
            const ratingActor = await AuthService.getRatingActor();
            await ratingActor.submit_rating(
                values.rated_user_id,
                values.product_id ? [values.product_id] : [],
                values.transaction_id ? [values.transaction_id] : [],
                values.rating,
                values.review,
                values.category
            );
            message.success('Rating submitted successfully');
            setModalVisible(false);
            form.resetFields();
            loadRatings();
        } catch (error) {
            console.error('Failed to submit rating:', error);
            message.error('Failed to submit rating');
        }
    };

    const handleReportRating = async (values) => {
        try {
            const ratingActor = await AuthService.getRatingActor();
            await ratingActor.report_rating(
                selectedRating.id,
                values.reason,
                values.description
            );
            message.success('Rating reported successfully');
            setReportModalVisible(false);
            reportForm.resetFields();
            setSelectedRating(null);
        } catch (error) {
            console.error('Failed to report rating:', error);
            message.error('Failed to report rating');
        }
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.id.toString() === userId.toString());
        return user ? user.name : 'Unknown User';
    };

    const ratingColumns = [
        {
            title: 'Rater',
            key: 'rater',
            render: (_, record) => getUserName(record.rater_id),
        },
        {
            title: 'Rated User',
            key: 'rated_user',
            render: (_, record) => getUserName(record.rated_user_id),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category) => (
                <Tag color="blue">{category}</Tag>
            ),
        },
        {
            title: 'Rating',
            dataIndex: 'rating',
            key: 'rating',
            render: (rating) => <Rate disabled defaultValue={rating} />,
        },
        {
            title: 'Review',
            dataIndex: 'review',
            key: 'review',
            ellipsis: true,
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
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (timestamp) => new Date(Number(timestamp) / 1000000).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button
                    size="small"
                    danger
                    onClick={() => {
                        setSelectedRating(record);
                        setReportModalVisible(true);
                    }}
                >
                    Report
                </Button>
            ),
        },
    ];

    const topUsersColumns = [
        {
            title: 'User',
            key: 'user',
            render: (_, record) => getUserName(record.user_id),
        },
        {
            title: 'Average Rating',
            dataIndex: 'average_rating',
            key: 'average_rating',
            render: (rating) => (
                <div>
                    <Rate disabled defaultValue={rating} />
                    <div style={{ fontSize: '12px' }}>({rating.toFixed(1)})</div>
                </div>
            ),
        },
        {
            title: 'Total Ratings',
            dataIndex: 'total_ratings',
            key: 'total_ratings',
        },
        {
            title: 'Star Distribution',
            dataIndex: 'star_distribution',
            key: 'star_distribution',
            render: (distribution) => (
                <div style={{ fontSize: '12px' }}>
                    {distribution.map((count, index) => (
                        <div key={index}>
                            {index + 1}★: {count}
                        </div>
                    ))}
                </div>
            ),
        },
    ];

    const totalRatings = ratings.length;
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
    const verifiedRatings = ratings.filter(r => r.is_verified).length;

    return (
        <div style={{ padding: '24px' }}>
            <h1>Ratings Management</h1>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Ratings"
                            value={totalRatings}
                            prefix={<StarOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Average Rating"
                            value={avgRating}
                            precision={1}
                            prefix={<StarOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Verified Ratings"
                            value={verifiedRatings}
                            prefix={<TrophyOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Top Rated Users"
                            value={topRatedUsers.length}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Button
                        type="primary"
                        onClick={() => setModalVisible(true)}
                        style={{ marginBottom: '16px' }}
                    >
                        Submit Rating
                    </Button>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={14}>
                    <Card title="All Ratings">
                        <Table
                            columns={ratingColumns}
                            dataSource={ratings}
                            loading={loading}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                        />
                    </Card>
                </Col>
                <Col span={10}>
                    <Card title="Top Rated Users">
                        <Table
                            columns={topUsersColumns}
                            dataSource={topRatedUsers}
                            loading={loading}
                            rowKey="user_id"
                            pagination={{ pageSize: 5 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Submit Rating"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleSubmitRating} layout="vertical">
                    <Form.Item name="rated_user_id" label="Rate User" rules={[{ required: true }]}>
                        <Select placeholder="Select user to rate">
                            {users.map(user => (
                                <Option key={user.id} value={user.id}>{user.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                        <Select placeholder="Select category">
                            <Option value="quality">Quality</Option>
                            <Option value="delivery">Delivery</Option>
                            <Option value="communication">Communication</Option>
                            <Option value="overall">Overall</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="rating" label="Rating" rules={[{ required: true }]}>
                        <Rate />
                    </Form.Item>
                    <Form.Item name="review" label="Review" rules={[{ required: true }]}>
                        <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="product_id" label="Product ID (optional)">
                        <Input />
                    </Form.Item>
                    <Form.Item name="transaction_id" label="Transaction ID (optional)">
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Submit Rating
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Report Rating"
                visible={reportModalVisible}
                onCancel={() => setReportModalVisible(false)}
                footer={null}
            >
                <Form form={reportForm} onFinish={handleReportRating} layout="vertical">
                    <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
                        <Select placeholder="Select reason">
                            <Option value="inappropriate">Inappropriate Content</Option>
                            <Option value="fake">Fake Rating</Option>
                            <Option value="spam">Spam</Option>
                            <Option value="other">Other</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Report Rating
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Ratings;
