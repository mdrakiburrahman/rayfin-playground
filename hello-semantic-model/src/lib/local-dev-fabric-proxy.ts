import {
    FabricApiProxyError,
    FabricGenericProxyError,
    FabricNetworkProxyError,
    type DaxJsonProxyResponse,
    type DaxProxyResponse,
    type IFabricApiProxy,
    type ILakehouseApiProxy,
    type ISemanticModelApiProxy,
    type IWarehouseApiProxy,
    type SqlProxyResponse,
    type WorkspaceId,
} from "@microsoft/fabric-app-data";

export const LOCAL_DAX_ENDPOINT = "/__fabric/semantic-model/query";

interface LocalProxyErrorResponse {
    message?: string;
    requestId?: string;
    details?: string;
}

function getResponseMessage(
    payload: LocalProxyErrorResponse | undefined,
    fallback: string,
): string {
    return payload?.message?.trim() || fallback;
}

async function parseErrorResponse(response: Response) {
    const text = await response.text();
    if (!text) return { payload: undefined, body: "" };

    try {
        return {
            payload: JSON.parse(text) as LocalProxyErrorResponse,
            body: text,
        };
    } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        return { payload: undefined, body: text };
    }
}

class LocalSemanticModelProxy implements ISemanticModelApiProxy {
    constructor(private readonly sessionId: string) {}

    async executeDax(): Promise<DaxProxyResponse> {
        throw new FabricGenericProxyError({
            message: "Local development uses the JSON DAX protocol.",
            sessionId: this.sessionId,
        });
    }

    async executeDaxJson(
        workspaceId: WorkspaceId,
        itemId: string,
        query: string,
    ): Promise<DaxJsonProxyResponse> {
        const requestId = crypto.randomUUID();
        let response: Response;

        try {
            response = await fetch(LOCAL_DAX_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Request-ID": requestId,
                },
                body: JSON.stringify({ workspaceId, itemId, query }),
            });
        } catch (error) {
            throw new FabricNetworkProxyError({
                requestId,
                sessionId: this.sessionId,
                message: "The local Fabric query endpoint could not be reached.",
                cause: error,
            });
        }

        if (!response.ok) {
            const { payload, body } = await parseErrorResponse(response);
            throw new FabricApiProxyError({
                status: response.status,
                requestId: payload?.requestId || requestId,
                sessionId: this.sessionId,
                body,
                message: getResponseMessage(
                    payload,
                    `Local Fabric query failed with HTTP ${response.status}.`,
                ),
            });
        }

        return await response.json() as DaxJsonProxyResponse;
    }
}

class UnsupportedLocalSqlProxy implements ILakehouseApiProxy, IWarehouseApiProxy {
    async executeSql(): Promise<SqlProxyResponse> {
        throw new FabricGenericProxyError({
            message: "Local SQL queries are not configured for this application.",
        });
    }
}

export class LocalDevFabricApiProxy implements IFabricApiProxy {
    readonly semanticModel: ISemanticModelApiProxy;
    readonly lakehouse: ILakehouseApiProxy;
    readonly warehouse: IWarehouseApiProxy;

    constructor(sessionId: string = crypto.randomUUID()) {
        this.semanticModel = new LocalSemanticModelProxy(sessionId);
        this.lakehouse = new UnsupportedLocalSqlProxy();
        this.warehouse = new UnsupportedLocalSqlProxy();
    }
}
