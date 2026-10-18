import { render, screen } from "@testing-library/react";
import DemoPage from "@/app/(public)/demo/page";

describe("DemoPage", () => {
  it("renders page heading", () => {
    render(<DemoPage />);

    expect(
      screen.getByRole("heading", {
        name: /intelli doc demo/i,
      })
    ).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<DemoPage />);

    expect(
      screen.getByText(
        /watch a quick walkthrough of the intelli_doc platform/i
      )
    ).toBeInTheDocument();
  });

  it("renders the demo video iframe", () => {
    render(<DemoPage />);

    const iframe = screen.getByTitle(
      /intelli_doc demo video/i
    );

    expect(iframe).toBeInTheDocument();
  });

  it("uses the correct youtube embed url", () => {
    render(<DemoPage />);

    const iframe = screen.getByTitle(
      /intelli_doc demo video/i
    );

    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/bQD9zk1SHrU"
    );
  });

  it("allows fullscreen video playback", () => {
    render(<DemoPage />);

    const iframe = screen.getByTitle(
      /intelli_doc demo video/i
    );

    expect(iframe).toHaveAttribute(
      "allow",
      expect.stringContaining("picture-in-picture")
    );

    expect(iframe).toHaveAttribute("allowfullscreen");
  });

  it("applies background image styling", () => {
    const { container } = render(<DemoPage />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveStyle({
      backgroundImage: "url('/contactsPage.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  });
});