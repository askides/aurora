// TODO: Move to directory
export class AuroraError extends Error {
  constructor(statusCode = 500, message = "Internal server error") {
    super(message);
    this.statusCode = statusCode;
  }
}

export class Controller {
  constructor(request, response) {
    this.req = request;
    this.res = response;
    this.middlewares = [];
  }

  validate(data, rules) {
    const { error, value: validated } = rules.validate(data, {
      stripUnknown: true,
    });

    if (error) {
      this.abort(422, error.message);
    }

    return validated;
  }

  abort(statusCode = 500, message) {
    switch (statusCode) {
      case 400:
        throw new AuroraError(400, message ?? "Bad request");
      case 401:
        throw new AuroraError(401, message ?? "Unauthenticated");
      case 403:
        throw new AuroraError(403, message ?? "Unauthorized");
      case 404:
        throw new AuroraError(404, message ?? "Not found");
      case 422:
        throw new AuroraError(422, message ?? "Unprocessable entity");
      case 500:
        throw new AuroraError(500, message ?? "Internal server error");
      default:
        throw new AuroraError(500, message ?? "Unknown error");
    }
  }

  middleware(middleware) {
    this.middlewares.push(middleware);
  }

  hasMiddlewares() {
    return this.middlewares.length > 0;
  }

  async run(method) {
    try {
      if (this.hasMiddlewares()) {
        for (const middleware of this.middlewares) {
          await middleware(this.req, this.res);
        }
      }

      await this[method]();
    } catch (err) {
      return this.res.status(err.statusCode).json({ message: err.message });
    }
  }
}
