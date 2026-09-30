# Lista las opciones del driver de la Xprinter XP-410B (PrintCapabilities) y,
# con -Aplicar, fija una opción de una característica en el ticket predeterminado
# del usuario y del dispositivo (misma vía que xp410b-material-etiquetas.ps1).
#   .\xp410b-opcion.ps1                                   -> lista características y valores actuales
#   .\xp410b-opcion.ps1 -Feature X -Opcion Y -Aplicar     -> graba Y en X
param(
  [string]$Impresora = "Xprinter XP-410B",
  [string]$Feature,
  [string]$Opcion,
  [switch]$Aplicar,
  [string]$Filtro = "seagull|Cut|Tear|Post|Media|Orientation|Speed|Dark|Print"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Printing
$psf = "http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework"
$psk = "http://schemas.microsoft.com/windows/2003/08/printing/printschemakeywords"

$q = (New-Object System.Printing.LocalPrintServer).GetPrintQueue($Impresora)
$capsXml = (New-Object System.IO.StreamReader($q.GetPrintCapabilitiesAsXml())).ReadToEnd()
[xml]$caps = $capsXml
$nsc = New-Object System.Xml.XmlNamespaceManager($caps.NameTable)
$nsc.AddNamespace("psf", $psf); $nsc.AddNamespace("psk", $psk)

$ticketXml = (New-Object System.IO.StreamReader($q.UserPrintTicket.GetXmlStream())).ReadToEnd()
[xml]$ticket = $ticketXml
$nst = New-Object System.Xml.XmlNamespaceManager($ticket.NameTable)
$nst.AddNamespace("psf", $psf); $nst.AddNamespace("psk", $psk)

$featuresPath = "//psf:Feature"
if (-not $Aplicar) {
  "Características del driver (filtro: $Filtro):"
  foreach ($f in $caps.SelectNodes($featuresPath, $nsc)) {
    $n = $f.GetAttribute("name")
    if ($n -notmatch $Filtro) { continue }
    $ops = @($f.SelectNodes("psf:Option", $nsc) | ForEach-Object { $_.GetAttribute("name") })
    $actual = $ticket.SelectSingleNode("//psf:Feature[@name='$n']/psf:Option", $nst)
    $valor = if ($actual) { $actual.GetAttribute("name") } else { "(no está en el ticket)" }
    "  $n"
    "      opciones: $($ops -join ', ')"
    "      actual:   $valor"
  }
  return
}

if (-not $Feature -or -not $Opcion) { throw "Con -Aplicar hacen falta -Feature y -Opcion" }
$capFeat = $caps.SelectSingleNode("//psf:Feature[@name='$Feature']", $nsc)
if (-not $capFeat) { throw "El driver no tiene la característica $Feature" }
$capOpt = $capFeat.SelectSingleNode("psf:Option[@name='$Opcion']", $nsc)
if (-not $capOpt) { throw "La característica $Feature no tiene la opción $Opcion" }

foreach ($prefijo in @($Feature.Split(":")[0], $Opcion.Split(":")[0])) {
  $uri = $caps.DocumentElement.GetNamespaceOfPrefix($prefijo)
  if ($uri -and -not $ticket.DocumentElement.GetNamespaceOfPrefix($prefijo)) {
    $ticket.DocumentElement.SetAttribute("xmlns:$prefijo", $uri)
  }
}

$feat = $ticket.SelectSingleNode("//psf:Feature[@name='$Feature']", $nst)
if ($feat) {
  $opt = $feat.SelectSingleNode("psf:Option", $nst)
  $opt.SetAttribute("name", $Opcion)
  foreach ($hijo in @($opt.ChildNodes)) { [void]$opt.RemoveChild($hijo) }
} else {
  $feat = $ticket.CreateElement("psf", "Feature", $psf)
  $feat.SetAttribute("name", $Feature)
  $opt = $ticket.CreateElement("psf", "Option", $psf)
  $opt.SetAttribute("name", $Opcion)
  [void]$feat.AppendChild($opt)
  [void]$ticket.DocumentElement.AppendChild($feat)
}

$nuevoXml = $ticket.OuterXml
$bytes = [System.Text.Encoding]::UTF8.GetBytes($nuevoXml)
$pt = [System.Printing.PrintTicket]::new([System.IO.MemoryStream]::new($bytes))
$q.UserPrintTicket = $pt
$q.Commit()
"Usuario: $Feature = $Opcion"
try {
  Set-PrintConfiguration -PrinterName $Impresora -PrintTicketXml $nuevoXml
  "Dispositivo: $Feature = $Opcion"
} catch {
  "Dispositivo: no se pudo (hace falta administrador): $($_.Exception.Message)"
}

$q.Refresh()
$leido = (New-Object System.IO.StreamReader($q.UserPrintTicket.GetXmlStream())).ReadToEnd()
[xml]$lx = $leido
$nsl = New-Object System.Xml.XmlNamespaceManager($lx.NameTable); $nsl.AddNamespace("psf", $psf)
$v = $lx.SelectSingleNode("//psf:Feature[@name='$Feature']/psf:Option", $nsl)
"Verificado: $Feature = $(if ($v) { $v.GetAttribute('name') } else { '(ausente)' })"
