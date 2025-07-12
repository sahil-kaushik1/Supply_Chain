import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Progress, Spin, Alert, Space, Typography, Row, Col } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined, HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { Title, Text } = Typography;

const UserRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [form] = Form.useForm();
    const [validationErrors, setValidationErrors] = useState([]);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Simplified - all users get Admin role automatically
    const USER_ROLES = {
        ADMIN: 'Admin'
    };

    const validateFormData = (values) => {
        const errors = [];

        const requiredFields = [
            { key: 'name', label: 'Full Name', minLength: 2 },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'company_name', label: 'Company Name', minLength: 2 },
            { key: 'address', label: 'Address', minLength: 5 }
        ];

        if (!values || typeof values !== 'object') {
            errors.push('Invalid form data structure');
            return errors;
        }

        for (const field of requiredFields) {
            const value = values[field.key];
            if (!value || value === null || value === undefined) {
                errors.push(`${field.label} is required`);
                continue;
            }

            if (typeof value === 'string') {
                const trimmedValue = value.trim();
                if (trimmedValue === '') {
                    errors.push(`${field.label} cannot be empty`);
                    continue;
                }

                if (field.minLength && trimmedValue.length < field.minLength) {
                    errors.push(`${field.label} must be at least ${field.minLength} characters long`);
                }
            }
        }

        // Email validation
        if (values.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(values.email.trim())) {
                errors.push('Please enter a valid email address');
            }
        }

        // Phone validation
        if (values.phone) {
            const cleanPhone = values.phone.replace(/[\s\-\(\)]/g, '');
            if (!/^[\+]?[\d]{7,15}$/.test(cleanPhone)) {
                errors.push('Please enter a valid phone number (7-15 digits)');
            }
        }

        return errors;
    };

    // Enhanced form submission with automatic Admin role assignment
    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            setProgress(10);
            setValidationErrors([]);

            const errors = validateFormData(values);
            if (errors.length > 0) {
                setValidationErrors(errors);
                setProgress(0);
                message.error('Please fix the validation errors before submitting');
                return;
            }

            setProgress(25);

            // Automatically assign Admin role for simplified system
            const cleanedData = {
                name: values.name?.trim() || '',
                email: values.email?.trim()?.toLowerCase() || '',
                phone: values.phone?.trim() || '',
                role: 'Admin', // Always Admin for simplified system
                company_name: values.company_name?.trim() || '',
                address: values.address?.trim() || ''
            };

            setProgress(40);
            await AuthService.ensureReady();
            setProgress(50);

            const userManagementActor = await AuthService.getUserManagementActor();
            setProgress(60);

            // Properly serialize role enum for Candid
            const userRole = AuthService.serializeEnumForCandid(cleanedData.role);
            setProgress(70);

            const registrationCall = async () => {
                return await userManagementActor.register_user(
                    cleanedData.name,
                    cleanedData.email,
                    userRole,
                    cleanedData.company_name,
                    cleanedData.address,
                    cleanedData.phone
                );
            };

            const result = await AuthService.retryWithBackoff(registrationCall, 3);
            setProgress(90);

            if ('Ok' in result) {
                setProgress(100);
                setSuccess(true);
                message.success('Registration successful! You now have full admin access to the platform.');
                form.resetFields();
                setValidationErrors([]);

                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                throw new Error(result.Err || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration failed:', error);
            setProgress(0);

            let errorMessage = 'Registration failed. Please try again.';

            if (error.message.includes('already registered')) {
                errorMessage = 'User already registered. Please try logging in instead.';
            } else if (error.message.includes('certificate') || error.message.includes('Certificate')) {
                errorMessage = 'Certificate verification failed. Please ensure DFX is running.';
            } else if (error.message.includes('Agent') || error.message.includes('agent')) {
                errorMessage = 'Authentication error. Please refresh the page and try again.';
                await AuthService.refreshPlugSession();
            } else if (error.message.includes('fetch') || error.message.includes('network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFailed = (errorInfo) => {
        console.log('Form submission failed:', errorInfo);
        const fieldsWithErrors = errorInfo.errorFields?.map(field => field.name.join('.')) || [];
        message.error(`Please check required fields: ${fieldsWithErrors.join(', ')}`);
    };

    const renderSuccessMessage = () => (
        <Card style={{ textAlign: 'center', marginTop: '20px' }}>
            <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
            <Title level={3} style={{ color: '#52c41a' }}>Registration Successful!</Title>
            <Text>
                Welcome to the Supply Chain Management Platform! <br />
                You have been granted full administrative access to all features.
                <br />
                Redirecting to dashboard...
            </Text>
        </Card>
    );

    if (success) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
                {renderSuccessMessage()}
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <Card>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                    <Title level={2}>Register for Supply Chain Platform</Title>
                    <Text type="secondary">
                        Register to get full administrative access to all supply chain features
                    </Text>
                </div>

                {validationErrors.length > 0 && (
                    <Alert
                        message="Please fix the following errors:"
                        description={
                            <ul style={{ marginBottom: 0 }}>
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        }
                        type="error"
                        closable
                        style={{ marginBottom: '24px' }}
                    />
                )}

                {progress > 0 && progress < 100 && (
                    <div style={{ marginBottom: '24px' }}>
                        <Text>Registration Progress:</Text>
                        <Progress percent={progress} status="active" />
                    </div>
                )}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    onFinishFailed={handleSubmitFailed}
                    requiredMark={true}
                >
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Full Name"
                                name="name"
                                rules={[
                                    { required: true, message: 'Please enter your full name' },
                                    { min: 2, message: 'Name must be at least 2 characters' }
                                ]}
                            >
                                <Input
                                    prefix={<UserOutlined />}
                                    placeholder="Enter your full name"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Email Address"
                                name="email"
                                rules={[
                                    { required: true, message: 'Please enter your email' },
                                    { type: 'email', message: 'Please enter a valid email' }
                                ]}
                            >
                                <Input
                                    prefix={<MailOutlined />}
                                    placeholder="your.email@company.com"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item
                                label="Phone Number"
                                name="phone"
                                rules={[
                                    { required: true, message: 'Please enter your phone number' }
                                ]}
                            >
                                <Input
                                    prefix={<PhoneOutlined />}
                                    placeholder="+1 (555) 123-4567"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Company Name"
                                name="company_name"
                                rules={[
                                    { required: true, message: 'Please enter your company name' },
                                    { min: 2, message: 'Company name must be at least 2 characters' }
                                ]}
                            >
                                <Input
                                    prefix={<BankOutlined />}
                                    placeholder="Your Company Name"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Address"
                                name="address"
                                rules={[
                                    { required: true, message: 'Please enter your address' },
                                    { min: 5, message: 'Address must be at least 5 characters' }
                                ]}
                            >
                                <Input.TextArea
                                    placeholder="Company Address"
                                    rows={3}
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Alert
                        message="Admin Access Granted"
                        description="All registered users receive full administrative privileges in this demo system, allowing complete control over suppliers, transporters, warehouses, and retailers."
                        type="info"
                        showIcon
                        style={{ marginBottom: '24px' }}
                    />

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            block
                            icon={<UserOutlined />}
                        >
                            {loading ? 'Registering...' : 'Register with Full Access'}
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                            Already have an account?{' '}
                            <Button type="link" onClick={() => navigate('/')}>
                                Login here
                            </Button>
                        </Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default UserRegistration;
