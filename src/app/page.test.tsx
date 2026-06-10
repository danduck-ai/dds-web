import { render, screen } from "@testing-library/react";

import HomePage from "./page";

test("renders the DSS shell entry", () => {
  render(<HomePage />);

  expect(screen.getByText("DSS 주문관리")).toBeInTheDocument();
});
