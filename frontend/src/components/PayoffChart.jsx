import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { pct, money } from "../lib/api";
export default function PayoffChart({
  curve,
  strikePct,
  barrierPct,
  protectionPct,
  mode = "percentage",
  currency = "INR",
  investment,
  selectedShock,
}) {
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label="Payoff chart comparing investor return with underlying movement; exact values appear in the scenario table."
    >
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={curve}
          margin={{ top: 25, right: 24, left: 4, bottom: 18 }}
        >
          <CartesianGrid
            stroke="#253349"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            dataKey="underlying_return_pct"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => v + "%"}
            stroke="#8b9ab0"
            fontSize={11}
            label={{
              value: "Underlying return (%)",
              position: "insideBottom",
              offset: -12,
              fill: "#8b9ab0",
              fontSize: 11,
            }}
          />
          <YAxis
            tickFormatter={(v) => mode === "money" ? new Intl.NumberFormat("en-IN",{notation:"compact"}).format(v) : v + "%"}
            stroke="#8b9ab0"
            fontSize={11}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "#132033",
              border: "1px solid #34445a",
              borderRadius: 10,
              color: "#e7edf7",
            }}
            formatter={(v) => mode === "money" ? money(v,currency) : pct(v)}
            labelFormatter={(v) => "Underlying: " + pct(v)}
          />
          <Legend verticalAlign="top" height={32} />
          {mode === "percentage" && <ReferenceArea y1={-100} y2={0} fill="#df806d" fillOpacity={0.045} />}
          {selectedShock != null && <ReferenceLine x={selectedShock} stroke="#f1cd90" label={{value:"Selected",fill:"#f1cd90"}}/>}
          {mode === "money" && <ReferenceLine y={investment} stroke="#7ebaa3" label={{value:"Invested",fill:"#7ebaa3"}}/>}
          <ReferenceLine y={0} stroke="#69788d" />
          {strikePct != null && (
            <ReferenceLine
              x={strikePct - 100}
              stroke="#8baac8"
              strokeDasharray="5 5"
              label={{ value: "Strike", fill: "#8baac8", fontSize: 11 }}
            />
          )}
          {barrierPct != null && (
            <ReferenceLine
              x={barrierPct - 100}
              stroke="#e2a66d"
              strokeDasharray="5 5"
              label={{ value: "Barrier", fill: "#e2a66d", fontSize: 11 }}
            />
          )}
          {protectionPct != null && mode === "percentage" && (
            <ReferenceLine
              y={protectionPct - 100}
              stroke="#9eafc5"
              strokeDasharray="5 5"
              label={{
                value: "Protected base (excl. coupon)",
                fill: "#9eafc5",
                fontSize: 10,
              }}
            />
          )}
          <Line
            name={mode === "money" ? "Maturity value ("+currency+")" : "Investor return"}
            type="linear"
            dataKey={mode === "money" ? "maturity_value" : "investor_return_pct"}
            stroke="#9abada"
            strokeWidth={2.5}
            dot={false}
            animationDuration={350}
          />
          {mode === "money" && <Line name={"Profit / loss ("+currency+")"} type="linear" dataKey="profit_loss" stroke="#8bbca9" dot={false} animationDuration={350}/>}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
