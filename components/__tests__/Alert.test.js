import "@testing-library/jest-dom";
import { render, screen, cleanup } from "@testing-library/react";
import { Alert } from "../Alert.js";

afterEach(cleanup);

describe("Alert", () => {
  it("should have a title", () => {
    render(<Alert title={"title"} />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("should not have an unordered list", () => {
    const { container } = render(<Alert />);
    expect(container.querySelector("ul")).toBeNull();
  });

  it("should have zero messages", () => {
    const { container } = render(<Alert />);
    expect(container.querySelectorAll("ul > li")).toHaveLength(0);
  });

  it("should have zero messages", () => {
    const { container } = render(<Alert messages={[]} />);
    expect(container.querySelectorAll("ul > li")).toHaveLength(0);
  });

  it("should have only two messages", () => {
    const messages = ["one", "two"];
    const { container } = render(<Alert messages={messages} />);
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
  });
});
