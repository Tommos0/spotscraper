import { Client } from "pg";
import spots from "./spots.json";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = new Client({
  user: "",
  password: "",
  host: "",
  database: "",
  ssl: true,
});

(async () => {
  await client.connect();

  for (const spot of spots) {
    await client.query(
      "INSERT INTO spots(user_id, image, latitude, longitude, address, sports) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        "0",
        spot.ATTRIBUTES.image || "",
        spot.LATMAX,
        spot.LNGMAX,
        spot.LABEL,
        spot.SPORT,
      ]
    );
  }
  await client.end();
})();
