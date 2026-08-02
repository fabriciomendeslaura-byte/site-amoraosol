/* ============================================================================
   AMOR AO SOL — Comportamento da página
   ----------------------------------------------------------------------------
   Este arquivo cuida SÓ do que se move e do que reage ao usuário.
   O visual está no styles.css e o conteúdo no index.html — cada arquivo com
   uma responsabilidade só (SRP: Single Responsibility Principle).
   ============================================================================ */

/* ----------------------------------------------------------------------------
   CONFIGURAÇÃO DA MARCA
   Fonte única da verdade do contato. O número aparece em 10+ botões no site,
   mas está escrito UMA vez. Mudou? Muda aqui e todos acompanham. Isso é DRY.
   ---------------------------------------------------------------------------- */
const MARCA = {
  whatsapp: '5521968587580',   // formato internacional, só números
  instagram: 'amoraosol',
};


/* ----------------------------------------------------------------------------
   MARCA "JS LIGADO"
   Primeira linha a rodar. O CSS só esconde os elementos para animar DEPOIS de
   ver esta classe no <html>. Se este arquivo não carregar, nada some da tela:
   o site perde as animações, mas continua vendendo. Chama-se progressive
   enhancement — o essencial funciona sempre, o enfeite é bônus.
   ---------------------------------------------------------------------------- */
document.documentElement.classList.add('js');


/* ============================================================================
   1. LINKS DO WHATSAPP
   ----------------------------------------------------------------------------
   Todo elemento com a classe .zap vira um link de WhatsApp.
   A mensagem é montada com o que o card sabe: nome da peça, preço e o tamanho
   que a cliente acabou de escolher. Ela não digita nada, e a vendedora recebe
   o pedido pronto — menos ida e volta na conversa é mais venda fechada.
   ============================================================================ */
function montarMensagem(botao) {
  // Mensagem sob medida escrita no próprio HTML (ex: o botão do guia de
  // medidas manda um modelo com lacunas para a cliente preencher).
  // Tem prioridade sobre tudo: quando o texto exato importa, ele vem do HTML.
  if (botao.dataset.mensagem) return botao.dataset.mensagem;

  // .closest sobe na árvore procurando o card que contém este botão.
  // É como perguntar "de qual produto eu faço parte?".
  const card = botao.closest('.produto');

  // Sem card = botão geral (topo, rodapé, botão flutuante)
  if (!card) {
    return 'Oi! Vim pelo site e queria ver as peças disponíveis. 🧡';
  }

  const nome  = card.dataset.nome;
  const preco = card.dataset.preco;

  // O seletor é genérico: no biquíni ele guarda o tamanho, no boné a cor.
  // O rótulo ("no tamanho" / "na cor") vem do próprio HTML, então a mesma
  // função monta a frase certa para qualquer tipo de produto.
  const grupo  = card.querySelector('.produto__opcoes');
  const rotulo = grupo?.dataset.rotulo ?? '';
  const opcao  = grupo?.querySelector('.opcao.is-ativo')?.textContent.trim() ?? '';

  const escolha = opcao ? ` ${rotulo} *${opcao}*` : '';

  return `Oi! Vi o site e quero *${nome}*${escolha} (R$ ${preco}). Ainda tem disponível? 🧡`;
}

function atualizarLink(botao) {
  const texto = montarMensagem(botao);

  // encodeURIComponent converte espaços e acentos em código seguro para URL.
  // Sem isso, a mensagem chega quebrada ou o link nem abre.
  botao.href = `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(texto)}`;
  botao.target = '_blank';
  botao.rel = 'noopener';        // impede a página aberta de manipular a nossa
}

// Monta todos os links já no carregamento
const botoesZap = document.querySelectorAll('.zap');
botoesZap.forEach(atualizarLink);


/* ============================================================================
   2. SELETOR DE OPÇÃO (tamanho no biquíni, cor no boné)
   ----------------------------------------------------------------------------
   Ao clicar: marca a opção como ativa, desmarca as irmãs e REESCREVE o link do
   WhatsApp daquele card.

   Repare que usamos UM listener por card, e não um por botão (seriam 40).
   Chama-se "event delegation": o clique borbulha do botão até o container, e a
   gente pergunta lá em cima quem foi clicado. Menos memória, e continua
   funcionando se novos botões forem criados depois.
   ============================================================================ */
document.querySelectorAll('.produto__opcoes').forEach((grupo) => {
  grupo.addEventListener('click', (evento) => {
    const botaoOpcao = evento.target.closest('.opcao');
    if (!botaoOpcao) return;            // clicou no espaço vazio entre botões

    // Desmarca todas deste card e marca só a clicada
    grupo.querySelectorAll('.opcao').forEach((b) => b.classList.remove('is-ativo'));
    botaoOpcao.classList.add('is-ativo');

    // O card mudou de estado, então o link precisa ser refeito
    const card = grupo.closest('.produto');
    card.querySelectorAll('.zap').forEach(atualizarLink);
  });
});


/* ============================================================================
   3. HERO — troca automática das fotos (o "efeito vídeo")
   ----------------------------------------------------------------------------
   A cada 6s trocamos qual foto tem a classe .is-active. O CSS cuida do
   crossfade e do zoom lento; o JS só diz "agora é a vez dessa".
   ============================================================================ */
