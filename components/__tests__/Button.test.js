import "@testing-library/jest-dom";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Button } from "../Button.js";

afterEach(cleanup);

describe("Button", () => {
  it("should render correctly", () => {
    render(<Button />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render have correct value", () => {
    render(<Button value={"Click"} />);
    expect(screen.getByText("Click")).toBeInTheDocument();
  });

  it("should not render any loader by default", () => {
    const { container } = render(<Button />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("should render the loader", () => {
    const { container } = render(<Button isLoading={true} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should be a type button", () => {
    const { container } = render(<Button />);
    expect(container.querySelector("button").getAttribute("type")).toBe("button");
  });

  it("should be a type submit", () => {
    const { container } = render(<Button type="submit" />);
    expect(container.querySelector("button").getAttribute("type")).toBe("submit");
  });

  it("should handle the onClick", () => {
    const onClick = jest.fn();
    render(<Button value={"Click"} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
