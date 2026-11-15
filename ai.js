import { getGeminiKey, MODELO_TEXTO, MODELOS_IMAGEM, urlGemini } from './settings.jsx'
import { compressDataUrl } from './image'

export const CATEGORIAS_IA = ['Pintura', 'Móveis', 'Iluminação', 'Estrutura', 'Decoração']
const PRIORIDADES_IA = ['Alta', 'Média', 'Baixa']

const semAcento = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Gera 5 sugestões para o cômodo.
 * Usa o Gemini se houver chave salva; senão (ou se der erro), usa o assistente local.
 */
export async function gerarSugestoes(comodo) {
  const evitar = comodo.ideias.map((i) => semAcento(i.titulo))
  const key = getGeminiKey()
  if (key) {
    try {
      const sugestoes = await sugestoesGemini(key, comodo)
      return { fonte: 'gemini', sugestoes }
    } catch (e) {
      return { fonte: 'local', erro: e.message, sugestoes: sugestoesLocais(comodo, evitar) }
    }
  }
  // pequeno atraso para a animação não "piscar"
  await new Promise((r) => setTimeout(r, 600))
  return { fonte: 'local', sugestoes: sugestoesLocais(comodo, evitar) }
}

// ---------------------------------------------------------------- Gemini

const descreverItens = (itens, acao) =>
  itens
    .filter((i) => i.acao === acao)
    .map((i) => `- ${i.nome}${i.medidas ? ` (${i.medidas})` : ''}${i.observacoes ? ` — ${i.observacoes}` : ''}`)
    .join('\n') || '(nenhum)'

async function sugestoesGemini(key, comodo) {
  const prompt = `Você é um(a) arquiteto(a) e designer de interiores brasileiro(a), prático(a) e criativo(a), ajudando um casal a reformar a própria casa.

Cômodo: ${comodo.nome}
Status da obra: ${comodo.status}
Notas gerais do casal: ${comodo.notas?.trim() || '(sem notas)'}

Itens marcados para REFORMAR/RESTAURAR:
${descreverItens(comodo.itens, 'Reformar')}

Itens marcados para TROCAR/COMPRAR NOVO:
${descreverItens(comodo.itens, 'Trocar')}

Ideias que o casal já tem (não repita):
${comodo.ideias.map((i) => `- ${i.titulo}`).join('\n') || '(nenhuma)'}

Gere exatamente 5 ideias criativas e práticas de decoração, iluminação, cores ou layout para este cômodo, levando em conta as notas e os itens acima. Pense no contexto brasileiro (materiais e lojas encontrados no Brasil, orçamento realista). Varie as categorias.
Para cada ideia:
- "titulo": curto e direto (até 60 caracteres)
- "descricao": 1 a 3 frases práticas (como executar, materiais, cores, medidas ou temperatura de luz sugeridas)
- "categoria": uma de Pintura, Móveis, Iluminação, Estrutura, Decoração
- "prioridade": Alta, Média ou Baixa
- "termo_busca_visual": frase curta (4 a 7 palavras, sem pontuação) em português, otimizada para buscar fotos dessa ideia no Pinterest/Google Imagens. Ex.: "sala estar sofa cinza iluminacao quente"
Responda em português do Brasil.`

  const res = await fetch(urlGemini(MODELO_TEXTO), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              titulo: { type: 'STRING' },
              descricao: { type: 'STRING' },
              categoria: { type: 'STRING', enum: CATEGORIAS_IA },
              prioridade: { type: 'STRING', enum: PRIORIDADES_IA },
              termo_busca_visual: { type: 'STRING' },
            },
            required: ['titulo', 'descricao', 'categoria', 'prioridade', 'termo_busca_visual'],
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Limite gratuito do Gemini atingido por agora. Tente mais tarde.')
    if (res.status === 400 || res.status === 403) throw new Error('A chave do Gemini parece inválida. Confira na engrenagem ⚙️.')
    throw new Error(j?.error?.message || `Erro ${res.status} ao falar com o Gemini`)
  }

  const data = await res.json()
  const texto = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  let lista
  try {
    lista = JSON.parse(texto)
  } catch {
    throw new Error('O Gemini respondeu num formato inesperado.')
  }
  if (!Array.isArray(lista) || !lista.length) throw new Error('O Gemini não retornou sugestões.')

  return lista.slice(0, 5).map((s) => ({
    titulo: String(s.titulo || '').slice(0, 90),
    descricao: String(s.descricao || ''),
    categoria: CATEGORIAS_IA.includes(s.categoria) ? s.categoria : 'Decoração',
    prioridade: PRIORIDADES_IA.includes(s.prioridade) ? s.prioridade : 'Média',
    termo_busca_visual: String(s.termo_busca_visual || '').trim() || termoPadrao(comodo.nome, s.titulo),
  }))
}

