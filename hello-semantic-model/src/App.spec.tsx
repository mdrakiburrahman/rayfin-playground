import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import App from "@/App";

vi.mock("@/components/release-health/release-health-dashboard", () => ({
    ReleaseHealthDashboard: () => <main>Release Health dashboard</main>,
}));

describe("App", () => {
    it("renders the release health dashboard", () => {
        render(<App />);
        expect(screen.getByText("Release Health dashboard")).toBeInTheDocument();
    });
});
