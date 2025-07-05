import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function Layout({ children }) {
    const location = useLocation();
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
            <motion.nav
                className="flex items-center justify-between px-8 py-4 bg-white shadow"
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, type: "spring" }}
            >
                <div className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Logo" className="w-10" />
                    <span className="font-bold text-xl text-indigo-700">ICP Supply Chain</span>
                </div>
                <div className="flex gap-4">
                    <Link to="/" className={location.pathname === "/" ? "nav-active" : "nav-link"}>Home</Link>
                    <Link to="/dashboard" className={location.pathname === "/dashboard" ? "nav-active" : "nav-link"}>Dashboard</Link>
                    <Link to="/settings" className={location.pathname === "/settings" ? "nav-active" : "nav-link"}>Settings</Link>
                </div>
            </motion.nav>
            <main className="p-6">{children}</main>
        </div>
    );
}
