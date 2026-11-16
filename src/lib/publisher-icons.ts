import abscbn from "@/assets/publishers/abscbn.png.asset.json";
import afp from "@/assets/publishers/afp.png.asset.json";
import gmanetwork from "@/assets/publishers/gmanetwork.png.asset.json";
import inquirer from "@/assets/publishers/inquirer.png.asset.json";
import manilabulletin from "@/assets/publishers/manilabulletin.png.asset.json";
import pcij from "@/assets/publishers/pcij.png.asset.json";
import pco from "@/assets/publishers/pco.png.asset.json";
import philstar from "@/assets/publishers/philstar.png.asset.json";
import pna from "@/assets/publishers/pna.png.asset.json";
import rappler from "@/assets/publishers/rappler.png.asset.json";
import reuters from "@/assets/publishers/reuters.png.asset.json";
import snopes from "@/assets/publishers/snopes.png.asset.json";
import tsek from "@/assets/publishers/tsek.png.asset.json";
import verafiles from "@/assets/publishers/verafiles.png.asset.json";

const PUBLISHER_ICONS: Array<{ aliases: string[]; url: string }> = [
  { aliases: ["vera files", "verafiles.org"], url: verafiles.url },
  { aliases: ["tsek.ph", "tsek"], url: tsek.url },
  { aliases: ["rappler"], url: rappler.url },
  { aliases: ["pcij.org", "pcij"], url: pcij.url },
  { aliases: ["inquirer.net", "inquirer"], url: inquirer.url },
  { aliases: ["abs-cbn", "abs cbn"], url: abscbn.url },
  { aliases: ["gmanetwork", "gma news"], url: gmanetwork.url },
  { aliases: ["philstar"], url: philstar.url },
  { aliases: ["manila bulletin", "mb.com.ph"], url: manilabulletin.url },
  { aliases: ["pna.gov.ph", "philippine news agency"], url: pna.url },
  { aliases: ["pco.gov.ph", "presidential communications office"], url: pco.url },
  { aliases: ["afp.factcheck", "afp fact check"], url: afp.url },
  { aliases: ["reuters"], url: reuters.url },
  { aliases: ["snopes"], url: snopes.url },
];

export function publisherIcon(name: string, url: string): string | undefined {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // The publisher name can still identify the icon if its URL is malformed.
  }

  const nameLower = name.toLowerCase();
  return PUBLISHER_ICONS.find(({ aliases }) =>
    aliases.some((alias) => nameLower.includes(alias) || host.includes(alias)),
  )?.url;
}