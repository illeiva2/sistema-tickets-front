export function parseVlans(input: string): { vlans: string[]; error?: string } {
  const vlans = [
    ...new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (vlans.length > 256)
    return { vlans, error: "Se permiten hasta 256 VLANs por registro." };
  const invalid = vlans.find((vlan) => {
    const match = /^(\d{1,4})(?:-[A-Za-z0-9][A-Za-z0-9._-]{0,31})?$/.exec(vlan);
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
