import { render, screen } from "@testing-library/react";
import Navbar from "@/app/comps/Navbar";

jest.mock("next/link", () => {
  return ({ children, href }: any) => (
    <a href={href}>{children}</a>
  );
});

describe("Navbar", () => {
  it("renders brand name", () => {
    render(<Navbar />);

    expect(
      screen.getByRole("link", {
        name: /doc intelligence/i,
      })
    ).toBeInTheDocument();
  });

  it("renders logo", () => {
    render(<Navbar />);

    const logo = screen.getByAltText(
      /taskforge logo/i
    );

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute(
      "src",
      "/logo.png"
    );
  });

  it("renders all navigation links", () => {
    render(<Navbar />);

    expect(
      screen.getByRole("link", {
        name: /features/i,
      })
    ).toHaveAttribute(
      "href",
      "/features"
    );

    expect(
      screen.getByRole("link", {
        name: /about/i,
      })
    ).toHaveAttribute(
      "href",
      "/about"
    );

    expect(
      screen.getByRole("link", {
        name: /contacts/i,
      })
    ).toHaveAttribute(
      "href",
      "/contacts"
    );

    expect(
      screen.getByRole("link", {
        name: /login/i,
      })
    ).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("contains exactly five links", () => {
    render(<Navbar />);

    expect(
      screen.getAllByRole("link")
    ).toHaveLength(5);
  });

  it("links home from brand name", () => {
    render(<Navbar />);

    expect(
      screen.getByRole("link", {
        name: /doc intelligence/i,
      })
    ).toHaveAttribute("href", "/");
  });
});