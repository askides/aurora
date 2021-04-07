beforeEach(() => {
  cy.exec("npm run db:test-seed");
});

describe("Views API", () => {
  const seed = "40551333ba09839f5287a7a6aa2f73fe";

  it("Not Authenticated.", () => {
    cy.request({
      method: "GET",
      url: `/api/metrics/${seed}/views/oses`,
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
      url: `/api/metrics/${seed}/views/oses?range=day`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.eql({
        data: [
          { element: "Windows", views: 9, unique: 3, percentage: 40.909090909090914 },
          { element: "iOS", views: 6, unique: 1, percentage: 27.27272727272727 },
          { element: "Mac OS", views: 4, unique: 1, percentage: 18.181818181818183 },
          { element: "Windows Phone", views: 3, unique: 1, percentage: 13.636363636363635 },
        ],
      });
    });
  });
});
