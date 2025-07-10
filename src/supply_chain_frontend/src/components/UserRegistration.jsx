import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, message, Space, Steps } from 'antd';
import { UserOutlined, BankOutlined, PhoneOutlined, MailOutlined, CheckOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { Step } = Steps;

const UserRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const handleRegister = async (values) => {
        try {
            setLoading(true);
            const userManagementActor = await AuthService.getUserManagementActor();

            const userRole = { [values.role]: null };

            const result = await userManagementActor.register_user(
                values.name,
                values.email,
                userRole,
                values.company_name,
                values.address,
                values.phone
            );

            if ('Ok' in result) {
                setCurrentStep(2);
                message.success('Registration successful! Welcome to the supply chain platform.');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                throw new Error(result.Err || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            message.error('Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        form.validateFields().then(() => {
            setCurrentStep(1);
        });
    };

    const prevStep = () => {
        setCurrentStep(0);
    };

    const renderPersonalInfo = () => (
        <>
            <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your full name' }]}
            >
                <Input prefix={<UserOutlined />} placeholder="Enter your full name" />
            </Form.Item>

            <Form.Item
                name="email"
                label="Email Address"
                rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' }
                ]}
            >
                <Input prefix={<MailOutlined />} placeholder="Enter your email address" />
            </Form.Item>

            <Form.Item
                name="phone"
                label="Phone Number"
                rules={[{ required: true, message: 'Please enter your phone number' }]}
            >
                <Input prefix={<PhoneOutlined />} placeholder="Enter your phone number" />
            </Form.Item>
        </>
    );

    const renderBusinessInfo = () => (
        <>
            <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select your role' }]}
            >
                <Select placeholder="Select your role in the supply chain">
                    <Option value="Supplier">Supplier</Option>
                    <Option value="Transporter">Transporter</Option>
                    <Option value="Warehouse">Warehouse</Option>
                    <Option value="Retailer">Retailer</Option>
                </Select>
            </Form.Item>

            <Form.Item
                name="company_name"
                label="Company Name"
                rules={[{ required: true, message: 'Please enter your company name' }]}
            >
                <Input prefix={<BankOutlined />} placeholder="Enter your company name" />
            </Form.Item>

            <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true, message: 'Please enter your address' }]}
            >
                <Input.TextArea rows={3} placeholder="Enter your complete address" />
            </Form.Item>
        </>
    );

    const renderSuccess = () => (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '20px' }} />
            <h3>Registration Successful!</h3>
            <p>You will be redirected to the dashboard shortly...</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <Card title="Complete Your Registration" style={{ width: 600 }}>
                <Steps current={currentStep} style={{ marginBottom: '30px' }}>
                    <Step title="Personal Information" />
                    <Step title="Business Information" />
                    <Step title="Complete" />
                </Steps>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleRegister}
                    autoComplete="off"
                >
                    {currentStep === 0 && renderPersonalInfo()}
                    {currentStep === 1 && renderBusinessInfo()}
                    {currentStep === 2 && renderSuccess()}

                    {currentStep < 2 && (
                        <Form.Item>
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Button
                                    disabled={currentStep === 0}
                                    onClick={prevStep}
                                >
                                    Previous
                                </Button>
                                {currentStep === 0 ? (
                                    <Button type="primary" onClick={nextStep}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="primary" htmlType="submit" loading={loading}>
                                        Complete Registration
                                    </Button>
                                )}
                            </Space>
                        </Form.Item>
                    )}
                </Form>
            </Card>
        </div>
    );
};

export default UserRegistration;
