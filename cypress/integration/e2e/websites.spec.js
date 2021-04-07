beforeEach(() => {
  cy.exec("npm run db:test-seed");
  cy.login("info@renatopozzi.me", "password");
});

describe("Websites CRUD", () => {
  it("should create a website and edit", () => {
    cy.visit("/");
    cy.contains("Create New").click();
    cy.location("pathname").should("equal", "/websites/create");
    cy.get('[name="name"]').type("Marco Pisellonio's Website");
    cy.get('[name="url"]').type("https://marcopisellonio.net");
    cy.get('[type="submit"]').click();

    // Check inserted values
    cy.wait(1000);
    cy.get('[name="name"]').should("have.value", "Marco Pisellonio's Website");
    cy.get('[name="url"]').should("have.value", "https://marcopisellonio.net");

    // Change Values
    cy.get('[name="name"]').clear().type("Goldissimo Bundi");
    cy.get('[name="url"]').clear().type("https://goldissimo.bundi");
    cy.get('[name="shared"]').select("1");
    cy.get('[type="submit"]').click();

    cy.reload();

    cy.get('[name="name"]').should("have.value", "Goldissimo Bundi");
    cy.get('[name="url"]').should("have.value", "https://goldissimo.bundi");
    cy.get('[name="shared"]').should("have.value", "1");

    // Check is present in list
    cy.visit("/");
    cy.get(".flex-1 > .font-medium").should("have.text", "Goldissimo Bundi");
    cy.get(".text-gray-500").should("have.text", "https://goldissimo.bundi");
  });
});
