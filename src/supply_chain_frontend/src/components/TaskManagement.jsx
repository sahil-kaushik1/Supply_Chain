import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, message, Row, Col, Space } from 'antd';
import { PlusOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import AuthService from '../services/AuthService';

const { Option } = Select;
const { TextArea } = Input;

const TaskManagement = () => {
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        loadTasks();
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

    const loadTasks = async () => {
        try {
            setLoading(true);
            // Mock task data - replace with actual API calls
            const mockTasks = [
                {
                    id: '1',
                    title: 'Quality Control Check',
                    description: 'Inspect incoming batch #1234',
                    assignedTo: 'Warehouse',
                    status: 'Pending',
                    priority: 'High',
                    dueDate: '2025-01-15',
                    createdBy: 'Admin',
                    category: 'Quality Control'
                },
                {
                    id: '2',
                    title: 'Transport Coordination',
                    description: 'Arrange pickup for delivery route A-5',
                    assignedTo: 'Transporter',
                    status: 'In Progress',
                    priority: 'Medium',
                    dueDate: '2025-01-12',
                    createdBy: 'Admin',
                    category: 'Logistics'
                },
                {
                    id: '3',
                    title: 'Inventory Update',
                    description: 'Update stock levels for Q4 items',
                    assignedTo: 'Supplier',
                    status: 'Completed',
                    priority: 'Low',
                    dueDate: '2025-01-10',
                    createdBy: 'Admin',
                    category: 'Inventory'
                }
            ];
            setTasks(mockTasks);
        } catch (error) {
            console.error('Failed to load tasks:', error);
            message.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const canUserPerformAction = (action, task) => {
        if (!currentUser) return false;

        const userRole = currentUser.role;

        // Admin can do everything
        if (userRole === 'Admin') return true;

        switch (action) {
            case 'create':
                return ['Admin', 'Supplier'].includes(userRole);
            case 'complete':
                return task.assignedTo === userRole || userRole === 'Admin';
            case 'view':
                return true; // All authenticated users can view
            default:
                return false;
        }
    };

    const handleCreateTask = async (values) => {
        try {
            if (!canUserPerformAction('create')) {
                message.error('You do not have permission to create tasks');
                return;
            }

            const newTask = {
                id: Date.now().toString(),
                title: values.title,
                description: values.description,
                assignedTo: values.assignedTo,
                status: 'Pending',
                priority: values.priority,
                dueDate: values.dueDate,
                createdBy: currentUser?.role || 'Unknown',
                category: values.category
            };

            setTasks(prevTasks => [...prevTasks, newTask]);
            setModalVisible(false);
            form.resetFields();
            message.success('Task created successfully');
        } catch (error) {
            console.error('Failed to create task:', error);
            message.error('Failed to create task');
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!canUserPerformAction('complete', task)) {
                message.error('You do not have permission to complete this task');
                return;
            }

            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId
                        ? { ...task, status: 'Completed' }
                        : task
                )
            );
            message.success('Task completed successfully');
        } catch (error) {
            console.error('Failed to complete task:', error);
            message.error('Failed to complete task');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'orange',
            'In Progress': 'blue',
            'Completed': 'green'
        };
        return colors[status] || 'default';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'High': 'red',
            'Medium': 'orange',
            'Low': 'green'
        };
        return colors[priority] || 'default';
    };

    const getTasksForUser = () => {
        if (!currentUser) return [];

        const userRole = currentUser.role;

        if (userRole === 'Admin') {
            return tasks; // Admin can see all tasks
        }

        // Users can see tasks assigned to their role or created by them
        return tasks.filter(task =>
            task.assignedTo === userRole || task.createdBy === userRole
        );
    };

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Assigned To',
            dataIndex: 'assignedTo',
            key: 'assignedTo',
            render: (role) => <Tag color="blue">{role}</Tag>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            key: 'dueDate',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.status !== 'Completed' && canUserPerformAction('complete', record) && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={() => handleCompleteTask(record.id)}
                        >
                            Complete
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const userTasks = getTasksForUser();

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Task Management</h1>
                {canUserPerformAction('create') && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalVisible(true)}
                    >
                        Create Task
                    </Button>
                )}
            </div>

            {/* Task Statistics */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <ClockCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                            <h3>{userTasks.filter(t => t.status === 'Pending').length}</h3>
                            <p>Pending Tasks</p>
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <ClockCircleOutlined style={{ fontSize: '24px', color: '#orange' }} />
                            <h3>{userTasks.filter(t => t.status === 'In Progress').length}</h3>
                            <p>In Progress</p>
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <CheckOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                            <h3>{userTasks.filter(t => t.status === 'Completed').length}</h3>
                            <p>Completed</p>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Tasks Table */}
            <Card title={`Tasks (${currentUser?.role || 'Unknown Role'})`}>
                <Table
                    dataSource={userTasks}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'No tasks available' }}
                />
            </Card>

            {/* Create Task Modal */}
            <Modal
                title="Create New Task"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                okText="Create Task"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateTask}
                >
                    <Form.Item
                        name="title"
                        label="Task Title"
                        rules={[{ required: true, message: 'Please enter task title' }]}
                    >
                        <Input placeholder="Enter task title" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                        rules={[{ required: true, message: 'Please enter task description' }]}
                    >
                        <TextArea rows={3} placeholder="Enter task description" />
                    </Form.Item>

                    <Form.Item
                        name="assignedTo"
                        label="Assign To"
                        rules={[{ required: true, message: 'Please select assignee' }]}
                    >
                        <Select placeholder="Select role to assign task">
                            <Option value="Supplier">Supplier</Option>
                            <Option value="Transporter">Transporter</Option>
                            <Option value="Warehouse">Warehouse</Option>
                            <Option value="Retailer">Retailer</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="priority"
                        label="Priority"
                        rules={[{ required: true, message: 'Please select priority' }]}
                    >
                        <Select placeholder="Select priority">
                            <Option value="High">High</Option>
                            <Option value="Medium">Medium</Option>
                            <Option value="Low">Low</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="category"
                        label="Category"
                        rules={[{ required: true, message: 'Please select category' }]}
                    >
                        <Select placeholder="Select category">
                            <Option value="Quality Control">Quality Control</Option>
                            <Option value="Logistics">Logistics</Option>
                            <Option value="Inventory">Inventory</Option>
                            <Option value="Compliance">Compliance</Option>
                            <Option value="Maintenance">Maintenance</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="dueDate"
                        label="Due Date"
                        rules={[{ required: true, message: 'Please enter due date' }]}
                    >
                        <Input type="date" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default TaskManagement;
