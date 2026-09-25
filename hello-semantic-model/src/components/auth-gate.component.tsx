//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { type ReactNode } from "react";

import { useAuth } from "@/hooks/auth.context";

interface AuthGateProps {
    children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const {
        isLoading,
        isAuthenticated,
    } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-sm text-muted-foreground">
                    Connecting to Fabric…
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-400">
                <div
                    role="alert"
                    className="signal-surface w-full max-w-md rounded-xl border p-800 text-center"
                >
                    <h1 className="mb-200 text-500 font-semibold leading-500 text-card-foreground">
                        Fabric session unavailable
                    </h1>
                    <p className="text-300 leading-300 text-muted-foreground">
                        This app uses the Fabric portal session automatically. Open the app from its Fabric workspace and reload if the session has expired.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}