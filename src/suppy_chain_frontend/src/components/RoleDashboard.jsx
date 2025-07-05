import { motion } from "framer-motion";

export default function RoleDashboard({ role }) {
    const variants = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 }
    };

    switch (role) {
        case 'Supplier':
            return (
                <motion.div variants={variants} initial="initial" animate="animate">
                    <h3 className="text-xl font-semibold mb-2">Supplier Actions</h3>
                    <ul className="list-disc ml-6">
                        <li>Record "PRODUCED" event</li>
                        <li>View product history</li>
                        <li>See ratings</li>
                    </ul>
                </motion.div>
            );
        case 'Transporter':
            return (
                <motion.div variants={variants} initial="initial" animate="animate">
                    <h3 className="text-xl font-semibold mb-2">Transporter Actions</h3>
                    <ul className="list-disc ml-6">
                        <li>Record "TRANSPORT" event</li>
                        <li>View assigned products</li>
                    </ul>
                </motion.div>
            );
        case 'Warehouse':
            return (
                <motion.div variants={variants} initial="initial" animate="animate">
                    <h3 className="text-xl font-semibold mb-2">Warehouse Actions</h3>
                    <ul className="list-disc ml-6">
                        <li>Record "WAREHOUSE" event</li>
                        <li>Manage inventory</li>
                    </ul>
                </motion.div>
            );
        case 'Retailer':
            return (
                <motion.div variants={variants} initial="initial" animate="animate">
                    <h3 className="text-xl font-semibold mb-2">Retailer Actions</h3>
                    <ul className="list-disc ml-6">
                        <li>Record "RETAIL" event</li>
                        <li>Verify product authenticity</li>
                    </ul>
                </motion.div>
            );
        case 'Auditor':
            return (
                <motion.div variants={variants} initial="initial" animate="animate">
                    <h3 className="text-xl font-semibold mb-2">Auditor Actions</h3>
                    <ul className="list-disc ml-6">
                        <li>View and resolve reports</li>
                        <li>Audit product chains</li>
                    </ul>
                </motion.div>
            );
        default:
            return <div>Unknown role.</div>;
    }
}
