beforeEach(() => {
  cy.exec("npm run db:test-seed");
});

describe("Websites CRUD", () => {
  it("should create a website and edit", () => {
    cy.login("info@renatopozzi.me", "password");

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
    cy.get(":nth-child(2) > .flex > .flex-1 > .font-medium").should(
      "have.text",
      "Goldissimo Bundi"
    );
    cy.get(":nth-child(2) > .flex > .flex-1 > .text-gray-500").should(
      "have.text",
      "https://goldissimo.bundi"
    );
  });
});

describe("Check Shared Website Capabilities", () => {
  it("enable website shared & visits api pages", () => {
    cy.request({
      method: "GET",
      url: "/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/browsers?range=day",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });

    cy.request({
      method: "GET",
      url: "/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/countries?range=day",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });

    cy.request({
      method: "GET",
      url: "/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/oses?range=day",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });

    cy.request({
      method: "GET",
      url: "/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/pages?range=day",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });

    cy.request({
      method: "GET",
      url: "/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/series?range=day",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });

    cy.login("info@renatopozzi.me", "password");

    cy.visit("/");
    cy.get('[href="/websites/40551333ba09839f5287a7a6aa2f73fe/edit"]').click();
    cy.location("pathname").should("equal", "/websites/40551333ba09839f5287a7a6aa2f73fe/edit");
    cy.get('[name="shared"]').select("1");
    cy.get('[type="submit"]').click();

    cy.clearCookies();

    cy.request("/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/browsers?range=day");
    cy.request("/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/countries?range=day");
    cy.request("/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/oses?range=day");
    cy.request("/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/pages?range=day");
    cy.request("/api/metrics/40551333ba09839f5287a7a6aa2f73fe/views/series?range=day");
  });
});
