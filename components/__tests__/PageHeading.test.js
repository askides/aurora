import "@testing-library/jest-dom";
import { render, screen, cleanup } from "@testing-library/react";
import { PageHeading } from "../PageHeading.js";

afterEach(cleanup);

describe("PageHeading", () => {
  it("should have a title", () => {
    render(<PageHeading title={"title"} />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("should render an ordered list", () => {
    const { container } = render(<PageHeading title={"title"} />);
    expect(container.querySelector("ol")).toBeInTheDocument();
  });

  it("should have only one breadcumb", () => {
    const { container } = render(<PageHeading />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(1);
    expect(screen.getByText("Aurora")).toBeInTheDocument();
  });

  it("should have three breadcumb", () => {
    const { container } = render(<PageHeading breadcumbs={["two", "three"]} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(3);
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.getByText("three")).toBeInTheDocument();
  });

  it("should have empty actions", () => {
    const { container } = render(<PageHeading />);
    expect(container.querySelector("#actions")).toBeEmptyDOMElement();
  });

  it("should have some actions", () => {
    const actions = <button>ClickMe</button>;
    const { container } = render(<PageHeading actions={actions} />);
    expect(container.querySelector("button")).toBeInTheDocument();
  });
});
