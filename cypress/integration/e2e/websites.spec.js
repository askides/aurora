beforeEach(() => {
  cy.exec("npm run db:test-seed");
  cy.request({
    method: "POST",
    url: "/api/auth/login",
    body: { email: "info@renatopozzi.me", password: "password" },
  });
});

describe("Websites Creation", () => {
  it("should create a website and edit", () => {
    cy.visit("/");
    cy.contains("Create New").click();
    cy.location("pathname").should("equal", "/websites/create");
    cy.get('[name="url"]').type("https://marcopisellonio.net");
    cy.get('[type="submit"]').click();
    cy.get('[name="name"]').type("Goldissimo Bundi");
    cy.get('[type="submit"]').click();
  });
});
