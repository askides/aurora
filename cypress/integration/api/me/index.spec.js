describe("Profile API", () => {
  it("Not Authenticated.", () => {
    cy.request({
      method: "GET",
      url: "/api/me",
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });
  });
});
