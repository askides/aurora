describe("Login API", () => {
  it("GET Method not working", () => {
    cy.request({
      method: "GET",
      url: "/api/auth/login",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(405);
    });
  });

  it("Wrong Password", () => {
    cy.request({
      method: "POST",
      url: "/api/auth/login",
      body: { email: "nonexisting@example.com", password: "nonexisting" },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });
  });

  it("Corrent Login", () => {
    cy.request({
      method: "POST",
      url: "/api/auth/login",
      body: { email: "info@renatopozzi.me", password: "password" },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.headers).to.have.property("set-cookie");
      expect(resp.body).to.have.property("access_token");
    });
  });
});