// ---------------------------------------------------------------- Busca visual (grátis)

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'com', 'para', 'em', 'no', 'na', 'um', 'uma', 'sem', 'ao', 'ou'])

/** Monta um termo de busca a partir do cômodo + título (usado no assistente offline) */
export function termoPadrao(nomeComodo = '', titulo = '') {
  const palavras = semAcento(`${nomeComodo} ${titulo}`)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
  return [...new Set(palavras)].slice(0, 7).join(' ') + ' decoracao'
}

export const linkPinterest = (termo) => `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(termo)}`
export const linkGoogleImagens = (termo) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(termo)}`

// ---------------------------------------------------------------- Imagem gerada pela IA

export class ErroImagem extends Error {}

/**
 * Gera uma imagem ilustrando a sugestão com a API de imagem do Gemini (Nano Banana)
 * e devolve já comprimida (JPEG ≤800px, via Canvas).
 */
export async function gerarImagemIdeia(comodo, sugestao) {
  const key = getGeminiKey()
  if (!key) throw new ErroImagem('Configure a chave do Gemini na engrenagem ⚙️ para gerar imagens.')

  const prompt = `Fotografia realista de interiores, estilo revista de decoração brasileira, enquadramento horizontal amplo (proporção 4:3).
Ambiente: ${comodo.nome || 'cômodo'} de uma casa brasileira.
Ideia aplicada no ambiente: ${sugestao.titulo}. ${sugestao.descricao || ''}
Luz natural agradável, cores harmoniosas, aspecto acolhedor e possível de executar numa reforma real.
Sem pessoas, sem texto, sem logotipos.`

  let ultimoStatus = 0
  for (const modelo of MODELOS_IMAGEM) {
    let res
    try {
      res = await fetch(urlGemini(modelo), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      })
    } catch {
      throw new ErroImagem('Sem conexão para gerar a imagem agora.')
    }

    if (res.ok) {
      const data = await res.json()
      const parts = data?.candidates?.[0]?.content?.parts || []
      const img = parts.map((p) => p.inlineData || p.inline_data).find((d) => d?.data)
      if (!img) throw new ErroImagem('A IA não conseguiu desenhar esta ideia. Tente de novo ou use a busca visual.')
      const mime = img.mimeType || img.mime_type || 'image/png'
      return compressDataUrl(`data:${mime};base64,${img.data}`, 800, 0.7)
    }

    ultimoStatus = res.status
    // modelo inexistente, sem cota ou não liberado: tenta o próximo da lista
    if ([400, 403, 404, 429].includes(res.status)) continue
    break
  }

  if (ultimoStatus === 429) {
    throw new ErroImagem('O limite gratuito de geração de imagens foi atingido por hoje.')
  }
  throw new ErroImagem('A geração de imagens não está liberada para esta chave do Gemini (pode exigir faturamento ativo no Google AI Studio).')
}

// ---------------------------------------------------------------- Assistente local

const I = (titulo, descricao, categoria, prioridade = 'Média') => ({ titulo, descricao, categoria, prioridade })

const BASE = {
  cozinha: [
    I('Triângulo de trabalho livre', 'Mantenha pia, fogão e geladeira formando um triângulo sem obstáculos, com 1,2 m a 2,7 m entre cada ponto. Deixe ao menos 60 cm de bancada livre ao lado do fogão.', 'Estrutura', 'Alta'),
    I('Fita de LED embaixo dos armários', 'Instale fita LED 3000K sob os armários aéreos para iluminar a bancada sem sombras. Perfil de alumínio com difusor deixa o acabamento limpo.', 'Iluminação', 'Alta'),
    I('Revestimento fácil de limpar atrás do fogão', 'Use porcelanato, azulejo de metrô ou vidro temperado na parede da bancada (60 cm de altura). Rejunte epóxi evita manchas de gordura.', 'Estrutura'),
    I('Envelopar armários antigos', 'Se a estrutura está boa, troque só a "cara": adesivo vinílico ou pintura com tinta esmalte à base d’água e puxadores novos. Custa uma fração do planejado.', 'Pintura'),
    I('Nichos e prateleiras abertas', 'Uma ou duas prateleiras abertas para temperos e louças do dia a dia deixam a cozinha mais leve e prática. Prefira profundidade de 25–30 cm.', 'Móveis', 'Baixa'),
    I('Cor terrosa em um ponto focal', 'Pinte só a parede de refeições ou a lateral de uma ilha em terracota, verde-oliva ou areia — aquece o ambiente sem pesar.', 'Pintura', 'Baixa'),
    I('Pendentes sobre a bancada ou mesa', 'Dois ou três pendentes a 70–80 cm acima do tampo criam aconchego. Lâmpadas 2700K deixam a refeição mais acolhedora.', 'Iluminação'),
    I('Tomadas de sobra na bancada', 'Planeje ao menos 4 tomadas na bancada (incluindo uma USB) para eletroportáteis. Torre de tomadas embutida é ótima em ilhas.', 'Estrutura', 'Alta'),
  ],
  sala: [
    I('Circulação de 60–80 cm', 'Deixe pelo menos 60 cm livres entre sofá, mesa de centro e passagens. A mesa de centro fica ideal a cerca de 40 cm do sofá.', 'Móveis', 'Alta'),
    I('Iluminação em camadas', 'Combine luz geral (plafon ou spots), luz de apoio (abajur/luminária de piso) e luz de destaque (fita LED no painel). Use 2700–3000K para aconchego.', 'Iluminação', 'Alta'),
    I('Tapete do tamanho certo', 'O tapete deve passar sob pelo menos os pés da frente do sofá e poltronas. Tapetes pequenos "soltos" encolhem a sala.', 'Decoração'),
    I('Altura da TV na medida', 'O centro da tela deve ficar na altura dos olhos sentados (≈ 1,00–1,10 m do chão). Distância ideal ≈ 1,5 a 2,5 vezes a diagonal da TV.', 'Estrutura'),
    I('Parede de destaque com textura', 'Uma parede com cimento queimado, ripado de madeira ou tinta efeito linho cria um ponto focal sem reformar a sala inteira.', 'Pintura'),
    I('Cortina do teto ao chão', 'Instale o trilho rente ao teto e deixe a cortina tocar o chão: o pé-direito parece mais alto. Linho ou voil claro filtram a luz com leveza.', 'Decoração'),
    I('Plantas em alturas diferentes', 'Combine uma planta grande no chão (costela-de-adão, ficus) com pendentes ou vasos pequenos em prateleiras para dar vida e frescor.', 'Decoração', 'Baixa'),
    I('Paleta de 3 cores', 'Escolha uma cor base neutra (60%), uma secundária (30%) e um destaque (10%) — por exemplo, off-white, madeira e terracota.', 'Pintura', 'Baixa'),
  ],
  quarto: [
    I('Cabeceira que abraça a cama', 'Uma cabeceira estofada ou painel de madeira até 1,20–1,40 m de altura traz aconchego e protege a parede. Pode incluir as mesinhas.', 'Móveis', 'Alta'),
    I('Luz quente e indireta', 'Evite luz branca fria no teto. Prefira 2700K, arandelas de leitura de cada lado e um dimmer — ajuda a desacelerar antes de dormir.', 'Iluminação', 'Alta'),
    I('Cortina blackout com voil', 'Combine blackout (para dormir no escuro) com voil por cima (para o dia). Trilho duplo do teto ao chão deixa tudo elegante.', 'Decoração', 'Alta'),
    I('Espaço de 60 cm ao redor da cama', 'Deixe ao menos 60 cm de circulação nas laterais e no pé da cama, e 90 cm na frente do guarda-roupa para abrir portas.', 'Estrutura'),
    I('Cores calmas nas paredes', 'Tons de verde-sálvia, areia, azul acinzentado ou rosado queimado acalmam. Pinte só a parede da cabeceira se quiser ousar mais.', 'Pintura'),
    I('Guarda-roupa com portas de correr', 'Em quartos pequenos, portas de correr economizam espaço. Espelho numa das portas amplia o ambiente visualmente.', 'Móveis'),
    I('Tapete nas laterais da cama', 'Um tapete grande sob 2/3 da cama ou passadeiras nas laterais deixam o pisar da manhã mais gostoso.', 'Decoração', 'Baixa'),
    I('Tomadas e USB nas mesinhas', 'Instale tomadas com USB dos dois lados da cama, a cerca de 70 cm do chão, e um interruptor paralelo para apagar a luz deitado.', 'Estrutura'),
  ],
  banheiro: [
    I('Box até o teto', 'Vidro do box até o teto segura o vapor, facilita a limpeza e faz o banheiro parecer maior.', 'Estrutura'),
    I('Nicho embutido no box', 'Um nicho de 30 × 60 cm na parede do box (fora da parede hidráulica principal) acaba com prateleiras de canto enferrujadas.', 'Estrutura', 'Alta'),
    I('Iluminação no espelho', 'Espelho com LED ou arandelas laterais iluminam o rosto sem sombras — melhor que uma luz só no teto. Use 3000–4000K.', 'Iluminação', 'Alta'),
    I('Trocar só o rejunte', 'Antes de quebrar tudo: limpeza pesada + rejunte novo (epóxi) + selante podem renovar o banheiro inteiro em um fim de semana.', 'Estrutura'),
    I('Porcelanato grande, poucos rejuntes', 'Peças maiores (60 × 60 ou mais) deixam o banheiro mais amplo e fácil de limpar. Use antiderrapante no piso do box.', 'Estrutura'),
    I('Toque natural', 'Madeira (ou porcelanato amadeirado), plantas que gostam de umidade (samambaia, jiboia) e toalhas em linho deixam o banheiro com cara de spa.', 'Decoração', 'Baixa'),
    I('Bancada suspensa', 'Gabinete suspenso facilita a limpeza do piso e faz o ambiente respirar. Deixe a cuba a ≈ 90 cm do chão.', 'Móveis'),
  ],
  lavanderia: [
    I('Tudo na vertical', 'Use a altura: prateleiras ou armário acima da máquina, varal de teto retrátil e ganchos para vassoura e rodo.', 'Móveis', 'Alta'),
    I('Bancada sobre as máquinas', 'Se as máquinas forem de abertura frontal, uma bancada por cima vira área para dobrar roupas.', 'Móveis'),
    I('Esconder a lavanderia', 'Portas de correr ou de camarão escondem a área de serviço quando ela é integrada à cozinha.', 'Estrutura'),
    I('Boa luz e ventilação', 'Luz branca neutra (4000K) ajuda a ver manchas. Se não houver janela, considere exaustor para tirar a umidade.', 'Iluminação'),
    I('Cestos por tipo de roupa', 'Cestos etiquetados (brancas, coloridas, delicadas) organizam a rotina e liberam espaço no chão.', 'Decoração', 'Baixa'),
  ],
  externa: [
    I('Piso antiderrapante e drenagem', 'Use piso externo antiderrapante e confira o caimento para o ralo (≈ 1%) para não empoçar água.', 'Estrutura', 'Alta'),
    I('Luz de chão e cordão de luz', 'Balizadores no piso e um cordão de lâmpadas 2700K transformam a área à noite. Prefira modelos com proteção IP65.', 'Iluminação'),
    I('Jardim vertical de baixa manutenção', 'Treliça com trepadeira ou vasos em parede com plantas resistentes (jiboia, aspargo, lambari) trazem verde sem ocupar o piso.', 'Decoração'),
    I('Móveis que aguentam tempo', 'Alumínio, fibra sintética ou madeira tratada (cumaru, teca) resistem a sol e chuva. Almofadas com tecido náutico.', 'Móveis'),
    I('Cobertura para usar o ano todo', 'Pergolado com policarbonato ou vidro laminado protege da chuva e mantém a claridade.', 'Estrutura'),
  ],
  escritorio: [
    I('Mesa perpendicular à janela', 'Posicione a mesa de lado para a janela: luz natural sem reflexo na tela e sem ofuscar os olhos.', 'Móveis', 'Alta'),
    I('Ergonomia básica', 'Tela na altura dos olhos, a um braço de distância; cadeira com apoio lombar; pés apoiados. Mesa com ≈ 75 cm de altura.', 'Móveis', 'Alta'),
    I('Luz neutra para trabalhar', 'Use 4000K na área de trabalho e uma luminária de mesa articulada. Deixe o 2700K para o restante da casa.', 'Iluminação'),
    I('Fundo bonito para videochamadas', 'Uma estante organizada, uma planta e um quadro atrás de você fazem toda diferença nas reuniões.', 'Decoração', 'Baixa'),
    I('Gestão de cabos', 'Calha sob a mesa e tomadas acima do tampo deixam tudo limpo e fácil de manter.', 'Estrutura'),
  ],
  generico: [
    I('Iluminação em camadas', 'Combine luz geral, luz de apoio e luz de destaque. Lâmpadas 2700–3000K deixam o ambiente acolhedor.', 'Iluminação', 'Alta'),
    I('Paleta de 3 cores', 'Base neutra (60%), uma secundária (30%) e um destaque (10%) — por exemplo off-white, madeira e verde-oliva.', 'Pintura'),
    I('Circulação livre', 'Garanta ao menos 60–80 cm livres nos caminhos principais. Menos móveis, mais respiro.', 'Móveis', 'Alta'),
    I('Plantas e texturas naturais', 'Madeira, fibras naturais, linho e plantas trazem aconchego imediato com pouco investimento.', 'Decoração', 'Baixa'),
    I('Cortinas do teto ao chão', 'Trilho rente ao teto e tecido até o chão aumentam a sensação de altura do ambiente.', 'Decoração'),
    I('Organização escondida', 'Baús, nichos fechados e cestos deixam o ambiente limpo visualmente — o olhar descansa.', 'Móveis', 'Baixa'),
  ],
}

const tipoDoComodo = (nome) => {
  const n = semAcento(nome)
  if (/cozinha|copa/.test(n)) return 'cozinha'
  if (/banheiro|lavabo|wc/.test(n)) return 'banheiro'
  if (/quarto|suite|dormitorio|hospede/.test(n)) return 'quarto'
  if (/sala|estar|living|tv|jantar/.test(n)) return 'sala'
  if (/lavanderia|servico/.test(n)) return 'lavanderia'
  if (/varanda|jardim|quintal|externa|sacada|area gourmet|churrasq|garagem/.test(n)) return 'externa'
  if (/escritorio|office|estudo/.test(n)) return 'escritorio'
  return 'generico'
}

// Regras por tipo de item marcado como Reformar ou Trocar
const REGRAS_ITENS = [
  { re: /piso|chao|assoalho|taco|porcelanato|ceramica/, reformar: (i) => I(`Revitalizar o ${i.nome.toLowerCase()}`, 'Antes de trocar: limpeza profunda, rejunte novo e, se for madeira/taco, raspagem e verniz fosco. Piso vinílico colado por cima também evita quebra-quebra.', 'Estrutura', 'Alta'), trocar: (i) => I(`Escolher o novo ${i.nome.toLowerCase()}`, `Vinílico é rápido e silencioso; porcelanato é mais durável. Compre 10% a mais para recortes${i.medidas ? ` (área: ${i.medidas})` : ''} e peça amostras para ver na luz da casa.`, 'Estrutura', 'Alta') },
  { re: /parede|pintura|tinta/, reformar: (i) => I('Preparar bem antes de pintar', 'Lixe, corrija trincas com massa e aplique fundo preparador. Duas demãos de tinta acrílica fosca ou acetinada escondem imperfeições.', 'Pintura', 'Alta'), trocar: (i) => I('Testar a cor na parede', 'Compre amostras e pinte quadrados de 50 × 50 cm em paredes diferentes. Observe de manhã e à noite antes de decidir.', 'Pintura', 'Alta') },
  { re: /sofa|poltrona|estofado/, reformar: (i) => I(`Reestofar o ${i.nome.toLowerCase()}`, 'Troca de tecido e espuma (D33 no assento) dá vida nova à estrutura boa. Tecidos com impermeabilização ou "limpa fácil" são ótimos para o dia a dia.', 'Móveis'), trocar: (i) => I(`Medir antes de comprar o ${i.nome.toLowerCase()}`, `Deixe ao menos 60 cm de circulação na frente${i.medidas ? ` e confira as medidas anotadas (${i.medidas})` : ''}. Verifique também portas, elevador e corredor para a entrega.`, 'Móveis', 'Alta') },
  { re: /armario|guarda.?roupa|gabinete|movel planejado|estante|rack/, reformar: (i) => I(`Renovar o ${i.nome.toLowerCase()} sem trocar`, 'Pintura com esmalte à base d’água ou adesivo vinílico + puxadores e dobradiças novos. Fica com cara de novo por bem menos.', 'Móveis'), trocar: (i) => I(`Planejado ou modulado para o ${i.nome.toLowerCase()}?`, 'Peça 3 orçamentos de planejado e compare com modulados (Tok&Stok, Leroy Merlin, MadeiraMadeira). Modulado pode sair 40–60% mais barato.', 'Móveis') },
  { re: /lumin|lustre|luz|lampada|pendente|spot|plafon|arandela/, reformar: (i) => I('Trocar lâmpadas e ajustar temperatura', 'Às vezes basta trocar as lâmpadas por LED 2700–3000K e limpar os difusores. Um dimmer muda o clima do ambiente.', 'Iluminação'), trocar: (i) => I(`Escolher ${i.nome.toLowerCase()} pela função`, 'Defina primeiro a função (geral, leitura, destaque). Pendentes sobre mesas a 70–80 cm do tampo; spots direcionáveis para quadros e plantas.', 'Iluminação', 'Alta') },
  { re: /cortina|persiana/, reformar: () => I('Lavar e ajustar a cortina', 'Lavagem profissional e um trilho novo rente ao teto já renovam. Ajuste a barra para tocar o chão.', 'Decoração', 'Baixa'), trocar: () => I('Cortina do teto ao chão', 'Trilho rente ao teto, largura 1,5–2× a janela e tecido até o chão. Blackout no quarto, linho ou voil na sala.', 'Decoração') },
  { re: /bancada|pia|tampo/, reformar: () => I('Renovar a bancada', 'Polimento de granito ou mármore, troca do rejunte e um misturador novo já mudam muito a cara da bancada.', 'Estrutura'), trocar: () => I('Material da nova bancada', 'Quartzo é resistente e sem manutenção; granito tem ótimo custo-benefício; porcelanato em placa é moderno e leve.', 'Estrutura', 'Alta') },
  { re: /porta|janela/, reformar: (i) => I(`Restaurar ${i.nome.toLowerCase()}`, 'Lixar, tratar a madeira (ou o metal com antiferrugem) e pintar com esmalte. Ferragens e borrachas novas resolvem vento e barulho.', 'Estrutura'), trocar: (i) => I(`Medir o vão da ${i.nome.toLowerCase()}`, 'Meça o vão em três pontos (largura e altura) e use a menor medida. Portas e janelas sob medida demoram: peça com antecedência.', 'Estrutura') },
  { re: /cama|cabeceira|colchao/, reformar: () => I('Cabeceira nova sobre a cama antiga', 'Uma cabeceira estofada ou painel de madeira fixado na parede renova o quarto sem trocar a cama.', 'Móveis'), trocar: () => I('Medidas da cama nova', 'Casal padrão 1,38 m; Queen 1,58 m; King 1,93 m. Deixe 60 cm livres nas laterais.', 'Móveis') },
  { re: /mesa|cadeira/, reformar: (i) => I(`Restaurar ${i.nome.toLowerCase()}`, 'Lixar e envernizar o tampo ou trocar o assento das cadeiras por um tecido novo é rápido e barato.', 'Móveis'), trocar: () => I('Mesa na medida certa', 'Reserve ≈ 60 cm de largura por pessoa e 75–90 cm atrás das cadeiras para circular.', 'Móveis') },
  { re: /tapete/, reformar: () => I('Lavar o tapete', 'Lavagem profissional devolve cor e tira ácaros — às vezes é tudo que ele precisa.', 'Decoração', 'Baixa'), trocar: () => I('Tapete do tamanho certo', 'Ele deve passar sob os pés da frente do sofá e poltronas. Medidas comuns: 2,00 × 2,50 m ou 2,00 × 3,00 m.', 'Decoração') },
]

function sugestaoParaItem(item) {
  const regra = REGRAS_ITENS.find((r) => r.re.test(semAcento(item.nome)))
  if (regra) return item.acao === 'Reformar' ? regra.reformar(item) : regra.trocar(item)
  if (item.acao === 'Reformar') {
    return I(`Dar vida nova ao ${item.nome.toLowerCase()}`, 'Lixar, pintar ou envernizar e trocar ferragens costuma resolver. Peça orçamento a um marceneiro ou restaurador antes de descartar.', 'Móveis')
  }
  return I(`Comparar opções de ${item.nome.toLowerCase()}`, `Antes de comprar, confira as medidas${item.medidas ? ` (${item.medidas})` : ''} e compare pelo menos 3 opções (ex.: Tok&Stok, Leroy Merlin, Mercado Livre). Salve os links aqui nas ideias.`, 'Decoração')
}

const embaralhar = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sugestoesLocais(comodo, evitar = []) {
  const usados = new Set(evitar)
  const resultado = []
  const add = (s) => {
    const k = semAcento(s.titulo)
    if (!usados.has(k) && resultado.length < 5) {
      usados.add(k)
      resultado.push(s)
    }
  }

  // 1) até 3 sugestões baseadas nos itens a reformar/trocar
  const alvo = embaralhar(comodo.itens.filter((i) => i.acao === 'Reformar' || i.acao === 'Trocar'))
  alvo.slice(0, 3).forEach((i) => add(sugestaoParaItem(i)))

  // 2) completa com boas práticas do tipo de cômodo (e genéricas, se faltar)
  embaralhar(BASE[tipoDoComodo(comodo.nome)]).forEach(add)
  embaralhar(BASE.generico).forEach(add)

  return resultado.map((r) => ({ ...r, termo_busca_visual: termoPadrao(comodo.nome, r.titulo) }))
}
