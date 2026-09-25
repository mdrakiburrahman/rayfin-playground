//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";
import license from "rollup-plugin-license";
import {
    DirectFabricApiProxy,
    FabricPermission,
    type IFabricTokenProvider,
} from "@microsoft/fabric-app-data-cli-proxy";
import { FabricApiProxyError } from "@microsoft/fabric-app-data";

import { execFile } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";

import { fabricConfig } from "./src/fabric.generated";

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;
const localDaxEndpoint = "/__fabric/semantic-model/query";
const maxRequestBytes = 1_000_000;
const tokenCacheDurationMs = 5 * 60 * 1000;

const resourceByPermission: Record<FabricPermission, string> = {
    [FabricPermission.SemanticModelRead]: "https://api.fabric.microsoft.com",
    [FabricPermission.PowerBIDatasetRead]: "https://analysis.windows.net/powerbi/api",
    [FabricPermission.LakehouseRead]: "https://api.fabric.microsoft.com",
    [FabricPermission.WarehouseRead]: "https://api.fabric.microsoft.com",
    [FabricPermission.SqlConnect]: "https://database.windows.net",
    [FabricPermission.CatalogRead]: "https://api.fabric.microsoft.com",
};

interface CachedToken {
    token: string;
    expiresAt: number;
}

class AzureCliTokenProvider implements IFabricTokenProvider {
    private readonly cache = new Map<FabricPermission, CachedToken>();
    private readonly pending = new Map<FabricPermission, Promise<string>>();

    async getToken(
        permission: FabricPermission,
        options?: { forceRefresh?: boolean },
    ): Promise<string> {
        const cached = this.cache.get(permission);
        if (
            !options?.forceRefresh &&
            cached &&
            cached.expiresAt > Date.now()
        ) {
            return cached.token;
        }

        if (!options?.forceRefresh) {
            const pending = this.pending.get(permission);
            if (pending) return pending;
        }

        const request = this.acquireToken(permission);
        this.pending.set(permission, request);

        try {
            const token = await request;
            this.cache.set(permission, {
                token,
                expiresAt: Date.now() + tokenCacheDurationMs,
            });
            return token;
        } finally {
            if (this.pending.get(permission) === request) {
                this.pending.delete(permission);
            }
        }
    }

    private acquireToken(permission: FabricPermission): Promise<string> {
        const resource = resourceByPermission[permission];

        return new Promise((resolveToken, rejectToken) => {
            execFile(
                "az",
                [
                    "account",
                    "get-access-token",
                    "--resource",
                    resource,
                    "--query",
                    "accessToken",
                    "--output",
                    "tsv",
                ],
                {
                    encoding: "utf8",
                    timeout: 30_000,
                    maxBuffer: maxRequestBytes,
                },
                (error, stdout, stderr) => {
                    if (error) {
                        const details = stderr.trim() || error.message;
                        if (
                            "code" in error &&
                            error.code === "ENOENT"
                        ) {
                            rejectToken(
                                new Error(
                                    "Azure CLI is not installed. Install it and run: az login",
                                    { cause: error },
                                ),
                            );
                            return;
                        }

                        if (
                            details.includes("az login") ||
                            details.includes("AADSTS")
                        ) {
                            rejectToken(
                                new Error(
                                    "Not signed in to Azure CLI. Run: az login",
                                    { cause: error },
                                ),
                            );
                            return;
                        }

                        rejectToken(
                            new Error(
                                `Azure CLI token acquisition failed: ${details}`,
                                { cause: error },
                            ),
                        );
                        return;
                    }

                    const token = stdout.trim();
                    if (!token) {
                        rejectToken(
                            new Error(
                                "Azure CLI returned an empty token. Run: az login",
                            ),
                        );
                        return;
                    }

                    resolveToken(token);
                },
            );
        });
    }
}

function sendJson(
    response: ServerResponse,
    statusCode: number,
    payload: unknown,
) {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(payload));
}

function readRequestBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolveBody, rejectBody) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        request.on("data", (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > maxRequestBytes) {
                rejectBody(new Error("Local Fabric query request is too large."));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on("end", () => {
            resolveBody(Buffer.concat(chunks).toString("utf8"));
        });
        request.on("error", rejectBody);
    });
}

