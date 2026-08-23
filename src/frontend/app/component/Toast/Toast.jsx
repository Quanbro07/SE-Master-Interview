"use client";
import { motion, AnimatePresence } from "framer-motion";

const Toast = ({ toast, onClose }) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: toast.type === "error" ? "#EF4444" : "#22C55E", // Đỏ nếu lỗi, Xanh lá nếu thành công
            color: "#FFFFFF",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
            fontWeight: "600",
            fontSize: "14px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;