const slides = document.querySelectorAll('.hero__slide');
const pontos = document.querySelectorAll('.hero__ponto');
let slideAtual = 0;
let timerSlides;

function mostrarSlide(indice) {
  slideAtual = indice;

  slides.forEach((slide, i) => {
    // Removemos e re-adicionamos a classe para REINICIAR a animação de zoom.
    // Sem isso o Ken Burns rodaria uma vez só e as fotos seguintes ficariam paradas.
    slide.classList.remove('is-active');
    if (i === indice) {
      void slide.offsetWidth;          // força o navegador a recalcular agora
      slide.classList.add('is-active');
    }
  });

  pontos.forEach((ponto, i) => ponto.classList.toggle('is-active', i === indice));
}

function iniciarCarrossel() {
  clearInterval(timerSlides);          // evita dois timers rodando juntos
  timerSlides = setInterval(() => {
    // O operador % (resto da divisão) faz o contador voltar a 0 no fim da lista
    mostrarSlide((slideAtual + 1) % slides.length);
  }, 6000);
}

pontos.forEach((ponto) => {
  ponto.addEventListener('click', () => {
    mostrarSlide(Number(ponto.dataset.slide));
    iniciarCarrossel();                // reinicia a contagem após escolha manual
  });
});

if (slides.length > 1) iniciarCarrossel();


/* ============================================================================
   4. CABEÇALHO E BARRA DO WHATSAPP reagindo à rolagem
   ============================================================================ */
const cabecalho = document.getElementById('cabecalho');
const zapFab    = document.querySelector('.zap-fab');

function aoRolar() {
  const y = window.scrollY;

  // Depois de 60px o cabeçalho ganha fundo de vidro fosco
  cabecalho.classList.toggle('is-scrolled', y > 60);

  // O botão flutuante só entra depois do hero — lá em cima ele competiria
  // com o botão principal e atrapalharia a primeira impressão.
  zapFab.classList.toggle('is-visivel', y > window.innerHeight * 0.7);
}

// { passive: true } avisa o navegador que não vamos bloquear a rolagem.
// Resultado: scroll bem mais fluido no celular.
window.addEventListener('scroll', aoRolar, { passive: true });
aoRolar();   // roda uma vez no carregamento (caso a página abra já rolada)


/* ============================================================================
   5. MENU MOBILE
   ============================================================================ */
const menuBtn = document.getElementById('menu-btn');
const menu    = document.getElementById('menu');

function alternarMenu(abrir) {
  menu.classList.toggle('is-open', abrir);
  menuBtn.classList.toggle('is-open', abrir);
  menuBtn.setAttribute('aria-expanded', String(abrir));   // leitor de tela
                                                          // anuncia o estado
  document.body.style.overflow = abrir ? 'hidden' : '';   // trava o fundo
}

menuBtn.addEventListener('click', () => alternarMenu(!menu.classList.contains('is-open')));

// Fecha ao clicar num link, senão o painel cobriria a seção de destino
menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => alternarMenu(false)));


/* ============================================================================
   6. ANIMAÇÃO DE ENTRADA DOS ELEMENTOS
   ----------------------------------------------------------------------------
   IntersectionObserver é o jeito moderno de saber "esse elemento apareceu na
   tela?". O jeito antigo era calcular posições a cada evento de scroll — pesado
   e travado. O observer roda fora da thread principal: mais rápido e mais limpo.
   ============================================================================ */
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada, i) => {
    if (!entrada.isIntersecting) return;

    // Atraso escalonado: itens do mesmo grupo entram em cascata, não todos de
    // uma vez. É o que dá sensação de coreografia em vez de "pisca tudo".
    setTimeout(() => entrada.target.classList.add('is-visivel'), i * 90);

    // Revelado uma vez, paramos de observar: economiza processamento
    observador.unobserve(entrada.target);
  });
}, {
  threshold: 0.15,                    // dispara com 15% do elemento visível
  rootMargin: '0px 0px -60px 0px',    // ...e um pouco antes de encostar na borda
});

document.querySelectorAll('.revelar').forEach((el) => observador.observe(el));


/* ============================================================================
   7. PARALLAX DO BANNER
   ----------------------------------------------------------------------------
   A foto se move mais devagar que a página. O cérebro lê essa diferença de
   velocidade como profundidade — parece que a foto está "atrás" do texto.
   ============================================================================ */
const fotoParallax = document.querySelector('[data-parallax]');

if (fotoParallax && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // requestAnimationFrame sincroniza a atualização com o refresh da tela.
  // Sem ele, mexer no transform a cada evento de scroll causa tremedeira.
  let pendente = false;

  window.addEventListener('scroll', () => {
    if (pendente) return;
    pendente = true;

    requestAnimationFrame(() => {
      const caixa = fotoParallax.getBoundingClientRect();

      // Só calcula com o banner visível — fora da tela é trabalho jogado fora
      if (caixa.bottom > 0 && caixa.top < window.innerHeight) {
        // Quanto o banner já percorreu a tela, de -1 (chegando) a 1 (saindo)
        const progresso = (caixa.top + caixa.height / 2 - window.innerHeight / 2) / window.innerHeight;
        fotoParallax.style.transform = `translateY(${progresso * 40}px)`;
      }
      pendente = false;
    });
  }, { passive: true });
}
