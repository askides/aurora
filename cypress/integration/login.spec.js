describe("Authentication Tests", () => {
  it("Visits the Login Page", () => {
    cy.visit("https://localhost:3000/auth/login");
  });
});
