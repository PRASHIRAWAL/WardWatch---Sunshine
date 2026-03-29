import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Bell, Zap, Users, TrendingUp, BarChart3 } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const floatingVariants = {
  floating: {
    y: [0, -20, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg overflow-hidden">
      {/* Navigation */}
      <nav className="border-b border-white/20 backdrop-blur-md fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              WardWatch
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4"
          >
            <Link
              to="/login"
              className="px-6 py-2 rounded-2xl font-medium hover:bg-white/10 smooth-transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-2xl font-medium hover:shadow-lg hover:shadow-blue-500/30 smooth-transition"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-600 bg-clip-text text-transparent">
                WardWatch
              </span>
              <br />
              Hospital Operations, Reimagined
            </h1>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            AI-powered real-time hospital intelligence for smarter bed management, faster patient flow, and
            better outcomes
          </motion.p>

          <motion.div variants={itemVariants} className="flex gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-blue-500/40 smooth-transition flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 smooth-transition" />
            </Link>
            <button className="px-8 py-4 border-2 border-blue-500/30 text-blue-600 rounded-2xl font-semibold hover:bg-blue-50 smooth-transition">
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mt-20 max-w-5xl mx-auto"
        >
          <div className="glass rounded-3xl p-8 border border-white/40">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={floatingVariants}
                  animate="floating"
                  style={{ animationDelay: `${i * 0.2}s` }}
                  className="glass rounded-2xl p-4"
                >
                  <div className="h-2 bg-gradient-to-r from-blue-300 to-teal-300 rounded-full mb-3 w-3/4" />
                  <div className="h-8 bg-blue-100 rounded-lg mb-2" />
                  <div className="h-2 bg-gray-200 rounded-full w-1/2" />
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <motion.div
                  key={`chart-${i}`}
                  variants={floatingVariants}
                  animate="floating"
                  style={{ animationDelay: `${0.3 + i * 0.2}s` }}
                  className="glass rounded-2xl p-4"
                >
                  <div className="space-y-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-2 bg-gradient-to-r from-blue-200 to-teal-200 rounded-full" />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto"
        >
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold text-center mb-4">
            Powerful Features
          </motion.h2>
          <motion.p variants={itemVariants} className="text-gray-600 text-center mb-16 text-lg">
            Everything you need to optimize hospital operations
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Activity,
                title: "Live Bed Tracking",
                description: "Real-time visibility into bed status across all wards",
              },
              {
                icon: Bell,
                title: "Smart Alerts",
                description: "Intelligent notifications for delays and capacity risks",
              },
              {
                icon: Zap,
                title: "AI Predictions",
                description: "Forecast occupancy and identify bottlenecks ahead",
              },
              {
                icon: Users,
                title: "Staff Coordination",
                description: "Optimize staff allocation and shift management",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="glass rounded-3xl p-8 border border-white/40 hover:border-white/60 smooth-transition group"
              >
                <feature.icon className="w-12 h-12 text-blue-500 mb-4 group-hover:text-teal-500 smooth-transition" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white/30 backdrop-blur">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto"
        >
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold text-center mb-16">
            How It Works
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Connect Your Hospital",
                description: "Integrate with your existing hospital systems",
                icon: Activity,
              },
              {
                step: "02",
                title: "Monitor in Real-Time",
                description: "Get live updates on bed status and occupancy",
                icon: TrendingUp,
              },
              {
                step: "03",
                title: "Receive AI Insights",
                description: "Get intelligent recommendations and predictions",
                icon: Zap,
              },
              {
                step: "04",
                title: "Optimize Operations",
                description: "Improve efficiency and patient outcomes",
                icon: BarChart3,
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg shadow-blue-500/30">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                {idx < 3 && (
                  <ArrowRight className="hidden md:block absolute -right-10 top-8 text-blue-400 w-6 h-6" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Hospital Operations?
          </motion.h2>
          <motion.p variants={itemVariants} className="text-xl text-gray-600 mb-8">
            Join leading hospitals in optimizing their operations with WardWatch
          </motion.p>
          <motion.div variants={itemVariants}>
            <Link
              to="/signup"
              className="inline-block px-10 py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-blue-500/40 smooth-transition"
            >
              Get Started Today
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 py-8 px-6 text-center text-gray-600">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          © 2024 WardWatch. All rights reserved. | Empowering hospitals with AI intelligence.
        </motion.p>
      </footer>
    </div>
  );
}
