# À caça

Repositório local do jogo **Senta a Pua!**, versão 3D.

Abra `index.html` no navegador. Os scripts, o Three.js, as texturas e as gravações ficam no projeto; jogar não exige internet nem instalação. Requer navegador com WebGL 2 e aceleração gráfica.

## O que mudou

- Modelo P-47D com fuselagem curva, asas com espessura e pontas arredondadas, cabine em bolha, piloto, hélice de quatro pás e quatro canos em cada asa.
- Pintura oliva, cinza inferior, estrelas brasileiras, distintivo do grupo, código B4 e detalhes de painéis e rebites. Interpretação visual das referências, não réplica certificada.
- Painel de inspeção: arraste o avião ou clique em **Girar avião**.
- Terreno com relevo, rio curvo, campos, vegetação, povoados, sombras e luz quente.
- Interface dedicada à participação brasileira na Itália, com distintivo histórico e caderneta de missão.
- Motor e metralhadoras reproduzem amostras de áudio; impactos e pequenos avisos continuam sintetizados.

## Áudio e fidelidade

O motor usa uma gravação CC0 de voo em cabine de um Cessna 152, de keng-wai-chane-chick-te (Freesound), como substituto provisório de som contínuo. **Não é uma gravação do P-47.** A gravação antiga de rasante não é mais carregada. As rajadas usam um sample de metralhadora .50 de Mike Koenig, CC BY 3.0; a variante exata da arma não é confirmada. Fontes e players em `CREDITOS.html`.

Ative **Som**, aguarde a preparação das gravações e ajuste **Volume**. O motor acompanha a aceleração e silencia na pausa. As amostras estão incorporadas em `js/media.js` para funcionar também ao abrir por duplo clique.

## Controles e missão

WASD/setas para manobrar, espaço para disparar, Shift para acelerar, P/Esc para pausar. Destrua quatro depósitos e sobreviva por 75 segundos. A missão é fictícia e preserva a jogabilidade arcade: altitude fixa e colisões aproximadas em um plano.

## Arquivos principais

- `js/aircraft.js`: modelo, perfis, materiais e marcas da aeronave.
- `js/renderer.js`: Three.js, luzes, paisagem, câmera, objetos e inspeção.
- `js/game.js`, `config.js`, `input.js`: regras, missão e controles.
- `js/audio.js`: decodificação, reprodução, volume e efeitos de apoio.
- `js/media.js`: gravações, terreno e distintivo incorporados para uso offline.
- `vendor/three.min.js`: biblioteca já empacotada, com licença no mesmo diretório.
- `assets/audio/`: WAVs preparados e testáveis separadamente.
- `tools/prepare_audio.py`: preparação dos recortes a partir das fontes locais.
- `CREDITOS.html`: autoria, licenças e limites históricos.

A mudança para Three.js substitui o renderizador geométrico inicial, facilitando superfícies suaves, materiais e sombras. O arquivo antigo `js/scene3d.js` é legado e não é carregado pela página.

## Desenvolvimento

Para um servidor opcional, dentro desta pasta:

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Acesse http://127.0.0.1:4174. Encerre com Ctrl+C.

Para trabalhar nas dependências, use `npm ci`. Para reconstruir a biblioteca local, use `npm run build:vendor`. Nenhum desses passos é necessário para jogar. Testes: `npm test` ou `node --test tests/game.test.cjs tests/audio.test.cjs tests/scene3d.test.cjs`.

A versão 2D permanece em `../p47-aurora/`. Para uma etapa futura de fotorrealismo maior, será necessário um modelo artístico revisado com medidas e texturas dedicadas; o atual ainda é um modelo procedural e o cenário não reproduz um lugar real.


## Histórico da revisão anterior: rio, proporções e motor em voo

O rio usa uma malha subdividida com pequenas ondulações, brilho animado, cor de profundidade, margens inclinadas e pedras. O shader utiliza o renderizador existente, sem bibliotecas extras; a água para durante a pausa.

O avião usa 10 unidades por metro: 11,02 m de comprimento e 12,42 m de envergadura. A área alar projetada, incluindo a seção central, foi ajustada para 27,87 m² e verificada por teste da malha. A altura de solo do print não é aplicada como alongamento vertical ao modelo de voo. Hélice e deriva foram proporcionadas novamente; tubos expostos são aproximações de 10–18 cm e cerca de 4 cm de diâmetro externo, não medidas extraídas do print.

O loop de motor agora vem dos segundos 54–62 da fonte CC0: passagem em voo, sem o acionamento. Há outras aeronaves na formação; não é um P-47 isolado. A emenda cruzada dura 750 ms. O novo YouTube enviado não pôde ser ouvido pela ferramenta e não foi incorporado.

Para reproduzir a extração, use FFmpeg sobre `sources/p47-john-veit-2012.ogv`, com `-ss 54 -t 8 -vn -af "highpass=f=75,lowpass=f=4800,dynaudnorm=f=250:g=15:p=0.7:m=5" -ar 44100 -ac 1 assets/audio/engine.wav`, depois execute `python tools/prepare_audio.py` para reconstruir o loop e os recursos embutidos.