function createLocalFabricDataPlugin(): PluginOption {
    const allowedModels = new Set(
        Object.values(fabricConfig.semanticModels).map(
            ({ workspaceId, itemId }) => `${workspaceId}:${itemId}`,
        ),
    );
    const proxy = new DirectFabricApiProxy(new AzureCliTokenProvider());

    return {
        name: "local-fabric-data-proxy",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use((request, response, next) => {
                const pathname = new URL(
                    request.url || "/",
                    "http://localhost",
                ).pathname;
                if (pathname !== localDaxEndpoint) {
                    next();
                    return;
                }

                void (async () => {
                    if (request.method !== "POST") {
                        sendJson(response, 405, {
                            message: "Method not allowed.",
                        });
                        return;
                    }

                    try {
                        const rawBody = await readRequestBody(request);
                        const body = JSON.parse(rawBody) as {
                            workspaceId?: unknown;
                            itemId?: unknown;
                            query?: unknown;
                        };

                        if (
                            typeof body.workspaceId !== "string" ||
                            typeof body.itemId !== "string" ||
                            typeof body.query !== "string" ||
                            body.query.trim().length === 0
                        ) {
                            sendJson(response, 400, {
                                message:
                                    "workspaceId, itemId, and a non-empty query are required.",
                            });
                            return;
                        }

                        if (
                            !allowedModels.has(
                                `${body.workspaceId}:${body.itemId}`,
                            )
                        ) {
                            sendJson(response, 403, {
                                message:
                                    "The requested semantic model is not registered in fabric.yaml.",
                            });
                            return;
                        }

                        const result =
                            await proxy.semanticModel.executeDaxJson(
                                body.workspaceId,
                                body.itemId,
                                body.query,
                            );
                        sendJson(response, 200, result);
                    } catch (error) {
                        const message =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        const statusCode =
                            error instanceof FabricApiProxyError
                                ? error.status
                                : message.includes("az login")
                                  ? 401
                                  : 500;
                        sendJson(response, statusCode, {
                            message,
                            requestId:
                                error instanceof FabricApiProxyError
                                    ? error.requestId
                                    : request.headers["x-request-id"],
                        });
                    }
                })();
            });
        },
    };
}

// Dev-only middleware: makes the local Vite server compatible with browsers that
// enforce Local Network Access (LNA) checks when a public origin (the Fabric portal)
// embeds an iframe pointing at http://localhost. Sets the LNA opt-in response header
// on every response and short-circuits the corresponding preflight OPTIONS request.
// This is required for fetch/XHR subresources from the embedded app — top-level
// iframe navigations additionally require launching Chromium with the
// `--disable-features=...LocalNetworkAccessChecks` flag (see .playwright-config.json).
const localNetworkAccessPlugin: PluginOption = {
  name: 'local-network-access-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      if (req.method === 'OPTIONS' && req.headers['access-control-request-private-network']) {
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
        res.statusCode = 204;
        res.end();
        return;
      }
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        createLocalFabricDataPlugin(),
        localNetworkAccessPlugin,
    ],
    resolve: {
        alias: {
            '@': resolve(projectRoot, 'src'),
        }
    },
    optimizeDeps: {
        include: ['@microsoft/fabric-visuals', '@microsoft/fabric-datagrid', '@microsoft/fabric-visuals-core'],
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
        },
        rollupOptions: {
            plugins: [
                license({
                    thirdParty: {
                        multipleVersions: true,
                        output: {
                            file: resolve(projectRoot, 'dist', 'THIRD_PARTY_NOTICES.txt'),
                            template(dependencies) {
                                if (dependencies.length === 0) {
                                    return 'No third-party dependencies.';
                                }
                                return (
                                    'This file was auto-generated at build time.\n\n' +
                                    dependencies
                                        .map((dep) => {
                                            const lines = [
                                                `${dep.name}@${dep.version}`,
                                                `License: ${dep.license || 'UNKNOWN'}`,
                                            ];
                                            if (dep.author) {
                                                lines.push(`Author: ${typeof dep.author === 'string' ? dep.author : dep.author.text()}`);
                                            }
                                            if (dep.noticeText) {
                                                lines.push('', 'NOTICE:', dep.noticeText.trim());
                                            }
                                            if (dep.licenseText) {
                                                lines.push('', dep.licenseText.trim());
                                            }
                                            return lines.join('\n');
                                        })
                                        .join('\n\n' + '='.repeat(60) + '\n\n')
                                );
                            },
                        },
                    },
                }),
            ],
        },
    },
});
