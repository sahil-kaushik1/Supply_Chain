import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Select, DatePicker, Input, message, Row, Col, Statistic, Tag, Spin } from 'antd';
import { FileTextOutlined, BarChartOutlined, TrophyOutlined, AlertOutlined, DownloadOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [performanceMetrics, setPerformanceMetrics] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [reportDetailModal, setReportDetailModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadReports();
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

    const loadReports = async () => {
        try {
            setLoading(true);

            // Load all data with proper error handling
            const [reportsResult, analyticsResult, metricsResult] = await Promise.allSettled([
                loadPublicReports(),
                loadAnalytics(),
                loadPerformanceMetrics()
            ]);

            // Handle reports
            if (reportsResult.status === 'fulfilled' && Array.isArray(reportsResult.value)) {
                setReports(reportsResult.value);
            } else {
                console.warn('Failed to load reports:', reportsResult.reason);
                setReports([]);
            }

            // Handle analytics
            if (analyticsResult.status === 'fulfilled' && analyticsResult.value) {
                setAnalytics(analyticsResult.value);
            } else {
                console.warn('Failed to load analytics:', analyticsResult.reason);
                setAnalytics(null);
            }

            // Handle performance metrics
            if (metricsResult.status === 'fulfilled' && Array.isArray(metricsResult.value)) {
                setPerformanceMetrics(metricsResult.value);
            } else {
                console.warn('Failed to load performance metrics:', metricsResult.reason);
                setPerformanceMetrics([]);
            }

        } catch (error) {
            console.error('Failed to load reports:', error);
            message.error('Failed to load reports data');
        } finally {
            setLoading(false);
        }
    };

    const loadPublicReports = async () => {
        try {
            const reportingActor = await AuthService.getReportingActor();
            const publicReports = await reportingActor.get_public_reports();
            return Array.isArray(publicReports) ? publicReports : [];
        } catch (error) {
            console.error('Failed to load public reports:', error);
            return [];
        }
    };

    const loadAnalytics = async () => {
        try {
            const reportingActor = await AuthService.getReportingActor();
            const analyticsData = await reportingActor.get_latest_analytics();
            return analyticsData;
        } catch (error) {
            console.error('Failed to load analytics:', error);
            return null;
        }
    };

    const loadPerformanceMetrics = async () => {
        try {
            const reportingActor = await AuthService.getReportingActor();
            const metricsData = await reportingActor.get_all_performance_metrics();
            return Array.isArray(metricsData) ? metricsData : [];
        } catch (error) {
            console.error('Failed to load performance metrics:', error);
            return [];
        }
    };

    const handleGenerateReport = async (values) => {
        try {
            const reportingActor = await AuthService.getReportingActor();
            const periodStart = values.period ? values.period[0].valueOf() * 1000000 : Date.now() * 1000000;
            const periodEnd = values.period ? values.period[1].valueOf() * 1000000 : Date.now() * 1000000;

            await reportingActor.generate_report(
                values.title,
                values.report_type,
                periodStart,
                periodEnd,
                values.is_public || false
            );

            message.success('Report generated successfully');
            setModalVisible(false);
            form.resetFields();
            loadReports();
        } catch (error) {
            console.error('Failed to generate report:', error);
            message.error('Failed to generate report');
        }
    };

    const handleDownloadReport = (report) => {
        try {
            const reportData = {
                title: report.title,
                type: report.report_type,
                data: report.data || [],
                summary: report.summary,
                generated_at: new Date(Number(report.created_at) / 1000000).toISOString(),
            };

            const dataStr = JSON.stringify(reportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `${report.title}_${Date.now()}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            message.success('Report downloaded successfully');
        } catch (error) {
            console.error('Failed to download report:', error);
            message.error('Failed to download report');
        }
    };

    const reportColumns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (title) => title || 'Untitled Report',
        },
        {
            title: 'Type',
            dataIndex: 'report_type',
            key: 'report_type',
            render: (type) => (
                <Tag color="blue">{type || 'Unknown'}</Tag>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (timestamp) => {
                try {
                    return new Date(Number(timestamp) / 1000000).toLocaleDateString();
                } catch {
                    return 'Unknown Date';
                }
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Tag color={record.is_public ? 'green' : 'orange'}>
                    {record.is_public ? 'Public' : 'Private'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div>
                    <Button
                        type="link"
                        onClick={() => {
                            setSelectedReport(record);
                            setReportDetailModal(true);
                        }}
                    >
                        View
                    </Button>
                    <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadReport(record)}
                    >
                        Download
                    </Button>
                </div>
            ),
        },
    ];

    // Safe analytics data with fallbacks
    const safeAnalytics = analytics || {
        total_products: 0,
        products_in_transit: 0,
        products_delivered: 0,
        products_lost_damaged: 0,
        average_transit_time: 0,
        top_performers: [],
        bottlenecks: []
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Reports & Analytics</h1>
                <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    onClick={() => setModalVisible(true)}
                >
                    Generate Report
                </Button>
            </div>

            {/* Analytics Overview */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Products"
                            value={safeAnalytics.total_products}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="In Transit"
                            value={safeAnalytics.products_in_transit}
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Delivered"
                            value={safeAnalytics.products_delivered}
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Issues"
                            value={safeAnalytics.products_lost_damaged}
                            prefix={<AlertOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Reports Table */}
            <Card title="Generated Reports">
                <Table
                    dataSource={reports}
                    columns={reportColumns}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'No reports available' }}
                />
            </Card>

            {/* Generate Report Modal */}
            <Modal
                title="Generate New Report"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                okText="Generate"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleGenerateReport}
                >
                    <Form.Item
                        name="title"
                        label="Report Title"
                        rules={[{ required: true, message: 'Please enter report title' }]}
                    >
                        <Input placeholder="Enter report title" />
                    </Form.Item>

                    <Form.Item
                        name="report_type"
                        label="Report Type"
                        rules={[{ required: true, message: 'Please select report type' }]}
                    >
                        <Select placeholder="Select report type">
                            <Option value="SUPPLY_CHAIN_OVERVIEW">Supply Chain Overview</Option>
                            <Option value="PERFORMANCE_REPORT">Performance Report</Option>
                            <Option value="TRANSACTION_SUMMARY">Transaction Summary</Option>
                            <Option value="QUALITY_METRICS">Quality Metrics</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="period"
                        label="Report Period"
                    >
                        <RangePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="is_public"
                        label="Public Report"
                        valuePropName="checked"
                    >
                        <input type="checkbox" /> Make this report public
                    </Form.Item>
                </Form>
            </Modal>

            {/* Report Detail Modal */}
            <Modal
                title="Report Details"
                visible={reportDetailModal}
                onCancel={() => setReportDetailModal(false)}
                footer={[
                    <Button key="download" onClick={() => handleDownloadReport(selectedReport)}>
                        Download
                    </Button>,
                    <Button key="close" onClick={() => setReportDetailModal(false)}>
                        Close
                    </Button>,
                ]}
                width={800}
            >
                {selectedReport && (
                    <div>
                        <p><strong>Title:</strong> {selectedReport.title}</p>
                        <p><strong>Type:</strong> {selectedReport.report_type}</p>
                        <p><strong>Summary:</strong> {selectedReport.summary}</p>
                        <p><strong>Generated:</strong> {new Date(Number(selectedReport.created_at) / 1000000).toLocaleString()}</p>

                        {Array.isArray(selectedReport.data) && selectedReport.data.length > 0 && (
                            <div>
                                <h4>Report Data:</h4>
                                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                    {selectedReport.data.map(([key, value], index) => (
                                        <p key={index}><strong>{key}:</strong> {value}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Reports;
