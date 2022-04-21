import { render, screen } from "@testing-library/react";
import { Panel } from "./Panel";

it("renders without crashing", () => {
  render(
    <Panel>
      <Panel.Title>This is the Title</Panel.Title>
      <Panel.Body>This is the Body</Panel.Body>
    </Panel>
  );

  const title = screen.getByText(/Title/i);
  expect(title).toBeInTheDocument();

  const body = screen.getByText(/Body/i);
  expect(body).toBeInTheDocument();
});
