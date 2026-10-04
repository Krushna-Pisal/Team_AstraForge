import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Svg, Polyline, Line, Rect } from "@react-pdf/renderer";
import { money, pct } from "../../lib/api";

// Use a font that supports Devanagari characters
Font.register({
  family: "Noto Sans Devanagari",
  src: "https://fonts.gstatic.com/s/notosansdevanagari/v22/6xKwdspZNa_1Yj-yYtW5yFw01G9B35U00rF0B7I2.ttf",
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 45,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.45,
  },
  pageDevanagari: {
    paddingTop: 36,
    paddingBottom: 45,
    paddingHorizontal: 36,
    fontFamily: "Noto Sans Devanagari",
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.45,
  },
  header: {
    marginBottom: 16,
    borderBottom: "1.5pt solid #cbd5e1",
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 1,
  },
  headerMeta: {
    textAlign: "right",
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#334155",
  },
  date: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: "#f1f5f9",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  text: {
    fontSize: 9.5,
    color: "#334155",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  bold: {
    fontWeight: "bold",
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    gap: 6,
  },
  factBox: {
    width: "31.8%",
    padding: 8,
    backgroundColor: "#f8fafc",
    border: "0.8pt solid #e2e8f0",
    borderRadius: 4,
    marginBottom: 4,
  },
  factLabel: {
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  factValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 3,
  },
  chartContainer: {
    marginVertical: 10,
    padding: 8,
    backgroundColor: "#f8fafc",
    border: "0.8pt solid #e2e8f0",
    borderRadius: 4,
  },
  chartAxisText: {
    fontSize: 7.5,
    fill: "#64748b",
  },
  scenarioTable: {
    marginVertical: 6,
    border: "0.8pt solid #e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: "1pt solid #cbd5e1",
  },
  tableHeaderCol: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#334155",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottom: "0.5pt solid #f1f5f9",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    borderBottom: "0.5pt solid #f1f5f9",
  },
  tableCol: {
    fontSize: 8.5,
    color: "#1e293b",
  },
  statusCard: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  passCard: {
    backgroundColor: "#f0fdf4",
    borderLeft: "3pt solid #16a34a",
    borderTop: "0.5pt solid #dcfce7",
    borderRight: "0.5pt solid #dcfce7",
    borderBottom: "0.5pt solid #dcfce7",
  },
  warningCard: {
    backgroundColor: "#fffbeb",
    borderLeft: "3pt solid #d97706",
    borderTop: "0.5pt solid #fef3c7",
    borderRight: "0.5pt solid #fef3c7",
    borderBottom: "0.5pt solid #fef3c7",
  },
  mismatchCard: {
    backgroundColor: "#fef2f2",
    borderLeft: "3pt solid #dc2626",
    borderTop: "0.5pt solid #fee2e2",
    borderRight: "0.5pt solid #fee2e2",
    borderBottom: "0.5pt solid #fee2e2",
  },
  infoCard: {
    backgroundColor: "#f8fafc",
    borderLeft: "3pt solid #64748b",
    borderTop: "0.5pt solid #e2e8f0",
    borderRight: "0.5pt solid #e2e8f0",
    borderBottom: "0.5pt solid #e2e8f0",
  },
  statusTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  statusText: {
    fontSize: 8.5,
    color: "#334155",
    lineHeight: 1.35,
  },
  bulletItem: {
    fontSize: 8.5,
    color: "#334155",
    marginBottom: 3,
    paddingLeft: 4,
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5pt solid #cbd5e1",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

const PdfChart = ({ curve, strikePct, barrierPct }) => {
  if (!curve || curve.length === 0) return null;
  const minX = Math.min(...curve.map((d) => d.underlying_return_pct));
  const maxX = Math.max(...curve.map((d) => d.underlying_return_pct));
  const minY = Math.min(-100, ...curve.map((d) => d.investor_return_pct));
  const maxY = Math.max(25, ...curve.map((d) => d.investor_return_pct));

  const width = 450;
  const height = 120;
  const padding = 20;

  const mapX = (x) => padding + ((x - minX) / (maxX - minX || 1)) * (width - 2 * padding);
  const mapY = (y) => padding + height - ((y - minY) / (maxY - minY || 1)) * height;

  const points = curve
    .map((d) => `${mapX(d.underlying_return_pct).toFixed(1)},${mapY(d.investor_return_pct).toFixed(1)}`)
    .join(" ");

  return (
    <View style={styles.chartContainer} wrap={false}>
      <Text style={{ fontSize: 9, fontWeight: "bold", color: "#334155", marginBottom: 6, textAlign: "center" }}>
        Contractual Payoff Curve (Maturity Return Profile)
      </Text>
      <Svg viewBox={`0 0 ${width} ${height + padding * 2}`} width="100%" height={120}>
        {/* Zero axes */}
        <Line x1={padding} y1={mapY(0)} x2={width - padding} y2={mapY(0)} stroke="#cbd5e1" strokeWidth={1} />
        <Line x1={mapX(0)} y1={padding} x2={mapX(0)} y2={height + padding} stroke="#cbd5e1" strokeWidth={1} />

        {/* Strike / Barrier Markers */}
        {strikePct != null && (
          <Line
            x1={mapX(strikePct - 100)}
            y1={padding}
            x2={mapX(strikePct - 100)}
            y2={height + padding}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        {barrierPct != null && (
          <Line
            x1={mapX(barrierPct - 100)}
            y1={padding}
            x2={mapX(barrierPct - 100)}
            y2={height + padding}
            stroke="#ef4444"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}

        {/* Payoff Curve */}
        <Polyline points={points} stroke="#2563eb" strokeWidth={2} fill="none" />

        {/* Axis Labels */}
        <Text x={mapX(maxX) - 45} y={mapY(0) + 12} style={styles.chartAxisText}>
          Underlying +
        </Text>
        <Text x={padding} y={mapY(0) + 12} style={styles.chartAxisText}>
          Underlying -
        </Text>
        <Text x={mapX(0) + 4} y={padding + 8} style={styles.chartAxisText}>
          + Return
        </Text>
      </Svg>
    </View>
  );
};

export default function ClientReportPDF({ state = {}, insights = {}, language = "EN", t = {} }) {
  const safeState = state || {};
  const safeInsights = insights || {};
  const productConfig = safeState.product?.config || {};
  const type = safeState.product?.type || "Product";

  const defaultStrings = {
    cpn_name: "Capital-Protected Note (CPN)",
    dcd_name: "Dual Currency Deposit (DCD)",
    eln_name: "Equity-Linked Note (ELN)",
    slider_instruction: "Deterministic scenarios showing potential maturity payoffs under various market movements.",
    initial_investment: "Initial Investment",
    modeled_maturity: "Modeled Maturity Value",
    potential_gain_loss: "Net Profit / Loss",
    investor_return: "Investor Return",
    risk_disclaimer: "All structured investments carry financial risks. Modeled returns assume counterparty solvency. Principal protection, where applicable, is contractual and guaranteed by the issuer at maturity.",
    compare_profile: "This suitability assessment benchmarks product risks against the customer profile submitted in this session.",
    need_info: "NEEDS REVIEW",
    historical_disclaimer: "Historical backtest results are based on historical observations and do not represent a guarantee or forecast of future market performance.",
    discuss_points: "Key advisory points to discuss between the client and relationship manager before execution:",
  };

  const strings = { ...defaultStrings, ...(t || {}) };
  const typeName =
    type === "CPN"
      ? strings.cpn_name
      : type === "DCD"
      ? strings.dcd_name
      : type === "ELN"
      ? strings.eln_name
      : type;

  const investment = productConfig.investment ?? productConfig.deposit_amount ?? safeState.client?.proposed_investment_amount ?? 0;
  const currency =
    productConfig.investment_currency ||
    productConfig.deposit_currency ||
    safeState.client?.portfolio_currency ||
    "INR";

  const clientName = safeState.client?.client_name || "Valued Client";
  const isIndic = language === "HI" || language === "MR";
  const pageStyle = isIndic ? styles.pageDevanagari : styles.page;

  // Safe Fallback Lists
  const executiveSummary =
    safeInsights.executive_summary ||
    `This report summarizes the advisory suitability and deterministic return profile of a ${typeName} linked to ${safeState.product?.ticker || "the underlying"} for ${clientName}.`;

  const investmentSummary =
    safeInsights.investment_summary && safeInsights.investment_summary.length > 0
      ? safeInsights.investment_summary
      : [
          { label: "Tenor", value: productConfig.tenor_years ? `${productConfig.tenor_years} yr(s)` : "1 yr" },
          ...(productConfig.coupon_pct_pa != null
            ? [{ label: "Coupon Rate", value: `${productConfig.coupon_pct_pa}% p.a.` }]
            : []),
          ...(productConfig.protection_pct != null
            ? [{ label: "Capital Floor", value: `${productConfig.protection_pct}%` }]
            : []),
          ...(productConfig.participation_pct != null
            ? [{ label: "Participation", value: `${productConfig.participation_pct}%` }]
            : []),
          ...(productConfig.strike_pct != null
            ? [{ label: "Strike Barrier", value: `${productConfig.strike_pct}%` }]
            : []),
          ...(productConfig.conversion_strike_rate != null
            ? [{ label: "Conversion Strike", value: `${productConfig.conversion_strike_rate}` }]
            : []),
        ];

  // Scenarios
  const scenarioResults = safeState.simulation?.scenarios?.results || [];
  const scenarioInsights =
    safeInsights.scenario_insights && safeInsights.scenario_insights.length > 0
      ? safeInsights.scenario_insights
      : scenarioResults.slice(0, 5).map((r) => ({
          title: `Shock: ${r.scenario_shock_pct > 0 ? "+" : ""}${r.scenario_shock_pct}%`,
          explanation: `Maturity value is estimated at ${money(r.maturity_value, currency)}.`,
          result: r,
        }));

  // Suitability Checks
  const checks = safeState.evaluation?.assessment?.checks || [];
  const suitabilityInsights =
    safeInsights.suitability_insights && safeInsights.suitability_insights.length > 0
      ? safeInsights.suitability_insights
      : checks.map((c) => ({
          title: (c.type || "").replace(/_/g, " ").toUpperCase(),
          status: c.status,
          missing: c.reason_code?.startsWith("MISSING_"),
          explanation: c.reason || "",
          money_comparison: [],
        }));

  // Key Risks
  const keyRisks =
    safeInsights.key_risks && safeInsights.key_risks.length > 0
      ? safeInsights.key_risks
      : [
          type === "CPN"
            ? "Capital Protection Floor: Principal floor is honored at contractual maturity, subject to issuer creditworthiness."
            : type === "DCD"
            ? "Currency Conversion: Conversion into alternate currency occurs if the exchange rate reaches or exceeds the strike rate."
            : "Market Downside Risk: Capital is not protected below the barrier; investment will mirror underlying asset decline.",
          "Counterparty Solvency: This investment is not a standard bank deposit. Return of principal depends on issuer credit solvency.",
          "Illiquidity: Intended to be held to maturity. Secondary market exits prior to maturity may result in capital discounts.",
        ];

  // Historical Insights
  const historicalInsights = safeInsights.historical_insights || [];
  const historicalNote =
    safeInsights.historical_note ||
    `Historical simulations analyze rolling ${productConfig.tenor_years || 1}-year calendar windows across available market data.`;

  // Discussion Points
  const discussionPoints =
    safeInsights.discussion_points && safeInsights.discussion_points.length > 0
      ? safeInsights.discussion_points
      : [
          "Confirm that the client's liquidity requirements match the contractual tenor without needing early exit.",
          "Review concentration exposure across the client's existing holdings in this underlying asset.",
          "Ensure the customer fully understands the payoff conditions and downside scenarios.",
        ];

  const importantNotes =
    safeInsights.important_notes && safeInsights.important_notes.length > 0
      ? safeInsights.important_notes
      : [
          "CONFIDENTIAL & PROPRIETARY · PREPARED FOR CLIENT REVIEW ONLY.",
          "DETERMINISTIC MODELING RESULTS · NOT AN OFFER OR EXECUTABLE ORDER.",
          "ASTRAFORGE STRUCTURED PRODUCT ADVISORY SYSTEM · REGULATORY COMPLIANT.",
        ];

  const assessmentRef = safeState.evaluation?.assessment?.assessment_id || safeState.id || "DRAFT-DOC";

  return (
    <Document>
      {/* PAGE 1: Overview, Terms, and Scenario Outcomes */}
      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ASTRAFORGE</Text>
            <Text style={styles.brandSub}>Structured Product Advisory</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.reportTitle}>Client Advisory Report</Text>
            <Text style={styles.date}>Ref: {assessmentRef.slice(0, 12)} · {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>1. Investment Overview & Customer Profile</Text>
        <Text style={styles.text}>{executiveSummary}</Text>

        <View style={styles.factGrid}>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Customer Name</Text>
            <Text style={styles.factValue}>{clientName}</Text>
          </View>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Product Type</Text>
            <Text style={styles.factValue}>{typeName}</Text>
          </View>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Underlying Asset</Text>
            <Text style={styles.factValue}>{safeState.product?.ticker || "N/A"}</Text>
          </View>
          <View style={styles.factBox}>
            <Text style={styles.factLabel}>Investment Amount</Text>
            <Text style={styles.factValue}>{money(investment, currency)}</Text>
          </View>
          {investmentSummary.map((fact, i) => (
            <View key={i} style={styles.factBox}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.factValue}>
                {fact.value} {fact.unit || ""}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>2. Contractual Payoff & Scenarios</Text>
        <Text style={styles.text}>{strings.slider_instruction}</Text>

        {safeState.simulation?.curve?.results && (
          <PdfChart
            curve={safeState.simulation.curve.results.map((r) => ({
              underlying_return_pct: r.scenario_shock_pct,
              investor_return_pct: r.return_pct,
            }))}
            strikePct={
              type === "ELN"
                ? productConfig.strike_pct
                : type === "DCD" && productConfig.initial_fx_rate
                ? (productConfig.conversion_strike_rate / productConfig.initial_fx_rate) * 100
                : undefined
            }
            barrierPct={type === "ELN" ? productConfig.barrier_pct : undefined}
          />
        )}

        {scenarioInsights.length > 0 && (
          <View style={styles.scenarioTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCol, { width: "30%" }]}>Scenario</Text>
              <Text style={[styles.tableHeaderCol, { width: "30%", textAlign: "right" }]}>Maturity Value</Text>
              <Text style={[styles.tableHeaderCol, { width: "20%", textAlign: "right" }]}>Net P&L</Text>
              <Text style={[styles.tableHeaderCol, { width: "20%", textAlign: "right" }]}>Return (%)</Text>
            </View>
            {scenarioInsights.slice(0, 5).map((sc, idx) => {
              const r = sc.result || {};
              const isGain = (r.return_pct || 0) >= 0;
              const rowStyle = idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow;
              return (
                <View key={idx} style={rowStyle}>
                  <Text style={[styles.tableCol, { width: "30%", fontWeight: "bold" }]}>{sc.title}</Text>
                  <Text style={[styles.tableCol, { width: "30%", textAlign: "right" }]}>
                    {money(r.maturity_value ?? 0, currency)}
                  </Text>
                  <Text style={[styles.tableCol, { width: "20%", textAlign: "right", color: isGain ? "#16a34a" : "#dc2626" }]}>
                    {isGain ? "+" : ""}{money(r.profit_loss ?? 0, currency)}
                  </Text>
                  <Text style={[styles.tableCol, { width: "20%", textAlign: "right", fontWeight: "bold", color: isGain ? "#16a34a" : "#dc2626" }]}>
                    {isGain ? "+" : ""}{pct((r.return_pct || 0) / 100)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AstraForge Advisory · {clientName} · {safeState.product?.ticker || type}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 2: Risks, Suitability, and Disclosures */}
      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ASTRAFORGE</Text>
            <Text style={styles.brandSub}>Structured Product Advisory</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.reportTitle}>Suitability & Risk Disclosures</Text>
            <Text style={styles.date}>Client: {clientName}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>3. Key Risks & Important Conditions</Text>
        <Text style={styles.text}>{strings.risk_disclaimer}</Text>
        {keyRisks.map((risk, i) => (
          <Text key={i} style={styles.bulletItem}>
            • {risk}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>4. Client Suitability Assessment</Text>
        <Text style={styles.text}>{strings.compare_profile}</Text>

        {suitabilityInsights.map((s, i) => {
          const cardStyle = s.missing
            ? styles.infoCard
            : s.status === "PASS"
            ? styles.passCard
            : s.status === "WARNING"
            ? styles.warningCard
            : styles.mismatchCard;
          return (
            <View key={i} style={[styles.statusCard, cardStyle]} wrap={false}>
              <Text style={styles.statusTitle}>
                {s.title} · {s.missing ? strings.need_info : s.status}
              </Text>
              <Text style={styles.statusText}>{s.explanation}</Text>
            </View>
          );
        })}

        {historicalInsights.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>5. Historical Market Evidence</Text>
            <Text style={styles.text}>{historicalNote}</Text>
            <View style={styles.factGrid}>
              {historicalInsights.map((f, i) => (
                <View key={i} style={styles.factBox}>
                  <Text style={styles.factLabel}>{f.label}</Text>
                  <Text style={styles.factValue}>
                    {f.value} {f.unit || ""}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 7.5, color: "#64748b", marginTop: 2 }}>{strings.historical_disclaimer}</Text>
          </View>
        )}

        <View wrap={false} style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>6. Relationship Manager Discussion Points</Text>
          <Text style={styles.text}>{strings.discuss_points}</Text>
          {discussionPoints.map((pt, i) => (
            <Text key={i} style={styles.bulletItem}>
              • {pt}
            </Text>
          ))}
          <View style={{ marginTop: 10, borderTop: "0.8pt solid #e2e8f0", paddingTop: 8 }}>
            {importantNotes.map((note, i) => (
              <Text key={i} style={{ fontSize: 7, color: "#94a3b8", marginBottom: 2 }}>
                {note}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AstraForge Wealth Management · Strictly Confidential</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
