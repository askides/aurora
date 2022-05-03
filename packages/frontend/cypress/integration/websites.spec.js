describe("Websites CRUD Flow", () => {
  beforeEach(() => {
    // TODO: Obviouly, this is not the best way to do this.
    cy.request("POST", "https://new-aurora-api.vercel.app/signin", {
      email: "john.doe@example.com",
      password: "password",
    }).then((resp) => {
      console.log(resp);
      window.localStorage.setItem("aurora_access_token", resp.body.accessToken);
    });
  });

  it("should view the empty state for websites", () => {
    cy.visit("/");
    cy.get(".chakra-text").should("contain", "Here is absolute emptiness..");
  });

  it("should create a website", () => {
    cy.visit("/");
    cy.get(".chakra-text").should("contain", "Here is absolute emptiness..");
    cy.get("a").contains("Create New").click();
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq("/websites/new");
    });

    cy.get("#name").type("My Website");
    cy.get("#url").type("https://example.com");
    cy.get("button").contains("Create").click();
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq("/");
    });

    // cy.get(".chakra-text")
    //   .should("contain", "Here is absolute emptiness..")
    //   .should("not.be.visible");
  });
});
