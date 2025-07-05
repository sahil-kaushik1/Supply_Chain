import { useState } from "react";
import { motion } from "framer-motion";
import {
    Wallet,
    Shield,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Sparkles,
    Lock,
    ArrowRight,
    Globe
} from "lucide-react";

export default function Login() {
    const [principal, setPrincipal] = useState(null);
    const [error, setError] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    async function connectPlug() {
        setIsConnecting(true);
        setError('');

        if (window.ic && window.ic.plug) {
            try {
                const connected = await window.ic.plug.requestConnect();
                if (connected) {
                    const principal = await window.ic.plug.getPrincipal();
                    setPrincipal(principal);
                    setError('');
                    // Simulate navigation delay
                    setTimeout(() => {
                        console.log('Redirecting to dashboard...');
                        // In real app: navigate('/dashboard')
                    }, 1500);
                }
            } catch (e) {
                setError('Failed to connect to Plug wallet.');
            }
        } else {
            setError('Plug wallet not detected. Please install the Plug extension.');
        }

        setIsConnecting(false);
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut",
                staggerChildren: 0.2
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

    const pulseVariants = {
        pulse: {
            scale: [1, 1.02, 1],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
                    animate={{
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"
                    animate={{
                        x: [0, -40, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            <motion.div
                className="relative z-10 w-full max-w-md"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Main Card */}
                <motion.div
                    className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 text-center"
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {/* Header */}
                    <motion.div
                        className="mb-8"
                        variants={itemVariants}
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Globe className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">ICP Supply Chain</h1>
                        <p className="text-slate-600">Connect your wallet to get started</p>
                    </motion.div>

                    {/* Connection Status */}
                    {!principal && !error && (
                        <motion.div
                            className="mb-8"
                            variants={itemVariants}
                        >
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-semibold text-slate-800">Plug Wallet</h3>
                                    <p className="text-sm text-slate-600">Secure ICP authentication</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                <Shield className="w-4 h-4" />
                                <span>End-to-end encrypted</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Success State */}
                    {principal && (
                        <motion.div
                            className="mb-8"
                            variants={itemVariants}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Connected Successfully!</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Principal: {principal.toString().slice(0, 20)}...
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                                <Sparkles className="w-4 h-4" />
                                <span>Redirecting to dashboard...</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Error State */}
                    {error && (
                        <motion.div
                            className="mb-8"
                            variants={itemVariants}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <AlertCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h3>
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            {error.includes('not detected') && (
                                <motion.a
                                    href="https://chrome.google.com/webstore/detail/plug/cfbfdhimifdmdehjmkdobpcjfefblkjm"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Install Plug Wallet
                                </motion.a>
                            )}
                        </motion.div>
                    )}

                    {/* Connect Button */}
                    {!principal && (
                        <motion.button
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={connectPlug}
                            disabled={isConnecting}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isConnecting ? (
                                <>
                                    <motion.div
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Wallet className="w-5 h-5" />
                                    Connect Plug Wallet
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </motion.button>
                    )}

                    {/* Features */}
                    <motion.div
                        className="mt-8 pt-8 border-t border-slate-200"
                        variants={itemVariants}
                    >
                        <h4 className="text-sm font-semibold text-slate-800 mb-4">Why choose ICP Supply Chain?</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <span>Transparent supply chain tracking</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                <span>Immutable blockchain records</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                    <Lock className="w-4 h-4 text-white" />
                                </div>
                                <span>Secure decentralized platform</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Footer */}
                <motion.div
                    className="mt-6 text-center text-sm text-slate-500"
                    variants={itemVariants}
                >
                    <p>Powered by Internet Computer Protocol</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                        <Lock className="w-3 h-3" />
                        <span>Your data is secured on the blockchain</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}