# Deja el material "Etiquetas" (50 x 30) como predeterminado de la Xprinter XP-410B
# por la vía oficial de Windows (PrintTicket), sin tocar la ventana del driver.
#   -SoloLeer : muestra los materiales que ofrece el driver y no cambia nada.
# Escribe el predeterminado del usuario actual (Preferencias de impresión) y,
# si hay permisos de administrador, también el del dispositivo (para otros usuarios).
# Backup del ticket original: Downloads\xp410b-printticket-original.xml
param([switch]$SoloLeer, [string]$Impresora = "Xprinter XP-410B", [string]$Material = "Etiquetas")

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Printing

$psf = "http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework"
$psk = "http://schemas.microsoft.com/windows/2003/08/printing/printschemakeywords"

$server = New-Object System.Printing.LocalPrintServer
$q = $server.GetPrintQueue($Impresora)

# 1) Capacidades del driver: qué materiales existen y con qué nombre de opción.
$capsStream = $q.GetPrintCapabilitiesAsXml()
$capsXml = (New-Object System.IO.StreamReader($capsStream)).ReadToEnd()
[xml]$caps = $capsXml
$nsc = New-Object System.Xml.XmlNamespaceManager($caps.NameTable)
$nsc.AddNamespace("psf", $psf); $nsc.AddNamespace("psk", $psk)
$feature = $caps.SelectSingleNode("//psf:Feature[@name='psk:PageMediaSize']", $nsc)
if (-not $feature) { throw "El driver no expone psk:PageMediaSize" }

$materiales = @()
foreach ($o in $feature.SelectNodes("psf:Option", $nsc)) {
  $w = $o.SelectSingleNode("psf:ScoredProperty[@name='psk:MediaSizeWidth']/psf:Value", $nsc)
  $h = $o.SelectSingleNode("psf:ScoredProperty[@name='psk:MediaSizeHeight']/psf:Value", $nsc)
  $stock = $o.SelectSingleNode("psf:Property[@name='seagull.driver.base:StockName']/psf:Value", $nsc)
  $id = $o.SelectSingleNode("psf:ScoredProperty[@name='seagull.driver.base:StockID']/psf:Value", $nsc)
  $materiales += [pscustomobject]@{
    Opcion = $o.GetAttribute("name"); Nombre = $(if ($stock) { $stock.InnerText } else { "" })
    AnchoMm = $(if ($w) { [int]$w.InnerText / 1000 } else { $null }); AltoMm = $(if ($h) { [int]$h.InnerText / 1000 } else { $null })
    StockID = $(if ($id) { $id.InnerText } else { "" })
  }
}
"Materiales que ofrece el driver:"
$materiales | Format-Table -AutoSize | Out-String -Width 200

$elegido = $materiales | Where-Object { $_.Nombre -eq $Material } | Select-Object -First 1
if (-not $elegido) { throw "No encontré un material llamado '$Material' en el driver" }
"Elegido: $($elegido.Opcion) · $($elegido.Nombre) · $($elegido.AnchoMm) x $($elegido.AltoMm) mm · StockID $($elegido.StockID)"
if ($SoloLeer) { return }

# 2) Ticket actual (predeterminado del dispositivo) como base; se reemplaza solo el tamaño de papel.
$config = Get-PrintConfiguration -PrinterName $Impresora
[xml]$ticket = $config.PrintTicketXml
$nst = New-Object System.Xml.XmlNamespaceManager($ticket.NameTable)
$nst.AddNamespace("psf", $psf); $nst.AddNamespace("psk", $psk)
$featT = $ticket.SelectSingleNode("//psf:Feature[@name='psk:PageMediaSize']", $nst)
$optT = $featT.SelectSingleNode("psf:Option", $nst)

# El prefijo del nombre de la opción tiene que estar declarado en el ticket.
$prefijo = $elegido.Opcion.Split(":")[0]
$uri = $caps.DocumentElement.GetNamespaceOfPrefix($prefijo)
if ($uri -and -not $ticket.DocumentElement.GetNamespaceOfPrefix($prefijo)) {
  $ticket.DocumentElement.SetAttribute("xmlns:$prefijo", $uri)
}

$optT.SetAttribute("name", $elegido.Opcion)
$optT.SelectSingleNode("psf:ScoredProperty[@name='psk:MediaSizeWidth']/psf:Value", $nst).InnerText = [string]([int]($elegido.AnchoMm * 1000))
$optT.SelectSingleNode("psf:ScoredProperty[@name='psk:MediaSizeHeight']/psf:Value", $nst).InnerText = [string]([int]($elegido.AltoMm * 1000))
$nombreNodo = $optT.SelectSingleNode("psf:Property[@name='seagull.driver.base:StockName']/psf:Value", $nst)
if ($nombreNodo) { $nombreNodo.InnerText = $elegido.Nombre }
$idNodo = $optT.SelectSingleNode("psf:ScoredProperty[@name='seagull.driver.base:StockID']/psf:Value", $nst)
if ($idNodo -and $elegido.StockID) { $idNodo.InnerText = $elegido.StockID }

# Orientación vertical, por las dudas.
$orient = $ticket.SelectSingleNode("//psf:Feature[@name='psk:PageOrientation']/psf:Option", $nst)
if ($orient) { $orient.SetAttribute("name", "psk:Vertical") }

$nuevoXml = $ticket.OuterXml
$nuevoXml | Set-Content -Path "$env:USERPROFILE\Downloads\xp410b-printticket-etiquetas.xml" -Encoding UTF8

# 3a) Predeterminado del usuario actual (lo que usa Chrome al abrir el diálogo).
# [MemoryStream]::new y no New-Object: PowerShell desarma el byte[] en argumentos sueltos.
$bytes = [System.Text.Encoding]::UTF8.GetBytes($nuevoXml)
$ms = [System.IO.MemoryStream]::new($bytes)
$pt = [System.Printing.PrintTicket]::new($ms)
$q.UserPrintTicket = $pt
$q.Commit()
"Predeterminado del usuario: actualizado."

# 3b) Predeterminado del dispositivo (otros usuarios de la PC); pide administrador.
try {
  Set-PrintConfiguration -PrinterName $Impresora -PrintTicketXml $nuevoXml
  "Predeterminado del dispositivo: actualizado."
} catch {
  "Predeterminado del dispositivo: NO se pudo (hace falta PowerShell como administrador): $($_.Exception.Message)"
}

# 4) Verificación: qué queda grabado.
$q.Refresh()
$leido = (New-Object System.IO.StreamReader($q.UserPrintTicket.GetXmlStream())).ReadToEnd()
$m = [regex]::Match($leido, 'StockName">\s*<psf:Value[^>]*>([^<]+)<')
"Material del usuario ahora: $($m.Groups[1].Value)"
$md = [regex]::Match((Get-PrintConfiguration -PrinterName $Impresora).PrintTicketXml, 'StockName">\s*<psf:Value[^>]*>([^<]+)<')
"Material del dispositivo ahora: $($md.Groups[1].Value)"
