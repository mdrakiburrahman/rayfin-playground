import { render, screen, waitFor } from "@testing-library/react";
import type { OpaqueSession } from "@microsoft/rayfin-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "@/components/auth-gate.component";
import { AuthProvider } from "@/hooks/use-auth";
import type { IAuthService } from "@/services/rayfin-auth.service";

const authenticatedSession: OpaqueSession = {
    user: {
        id: "user-id",
        email: "user@example.com",
    },
    isAuthenticated: true,
    isAnonymous: false,
};

function createAuthService(
    session: OpaqueSession | null,
): IAuthService {
    return {
        initEmbeddedAuth: vi.fn().mockResolvedValue(session),
    };
}

function renderAuthGate(authService: IAuthService) {
    render(
        <AuthProvider rayfinAuthService={authService}>
            <AuthGate>
                <div>Authenticated app</div>
            </AuthGate>
        </AuthProvider>,
    );
}

describe("AuthGate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the app after embedded Fabric SSO succeeds", async () => {
        const authService = createAuthService(authenticatedSession);
        renderAuthGate(authService);

        expect(await screen.findByText("Authenticated app")).toBeInTheDocument();
        await waitFor(() =>
            expect(authService.initEmbeddedAuth).toHaveBeenCalledOnce(),
        );
    });

    it("does not offer an interactive sign-in when embedded SSO is unavailable", async () => {
        renderAuthGate(createAuthService(null));

        expect(
            await screen.findByText("Fabric session unavailable"),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /sign in/i }),
        ).not.toBeInTheDocument();
    });
});
