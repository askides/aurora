describe("Websites CRUD Flow", () => {
  beforeEach(() => {
    cy.request("POST", Cypress.env("apiUrl") + "/signin", {
      email: "john.doe@example.com",
      password: "password",
    }).then((resp) => {
      window.localStorage.setItem("aurora_access_token", resp.body.accessToken);
    });
  });

  it("should view the empty state for websites", () => {
    cy.visit("/");
    cy.get(".chakra-text").should("contain", "Here is absolute emptiness..");
  });

  it("should complete a full CRUD website flow", () => {
    cy.visit("/");
    cy.get(".chakra-text").should("contain", "Here is absolute emptiness..");
    cy.get("a").contains("Create New").click();

    // Create
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq("/websites/new");
    });

    cy.get("#name").type("My Website");
    cy.get("#url").type("https://example.com");
    cy.get("button").contains("Create").click();

    // Index
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq("/");
    });

    cy.get("table").contains("My Website").should("be.visible");
    cy.get("table").contains("https://example.com").should("be.visible");
    // cy.get("table").contains("PRIVATE").should("be.visible");
    cy.get("table").contains("View Details").click();

    // View & Edit // TODO: Checkbox is missing
    cy.location().should((loc) => {
      expect(loc.pathname).to.match(/\/websites\/([a-z0-9]+)\/edit/);
    });

    cy.get("#name").should("have.value", "My Website");
    cy.get("#url").should("have.value", "https://example.com");

    cy.get("#name").clear().type("My Website 2");
    cy.get("#url").clear().type("https://example.com/2");

    cy.get("button").contains("Update").click();

    cy.get("a").contains("Back").click();

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq("/");
    });

    // TODO: To be finished (we need to wait for SWR to update the data)
    // cy.get("table").contains("View Details").click();

    // cy.get("#name").should("have.value", "My Website 2");
    // cy.get("#url").should("have.value", "https://example.com/2");
  });
});
