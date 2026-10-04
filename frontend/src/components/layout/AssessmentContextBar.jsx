import { Link } from "react-router-dom";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { useAssessment } from "../../state/AssessmentContext";

export default function AssessmentContextBar() {
  const { state } = useAssessment();
  const savedProduct = state.products.find(
    (product) => product.id === state.selectedProductId,
  );
  const customerName = state.client?.client_name || "No customer selected";
  const productName =
    state.product?.name ||
    savedProduct?.template?.name ||
    "No product selected";
  const productType =
    state.product?.type || savedProduct?.template?.product_type || "";
  const underlying =
    state.product?.ticker || savedProduct?.template?.ticker || "";

  return (
    <div className="assessment-context" aria-label="Current advisory context">
      <div className="assessment-context-item">
        <span className="assessment-context-icon">
          <UserRound size={15} />
        </span>
        <span>
          <small>Customer</small>
          <strong>{customerName}</strong>
        </span>
        <Link to="/clients">Change</Link>
      </div>
      <span className="assessment-context-divider" aria-hidden="true" />
      <div className="assessment-context-item">
        <span className="assessment-context-icon product">
          <BriefcaseBusiness size={15} />
        </span>
        <span>
          <small>Product</small>
          <strong>
            {productType ? `${productType} · ` : ""}
            {productName}
            {underlying ? ` · ${underlying}` : ""}
          </strong>
        </span>
        <Link to="/simulator">Change</Link>
      </div>
    </div>
  );
}
