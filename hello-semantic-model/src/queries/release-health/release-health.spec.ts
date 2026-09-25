import { describe, expect, it } from "vitest";

import {
    daysSinceLastSuccessfulDeployment,
    deployedEnvironment,
    deploymentFreshness,
    deploymentStepsByFailure,
    failedDeploymentStepsByServiceGroup,
    failedRolloutsByServiceGroup,
    icmsOpenedByDate,
    regionalVersionDrift,
    releaseSummary,
    rolloutAttemptsByDate,
    rolloutSuccessByState,
    rolloutSuccessRateByDate,
    rolloutTrend,
    serviceGroupRisk,
    stalenessLeaderboard,
    stepRunsAndFailuresByDate,
    successfulAndFailedRolloutsByDate,
    successfulRolloutsByServiceGroup,
    versionsBehindByRegion,
} from "@/queries/release-health";

const expectedConnection = "releaseHealth";
const scopedServiceGroup = "Microsoft.Azure.HybridData.SqlOpsMcpService";

describe("release health query factories", () => {
    it.each([
        ["releaseSummary", releaseSummary],
        ["rolloutTrend", rolloutTrend],
        ["serviceGroupRisk", serviceGroupRisk],
        ["deploymentFreshness", deploymentFreshness],
        ["deploymentStepsByFailure", deploymentStepsByFailure],
        ["regionalVersionDrift", regionalVersionDrift],
        ["deployedEnvironment", deployedEnvironment],
        ["failedRolloutsByServiceGroup", failedRolloutsByServiceGroup],
        ["successfulRolloutsByServiceGroup", successfulRolloutsByServiceGroup],
        ["versionsBehindByRegion", versionsBehindByRegion],
        ["rolloutSuccessRateByDate", rolloutSuccessRateByDate],
        ["rolloutAttemptsByDate", rolloutAttemptsByDate],
        ["successfulAndFailedRolloutsByDate", successfulAndFailedRolloutsByDate],
        ["rolloutSuccessByState", rolloutSuccessByState],
        [
            "daysSinceLastSuccessfulDeployment",
            daysSinceLastSuccessfulDeployment,
        ],
        ["stepRunsAndFailuresByDate", stepRunsAndFailuresByDate],
        [
            "failedDeploymentStepsByServiceGroup",
            failedDeploymentStepsByServiceGroup,
        ],
        ["stalenessLeaderboard", stalenessLeaderboard],
        ["icmsOpenedByDate", icmsOpenedByDate],
    ])("%s returns the registered connection and report scope", (_name, factory) => {
        const config = factory();

        expect(config.connection).toBe(expectedConnection);
        expect(config.query).toContain(scopedServiceGroup);
        expect(config.query).toContain("EVALUATE");
        expect(config.vegaLiteSpec).toMatchObject({
            width: "container",
            height: "container",
        });
    });

    it("uses exact query output names for rollout trend metadata", () => {
        const config = rolloutTrend();

        expect(Object.keys(config.columnMetadata)).toEqual([
            "Date[date]",
            "[Rollout Attempts]",
            "[Successful Rollouts]",
            "[Failed Rollouts]",
            "[Rollout Success Rate]",
        ]);
        expect(config.columnMetadata["Date[date]"].name).toBe("Date");
    });

    it("uses exact query output names for deployment freshness metadata", () => {
        const config = deploymentFreshness();

        expect(config.columnMetadata).toHaveProperty(
            "Deployment Environment[environment_name]",
        );
        expect(config.columnMetadata).toHaveProperty("[Last Successful Rollout]");
        expect(config.query).toContain("TOPN(");
    });

    it("keeps presentation field names aligned with the risk chart spec", () => {
        const config = serviceGroupRisk();
        const serializedSpec = JSON.stringify(config.vegaLiteSpec);

        expect(config.columnMetadata["[Failed Rollouts]"].name).toBe(
            "FailedRollouts",
        );
        expect(serializedSpec).toContain("FailedRollouts");
        expect(serializedSpec).toContain("ServiceGroup");
    });
});
