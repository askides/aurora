export class Router {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.callbackParams = { req: this.req, res: this.res };
    this.lastCall = null;
    this.error = null;
  }

  async route(method, callback) {
    if (this.error) {
      return false;
    }

    if (this.req.method === method.toUpperCase()) {
      try {
        await callback(this.callbackParams);

        // This is to enable the fallback
        this.lastCall = callback;
      } catch (err) {
        this.error = err;
      }
    }
  }

  async fallback() {
    if (this.error) {
      return this.res
        .status(this.error.statusCode)
        .json({ message: this.error.message });
    }

    if (!this.lastCall) {
      return this.res.status(405).json({ message: "Method not allowed" });
    }
  }

  async use(middleware) {
    if (this.error) {
      return false;
    }

    try {
      await middleware(this.callbackParams);
    } catch (err) {
      this.error = err;
    }
  }
}
