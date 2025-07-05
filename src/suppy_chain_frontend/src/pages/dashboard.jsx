import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    User,
    Package,
    Truck,
    Store,
    Shield,
    BarChart3,
    Globe,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Users,
    Settings,
    Bell,
    Search,
    Filter,
    Download,
    Plus,
    Eye,
    MapPin,
    Calendar,
    ChevronRight
} from "lucide-react";

// Mock RoleDashboard component
const RoleDashboard = ({ role }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'info', message: 'New shipment from Supplier A', time: '2 mins ago' },
        { id: 2, type: 'warning', message: 'Delayed delivery expected', time: '1 hour ago' },
        { id: 3, type: 'success', message: 'Quality check completed', time: '3 hours ago' }
    ]);

    const roleConfig = {
        Supplier: {
            icon: Package,
            color: 'from-blue-600 to-blue-800',
            bgColor: 'bg-blue-50',
            tabs: ['overview', 'inventory', 'orders', 'quality'],
            metrics: [
                { label: 'Active Products', value: '1,247', change: '+12%', icon: Package },
                { label: 'Pending Orders', value: '34', change: '+5%', icon: Clock },
                { label: 'Quality Score', value: '98.5%', change: '+0.3%', icon: CheckCircle },
                { label: 'Revenue', value: '$45.2K', change: '+18%', icon: TrendingUp }
            ]
        },
        Distributor: {
            icon: Truck,
            color: 'from-green-600 to-green-800',
            bgColor: 'bg-green-50',
            tabs: ['overview', 'shipments', 'routes', 'partners'],
            metrics: [
                { label: 'Active Shipments', value: '156', change: '+8%', icon: Truck },
                { label: 'Routes Optimized', value: '23', change: '+15%', icon: MapPin },
                { label: 'On-Time Delivery', value: '94.2%', change: '+2.1%', icon: Clock },
                { label: 'Partner Network', value: '87', change: '+6%', icon: Users }
            ]
        },
        Retailer: {
            icon: Store,
            color: 'from-purple-600 to-purple-800',
            bgColor: 'bg-purple-50',
            tabs: ['overview', 'inventory', 'sales', 'customers'],
            metrics: [
                { label: 'Products in Stock', value: '2,341', change: '+7%', icon: Package },
                { label: 'Daily Sales', value: '$12.4K', change: '+23%', icon: TrendingUp },
                { label: 'Customer Satisfaction', value: '4.8/5', change: '+0.2', icon: Users },
                { label: 'Store Locations', value: '12', change: '0%', icon: Store }
            ]
        },
        Validator: {
            icon: Shield,
            color: 'from-orange-600 to-orange-800',
            bgColor: 'bg-orange-50',
            tabs: ['overview', 'audits', 'compliance', 'reports'],
            metrics: [
                { label: 'Audits Completed', value: '89', change: '+11%', icon: Shield },
                { label: 'Compliance Rate', value: '99.1%', change: '+0.5%', icon: CheckCircle },
                { label: 'Active Validations', value: '45', change: '+3%', icon: Eye },
                { label: 'Risk Assessments', value: '12', change: '+2%', icon: AlertCircle }
            ]
        }
    };

    const config = roleConfig[role];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                duration: 0.5
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.4 }
        }
    };

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div
                className={`${config.bgColor} rounded-2xl p-6 border border-slate-200/60`}
                variants={itemVariants}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center shadow-lg`}>
                            <config.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{role} Dashboard</h2>
                            <p className="text-slate-600">Welcome back! Here's your overview.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-white/60 rounded-lg transition-colors">
                            <Bell className="w-5 h-5 text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-white/60 rounded-lg transition-colors">
                            <Settings className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Metrics Grid */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                variants={itemVariants}
            >
                {config.metrics.map((metric, index) => (
                    <div key={index} className="bg-white/80 backdrop-blur-lg rounded-xl p-6 border border-slate-200/60 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <metric.icon className="w-8 h-8 text-slate-600" />
                            <span className={`text-sm font-medium ${metric.change.startsWith('+') ? 'text-green-600' :
                                metric.change.startsWith('-') ? 'text-red-600' : 'text-slate-600'
                                }`}>
                                {metric.change}
                            </span>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-800 mb-1">{metric.value}</div>
                            <div className="text-sm text-slate-600">{metric.label}</div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Tabs */}
            <motion.div
                className="bg-white/80 backdrop-blur-lg rounded-xl border border-slate-200/60 shadow-lg"
                variants={itemVariants}
            >
                <div className="border-b border-slate-200">
                    <nav className="flex space-x-8 px-6">
                        {config.tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab
                                    ? 'border-slate-700 text-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Recent Activity */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
                                <div className="space-y-3">
                                    {notifications.map((notification) => (
                                        <div key={notification.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' :
                                                notification.type === 'warning' ? 'bg-yellow-500' :
                                                    'bg-blue-500'
                                                }`}></div>
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-800">{notification.message}</p>
                                                <p className="text-xs text-slate-500">{notification.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                                        <Plus className="w-5 h-5 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-800">Add New Item</span>
                                    </button>
                                    <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                                        <Download className="w-5 h-5 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-800">Export Report</span>
                                    </button>
                                    <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                                        <Eye className="w-5 h-5 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-800">View Analytics</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'overview' && (
                        <div className="text-center py-12">
                            <div className="text-slate-400 mb-4">
                                <BarChart3 className="w-12 h-12 mx-auto" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
                            </h3>
                            <p className="text-slate-600">
                                This section would contain {activeTab}-specific content and functionality.
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function Dashboard() {
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const roles = [
        {
            id: 'Supplier',
            name: 'Supplier',
            description: 'Manage products and fulfill orders',
            icon: Package,
            color: 'from-blue-600 to-blue-800',
            bgColor: 'bg-blue-50'
        },
        {
            id: 'Distributor',
            name: 'Distributor',
            description: 'Handle logistics and shipping',
            icon: Truck,
            color: 'from-green-600 to-green-800',
            bgColor: 'bg-green-50'
        },
        {
            id: 'Retailer',
            name: 'Retailer',
            description: 'Sell products to customers',
            icon: Store,
            color: 'from-purple-600 to-purple-800',
            bgColor: 'bg-purple-50'
        },
        {
            id: 'Validator',
            name: 'Validator',
            description: 'Audit and validate supply chain',
            icon: Shield,
            color: 'from-orange-600 to-orange-800',
            bgColor: 'bg-orange-50'
        }
    ];

    useEffect(() => {
        // Simulate loading user role
        const timer = setTimeout(() => {
            setIsLoading(false);
            // Check if user has a saved role
            const savedRole = localStorage.getItem('userRole');
            if (savedRole) {
                setRole(savedRole);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        localStorage.setItem('userRole', selectedRole);
    };

    const handleRoleChange = () => {
        setRole(null);
        localStorage.removeItem('userRole');
    };

    if (isLoading) {
        return (
            <motion.div
                className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Loading Dashboard</h2>
                    <p className="text-slate-600">Preparing your workspace...</p>
                </div>
            </motion.div>
        );
    }

    if (!role) {
        return (
            <motion.div
                className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Globe className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-4">Select Your Role</h1>
                        <p className="text-lg text-slate-600">Choose your role to access the appropriate dashboard</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {roles.map((roleOption) => (
                            <motion.button
                                key={roleOption.id}
                                onClick={() => handleRoleSelect(roleOption.id)}
                                className={`${roleOption.bgColor} p-8 rounded-2xl border border-slate-200/60 hover:shadow-xl transition-all duration-300 text-left group`}
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 bg-gradient-to-br ${roleOption.color} rounded-xl flex items-center justify-center shadow-lg`}>
                                        <roleOption.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-800">{roleOption.name}</h3>
                                        <p className="text-slate-600">{roleOption.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">Click to continue</span>
                                    <div className="w-6 h-6 bg-white/60 rounded-full flex items-center justify-center group-hover:bg-white/80 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                            <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">ICP Supply Chain</h1>
                            <p className="text-slate-600 text-sm">Management Platform</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRoleChange}
                        className="px-4 py-2 bg-white/80 backdrop-blur-lg rounded-lg text-slate-700 font-medium text-sm border border-slate-200 hover:bg-white/90 transition-colors"
                    >
                        Change Role
                    </button>
                </div>

                <RoleDashboard role={role} />
            </div>
        </div>
    );
}