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

  it("should handle the onClick", () => {
    const onClick = jest.fn();
    render(<Button value={"Click"} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
