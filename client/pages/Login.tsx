import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth-context";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate auth delay
    setTimeout(() => {
      const success = login(email, password, role);
      if (success) {
        // Redirect based on role
        const routes = {
          admin: "/admin",
          nurse: "/nurse",
          doctor: "/doctor",
          ward: "/ward",
        };
        navigate(routes[role]);
      } else {
        setError("Invalid email or password");
      }
      setIsLoading(false);
    }, 500);
  };

  const roles: Array<{ value: UserRole; label: string; description: string }> = [
    { value: "admin", label: "Admin", description: "Hospital Administrator" },
    { value: "nurse", label: "Nurse", description: "Nursing Staff" },
    { value: "doctor", label: "Doctor", description: "Medical Doctor" },
    { value: "ward", label: "Ward Staff", description: "Ward Operations" },
  ];

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-6">
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
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8 border border-white/40 space-y-6"
        >
          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Demo Credentials Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4"
          >
            <p className="text-sm font-semibold text-blue-900 mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-blue-800">
              <p>
                <strong>Email:</strong> admin@wardwatch.com
              </p>
              <p>
                <strong>Password:</strong> 123456
              </p>
              <p className="mt-2">Available for: admin, nurse, doctor, ward roles</p>
            </div>
          </motion.div>

          {/* Role Selector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <label className="block text-sm font-semibold mb-3">Select Role</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
                <motion.button
                  key={r.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setRole(r.value);

                    const routes = {
                      admin: "/admin",
                      nurse: "/nurse",
                      doctor: "/doctor",
                      ward: "/ward",
                    };

                    // Optional: keep auth context working
                    login("admin@wardwatch.com", "123456", r.value);

                    navigate(routes[r.value]);
                  }}
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

          {/* Email Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <label htmlFor="email" className="block text-sm font-semibold mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                placeholder="name@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 smooth-transition"
              />
            </div>
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
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 smooth-transition"
              />
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 smooth-transition disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </motion.button>

          {/* Signup Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
