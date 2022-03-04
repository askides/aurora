export default async function handler(_request, response) {
  response.status(200).json({ message: "Aurora APIs are running!" });
}
