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

    // CRITICAL FIX: Proper enum handling for user roles
    const USER_ROLES = {
        SUPPLIER: 'Supplier',
        TRANSPORTER: 'Transporter',
        WAREHOUSE: 'Warehouse',
        RETAILER: 'Retailer'
    };

    const validateFormData = (values) => {
        const errors = [];
        const requiredFields = [
            { key: 'name', label: 'Full Name', minLength: 2 },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'role', label: 'Role' },
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

        // Role validation
        if (values.role && !Object.values(USER_ROLES).includes(values.role)) {
            errors.push('Please select a valid role');
        }

        return errors;
    };

    // CRITICAL FIX: Enhanced form submission with proper enum serialization
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

            const cleanedData = {
                name: values.name?.trim() || '',
                email: values.email?.trim()?.toLowerCase() || '',
                phone: values.phone?.trim() || '',
                role: values.role || '',
                company_name: values.company_name?.trim() || '',
                address: values.address?.trim() || ''
            };

            setProgress(40);

            await AuthService.ensureReady();
            setProgress(50);

            const userManagementActor = await AuthService.getUserManagementActor();
            setProgress(60);

            // CRITICAL FIX: Properly serialize role enum for Candid
            const userRole = AuthService.serializeEnumForCandid(cleanedData.role);

            setProgress(70);

            const registrationCall = async () => {
                return await userManagementActor.register_user(
                    cleanedData.name,
                    cleanedData.email,
                    userRole, // FIXED: Properly serialized enum
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
                message.success('Registration successful! Welcome to the platform.');

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
        <Card style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={3}>Registration Successful!</Title>
            <Text>Your account has been created successfully. Redirecting to dashboard...</Text>
            <Progress percent={100} status="success" style={{ marginTop: 16 }} />
        </Card>
    );

    if (success) {
        return renderSuccessMessage();
    }

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Card title="User Registration" bordered={false}>
                {validationErrors.length > 0 && (
                    <Alert
                        message="Validation Errors"
                        description={
                            <ul style={{ margin: 0 }}>
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        }
                        type="error"
                        closable
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    onFinishFailed={handleSubmitFailed}
                    autoComplete="off"
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
                                    placeholder="Enter your email"
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
                                    placeholder="Enter your phone number"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Role"
                                name="role"
                                rules={[
                                    { required: true, message: 'Please select your role' }
                                ]}
                            >
                                <Select placeholder="Select your role" size="large">
                                    {Object.entries(USER_ROLES).map(([key, value]) => (
                                        <Option key={key} value={value}>
                                            {value}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
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
                                    placeholder="Enter your company name"
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
                                <Input
                                    prefix={<HomeOutlined />}
                                    placeholder="Enter your address"
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            size="large"
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Registering...' : 'Register'}
                        </Button>
                    </Form.Item>
                </Form>

                {progress > 0 && (
                    <Progress percent={progress} style={{ marginTop: 16 }} />
                )}
            </Card>
        </div>
    );
};

export default UserRegistration;
