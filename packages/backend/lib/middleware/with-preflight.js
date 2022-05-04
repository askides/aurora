const withPreflight = (fn) => async (request, response) => {
  if (request.method === "OPTIONS") {
    return response.status(200).json({
      body: "OK",
    });
  }

  return await fn(request, response);
};

export { withPreflight };
