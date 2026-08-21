# Material comercial

Duas peças para apresentar o AlePejo ERP Cloud a uma empresa: o PDF que
se manda por e-mail e a demonstração guiada que fica no site.

## 1. PDF — `AlePejo-ERP-Cloud-Apresentacao.pdf`

13 slides em 16:9, prontos para encaminhar ou projetar: problema,
diferenciais, fluxo do pedido ao caixa, módulos, RH/ponto/folha,
administração, planos e preços, módulos avulsos, como começar,
perguntas frequentes e contato.

Para regerar depois de mexer no conteúdo:

```bash
node docs/apresentacao/gerar-pdf.js
```

O conteúdo fica em `apresentacao.html` (uma `<section class="slide">`
por página). O script troca a logo por base64 e imprime pelo Chrome que
já está instalado na máquina — não precisa instalar nada.

**Atenção aos preços:** os valores dos slides 8 e 9 foram copiados do
catálogo de planos. Se mudar preço em *OS → Administrar planos*, é
preciso atualizar o HTML e gerar o PDF de novo — ele não lê do banco.

## 2. Demonstração guiada — na página institucional

Fica em `/institucional#demonstracao` (componente `DemoTour` em
`frontend/src/app/institucional/page.tsx`).

Faz o papel do vídeo: passa sozinho pelos 10 módulos, mostra a tela de
cada um e **narra em voz alta** o que ele faz, usando a voz em
português do próprio navegador. Tem play/pausa, avançar, voltar, botão
de som e legenda escrita para quem assiste no mudo.

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
