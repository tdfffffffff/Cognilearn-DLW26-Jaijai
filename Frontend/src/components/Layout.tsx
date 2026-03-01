import { NavLink, Outlet } from "react-router-dom";
import { Brain, BookOpen, Network, Eye, Mic, Shield, Activity, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: Brain, label: "Cognitive Fingerprint" },
  { to: "/study-brief", icon: BookOpen, label: "Study Brief" },
  { to: "/quiz-me", icon: GraduationCap, label: "Quiz Me" },
  { to: "/knowledge-graph", icon: Network, label: "Knowledge Graph" },
  { to: "/attention", icon: Eye, label: "Attention Monitor" },
  { to: "/teach-me", icon: Mic, label: "Teach Me" },
  { to: "/my-data", icon: Shield, label: "My Data" },
];

const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">CogniLearn</h1>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Cognitive OS</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground glow-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="glass rounded-lg p-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cognitive-excellent animate-pulse-glow" />
              <span className="text-xs text-foreground">All models active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto gradient-mesh">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
