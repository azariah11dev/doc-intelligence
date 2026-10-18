import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/(public)/about/page";

describe("AboutPage", () => {
  it("renders page heading", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", {
        name: /about doc intelligence/i,
        level: 1,
      })
    ).toBeInTheDocument();
  });

  it("renders hero description", () => {
    render(<AboutPage />);

    expect(
      screen.getByText(
        /doc intelligence transforms your documents into clear, verified answers/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /built for professionals who need accuracy, speed, and trustworthy citations/i
      )
    ).toBeInTheDocument();
  });

  it("renders all major sections", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", {
        name: /our mission/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /why we built this/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /what makes doc intelligence different/i,
      })
    ).toBeInTheDocument();
  });

  it("renders feature list", () => {
    render(<AboutPage />);

    expect(
      screen.getByText(/verified citations/i)
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/semantic retrieval/i).length
    ).toBeGreaterThan(0);

    expect(
      screen.getByText(/fast document processing/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/clear, concise answers/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/privacy-focused architecture/i)
    ).toBeInTheDocument();
  });

  it("renders mission content", () => {
    render(<AboutPage />);

    expect(
      screen.getByText(/information is locked inside documents/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no hallucinations/i)
    ).toBeInTheDocument();
  });

  it("renders footer with current year", () => {
    render(<AboutPage />);

    const currentYear = new Date().getFullYear();

    expect(
      screen.getByText(
        new RegExp(`© ${currentYear} Doc Intelligence`, "i")
      )
    ).toBeInTheDocument();
  });

  it("applies background image styling", () => {
    const { container } = render(<AboutPage />);

    const rootDiv = container.firstChild as HTMLElement;

    expect(rootDiv).toHaveStyle({
      backgroundImage: "url('/aboutPage.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });
});