import {
    FabricApiProxyError,
    FabricNetworkProxyError,
} from "@microsoft/fabric-app-data";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    LOCAL_DAX_ENDPOINT,
    LocalDevFabricApiProxy,
} from "@/lib/local-dev-fabric-proxy";

describe("LocalDevFabricApiProxy", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("forwards JSON DAX requests to the Vite development endpoint", async () => {
        const response = {
            data: { results: [] },
            requestId: "server-request",
        };
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(response), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const proxy = new LocalDevFabricApiProxy("session");
        await expect(
            proxy.semanticModel.executeDaxJson("workspace", "item", "EVALUATE ROW()"),
        ).resolves.toEqual(response);

        expect(fetchMock).toHaveBeenCalledWith(
            LOCAL_DAX_ENDPOINT,
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    workspaceId: "workspace",
                    itemId: "item",
                    query: "EVALUATE ROW()",
                }),
            }),
        );
    });

    it("maps endpoint errors to Fabric API errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        message: "Not signed in to Azure CLI. Run: az login",
                        requestId: "server-request",
                    }),
                    { status: 401 },
                ),
            ),
        );

        const proxy = new LocalDevFabricApiProxy("session");
        await expect(
            proxy.semanticModel.executeDaxJson("workspace", "item", "EVALUATE ROW()"),
        ).rejects.toBeInstanceOf(FabricApiProxyError);
    });

    it("maps fetch failures to Fabric network errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("connection refused")),
        );

        const proxy = new LocalDevFabricApiProxy("session");
        await expect(
            proxy.semanticModel.executeDaxJson("workspace", "item", "EVALUATE ROW()"),
        ).rejects.toBeInstanceOf(FabricNetworkProxyError);
    });
});
