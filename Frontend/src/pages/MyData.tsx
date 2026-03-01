import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Download, Trash2, FileText, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storedDataCategories, auditLog } from "@/data/mockData";
import { toast } from "sonner";

const MyData = () => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      categories: storedDataCategories,
      auditLog: auditLog,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cognilearn-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    toast.success("All personal data has been queued for deletion");
  };

  const totalSize = storedDataCategories.reduce((acc, c) => acc + parseFloat(c.size), 0).toFixed(1);
  const totalItems = storedDataCategories.reduce((acc, c) => acc + c.items, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Data & Privacy</h1>
          <p className="text-sm text-muted-foreground mt-1">Responsible AI compliance — full transparency over your data</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cognitive-excellent/10 border border-cognitive-excellent/20">
          <Shield className="w-3.5 h-3.5 text-cognitive-excellent" />
          <span className="text-xs font-medium text-cognitive-excellent">Privacy-by-Design</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Total Data</p>
          <p className="text-2xl font-bold text-foreground">{totalSize} MB</p>
          <p className="text-xs text-muted-foreground">{totalItems} records</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Categories</p>
          <p className="text-2xl font-bold text-foreground">{storedDataCategories.length}</p>
          <p className="text-xs text-muted-foreground">data types stored</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Audit Events</p>
          <p className="text-2xl font-bold text-foreground">{auditLog.length}</p>
          <p className="text-xs text-muted-foreground">logged actions</p>
        </motion.div>
      </div>

      {/* What's Stored */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">What Data Is Stored</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] font-mono uppercase text-muted-foreground pb-2">Category</th>
                <th className="text-right text-[10px] font-mono uppercase text-muted-foreground pb-2">Items</th>
                <th className="text-right text-[10px] font-mono uppercase text-muted-foreground pb-2">Size</th>
                <th className="text-right text-[10px] font-mono uppercase text-muted-foreground pb-2">Retention</th>
              </tr>
            </thead>
            <tbody>
              {storedDataCategories.map((cat, i) => (
                <motion.tr
                  key={cat.category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="border-b border-border/50"
                >
                  <td className="py-3 text-sm text-foreground flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    {cat.category}
                  </td>
                  <td className="py-3 text-sm text-right font-mono text-muted-foreground">{cat.items}</td>
                  <td className="py-3 text-sm text-right font-mono text-muted-foreground">{cat.size}</td>
                  <td className="py-3 text-sm text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      cat.retention === "Until deletion" ? "bg-primary/10 text-primary" : "bg-cognitive-moderate/10 text-cognitive-moderate"
                    }`}>
                      {cat.retention}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Download JSON
          </Button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-cognitive-critical">Confirm deletion of all data?</span>
              <Button onClick={handleDelete} variant="destructive" size="sm" className="text-xs">
                Yes, Delete All
              </Button>
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" size="sm" className="text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" size="sm" className="gap-2 text-cognitive-critical border-cognitive-critical/20 hover:bg-cognitive-critical/10">
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Data
            </Button>
          )}
        </div>
      </motion.div>

      {/* Audit Log */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Audit Log</h2>
        </div>
        <div className="space-y-2">
          {auditLog.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.03 }}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="mt-0.5">
                {entry.action.includes("override") || entry.action.includes("Privacy") ? (
                  <Shield className="w-3.5 h-3.5 text-primary" />
                ) : entry.action.includes("Maker") ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-cognitive-moderate" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground">{entry.action}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{entry.actor}</span>
                </div>
                <p className="text-xs text-muted-foreground">{entry.detail}</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{entry.timestamp}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MyData;
