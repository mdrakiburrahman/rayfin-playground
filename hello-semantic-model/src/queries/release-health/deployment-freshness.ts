import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./deployment-freshness.dax?raw";
import spec from "./deployment-freshness.json";

const connection = "releaseHealth";

export const deploymentFreshnessColumnMetadata: ColumnMetadataMap = {
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "Deployment Environment[environment_name]": {
        name: "Environment",
        displayName: "Environment",
    },
    "Service Group[primary_owner_alias]": {
        name: "EngineeringManager",
        displayName: "Engineering manager",
    },
    "[Days Since Last Successful Deployment]": {
        name: "DaysSinceLastSuccessfulDeployment",
        displayName: "Days since last success",
        format: "#,0",
    },
    "[Freshness SLA Days]": {
        name: "FreshnessSLADays",
        displayName: "SLA days",
        format: "#,0",
    },
    "[Days Over SLA]": {
        name: "DaysOverSLA",
        displayName: "Days over SLA",
        format: "#,0",
    },
    "[Last Successful Deployment]": {
        name: "LastSuccessfulDeployment",
        displayName: "Last successful deployment",
        format: "yyyy-mm-dd HH:mm:ss",
    },
    "[Last Successful Rollout]": {
        name: "LastSuccessfulRollout",
        displayName: "Last successful rollout",
    },
};

export function deploymentFreshness() {
    return {
        connection,
        query,
        columnMetadata: deploymentFreshnessColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
