# =============================================================================
# GERAR-PREVIEW.PS1 — empacotador ("build") do site Amor ao Sol
# -----------------------------------------------------------------------------
# O QUE FAZ: pega os 3 arquivos do site + as imagens + as fontes e cospe UM
# arquivo HTML único, que funciona sozinho, sem internet e sem pasta de assets.
#
# POR QUE EXISTE: para hospedar o preview num lugar que bloqueia arquivos
# externos (o link que mandamos pro celular). Também é um "hello world" de
# build step — é isso que Vite e Webpack fazem, só que em escala maior.
#
# COMO USAR:  powershell -ExecutionPolicy Bypass -File gerar-preview.ps1
# =============================================================================

Add-Type -AssemblyName System.Drawing

$raiz   = Split-Path -Parent $MyInvocation.MyCommand.Path
$saida  = Join-Path $raiz "preview-amor-ao-sol.html"


# -----------------------------------------------------------------------------
# 1. IMAGENS -> data URI
# -----------------------------------------------------------------------------
# Uma "data URI" é a imagem inteira escrita como texto dentro do HTML.
# Vantagem: zero requisições de rede. Desvantagem: base64 engorda ~33%.
# Por isso reduzimos e recomprimimos ANTES de converter — senão o arquivo
# final ficaria com dezenas de MB e não abriria no 4G.
# -----------------------------------------------------------------------------
function Converter-ImagemParaDataUri {
    param([string]$Caminho, [int]$LarguraMax, [int]$Qualidade)

    $original = [System.Drawing.Image]::FromFile($Caminho)
    try {
        # Só reduz se a imagem for maior que o limite (nunca aumenta = nunca borra)
        $escala   = [Math]::Min(1.0, $LarguraMax / $original.Width)
        $largura  = [int]($original.Width  * $escala)
        $altura   = [int]($original.Height * $escala)

        $bitmap  = New-Object System.Drawing.Bitmap($largura, $altura)
        $grafico = [System.Drawing.Graphics]::FromImage($bitmap)
        $grafico.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $grafico.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $grafico.DrawImage($original, 0, 0, $largura, $altura)

        # Configura o compressor JPEG na qualidade pedida (0-100)
        $codec      = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $parametros = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $parametros.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Qualidade)

        $memoria = New-Object System.IO.MemoryStream
        $bitmap.Save($memoria, $codec, $parametros)

        $base64 = [Convert]::ToBase64String($memoria.ToArray())
        "data:image/jpeg;base64,$base64"
    }
    finally {
        # finally garante que os recursos são liberados MESMO se der erro acima.
        # Sem isso o arquivo fica travado pelo Windows e o script não roda 2x.
        if ($grafico)  { $grafico.Dispose() }
        if ($bitmap)   { $bitmap.Dispose() }
        if ($memoria)  { $memoria.Dispose() }
        $original.Dispose()
    }
}

# Cada imagem tem seu tamanho conforme o papel que cumpre na tela:
# hero ocupa a tela inteira (precisa ser maior), card de produto é pequeno.
# OBS: logo.jpeg saiu da lista — a logo agora e um SVG desenhado a mao dentro
# do proprio HTML. Vetor nao precisa virar base64: ja e texto, ja e leve, e
# fica nitido em qualquer tela.
$receita = @{
    # Fundo de tela cheia: precisam de mais resolucao.
    # hero-dois-irmaos e hero-pao-de-acucar sairam do carrossel (o hero ficou
    # com 2 slides). Os arquivos seguem em assets/ caso voltem.
    'hero-por-do-sol.jpeg'       = @{ w = 1100; q = 64 }
    'hero-praia-rio.jpeg'        = @{ w = 1100; q = 64 }
    'banner-noronha.jpeg'        = @{ w = 1100; q = 64 }
    # Banners de colecao: aparecem lado a lado, entao ~900px cobre bem
    'banner-categoria-biquinis.png' = @{ w = 900; q = 70 }
    'banner-categoria-saidas.png'   = @{ w = 900; q = 70 }
    # Cards e blocos menores: 700px ja cobre ate tela retina
    'banner-bone-praia.jpeg'     = @{ w = 700;  q = 68 }
    'bones.jpeg'                 = @{ w = 700;  q = 68 }
    'fundadora.jpeg'             = @{ w = 700;  q = 68 }
    'entregas.jpeg'              = @{ w = 700;  q = 68 }
    # produto-coral.jpeg saiu: o biquini Arpoador foi removido da colecao.
    # O arquivo continua em assets/ caso a peca volte.
    'produto-marrom.jpeg'        = @{ w = 700;  q = 68 }
    'produto-laranja-marrom.jpeg'= @{ w = 700;  q = 68 }
    'produto-pessego.jpeg'       = @{ w = 700;  q = 68 }
    'produto-grafite.jpeg'       = @{ w = 700;  q = 68 }
    'produto-vinho.jpeg'         = @{ w = 700;  q = 68 }
    'produto-branco.jpeg'        = @{ w = 700;  q = 68 }
    'hero-mar-azul.jpeg'         = @{ w = 700;  q = 68 }
    'hero-peixes.jpeg'           = @{ w = 700;  q = 68 }
}

