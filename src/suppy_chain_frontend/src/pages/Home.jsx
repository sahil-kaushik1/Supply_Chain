import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Shield, Eye, Database, Globe, TrendingUp, Users, CheckCircle, ArrowRight } from "lucide-react";

export default function Home() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [showDemo, setShowDemo] = useState(false);

    const handleConnectWallet = async () => {
        setIsConnecting(true);
        // Simulate wallet connection
        setTimeout(() => {
            setIsConnecting(false);
            alert("Wallet connection feature would be implemented here!");
        }, 2000);
    };

    const handleRegister = () => {
        alert("Registration form would open here!");
    };

    const handleDemo = () => {
        setShowDemo(true);
        setTimeout(() => setShowDemo(false), 3000);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                duration: 0.6
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.5
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 relative overflow-hidden">
            {/* Animated Background Grid */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="animated-grid"></div>
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"></div>
            </div>

            {/* Floating Network Nodes Animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="network-animation">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`node node-${i + 1}`}>
                            <div className="node-pulse"></div>
                        </div>
                    ))}
                    <svg className="connections" width="100%" height="100%">
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(71, 85, 105, 0.1)" />
                                <stop offset="50%" stopColor="rgba(71, 85, 105, 0.3)" />
                                <stop offset="100%" stopColor="rgba(71, 85, 105, 0.1)" />
                            </linearGradient>
                        </defs>
                        <path className="connection-line line-1" d="M 10% 20% Q 30% 10% 50% 25%" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
                        <path className="connection-line line-2" d="M 50% 25% Q 70% 40% 90% 30%" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
                        <path className="connection-line line-3" d="M 20% 70% Q 40% 50% 60% 75%" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
                        <path className="connection-line line-4" d="M 60% 75% Q 80% 60% 85% 80%" stroke="url(#lineGradient)" strokeWidth="2" fill="none" />
                    </svg>
                </div>
            </div>

            <motion.div
                className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Logo */}
                <motion.div
                    className="relative mb-12"
                    variants={itemVariants}
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
                        <Globe className="w-10 h-10 text-white" />
                    </div>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    className="text-5xl md:text-6xl font-light text-slate-800 mb-6 text-center leading-tight tracking-tight"
                    variants={itemVariants}
                >
                    ICP Supply Chain
                    <span className="block text-2xl md:text-3xl font-normal text-slate-600 mt-2">
                        Management Platform
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    className="text-lg md:text-xl text-slate-600 mb-16 text-center max-w-2xl leading-relaxed font-light"
                    variants={itemVariants}
                >
                    Enterprise-grade supply chain transparency and traceability built on the
                    <span className="text-slate-800 font-medium"> Internet Computer Protocol</span>
                </motion.p>

                {/* Feature Cards */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl"
                    variants={itemVariants}
                >
                    {[
                        { icon: Shield, title: "Enterprise Security", desc: "Bank-grade encryption and data protection" },
                        { icon: Eye, title: "Full Transparency", desc: "Complete supply chain visibility" },
                        { icon: Database, title: "Scalable Infrastructure", desc: "Built for global enterprise deployment" }
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white/80 backdrop-blur-lg rounded-xl p-8 border border-slate-200/60 shadow-lg hover:shadow-xl transition-shadow duration-300"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-slate-800 font-semibold mb-3 text-lg">{feature.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    className="flex flex-col sm:flex-row gap-4 mb-20"
                    variants={itemVariants}
                >
                    <button
                        className="group relative px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-900 rounded-lg text-white font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleConnectWallet}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <span>Connect Wallet</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                            </>
                        )}
                    </button>

                    <button
                        className="group px-8 py-4 bg-white/80 backdrop-blur-lg rounded-lg text-slate-700 font-medium text-base border border-slate-200 hover:bg-white/90 hover:border-slate-300 transition-all duration-300 flex items-center gap-2 shadow-lg"
                        onClick={handleRegister}
                    >
                        <span>Create Account</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>

                    <button
                        className="group px-8 py-4 text-slate-600 font-medium text-base border border-slate-300 rounded-lg hover:border-slate-400 hover:text-slate-700 transition-all duration-300 flex items-center gap-2"
                        onClick={handleDemo}
                    >
                        <span>View Demo</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                </motion.div>

                {/* Demo Preview */}
                {showDemo && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                        >
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">Demo Loading</h3>
                            <p className="text-slate-600">Interactive demo would launch here!</p>
                        </motion.div>
                    </motion.div>
                )}

                {/* Dashboard Preview */}
                <motion.div
                    className="relative max-w-4xl"
                    variants={itemVariants}
                >
                    <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-1 border border-white/50 shadow-2xl">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Panel */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-slate-800 font-semibold">Supply Chain Analytics</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-white/80 rounded-lg p-4 border border-slate-200/60">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-slate-600">Active Shipments</span>
                                                <span className="text-lg font-semibold text-slate-800">1,247</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-slate-600 to-slate-800 h-2 rounded-full w-3/4"></div>
                                            </div>
                                        </div>
                                        <div className="bg-white/80 rounded-lg p-4 border border-slate-200/60">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-slate-600">Verification Rate</span>
                                                <span className="text-lg font-semibold text-slate-800">98.7%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-slate-600 to-slate-800 h-2 rounded-full w-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Panel */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                                            <Users className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-slate-800 font-semibold">Network Status</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {['Manufacturers', 'Distributors', 'Retailers', 'Validators'].map((role, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-white/80 rounded-lg p-3 border border-slate-200/60">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-sm text-slate-700">{role}</span>
                                                <span className="text-xs text-slate-500 ml-auto">Online</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            <style>{`
                .animated-grid {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        linear-gradient(rgba(71, 85, 105, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(71, 85, 105, 0.03) 1px, transparent 1px);
                    background-size: 50px 50px;
                    animation: gridMove 20s linear infinite;
                }

                @keyframes gridMove {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(50px, 50px); }
                }

                .network-animation {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                }

                .node {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: linear-gradient(135deg, #475569, #334155);
                    border-radius: 50%;
                    opacity: 0.6;
                }

                .node-pulse {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: rgba(71, 85, 105, 0.2);
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(2); opacity: 0.2; }
                    100% { transform: scale(1); opacity: 0.6; }
                }

                .node-1 { top: 15%; left: 10%; animation: float 8s ease-in-out infinite; }
                .node-2 { top: 20%; left: 50%; animation: float 8s ease-in-out infinite 1s; }
                .node-3 { top: 25%; left: 90%; animation: float 8s ease-in-out infinite 2s; }
                .node-4 { top: 70%; left: 15%; animation: float 8s ease-in-out infinite 3s; }
                .node-5 { top: 75%; left: 65%; animation: float 8s ease-in-out infinite 4s; }
                .node-6 { top: 80%; left: 85%; animation: float 8s ease-in-out infinite 5s; }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                .connections {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                }

                .connection-line {
                    stroke-dasharray: 100;
                    stroke-dashoffset: 100;
                    animation: drawLine 4s ease-in-out infinite;
                }

                .line-1 { animation-delay: 0s; }
                .line-2 { animation-delay: 1s; }
                .line-3 { animation-delay: 2s; }
                .line-4 { animation-delay: 3s; }

                @keyframes drawLine {
                    0% { stroke-dashoffset: 100; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -100; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .animated-grid,
                    .node,
                    .connection-line {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}