// Deterministic avatar assignment based on player ID

const AVATARS = [
  "\u{1F43B}", // bear
  "\u{1F98A}", // fox
  "\u{1F431}", // cat
  "\u{1F436}", // dog
  "\u{1F43A}", // wolf
  "\u{1F981}", // lion
  "\u{1F42F}", // tiger
  "\u{1F98C}", // deer
  "\u{1F430}", // rabbit
  "\u{1F43C}", // panda
  "\u{1F428}", // koala
  "\u{1F435}", // monkey
  "\u{1F427}", // penguin
  "\u{1F989}", // owl
  "\u{1F985}", // eagle
  "\u{1F99C}", // parrot
  "\u{1F40A}", // crocodile
  "\u{1F422}", // turtle
  "\u{1F433}", // whale
  "\u{1F42C}", // dolphin
  "\u{1F419}", // octopus
  "\u{1F984}", // unicorn
  "\u{1F409}", // dragon
  "\u{1F98E}", // lizard
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getPlayerAvatar(playerId: string): string {
  return AVATARS[hashCode(playerId) % AVATARS.length];
}
