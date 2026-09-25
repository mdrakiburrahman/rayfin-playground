import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./deployment-steps-by-failure.dax?raw";
import spec from "./deployment-steps-by-failure.json";

const connection = "releaseHealth";

export const deploymentStepsByFailureColumnMetadata: ColumnMetadataMap = {
    "Deployment Step[step_name]": {
        name: "DeploymentStep",
        displayName: "Deployment step",
    },
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "[Average Duration Seconds]": {
        name: "AverageDurationSeconds",
        displayName: "Average duration (s)",
        format: "#,0.00",
    },
    "[Step Runs]": {
        name: "StepRuns",
        displayName: "Step runs",
        format: "#,0",
    },
    "[Step Failures]": {
        name: "StepFailures",
        displayName: "Step failures",
        format: "#,0",
    },
    "[Step Failure Rate]": {
        name: "StepFailureRate",
        displayName: "Step failure rate",
        format: "0.0%;-0.0%;0.0%",
    },
};

export function deploymentStepsByFailure() {
    return {
        connection,
        query,
        columnMetadata: deploymentStepsByFailureColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
