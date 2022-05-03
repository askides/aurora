describe("Authentication Flow", () => {
  it("login should fail because the user does not exists", () => {
    cy.visit("/signin");
    cy.get("#email").type("unusual@example.com");
    cy.get("#password").type("password");
    cy.get('button[type="submit"]').click();
    cy.contains("An error has occurred..").should("be.visible");
  });

  it("should login correctly", () => {
    cy.visit("/signin");
    cy.get("#email").type("john.doe@example.com");
    cy.get("#password").type("password");
    cy.get('button[type="submit"]').click();
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq("/");
    });
  });
});
