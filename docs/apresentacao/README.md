# Material comercial

Duas peças para apresentar o AlePejo ERP Cloud a uma empresa: o PDF que
se manda por e-mail e a demonstração guiada que fica no site.

## 1. PDF — `AlePejo-ERP-Cloud-Apresentacao.pdf`

13 slides em 16:9, prontos para encaminhar ou projetar: problema,
diferenciais, fluxo do pedido ao caixa, módulos, RH/ponto/folha,
administração, planos, módulos do customizado, como começar, perguntas
frequentes e contato.

Para regerar depois de mexer no conteúdo:

```bash
node docs/apresentacao/gerar-pdf.js
```

O conteúdo fica em `apresentacao.html` (uma `<section class="slide">`
por página). O script troca a logo por base64 e imprime pelo Chrome que
já está instalado na máquina — não precisa instalar nada.

**Sem valores de propósito:** o PDF mostra os planos e o que cada um
inclui, mas nenhum preço — quem manda no preço é o site. Assim uma
tabela de preços antiga não fica circulando por e-mail depois de um
reajuste. Os slides apontam para `alepejo.com.br/planos`, e o endereço
é um link clicável de verdade dentro do PDF (rodapé de todas as
páginas, capa e fechamento).

## 2. Demonstração guiada — na página institucional

Fica em `/institucional#demonstracao` (componente `DemoTour` em
`frontend/src/app/institucional/page.tsx`).

Faz o papel do vídeo: passa sozinho pelos 10 módulos, mostra a tela de
cada um e **narra em voz alta** o que ele faz, usando a voz em
português do próprio navegador. Tem play/pausa, avançar, voltar, botão
de som e legenda escrita para quem assiste no mudo.

A voz é escolhida por `pickVoice()`: entre as vozes em português que o
navegador oferecer, prefere as femininas e as neurais (as do Edge
marcadas como "Natural"/"Online", e a do Google), que soam bem melhor
que a voz antiga do Windows. Como o conjunto de vozes muda de navegador
para navegador, a escolha é por pontuação e não por um nome fixo.

Foi feito assim, e não como um arquivo `.mp4`, por dois motivos: não
depende de hospedar vídeo, e a narração acompanha o sistema — mudou o
texto de um módulo no código, a narração muda junto, sem ficar um vídeo
velho mostrando o sistema errado.

O roteiro é o campo `narration` de cada item de `demoTabs`, no mesmo
arquivo. **É esse texto que a voz lê** — para mudar o que é falado,
muda ali.

### Se um dia quiser um vídeo gravado de verdade

O texto do `narration` já serve de roteiro pronto: dá para gravar a
locução por cima de uma captura de tela do tour rodando, na ordem em
que ele passa. A ordem segue o fluxo da empresa — cadastra, compra,
estoca, vende, recebe — que é o argumento de venda do sistema.
