import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";

const Context = createContext(null);
const STORAGE = "astraforge.session.v1";
const empty = {
  client: null,
  product: null,
  simulation: null,
  evaluation: null,
  history: [],
  products: [],
  selectedProductId: null,
  clientDraft: null,
  insights: {},
};
function initial() {
  try {
    const data = JSON.parse(sessionStorage.getItem(STORAGE));
    return data?.version === 1 ? { ...empty, ...data.state } : empty;
  } catch {
    return empty;
  }
}
function reducer(state, action) {
  // New deterministic inputs invalidate both audience explanations.
  if (["client", "budget", "product", "save_product", "select_product", "start_assessment", "simulation", "evaluation", "restore"].includes(action.type)) state = {...state, insights: {}};
  switch (action.type) {
    case "insights":
      return action.assessmentId === state.evaluation?.assessment.assessment_id ? {...state, insights: {...state.insights, [action.audience]: action.value}} : state;
    case "budget":
      return {...state, client: {...state.client, ...action.value}, product: null, simulation: null, evaluation: null};
    case "save_product":
      return {
        ...state,
        products: [
          ...state.products.filter((p) => p.id !== action.value.id),
          action.value,
        ],
        selectedProductId: action.value.id,
        product: null,
        simulation: null,
        evaluation: null,
      };
    case "select_product":
      return {
        ...state,
        selectedProductId: action.value,
        product: null,
        simulation: null,
        evaluation: null,
      };
    case "start_assessment":
      return { ...state, ...action.value, simulation: null, evaluation: null };
    case "client":
      return {
        ...state,
        client: action.value,
        clientDraft: action.draft || null,
        product: null,
        simulation: null,
        evaluation: null,
      };
    case "product":
      return {
        ...state,
        product: action.value,
        simulation: null,
        evaluation: null,
      };
    case "simulation":
      return { ...state, simulation: action.value, evaluation: null };
    case "evaluation":
      return { ...state, evaluation: action.value };
    case "save": {
      if (!state.evaluation) return state;
      const id = state.evaluation.assessment.assessment_id;
      if (state.history.some((row) => row.id === id)) return state;
      // Keep compact immutable snapshots; avoid storing thousands of historical windows.
      const snapshot = {
        id,
        client: state.client,
        product: state.product,
        evaluation: state.evaluation,
        simulation: {
          ...state.simulation,
          backtest: state.simulation?.backtest
            ? { ...state.simulation.backtest, windows: [] }
            : null,
        },
      };
      return { ...state, history: [snapshot, ...state.history].slice(0, 30) };
    }
    case "restore":
      return {
        ...state,
        client: action.value.client,
        clientDraft: null,
        selectedProductId: action.value.product?.savedProductId || null,
        product: action.value.product,
        simulation: action.value.simulation,
        evaluation: action.value.evaluation,
      };
    case "new":
      return { ...empty, products: state.products, history: state.history };
    default:
      return state;
  }
}
export function AssessmentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const compact = {
        ...state,
        simulation: state.simulation
          ? {
              ...state.simulation,
              backtest: state.simulation.backtest
                ? { ...state.simulation.backtest, windows: [] }
                : null,
            }
          : null,
      };
      sessionStorage.setItem(
        STORAGE,
        JSON.stringify({ version: 1, state: compact }),
      );
      // Storage is an external system; report its availability to the user.
      // eslint-disable-next-line react/set-state-in-effect
      setStorageError(false);
    } catch {
      // eslint-disable-next-line react/set-state-in-effect
      setStorageError(true);
    }
  }, [state]);
  return (
    <Context.Provider value={{ state, dispatch }}>
      {storageError && (
        <div className="notice warning" role="alert">
          Browser session storage is unavailable or full. Changes are in memory
          only and will be lost on refresh.
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
// Shared provider/hook pair is intentional; consumers are HMR-safe.
// eslint-disable-next-line react/only-export-components
export const useAssessment = () => useContext(Context);
