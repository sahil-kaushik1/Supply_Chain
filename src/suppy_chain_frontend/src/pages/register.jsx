import { useState } from "react";
import { motion } from "framer-motion";
import {
    Check,
    ArrowRight,
    Users,
    Truck,
    Building,
    ShoppingCart,
    Shield,
    CheckCircle,
    Loader2
} from "lucide-react";

const roles = [
    {
        name: 'Supplier',
        desc: 'Produce and supply raw materials and goods to the supply chain',
        icon: '🧑‍🌾',
        lucideIcon: Users,
        color: 'from-green-500 to-emerald-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    },
    {
        name: 'Transporter',
        desc: 'Move goods between locations and ensure timely delivery',
        icon: '🚚',
        lucideIcon: Truck,
        color: 'from-blue-500 to-cyan-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
    },
    {
        name: 'Warehouse',
        desc: 'Store and manage inventory with proper handling',
        icon: '🏬',
        lucideIcon: Building,
        color: 'from-purple-500 to-violet-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
    },
    {
        name: 'Retailer',
        desc: 'Sell products directly to end customers',
        icon: '🛒',
        lucideIcon: ShoppingCart,
        color: 'from-orange-500 to-red-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
    },
    {
        name: 'Auditor',
        desc: 'Audit transactions and resolve compliance reports',
        icon: '🕵️',
        lucideIcon: Shield,
        color: 'from-indigo-500 to-purple-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200'
    },
];

export default function Register() {
    const [selected, setSelected] = useState(null);
    const [status, setStatus] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    async function registerRole() {
        if (selected === null) return;

        setIsRegistering(true);
        setStatus('Registering your role...');

        // Simulate API call
        setTimeout(() => {
            setIsRegistering(false);
            setStatus('success');
        }, 2000);
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut",
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <motion.div
                className="w-full max-w-4xl"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    variants={itemVariants}
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-4">Join the Supply Chain</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Select your role in the supply chain ecosystem to start tracking and managing your operations
                    </p>
                </motion.div>

                {/* Role Selection */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
                    variants={itemVariants}
                >
                    {roles.map((role, idx) => {
                        const isSelected = selected === idx;
                        const IconComponent = role.lucideIcon;

                        return (
                            <motion.div
                                key={role.name}
                                className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 ${isSelected
                                        ? `${role.bgColor} border-2 ${role.borderColor} shadow-xl`
                                        : 'bg-white/80 backdrop-blur-sm border-2 border-transparent hover:border-slate-200 shadow-lg hover:shadow-xl'
                                    }`}
                                onClick={() => setSelected(idx)}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                variants={itemVariants}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <motion.div
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    >
                                        <Check className="w-4 h-4 text-white" />
                                    </motion.div>
                                )}

                                {/* Icon */}
                                <div className="flex items-center justify-center mb-4">
                                    <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center shadow-lg`}>
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{role.name}</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{role.desc}</p>
                                </div>

                                {/* Hover Effect */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 opacity-0"
                                    whileHover={{ opacity: 1, x: ['-100%', '100%'] }}
                                    transition={{ duration: 0.8 }}
                                />
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Register Button */}
                <motion.div
                    className="flex justify-center"
                    variants={itemVariants}
                >
                    <motion.button
                        className={`px-8 py-4 rounded-2xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center gap-3 ${selected === null
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-700 hover:shadow-xl'
                            }`}
                        disabled={selected === null || isRegistering}
                        onClick={registerRole}
                        whileHover={{ scale: selected !== null ? 1.05 : 1 }}
                        whileTap={{ scale: selected !== null ? 0.95 : 1 }}
                    >
                        {isRegistering ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Registering...
                            </>
                        ) : (
                            <>
                                <span>Register as {selected !== null ? roles[selected].name : 'Role'}</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </motion.button>
                </motion.div>

                {/* Status Messages */}
                {status && (
                    <motion.div
                        className="mt-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {status === 'success' ? (
                            <motion.div
                                className="inline-flex items-center gap-3 px-6 py-3 bg-green-100 border border-green-200 rounded-xl text-green-700"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-semibold">Successfully registered as {roles[selected].name}!</span>
                            </motion.div>
                        ) : (
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-100 border border-blue-200 rounded-xl text-blue-700">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>{status}</span>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Info Footer */}
                <motion.div
                    className="mt-12 text-center"
                    variants={itemVariants}
                >
                    <div className="max-w-2xl mx-auto p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30">
                        <h4 className="text-lg font-semibold text-slate-800 mb-2">What happens next?</h4>
                        <p className="text-slate-600 text-sm">
                            After registration, you'll gain access to role-specific features including inventory management,
                            transaction tracking, and compliance reporting. Your identity will be verified on the blockchain.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}