Write-Host "[1/4] Convertendo imagens..."
$imagens = @{}
foreach ($arquivo in $receita.Keys) {
    $caminho = Join-Path $raiz "assets\$arquivo"
    $imagens[$arquivo] = Converter-ImagemParaDataUri -Caminho $caminho -LarguraMax $receita[$arquivo].w -Qualidade $receita[$arquivo].q
    $kb = [math]::Round($imagens[$arquivo].Length / 1KB)
    Write-Host ("      {0,-24} {1} KB" -f $arquivo, $kb)
}


# -----------------------------------------------------------------------------
# 2. FONTES -> @font-face embutido
# -----------------------------------------------------------------------------
# O Google Fonts entrega um CSS com vários blocos @font-face (um por alfabeto:
# latin, cirílico, grego...). Mantemos SÓ o bloco "latin": o site é em português,
# os outros alfabetos seriam peso morto.
# -----------------------------------------------------------------------------
Write-Host "[2/4] Embutindo fontes..."
$ua  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
$url = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=Jost:wght@300;400;500&family=Style+Script&display=swap"

$cssGoogle = (Invoke-WebRequest -Uri $url -UserAgent $ua -UseBasicParsing -TimeoutSec 30).Content

$cssFontes = ""
# Cada bloco vem precedido do comentário com o nome do alfabeto: /* latin */
foreach ($bloco in [regex]::Matches($cssGoogle, "/\*\s*([a-z\-]+)\s*\*/\s*(@font-face\s*\{[^}]+\})")) {
    if ($bloco.Groups[1].Value -ne 'latin') { continue }

    $regra   = $bloco.Groups[2].Value
    $urlFont = [regex]::Match($regra, "https://[^\)]+\.woff2").Value
    if (-not $urlFont) { continue }

    $bytes  = (Invoke-WebRequest -Uri $urlFont -UserAgent $ua -UseBasicParsing -TimeoutSec 30).Content
    $base64 = [Convert]::ToBase64String($bytes)

    # Troca o endereço na internet pela fonte inteira escrita ali mesmo
    $cssFontes += ($regra -replace [regex]::Escape($urlFont), "data:font/woff2;base64,$base64") + "`n"
}
Write-Host ("      {0} fontes embutidas ({1} KB)" -f ([regex]::Matches($cssFontes,'@font-face')).Count, [math]::Round($cssFontes.Length/1KB))


# -----------------------------------------------------------------------------
# 3. JUNTAR TUDO
# -----------------------------------------------------------------------------
Write-Host "[3/4] Montando arquivo unico..."
$html = [System.IO.File]::ReadAllText((Join-Path $raiz "index.html"))
$css  = [System.IO.File]::ReadAllText((Join-Path $raiz "styles.css"))
$js   = [System.IO.File]::ReadAllText((Join-Path $raiz "script.js"))

# Troca todo "assets/xxx.jpeg" pela imagem em base64 — vale para o src= do HTML
# e para o url() do CSS de uma vez só.
foreach ($arquivo in $imagens.Keys) {
    $html = $html.Replace("assets/$arquivo", $imagens[$arquivo])
    $css  = $css.Replace("assets/$arquivo", $imagens[$arquivo])
}

# O host embrulha o conteudo no proprio <html>/<head>/<body>, entao extraimos
# apenas o miolo do body e descartamos nossa casca.
$miolo = [regex]::Match($html, '(?s)<body[^>]*>(.*)</body>').Groups[1].Value
# A tag <script src="script.js"> nao serve aqui: o JS vai inline no final.
$miolo = [regex]::Replace($miolo, '<script src="script\.js"></script>', '')

$final = @"
<title>Amor ao Sol — Biquínis feitos no Rio</title>
<style>
$cssFontes
$css
</style>
$miolo
<script>
$js
</script>
"@

# UTF8 **COM** BOM (o "true" no final).
# O BOM sao 3 bytes invisiveis no inicio do arquivo que gritam "eu sou UTF-8!".
# Normalmente quem faz esse aviso e a tag <meta charset="utf-8"> — mas aqui o
# <head> e montado pelo servico de hospedagem e a nossa tag e descartada.
# Sem BOM e sem meta, o navegador chuta o alfabeto errado e "biquíni" vira
# "biquÃ­ni". O BOM resolve porque tem prioridade sobre qualquer outro palpite.
[System.IO.File]::WriteAllText($saida, $final, (New-Object System.Text.UTF8Encoding($true)))

Write-Host "[4/4] Pronto!"
Write-Host ("      {0}  ({1} KB)" -f (Split-Path $saida -Leaf), [math]::Round((Get-Item $saida).Length / 1KB))
