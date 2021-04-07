beforeEach(() => {
  cy.exec("npm run db:test-seed");
});

describe("Views API", () => {
  const seed = "40551333ba09839f5287a7a6aa2f73fe";

  it("Not Authenticated.", () => {
    cy.request({
      method: "GET",
      url: `/api/metrics/${seed}/views/browsers`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(401);
      expect(resp.body).to.eql({ message: "Unauthorized" });
    });
  });

  it("Authenticated Range Day.", () => {
    cy.login("info@renatopozzi.me", "password");

    cy.request({
      method: "GET",
      url: `/api/metrics/${seed}/views/browsers?range=day`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.eql({
        data: [
          { element: "IE", views: 6, unique: 2, percentage: 27.27272727272727 },
          { element: "Mobile Safari", views: 6, unique: 1, percentage: 27.27272727272727 },
          { element: "Safari", views: 4, unique: 1, percentage: 18.181818181818183 },
          { element: "IEMobile", views: 3, unique: 1, percentage: 13.636363636363635 },
          { element: "Opera", views: 3, unique: 1, percentage: 13.636363636363635 },
        ],
      });
    });
  });
});
