import { useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    Settings2 as SettingsIcon,
    Bell,
    Shield,
    Palette,
    Globe,
    Save,
    CheckCircle,
    Mail,
    Phone,
    Building,
    MapPin,
    Eye,
    EyeOff,
    Smartphone,
    Monitor,
    Moon,
    Sun
} from "lucide-react";

export default function Settings() {
    const [profile, setProfile] = useState({
        displayName: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        company: 'Supply Chain Co.',
        location: 'New York, NY'
    });

    const [preferences, setPreferences] = useState({
        theme: 'light',
        notifications: {
            email: true,
            push: true,
            sms: false,
            updates: true
        },
        privacy: {
            profileVisible: true,
            shareData: false,
            trackingEnabled: true
        }
    });

    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save operation
        setTimeout(() => {
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }, 1500);
    };

    const handleProfileChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const handleNotificationChange = (field, value) => {
        setPreferences(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [field]: value }
        }));
    };

    const handlePrivacyChange = (field, value) => {
        setPreferences(prev => ({
            ...prev,
            privacy: { ...prev.privacy, [field]: value }
        }));
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Privacy', icon: Shield }
    ];

    const containerVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut",
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
            <motion.div
                className="max-w-4xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <motion.div
                    className="text-center mb-8"
                    variants={itemVariants}
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <SettingsIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
                    <p className="text-slate-600">Manage your account and preferences</p>
                </motion.div>

                {/* Tab Navigation */}
                <motion.div
                    className="flex flex-wrap justify-center gap-2 mb-8"
                    variants={itemVariants}
                >
                    {tabs.map((tab) => {
                        const IconComponent = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <motion.button
                                key={tab.id}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive
                                        ? 'bg-white shadow-lg text-indigo-600 border-2 border-indigo-200'
                                        : 'bg-white/60 text-slate-600 hover:bg-white/80 border-2 border-transparent'
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <IconComponent className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* Settings Content */}
                <motion.div
                    className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-8"
                    variants={itemVariants}
                >
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Profile Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.displayName}
                                        onChange={(e) => handleProfileChange('displayName', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                                        placeholder="Enter your display name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => handleProfileChange('email', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={profile.phone}
                                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                                            placeholder="Enter your phone number"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Company
                                    </label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={profile.company}
                                            onChange={(e) => handleProfileChange('company', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                                            placeholder="Enter your company name"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Location
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={profile.location}
                                            onChange={(e) => handleProfileChange('location', e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                                            placeholder="Enter your location"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Palette className="w-5 h-5" />
                                Preferences
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        Theme
                                    </label>
                                    <div className="flex gap-3">
                                        {[
                                            { id: 'light', label: 'Light', icon: Sun },
                                            { id: 'dark', label: 'Dark', icon: Moon },
                                            { id: 'system', label: 'System', icon: Monitor }
                                        ].map((theme) => {
                                            const IconComponent = theme.icon;
                                            const isSelected = preferences.theme === theme.id;

                                            return (
                                                <motion.button
                                                    key={theme.id}
                                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${isSelected
                                                            ? 'bg-indigo-100 border-2 border-indigo-300 text-indigo-700'
                                                            : 'bg-slate-100 border-2 border-transparent text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                    onClick={() => setPreferences(prev => ({ ...prev, theme: theme.id }))}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <IconComponent className="w-4 h-4" />
                                                    <span>{theme.label}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        Language
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                        <select className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 appearance-none bg-white">
                                            <option>English (US)</option>
                                            <option>English (UK)</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                            <option>German</option>
                                            <option>Japanese</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notification Settings
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email', icon: Mail },
                                    { key: 'push', label: 'Push Notifications', desc: 'Browser and mobile notifications', icon: Smartphone },
                                    { key: 'sms', label: 'SMS Notifications', desc: 'Text message alerts', icon: Phone },
                                    { key: 'updates', label: 'Product Updates', desc: 'New features and improvements', icon: Bell }
                                ].map((notification) => {
                                    const IconComponent = notification.icon;
                                    const isEnabled = preferences.notifications[notification.key];

                                    return (
                                        <div key={notification.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                    <IconComponent className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{notification.label}</h4>
                                                    <p className="text-sm text-slate-600">{notification.desc}</p>
                                                </div>
                                            </div>
                                            <motion.button
                                                className={`relative w-12 h-6 rounded-full transition-all duration-200 ${isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                                    }`}
                                                onClick={() => handleNotificationChange(notification.key, !isEnabled)}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <motion.div
                                                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                                                    animate={{ x: isEnabled ? 24 : 2 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </motion.button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Privacy Tab */}
                    {activeTab === 'privacy' && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Privacy Settings
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { key: 'profileVisible', label: 'Profile Visibility', desc: 'Make your profile visible to other users', icon: Eye },
                                    { key: 'shareData', label: 'Data Sharing', desc: 'Share anonymized data for analytics', icon: Globe },
                                    { key: 'trackingEnabled', label: 'Activity Tracking', desc: 'Track your activity for better experience', icon: Shield }
                                ].map((privacy) => {
                                    const IconComponent = privacy.icon;
                                    const isEnabled = preferences.privacy[privacy.key];

                                    return (
                                        <div key={privacy.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <IconComponent className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{privacy.label}</h4>
                                                    <p className="text-sm text-slate-600">{privacy.desc}</p>
                                                </div>
                                            </div>
                                            <motion.button
                                                className={`relative w-12 h-6 rounded-full transition-all duration-200 ${isEnabled ? 'bg-green-600' : 'bg-slate-300'
                                                    }`}
                                                onClick={() => handlePrivacyChange(privacy.key, !isEnabled)}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <motion.div
                                                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                                                    animate={{ x: isEnabled ? 24 : 2 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </motion.button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Save Button */}
                    <motion.div
                        className="mt-8 pt-6 border-t border-slate-200 flex justify-end"
                        variants={itemVariants}
                    >
                        <motion.button
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                            onClick={handleSave}
                            disabled={isSaving}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isSaving ? (
                                <>
                                    <motion.div
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                </motion.div>

                {/* Success Message */}
                {saveSuccess && (
                    <motion.div
                        className="fixed top-4 right-4 bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CheckCircle className="w-5 h-5" />
                        <span>Settings saved successfully!</span>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}