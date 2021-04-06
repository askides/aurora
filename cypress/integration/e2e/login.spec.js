describe("Login Procedure", () => {
  it("should redirect unauthenticated user to signin page", function () {
    cy.visit("/");
    cy.location("pathname").should("equal", "/auth/login");
  });

  it("go to login and type wrong data.", () => {
    cy.visit("/auth/login");
    cy.get('[type="email"]').type("nonexisting@example.com");
    cy.get('[type="password"]').type("nonexisting");
    cy.get('[type="submit"]').click();
  });

  it("go to login and type correct data.", () => {
    cy.visit("/auth/login");
    cy.get('[type="email"]').type("info@renatopozzi.me");
    cy.get('[type="password"]').type("password");
    cy.get('[type="submit"]').click();
    cy.location("pathname").should("equal", "/");
  });
});
