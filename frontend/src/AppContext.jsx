import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [workflowState, setWorkflowState] = useState({
    product: null,
    payoff: null,
    simulation: null,
    backtest: null,
    client_profile: null,
    product_risk: null,
    suitability: null,
    metadata: null
  });

  const updateWorkflow = (key, data) => {
    setWorkflowState(prev => ({ ...prev, [key]: data }));
  };

  return (
    <AppContext.Provider value={{ workflowState, updateWorkflow }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppWorkflow() {
  return useContext(AppContext);
}
