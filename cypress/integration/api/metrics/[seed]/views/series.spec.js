beforeEach(() => {
  cy.exec("npm run db:test-seed");
});

describe("Views API", () => {
  const seed = "40551333ba09839f5287a7a6aa2f73fe";

  it("Not Authenticated.", () => {
    cy.request({
      method: "GET",
      url: `/api/metrics/${seed}/views/series`,
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
      url: `/api/metrics/${seed}/views/series?range=day`,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.eql({
        data: [
          ["00:00:00", "0"],
          ["01:00:00", "0"],
          ["02:00:00", "0"],
          ["03:00:00", "0"],
          ["04:00:00", "0"],
          ["05:00:00", "0"],
          ["06:00:00", "0"],
          ["07:00:00", "0"],
          ["08:00:00", "0"],
          ["09:00:00", "0"],
          ["10:00:00", "0"],
          ["11:00:00", "0"],
          ["12:00:00", "0"],
          ["13:00:00", "0"],
          ["14:00:00", "0"],
          ["15:00:00", "0"],
          ["16:00:00", "0"],
          ["17:00:00", "0"],
          ["18:00:00", "0"],
          ["19:00:00", "0"],
          ["20:00:00", "0"],
          ["21:00:00", "22"],
          ["22:00:00", "0"],
          ["23:00:00", "0"],
        ],
      });
    });
  });
});