## Atualização da campanha e do voo contínuo

A revisão atual substitui o antigo áudio de Paine Field por uma gravação CC0 de dentro de um Cessna 152, trecho 200–212 s do arquivo `sources/cockpit-cruise.mp3`. É um substituto de voo contínuo, não uma gravação autêntica do P-47. Use FFmpeg com `-ss 200 -t 12 -af "highpass=f=55,lowpass=f=2800,dynaudnorm=f=500:g=15:p=0.65:m=3" -ar 44100 -ac 1` e depois `python tools/prepare_audio.py`. Este procedimento substitui a extração do rasante documentada na revisão anterior.

Ao vencer a missão 1, clique em **Seguir para missão 2**. Pontos são mantidos; vida e combustível voltam a 100%. A missão dos Apeninos dura 90 s e exige cinco de sete depósitos. Após derrota, a tentativa recomeça na missão atual com a pontuação de entrada; após vencer a segunda, o botão reinicia a campanha inteira. Missões ficam em `js/config.js`; a troca de paisagem fica em `js/renderer.js`.

As asas foram revistas com fotografias superiores do Smithsonian e do P-47D Nellie: bordo dianteiro quase reto, curva traseira progressiva, ponta assimétrica, carenagem de raiz e linhas de ailerons. Fontes em `CREDITOS.html`.

A página `tests/campaign-preview.html` abrevia somente a missão 1 para validar a passagem na interface. É uma ferramenta de teste claramente identificada; `index.html` usa a missão completa.

## Fw 190A-8 e continuidade do cenário

O inimigo das duas missões agora usa um modelo próprio em `js/fw190.js`: motor radial BMW 801, hélice de três pás, asas trapezoidais, cabine enquadrada e camuflagem cinza/verde. A escala acompanha o P-47: 8,95 m de comprimento e 10,50 m de envergadura; área alar de referência de 18,30 m². Esta versão representa o A-8; o Dora precisa de outra fuselagem e motorização. A pilotagem inimiga continua arcade.

Na ficha lateral, escolha **Fw 190** e **Ampliar** para inspecionar e arrastar o modelo. Abrir a ampliação durante a missão pausa o jogo. Os modelos compartilham materiais e geometrias para reduzir o custo de criar inimigos.

As bordas dos trechos de terreno repetidos agora compartilham altura, inclinação e normais de iluminação. Isso corrige o degrau e a linha de luz nas emendas sem acrescentar dependências. Testes verificam dimensões, geometria, armamento, hélice, continuidade do relevo e iluminação.

## Messerschmitt na missão 2

`js/axis-aircraft.js` contém os modelos próprios do Bf 109G-10 e Me 262A-1a. A ficha lateral permite inspecionar os quatro aviões. Na missão 1 continua apenas o Fw 190. A missão 2 usa a lista `patrols` em `js/config.js` para misturar Bf 109 e Fw 190; `jets: true` habilita passagens do Me 262. Para habilitar em missões futuras, inclua esse mesmo campo.

A primeira aproximação é anunciada após 10 s; há 1,8 s de faixa laranja antes da entrada. O jato voa reto a 340 unidades/s, contra 145 do Bf 109, dispara para a frente e sai da tela em cerca de 3 s. Novas aproximações ocorrem 14–22 s após cada entrada. Quatro traçantes representam seus canhões, mas cada rajada usa uma colisão lógica (18 pontos de dano) para evitar dano quádruplo instantâneo. Pausa congela avisos e aviões; reinício limpa a aproximação pendente. Dados históricos e limitações em `PESQUISA-MESSERSCHMITT.md`.

## Ponte, construções e contas

A ponte agora tem três arcos abertos, pilares, fundações, guarda-corpos e rampas. Casas e depósitos usam telhados de duas águas, materiais de alvenaria/telhas, janelas, portas e detalhes próprios em `js/architecture.js`. As geometrias são agrupadas por material para reduzir chamadas de desenho. **Inspecionar construções** no rodapé abre os modelos ampliados.

Para usar o novo cadastro e login, execute **`npm start`** nesta pasta e abra **http://localhost:4180**. Abertura direta do HTML é apenas prévia offline, sem autenticação. Cadastro, entrada, saída, troca de senha e recuperação por código funcionam localmente; Google exige configurar suas credenciais conforme `AUTENTICACAO.md`. Não há credenciais padrão nem login Google fictício. As contas ficam em `data/`, que não é servido ao navegador nem incluído no Git.

### Folga sobre as montanhas

Na missão dos Apeninos, aviões, disparos e objetos aéreos compartilham uma altura calculada para superar o relevo em toda a largura visível, com margem para asas inclinadas e árvores. A câmera ortográfica mantém as posições de tela e as colisões arcade alinhadas. A margem é recalculada ao redimensionar a janela e cobre todas as fases da rolagem; a missão 1 mantém a altura anterior.
