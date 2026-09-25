import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./service-group-risk.dax?raw";
import spec from "./service-group-risk.json";

const connection = "releaseHealth";

export const serviceGroupRiskColumnMetadata: ColumnMetadataMap = {
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "Service Group[primary_owner_alias]": {
        name: "EngineeringManager",
        displayName: "Engineering manager",
    },
    "[Rollout Attempts]": {
        name: "RolloutAttempts",
        displayName: "Rollout attempts",
        format: "#,0",
    },
    "[Failed Rollouts]": {
        name: "FailedRollouts",
        displayName: "Failed rollouts",
        format: "#,0",
    },
    "[Rollout Success Rate]": {
        name: "RolloutSuccessRate",
        displayName: "Rollout success rate",
        format: "0.0%;-0.0%;0.0%",
    },
    "[Step Failures]": {
        name: "StepFailures",
        displayName: "Step failures",
        format: "#,0",
    },
    "[Days Since Last Successful Deployment]": {
        name: "DaysSinceLastSuccessfulDeployment",
        displayName: "Days since last successful deployment",
        format: "#,0",
    },
};

export function serviceGroupRisk() {
    return {
        connection,
        query,
        columnMetadata: serviceGroupRiskColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
