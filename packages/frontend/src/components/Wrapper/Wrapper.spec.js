import { render, screen } from "@testing-library/react";
import { Wrapper } from "./Wrapper";

it("renders without crashing", () => {
  render(
    <Wrapper>
      <Wrapper.Header>
        <Wrapper.Title>Hello i'm supposed to be title</Wrapper.Title>
        <Wrapper.Actions>
          <p>Hello i'm supposed to be actions</p>
        </Wrapper.Actions>
      </Wrapper.Header>
      <Wrapper.Content>Hello i'm supposed to be content</Wrapper.Content>
    </Wrapper>
  );

  const title = screen.getByRole("heading", { name: /title/i });
  const actions = screen.getByText(/actions/i);
  const content = screen.getByText("Hello i'm supposed to be content");

  expect(title).toBeInTheDocument();
  expect(actions).toBeInTheDocument();
  expect(content).toBeInTheDocument();
});
