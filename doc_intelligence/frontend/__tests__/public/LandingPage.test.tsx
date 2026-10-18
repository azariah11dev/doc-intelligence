import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";

describe("LandingPage", () => {
  it("renders hero section", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /turn documents into verified answers/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /upload any document\. ask a question\. get a citation-verified answer/i
      )
    ).toBeInTheDocument();
  });

  it("renders call-to-action links", () => {
    render(<LandingPage />);

    const demoLink = screen.getByRole("link", {
      name: /try a demo/i,
    });

    const signupLink = screen.getByRole("link", {
      name: /make an account/i,
    });

    expect(demoLink).toHaveAttribute("href", "/demo");
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("renders all pipeline steps", () => {
    render(<LandingPage />);

    const steps = [
      "1. Upload Document",
      "2. Process Document",
      "3. Ask Question",
      "4. Retrieve Context",
      "5. Generate Answer",
      "6. Verify Citation",
    ];

    steps.forEach((step) => {
      expect(
        screen.getByRole("heading", { name: step })
      ).toBeInTheDocument();
    });
  });

  it("renders how it works section", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /how it works/i,
      })
    ).toBeInTheDocument();
  });

  it("renders current year in footer", () => {
    render(<LandingPage />);

    const currentYear = new Date().getFullYear();

    expect(
      screen.getByText(
        new RegExp(`© ${currentYear} Doc Intelligence`, "i")
      )
    ).toBeInTheDocument();
  });

  it("applies background image styling", () => {
    const { container } = render(<LandingPage />);

    const rootDiv = container.firstChild as HTMLElement;

    expect(rootDiv).toHaveStyle({
      backgroundImage: "url('/landingPage.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });
});