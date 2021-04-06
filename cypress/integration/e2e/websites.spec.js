describe("Login & Websites Creation", () => {
  it("go to login and type correct data.", () => {
    cy.visit("/auth/login");
    cy.get('[type="email"]').type("info@renatopozzi.me");
    cy.get('[type="password"]').type("password");
    cy.get('[type="submit"]').click();
    cy.location("pathname").should("equal", "/");

    cy.contains("Create New").click();
    cy.location("pathname").should("equal", "/websites/create");
    cy.get('[name="url"]').type("https://marcopisellonio.net");
    cy.get('[type="submit"]').click();
  });
});
