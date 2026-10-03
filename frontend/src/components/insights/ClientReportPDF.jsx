import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Svg, Polyline, Line } from "@react-pdf/renderer";
import { money, pct } from "../../lib/api";

// Use a font that supports Devanagari characters
Font.register({
  family: "Noto Sans Devanagari",
  src: "https://fonts.gstatic.com/s/notosansdevanagari/v22/6xKwdspZNa_1Yj-yYtW5yFw01G9B35U00rF0B7I2.ttf",
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 11, color: "#1f2937", lineHeight: 1.5 },
  pageDevanagari: { padding: 40, fontFamily: "Noto Sans Devanagari", fontSize: 11, color: "#1f2937", lineHeight: 1.5 },
  header: { marginBottom: 20, borderBottom: "1pt solid #e5e7eb", paddingBottom: 15 },
  brand: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  reportTitle: { fontSize: 14, color: "#4b5563", marginTop: 4 },
  date: { fontSize: 10, color: "#9ca3af", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#111827", marginTop: 20, marginBottom: 10, backgroundColor: "#f3f4f6", padding: 8 },
  text: { fontSize: 11, marginBottom: 8 },
  bold: { fontWeight: "bold" },
  factGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 15 },
  factBox: { width: "48%", padding: 10, border: "1pt solid #e5e7eb", borderRadius: 4, marginBottom: 8, marginRight: "2%" },
  factLabel: { fontSize: 9, color: "#6b7280", textTransform: "uppercase" },
  factValue: { fontSize: 14, fontWeight: "bold", color: "#1f2937", marginTop: 4 },
  scenarioCard: { marginBottom: 15, padding: 12, border: "1pt solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" },
  scenarioTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "1pt solid #e5e7eb" },
  rowLabel: { fontSize: 10, color: "#4b5563" },
  rowValue: { fontSize: 10, fontWeight: "bold" },
  warningCard: { padding: 10, backgroundColor: "#fef3c7", borderLeft: "3pt solid #f59e0b", marginBottom: 10 },
  mismatchCard: { padding: 10, backgroundColor: "#fee2e2", borderLeft: "3pt solid #ef4444", marginBottom: 10 },
  passCard: { padding: 10, backgroundColor: "#d1fae5", borderLeft: "3pt solid #10b981", marginBottom: 10 },
  infoCard: { padding: 10, backgroundColor: "#f3f4f6", borderLeft: "3pt solid #9ca3af", marginBottom: 10 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", color: "#9ca3af", fontSize: 9, borderTop: "1pt solid #e5e7eb", paddingTop: 10 },
  pageNumber: { position: 'absolute', fontSize: 9, bottom: 30, right: 40, color: '#9ca3af' },
  chartContainer: { marginVertical: 15, padding: 10, border: "1pt solid #e5e7eb", borderRadius: 4 },
  chartAxisText: { fontSize: 8, fill: "#6b7280" }
});

const PdfChart = ({ curve, strikePct, barrierPct }) => {
  if (!curve || curve.length === 0) return null;
  const minX = Math.min(...curve.map((d) => d.underlying_return_pct));
  const maxX = Math.max(...curve.map((d) => d.underlying_return_pct));
  const minY = Math.min(-100, ...curve.map((d) => d.investor_return_pct));
  const maxY = Math.max(20, ...curve.map((d) => d.investor_return_pct));

  const width = 400;
  const height = 150;
  const padding = 20;

  const mapX = (x) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const mapY = (y) => padding + height - ((y - minY) / (maxY - minY)) * height;

  const points = curve.map((d) => `${mapX(d.underlying_return_pct)},${mapY(d.investor_return_pct)}`).join(" ");

  return (
    <View style={styles.chartContainer} wrap={false}>
      <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 10, textAlign: "center" }}>Investor Return Profile</Text>
      <Svg viewBox={`0 0 ${width} ${height + padding * 2}`} width="100%" height={150}>
        {/* Zero axes */}
        <Line x1={padding} y1={mapY(0)} x2={width - padding} y2={mapY(0)} stroke="#d1d5db" strokeWidth={1} />
        <Line x1={mapX(0)} y1={padding} x2={mapX(0)} y2={height + padding} stroke="#d1d5db" strokeWidth={1} />
        
        {/* Strike and Barrier */}
        {strikePct != null && (
          <Line x1={mapX(strikePct - 100)} y1={padding} x2={mapX(strikePct - 100)} y2={height + padding} stroke="#9ca3af" strokeDasharray="3 3" strokeWidth={1} />
        )}
        {barrierPct != null && (
          <Line x1={mapX(barrierPct - 100)} y1={padding} x2={mapX(barrierPct - 100)} y2={height + padding} stroke="#f87171" strokeDasharray="3 3" strokeWidth={1} />
        )}

        {/* Payoff Curve */}
        <Polyline points={points} stroke="#3b82f6" strokeWidth={2} fill="none" />
        
        {/* Labels */}
        <Text x={mapX(maxX) - 20} y={mapY(0) + 10} style={styles.chartAxisText}>Mkt Rises</Text>
        <Text x={padding} y={mapY(0) + 10} style={styles.chartAxisText}>Mkt Falls</Text>
      </Svg>
    </View>
  );
};

