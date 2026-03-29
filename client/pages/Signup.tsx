import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth-context";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [role, setRole] = useState<UserRole>("nurse");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const roles: Array<{ value: UserRole; label: string; description: string }> = [
    { value: "admin", label: "Admin", description: "Hospital Administrator" },
    { value: "nurse", label: "Nurse", description: "Nursing Staff" },
    { value: "doctor", label: "Doctor", description: "Medical Doctor" },
    { value: "ward", label: "Ward Staff", description: "Ward Operations" },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Please enter a valid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    // Simulate signup delay
    // TODO: connect backend here
    setTimeout(() => {
      const success = login(formData.email, formData.password, role);
      if (success) {
        const routes = {
          admin: "/admin",
          nurse: "/nurse",
          doctor: "/doctor",
          ward: "/ward",
        };
        navigate(routes[role]);
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              WardWatch
            </span>
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Get Started</h1>
          <p className="text-gray-600">Create your WardWatch account</p>
        </div>

        {/* Signup Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8 border border-white/40 space-y-5"
        >
          {/* Role Selector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <label className="block text-sm font-semibold mb-3">Select Role</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
                <motion.button
                  key={r.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.value)}
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    role === r.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-sm">{r.label}</div>
                  <div className="text-xs text-gray-600">{r.description}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Name Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <label htmlFor="name" className="block text-sm font-semibold mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full pl-12 pr-4 py-3 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 smooth-transition ${
                  errors.name ? "border-red-300 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            </div>
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </motion.div>

          {/* Email Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <label htmlFor="email" className="block text-sm font-semibold mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@hospital.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-12 pr-4 py-3 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 smooth-transition ${
                  errors.email ? "border-red-300 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            </div>
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
          </motion.div>

          {/* Password Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <label htmlFor="password" className="block text-sm font-semibold mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-12 pr-4 py-3 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 smooth-transition ${
                  errors.password ? "border-red-300 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            </div>
            {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
          </motion.div>

          {/* Confirm Password Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full pl-12 pr-4 py-3 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 smooth-transition ${
                  errors.confirmPassword ? "border-red-300 focus:ring-red-500/20" : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 smooth-transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              "Creating account..."
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Create Account
              </>
            )}
          </motion.button>

          {/* Login Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
