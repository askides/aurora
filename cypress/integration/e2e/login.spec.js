describe("Login Procedure", () => {
  it("Go to login and type wrong data.", () => {
    cy.visit("/auth/login");
    cy.get('[type="email"]').type("nonexisting@example.com");
    cy.get('[type="password"]').type("nonexisting");
    cy.get('[type="submit"]').click();
  });

  it("Go to login and type correct data.", () => {
    cy.visit("/auth/login");
    cy.get('[type="email"]').type("info@renatopozzi.me");
    cy.get('[type="password"]').type("password");
    cy.get('[type="submit"]').click();
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
  });
});
