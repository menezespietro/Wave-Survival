# Wave Survival - Versão 18

Projeto escolar em HTML, CSS, JavaScript, PHP e SQLite para rodar no XAMPP.

## Novidades da versão 6
- Tudo da versão 4 continua funcionando.
- Tela de escolha entre modo 1 jogador e 2 jogadores.
- No modo 2 jogadores, o jogador 1 entra normalmente e o jogador 2 faz login na própria conta.
- Os dois jogadores usam contas diferentes.
- P1: WASD + mouse + botão esquerdo para atirar automaticamente.
- P2: SETAS + ESPAÇO para atirar automaticamente no inimigo mais próximo.
- Os dois jogadores ficam na mesma arena e podem jogar cooperativamente.
- A partida só termina quando os dois jogadores perdem toda a vida.
- A dificuldade do modo 2 jogadores é dobrada: mais inimigos, maior vida/dano/velocidade dos inimigos e spawn mais rápido.
- Novo ranking exclusivo para duplas, ordenado pela maior wave alcançada.
- O recorde da dupla é salvo no SQLite para cada combinação de duas contas.
- O ranking solo continua separado e inalterado.
- Tutorial do modo 2 jogadores explica os controles dos dois jogadores.

## Como instalar no XAMPP
1. Extraia a pasta inteira em C:\xampp\htdocs\wave-survival.
2. Abra o XAMPP e ligue o Apache.
3. Acesse http://localhost/wave-survival/
4. Crie uma conta e faça login.
5. No menu inicial, escolha 1 jogador, 2 jogadores ou um dos rankings.
6. No modo 2 jogadores, o segundo jogador informa o nome e senha da própria conta.
7. O SQLite é criado/atualizado automaticamente em data/game.sqlite.

Não é necessário criar tabelas manualmente nem usar MySQL/phpMyAdmin.

## Rankings
Os rankings só podem ser acessados pelo menu inicial; durante o login e a partida não há atalhos para ranking.
- ranking.php = ranking individual (solo).
- coop_ranking.php = ranking separado de duplas.


Alterações da v8:
- Barra de vida maior.
- Pontos removidos da interface e substituídos por EXP + nível.
- EXP compartilhada no modo cooperativo.
- Cada wave concluída concede EXP suficiente para exatamente 1 level up.
- A cada level up, o jogo pausa e oferece 3 buffs diferentes para escolher. No coop, cada jogador escolhe seu próprio buff.
- Waves possuem mais inimigos e intervalos de spawn maiores para durar mais.
- Jogadores mantêm tiro totalmente automático contra o inimigo mais próximo.


V16: no modo coop, o jogador 2 agora pode criar uma conta diretamente na tela de entrada, sem substituir a sessão do jogador 1.


## Versão 18
- Zumbi Sniper: nasce 1 na wave 1 e dobra a quantidade a cada wave.
- Zumbi Homem Bomba: nasce 4 na wave 1 e dobra a cada wave; possui 40% menos vida, corre 60% mais rápido e explode perto do jogador causando 15 de dano.
- Zumbi Mago das Trevas: começa na wave 4, nasce 1 vez por wave, fica parado a 4x o alcance visual e teleporta grupos muito aglomerados para perto do jogador. Enquanto existe um Mago das Trevas em campo, os demais zumbis têm 20% de chance de desviar de tiros.
- Zumbis comuns continuam crescendo em quantidade 50% por wave.

V23: caveira antes de cada spawn, normais dentro do campo de visão, teleporte do mago com indicadores e limite de 15, efeito de esquiva, HUD ~50% transparente, sniper 20% mais perto para atirar, mago a partir da wave 6 e boss da wave 5 com dash, invocações e ataque de espinhos.


V30: a geração de inimigos fica 25% mais rápida a cada nova wave, mantendo o crescimento de 50% na quantidade de inimigos.


V35 - Convidados agora podem visualizar o ranking solo e o ranking de 2 jogadores. Convidados continuam sem poder registrar pontuações.

V38: sprites de jogadores/zumbis atualizados, personagens voltados para frente sem rotação, mais frames de caminhada/ataque e animação de morte dos zumbis comuns.

V44 - CORREÇÃO DOS SPRITES ESQUERDOS
- Sprites para a esquerda recriados espelhando cada frame individualmente, mantendo a ordem dos frames.
- Jogadores e zumbis usam explicitamente a folha normal ou a folha esquerda conforme a direção horizontal do movimento.
- Atirar não altera a direção do personagem.

V44 - CORREÇÃO DO FLICKER À ESQUERDA
- Cada frame das folhas *_left_sheet.png foi espelhado dentro da própria célula 100x100.
- A posição de cada frame foi mantida idêntica à folha original.
- Corrige especialmente os frames de caminhada e tiro que ficavam desalinhados e pareciam desaparecer.
