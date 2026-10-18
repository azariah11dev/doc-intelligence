import { render, screen } from "@testing-library/react";
import FeaturesPage from "@/app/features/page";

describe("FeaturesPage", () => {
  it("renders the page heading", () => {
    render(<FeaturesPage />);

    expect(
      screen.getByRole("heading", {
        name: /features/i,
        level: 1,
      })
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<FeaturesPage />);

    expect(
      screen.getByText(
        /powerful tools designed to help you extract meaning/i
      )
    ).toBeInTheDocument();
  });

  it("renders all feature headings", () => {
    render(<FeaturesPage />);

    const featureHeadings = [
      "Smart Document Upload",
      "Intelligent Processing",
      "Natural Language Questions",
      "Semantic Context Retrieval",
      "Grounded Answer Generation",
      "Verified Citations",
    ];

    featureHeadings.forEach((heading) => {
      expect(
        screen.getByRole("heading", {
          name: heading,
        })
      ).toBeInTheDocument();
    });
  });

  it("renders all feature descriptions", () => {
    render(<FeaturesPage />);

    expect(
      screen.getByText(/upload pdfs, docx, txt, or images/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /automatic text extraction, chunking, and embedding/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /ask questions conversationally/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /retrieve the most relevant passages/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /ai-generated answers that stay grounded/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /every answer includes exact citations/i
      )
    ).toBeInTheDocument();
  });

  it("renders exactly 6 feature cards", () => {
    render(<FeaturesPage />);

    const headings = screen.getAllByRole("heading", {
      level: 2,
    });

    expect(headings).toHaveLength(6);
  });

  it("renders footer with current year", () => {
    render(<FeaturesPage />);

    const currentYear = new Date().getFullYear();

    expect(
      screen.getByText(
        new RegExp(`© ${currentYear} Doc Intelligence`)
      )
    ).toBeInTheDocument();
  });

  it("applies background image styling", () => {
    const { container } = render(<FeaturesPage />);

    const rootDiv = container.firstChild as HTMLElement;

    expect(rootDiv).toHaveStyle({
      backgroundImage: "url('/featuresPage.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });
});