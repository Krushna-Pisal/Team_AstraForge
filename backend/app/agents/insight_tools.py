"""Read-only wrappers over trusted assessment snapshots and existing engines."""
from app.assessment_records import get_record
from app.phase3_sim_models import ProductConfiguration, ScenarioRequest
from app.phase3_simulation import simulate_scenarios
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff

def trusted_inputs(assessment_id, caller=None):
    record = get_record(assessment_id, caller=caller)
    request = record["request"]
    config = ProductConfiguration.model_validate({key:request[key] for key in ("product_type","eln_config","dcd_config","cpn_config")})
    # Only deterministic services compute results. No fresh quotes change the saved contract.
    payoff = {"ELN":calculate_eln_payoff,"DCD":calculate_dcd_payoff,"CPN":calculate_cpn_payoff}[config.product_type](config.config)
    scenarios = simulate_scenarios(ScenarioRequest(**config.model_dump()))
    client = {key:value for key,value in request["client"].items() if key not in ("client_id","client_name","additional_constraints")}
    return {"client":client,"product":config.model_dump(mode="json"),"ticker":request["ticker"],
            "payoff":payoff.model_dump(mode="json"),"scenarios":scenarios.model_dump(mode="json"),
            "history":record["history"],"risk":record["evaluation"]["product_risk"],
            "assessment":{k:v for k,v in record["evaluation"]["assessment"].items()
                          if k in ("checks","overall_status","completeness","rule_set_version")},
            "historical_error":record["evaluation"]["historical_error"]}
