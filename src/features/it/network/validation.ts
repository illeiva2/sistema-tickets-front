export function parseVlans(input: string): { vlans: string[]; error?: string } {
  const seen = new Set<string>();
  const vlans = input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (vlans.length > 256)
    return { vlans, error: "Se permiten hasta 256 VLANs por registro." };
  const invalid = vlans.find((vlan) => {
    const match = /^(\d{1,4})(?:-([\p{L}\p{N}][\p{L}\p{N}_. ]{0,63}))?$/u.exec(
      vlan,
    );
    if (!match) return true;
    const id = Number(match[1]);
    return id < 1 || id > 4094;
  });
  return invalid
    ? {
        vlans,
        error: `La VLAN “${invalid}” no es válida. Usá un ID entre 1 y 4094, por ejemplo 20-VoIP.`,
      }
    : { vlans };
}