export default function ClientReportPDF({ state, insights, language, t }) {
  const product = state.product?.config || {};
  const type = state.product?.type || "Product";
  const typeName = type === "CPN" ? t.cpn_name : type === "DCD" ? t.dcd_name : type === "ELN" ? t.eln_name : type;
  
  const investment = product.investment ?? product.deposit_amount;
  const currency = product.investment_currency || product.deposit_currency || "INR";
  
  const clientName = state.client?.client_name || "Client";
  const isIndic = language === "HI" || language === "MR";
  const pageStyle = isIndic ? styles.pageDevanagari : styles.page;

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <Text style={styles.brand}>InveSimul</Text>
          <Text style={styles.reportTitle}>Investment Advisory Report for {clientName}</Text>
          <Text style={styles.date}>Generated on {new Date().toLocaleDateString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>1. Investment Overview</Text>
        <Text style={styles.text}>{insights.executive_summary}</Text>
        
        <View style={styles.factGrid}>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Product Type</Text>
            <Text style={styles.factValue}>{typeName}</Text>
          </View>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Underlying Asset</Text>
            <Text style={styles.factValue}>{state.product?.ticker}</Text>
          </View>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Investment Amount</Text>
            <Text style={styles.factValue}>{money(investment, currency)}</Text>
          </View>
          {insights.investment_summary.map((fact, i) => (
             <View key={i} style={styles.factBox}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue}>{fact.value} {fact.unit}</Text>
             </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>2. Potential Investment Outcomes</Text>
        <Text style={styles.text}>{t.slider_instruction}</Text>

        {state.simulation?.curve && (
          <PdfChart 
            curve={state.simulation.curve.results.map(r => ({ underlying_return_pct: r.scenario_shock_pct, investor_return_pct: r.return_pct }))}
            strikePct={type === "ELN" ? product.strike_pct : type === "DCD" ? (product.conversion_strike_rate / product.initial_fx_rate) * 100 : undefined}
            barrierPct={type === "ELN" ? product.barrier_pct : undefined}
          />
        )}

        {(insights.scenario_insights || []).map((scenario, idx) => (
          <View key={idx} style={styles.scenarioCard} wrap={false}>
            <Text style={styles.scenarioTitle}>{scenario.title}</Text>
            <Text style={styles.text}>{scenario.explanation}</Text>
            
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t.initial_investment}</Text>
              <Text style={styles.rowValue}>{money(investment, currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t.modeled_maturity}</Text>
              <Text style={styles.rowValue}>{money(scenario.result.maturity_value, currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t.potential_gain_loss}</Text>
              <Text style={styles.rowValue}>{scenario.result.profit_loss > 0 ? "+" : ""}{money(scenario.result.profit_loss, currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t.investor_return}</Text>
              <Text style={styles.rowValue}>{scenario.result.return_pct > 0 ? "+" : ""}{pct(scenario.result.return_pct / 100)}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.footer} fixed>InveSimul Investment Report · {clientName} · {state.product?.ticker}</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <Text style={styles.brand}>InveSimul</Text>
          <Text style={styles.reportTitle}>Investment Advisory Report for {clientName}</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Risks and Important Conditions</Text>
        <Text style={styles.text}>{t.risk_disclaimer}</Text>
        {insights.key_risks.map((risk, i) => (
          <Text key={i} style={styles.text}>• {risk}</Text>
        ))}

        <Text style={styles.sectionTitle}>4. Suitability Assessment</Text>
        <Text style={styles.text}>{t.compare_profile}</Text>
        
        {insights.suitability_insights.map((s, i) => {
          const cardStyle = s.missing ? styles.infoCard : s.status === "PASS" ? styles.passCard : s.status === "WARNING" ? styles.warningCard : styles.mismatchCard;
          return (
            <View key={i} style={cardStyle} wrap={false}>
              <Text style={styles.bold}>{s.title} - {s.missing ? t.need_info : s.status}</Text>
              <Text style={styles.text}>{s.explanation}</Text>
              {s.money_comparison && s.money_comparison.length > 0 && (
                <View style={{ flexDirection: "row", marginTop: 5 }}>
                  {s.money_comparison.map((f, j) => (
                    <Text key={j} style={{ fontSize: 9, marginRight: 15 }}>
                      {f.label}: {f.unit === currency ? money(f.value, f.unit) : f.unit === "%" ? pct(f.value / 100) : `${f.value} ${f.unit}`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {insights.historical_insights && insights.historical_insights.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>5. Historical Evidence</Text>
            <Text style={styles.text}>{insights.historical_note}</Text>
            <View style={styles.factGrid}>
              {insights.historical_insights.map((f, i) => (
                <View key={i} style={styles.factBox}>
                  <Text style={styles.factLabel}>{f.label}</Text>
                  <Text style={styles.factValue}>{f.value} {f.unit}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 9, color: "#6b7280" }}>{t.historical_disclaimer}</Text>
          </View>
        )}

        <View wrap={false}>
          <Text style={styles.sectionTitle}>6. Questions and Disclosures</Text>
          <Text style={styles.text}>{t.discuss_points}</Text>
          {insights.discussion_points.map((pt, i) => (
            <Text key={i} style={styles.text}>• {pt}</Text>
          ))}
          <View style={{ marginTop: 15, borderTop: "1pt solid #e5e7eb", paddingTop: 10 }}>
            {insights.important_notes.map((note, i) => (
              <Text key={i} style={{ fontSize: 9, color: "#6b7280", marginBottom: 4, textTransform: "uppercase" }}>{note}</Text>
            ))}
          </View>
        </View>

        <Text style={styles.footer} fixed>InveSimul Investment Report · {clientName} · {state.product?.ticker}</Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
