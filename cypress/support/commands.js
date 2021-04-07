Cypress.Commands.add("login", (email, password) => {
  cy.request({
    method: "POST",
    url: "/api/auth/login",
    body: { email: email, password: password },
  });
});
