import { createContext, useContext, useState } from 'react';

const SimulatorContext = createContext();

export function SimulatorProvider({ children }) {
  const [productConfig, setProductConfig] = useState({
    product_type: 'ELN',
    underlying: 'NIFTY50',
    investment: 1000000,
    tenor_years: 1.0,
    strike_pct: 90.0,
    barrier_pct: 70.0,
    barrier_monitoring: 'daily',
    coupon_pct_pa: 12.0
  });

  const [clientProfile, setClientProfile] = useState({
    client_id: 'CLI-BAL-02',
    client_name: 'Balanced professional',
    risk_appetite: 'MODERATE',
    investment_horizon_months: 24,
    max_acceptable_loss_pct: 15.0,
    existing_underlying_exposure_pct: 15.0,
    total_portfolio_value: 15000000,
    proposed_investment_amount: 1000000,
    existing_structured_product_exposure: 500000,
    liquidity_requirement_months: 6,
    investment_objective: 'Growth',
    rm_name: 'Wealth Management Team'
  });

  const [simulationResults, setSimulationResults] = useState(null);
  const [suitabilityAssessment, setSuitabilityAssessment] = useState(null);
  const [auditRecord, setAuditRecord] = useState(null);

  const value = {
    productConfig,
    setProductConfig,
    clientProfile,
    setClientProfile,
    simulationResults,
    setSimulationResults,
    suitabilityAssessment,
    setSuitabilityAssessment,
    auditRecord,
    setAuditRecord
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  return useContext(SimulatorContext);
}
