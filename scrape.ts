import PQueue from "p-queue";
import axios from "axios";
import cheerio from "cheerio";
import { URLSearchParams } from "url";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = "https://maps.amsterdam.nl/_maps/";

const SPORTS = [
  "SKATE",
  "TENNIS",
  "BASKETBAL",
  "VOETBAL",
  "JEUDEBOULES",
  "FITNESS",
  "TAFELTENNIS",
  "BEACHVOLLEY",
  "OVERIG",
];

interface ListedSpot {
  VOLGNR: number;
  LABEL: string;
  TYPE: string;
  LATMAX: number;
  LNGMAX: number;
}

const getSpots = async (sport: string): Promise<Array<ListedSpot>> => {
  const body = {
    TABEL: "SPORT_OPENBAAR",
    SELECT: sport,
    SELECTIEKOLOM: "SELECTIE",
    THEMA: "sport",
    SD: "X",
    TAAL: "nl",
    TIJD: "1615280705341",
  };
  const result = await axios.post<Array<ListedSpot>>(
    BASE_URL + "haal.objecten.php",
    new URLSearchParams(body).toString()
  );
  return result.data;
};

const getSpotDetails = async (id: string) => {
  const result = await axios.post<string>(
    BASE_URL + "haal.info.php",
    `PRIKS=|||sport||SPORT_OPENBAAR||${id}`
  );
  return result.data;
};

const parseSpotDetails = (rawSpot: string) => {
  const $ = cheerio.load(rawSpot, { decodeEntities: true });

  let attributes: Record<string, string | null> = {};

  $("tr").each(function (x, y) {
    const veldTD = $(y).find("td[class='veld']");
    const veld = veldTD.html();
    if (veld !== null && veld !== "&nbsp;") {
      attributes[veld] = $(y).find("td+td").html();
    }
  });

  const image = $("img").attr("src");
  if (image) {
    attributes["image"] = image;
  }

  return attributes;
};

function flatten<T>(nested: T[][]): T[] {
  return ([] as T[]).concat.apply([], nested);
}

const run = async () => {
  const spots = flatten(
    await Promise.all(
      SPORTS.map(async (sport) => {
        const spotsForSport = await getSpots(sport);
        return spotsForSport.map((spot) => ({ ...spot, SPORT: sport }));
      })
    )
  );

  const queue = new PQueue({ concurrency: 2 });
  const resolvedSpots = await Promise.all(
    spots.map((spot) =>
      queue.add(async () => {
        const attributes = parseSpotDetails(
          await getSpotDetails(spot.VOLGNR.toString())
        );
        return { ...spot, ATTRIBUTES: attributes };
      })
    )
  );

  console.log(JSON.stringify(resolvedSpots, undefined, 2));
};

run();
