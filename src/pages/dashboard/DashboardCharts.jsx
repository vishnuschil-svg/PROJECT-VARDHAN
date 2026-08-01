import { motion } from "framer-motion";
import { Activity, WalletCards } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function DashboardCharts({ commandModel, paymentModes, text, money, fadeUp }) {
  return (
    <section className="v2-chart-grid" aria-label="Business analytics">
      <motion.article className="v2-glass-card v2-trend-card" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="v2-card-heading"><div><h2>{text.trend}</h2><p>{text.trendHint}</p></div><strong>{money(commandModel.monthlyCollection)}</strong></div>
        <div className="v2-chart" role="img" aria-label={`${text.trend}: ${money(commandModel.monthlyCollection)}`}>
          {commandModel.collectionTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commandModel.collectionTrend} margin={{ top: 12, right: 4, left: -14, bottom: 0 }}>
                <defs><linearGradient id="collectionGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.42} /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--v2-chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="v2-chart-tooltip"><small>Day {label}</small><strong>{money(payload[0].value)}</strong></div> : null} />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} fill="url(#collectionGlow)" activeDot={{ r: 5, strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="v2-empty-chart"><Activity size={24} /><p>{text.emptyChart}</p></div>}
        </div>
      </motion.article>
      <motion.article className="v2-glass-card" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="v2-card-heading"><div><h2>{text.modes}</h2><p>{text.modesHint}</p></div></div>
        <div className="v2-chart v2-bar-chart" role="img" aria-label={text.modes}>
          {paymentModes.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentModes} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={48} fontSize={11} />
                <Tooltip cursor={{ fill: "var(--v2-hover)" }} content={({ active, payload }) => active && payload?.length ? <div className="v2-chart-tooltip"><small>{payload[0].payload.name}</small><strong>{money(payload[0].value)}</strong></div> : null} />
                <Bar dataKey="value" fill="#16a34a" radius={[0, 9, 9, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="v2-empty-chart"><WalletCards size={24} /><p>{text.emptyChart}</p></div>}
        </div>
      </motion.article>
    </section>
  );
}

export default DashboardCharts;
