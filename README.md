# Amor ao Sol — site de vendas

Landing page da [@amoraosol](https://instagram.com/amoraosol), marca carioca de biquínis.
O objetivo é simples: a visitante se apaixona pela marca e sai pelo WhatsApp com a peça
e o tamanho **já escolhidos**.

## Como rodar

Não tem build nem dependência. Para desenvolver, sirva a pasta por HTTP:

```bash
python -m http.server 8080
# abra http://localhost:8080
```

> Abrir o `index.html` direto pelo `file://` funciona, mas o navegador desliga
> regras de segurança que existem no servidor real. Prefira o HTTP.

## Estrutura

```
index.html    → conteúdo e estrutura
styles.css    → todo o visual
script.js     → comportamento (carrossel, WhatsApp, animações)
assets/       → imagens da marca, com nome semântico
vercel.json   → cabeçalhos de cache da hospedagem
```

Cada arquivo tem uma responsabilidade só. Quer mudar uma cor? CSS. Um preço? HTML.

## Onde mexer nas coisas mais comuns

| O que mudar | Onde |
|---|---|
| Número do WhatsApp | `script.js` → objeto `MARCA` (um lugar só, vale para todos os botões) |
| Cores da marca | `styles.css` → bloco `:root` |
| Preços, nomes e descrições das peças | `index.html` → seção `#colecao` |
| Fotos do banner de abertura | `index.html` → `.hero__filme` |
| Tabela de medidas | `index.html` → seção `#medidas` |

## Preview de arquivo único

`gerar-preview.ps1` empacota o site inteiro (CSS, JS, fontes e imagens em base64)
num único HTML autossuficiente, para compartilhar sem servidor:

```powershell
powershell -ExecutionPolicy Bypass -File gerar-preview.ps1
```

O arquivo gerado não é versionado — é saída de build.

## Pendências antes de publicar como oficial

Estes conteúdos são **exemplos** e precisam ser confirmados com a marca:

- [ ] Preços e nomes das peças
- [ ] Tabela de medidas (a atual é referência de mercado, não a modelagem real)
- [ ] Depoimentos — hoje são fictícios; substituir por mensagens reais de clientes
- [ ] Alegação de "tecido com proteção UV"
- [ ] Texto da seção "A marca"

Dados **reais**, já confirmados pelo material da marca: WhatsApp, Instagram,
paleta de cores e as três modalidades de entrega.
