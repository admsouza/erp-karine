# CONSENTS_LEGAL_REVIEW.md — Revisão jurídica e regulatória

> Revisão da especificação `CONSENTS_SPEC.md` da Fase 7.1 do ERP Clínica.
> Data: 2026-09-14.
> Objetivo: reduzir risco de desconformidade com CDC, LGPD, regras de assinatura eletrônica, direito de imagem e regulação sanitária/profissional aplicável a clínicas de estética.
>
> Esta revisão orienta o produto e não substitui parecer jurídico individualizado sobre a clínica, a categoria profissional e cada procedimento concreto.

## 1. Conclusão executiva

A arquitetura original estava **bem orientada**, especialmente ao separar TCLE, aviso de privacidade, consentimento LGPD e uso de imagem, preservar versões imutáveis e gerar trilha de evidências. Porém, antes da implementação, foram identificados pontos que precisavam ser fortalecidos para evitar que o software transformasse o consentimento em mecanismo de exoneração de responsabilidade ou aceitasse um consentimento genérico.

A especificação deve incorporar estas regras obrigatórias:

1. TCLE não é termo de isenção de responsabilidade.
2. É vedada cláusula de renúncia genérica a direitos, indenização ou reembolso.
3. Não usar “resultado não garantido” como escudo jurídico padrão em procedimentos estéticos.
4. A oferta/publicidade suficientemente precisa não pode ser desfeita pelo TCLE posterior.
5. Consentimento de procedimento precisa ser individualizado ao caso do paciente; `blanket consent` não basta.
6. Uso de imagem para marketing é independente, facultativo, por finalidade/canal e revogável.
7. `PRIVACY_NOTICE` é transparência, não autorização geral de tratamento de dados.
8. Consentimento não deve ser escolhido automaticamente como base legal de todo dado de saúde.
9. Procedimento marcado pela clínica como exigente de TCLE deve ser bloqueado no ERP sem aceite válido, salvo exceção administrativa documentada.
10. Consentimento não torna lícito ato fora da habilitação profissional ou realizado em serviço/produto irregular.
11. O produto deve registrar profissão, conselho/habilitação, regularidade sanitária e rastreabilidade aplicável, sem hardcodar uma matriz universal de competências profissionais.
12. Marketing com imagem de menor fica desabilitado no MVP, por prudência jurídica.

**Regra de precedência:** em caso de conflito entre este documento e `CONSENTS_SPEC.md`, prevalecem as salvaguardas jurídicas mais protetivas deste documento até que a especificação principal seja consolidada.

## 2. Código de Defesa do Consumidor

### 2.1 Dever de informação

O CDC assegura informação adequada, clara e prévia sobre características, riscos e condições do serviço. Para o produto, isso significa que o paciente deve conseguir ler integralmente o termo antes do aceite, em linguagem compreensível e sem riscos escondidos por padrão.

O STJ reforça que o dever de informação em saúde não é satisfeito por informação genérica: riscos, benefícios e alternativas precisam ser relacionados ao caso concreto. O ônus de demonstrar o cumprimento desse dever recai, em regra, sobre o profissional/serviço que detém maior facilidade probatória.

**Implicação no produto:** o template sozinho não basta. `ConsentRequest` precisa preservar informações individualizadas do procedimento e do paciente.

### 2.2 Cláusulas abusivas

O CDC considera nulas cláusulas que exonerem/atenuem previamente a responsabilidade do fornecedor, impliquem renúncia de direitos, transfiram genericamente responsabilidades ou imponham desvantagem exagerada ao consumidor.

**O sistema deve alertar ou bloquear publicação de templates com frases como:**

- “a clínica não se responsabiliza por qualquer intercorrência”;
- “assumo integralmente todos os riscos”;
- “renuncio a qualquer indenização”;
- “o profissional não poderá ser responsabilizado pelo resultado”;
- “qualquer problema é de responsabilidade do fabricante”.

Essas redações podem descrever riscos normais e previsíveis, mas não podem afastar responsabilidade decorrente de falha do serviço.

### 2.3 Oferta e publicidade

Informação/publicidade suficientemente precisa integra a relação de consumo e vincula o fornecedor. Assim, o TCLE não pode prometer menos do que a publicidade prometeu apenas para reduzir responsabilidade.

**Implicação no produto:** quando houver proposta/orçamento/oferta relacionada ao procedimento, o sistema deve permitir referência/snapshot dela no consentimento, preservando a coerência entre promessa comercial, expectativa apresentada e TCLE.

### 2.4 Obrigação de resultado em estética

A jurisprudência do STJ permanece forte no sentido de que cirurgia plástica exclusivamente estética envolve obrigação de resultado, com responsabilidade subjetiva e presunção de culpa quando o resultado prometido não é atingido. Em 2026 o STJ também noticiou caso odontológico estético-funcional no qual a natureza estética foi relevante para a obrigação de resultado.

Não se deve extrapolar automaticamente essa classificação para **todo** procedimento estético não cirúrgico ou para toda categoria profissional. Porém, o produto também não pode tentar resolver a questão com uma cláusula padrão “não há garantia de resultado”.

**Regra segura de produto:** descrever objetivo, resultado esperado, variabilidade biológica, limites, possibilidade de retoque e riscos, sem renúncia de direitos e sem contradizer a oferta concreta.

## 3. Consentimento informado e jurisprudência

O STJ rejeita o chamado `blanket consent`: consentimento genérico, sem individualização das informações. A Corte entende que o paciente deve receber informação clara e precisa sobre riscos, benefícios e alternativas, de forma relacionada ao caso concreto. A ausência/deficiência dessa informação pode gerar responsabilidade civil autônoma por violação da autodeterminação.

**Regras obrigatórias do produto:**

- versão publicada imutável;
- individualização do caso em snapshot;
- declarações obrigatórias separadas;
- oportunidade de perguntas;
- data/hora do servidor;
- evidência de visualização e manifestação;
- PDF final imutável + SHA-256;
- nenhum aceite retroativo inventado.

## 4. LGPD

### 4.1 Dados de saúde

Dados de saúde são dados pessoais sensíveis. A LGPD admite diferentes bases legais para seu tratamento. Quando o tratamento for indispensável à tutela da saúde e executado nas condições previstas em lei, pode haver base legal independente do consentimento.

**O ERP não deve criar o padrão:** “aceite a LGPD para ser atendido”.

`PRIVACY_NOTICE` deve representar ciência/transparência. `DATA_CONSENT` só deve ser usado quando a clínica tiver definido que consentimento é de fato a base legal daquela finalidade específica.

### 4.2 Consentimento LGPD

Quando consentimento for a base legal, deve ser livre, informado, inequívoco e ligado a finalidade determinada; para dado sensível, específico e destacado. Cabe ao controlador demonstrar que foi obtido de forma válida. Autorizações genéricas são inválidas.

**Regras obrigatórias:** finalidade específica, versão, evidências, ausência de checkbox pré-marcado e possibilidade de revogação facilitada.

### 4.3 Revogação

A revogação do consentimento deve ser gratuita e facilitada. Para uso de imagem/marketing, o ERP precisa registrar o pedido e cessar novos usos. A retirada de conteúdo já distribuído/publicado exige fluxo operacional próprio e não pode ser tratada por frase absoluta do tipo “a revogação não afeta material já publicado”.

### 4.4 Minimização e segurança

CPF, dados clínicos, tokens, OTPs, assinatura e PDFs não devem vazar em logs. Antes do challenge, a rota pública deve expor apenas metadados mínimos. Token deve ser aleatório e armazenado somente por hash.

## 5. Assinatura eletrônica

A MP 2.200-2/2001 admite, além da ICP-Brasil, outros meios de comprovação da autoria e integridade de documentos eletrônicos quando aceitos pelas partes. A Lei 14.063/2020 diferencia assinatura simples, avançada e qualificada.

O fluxo `link secreto + identificação + declarações + data/hora + evidências + hash do PDF` é adequado como **mecanismo probatório eletrônico**, mas o sistema não deve rotulá-lo como assinatura qualificada ou ICP-Brasil.

Se algum ato futuro exigir forma/nível específico de assinatura por lei ou regulação, o módulo deve permitir provider externo compatível.

## 6. Direito de imagem

A jurisprudência do STJ protege fortemente a imagem utilizada sem autorização, especialmente para fins econômicos/comerciais; a Súmula 403 estabelece que a indenização por publicação não autorizada com finalidade econômica independe de prova do prejuízo.

**Regras obrigatórias:**

- autorização de marketing separada do TCLE;
- recusa não impede atendimento;
- escopo por canal/finalidade;
- identificável/não identificável;
- nenhum escopo inferido;
- revogação facilitada;
- uso fora do escopo = não autorizado.

Para menores, o MVP desabilita uso de imagem para marketing até existir política jurídica específica.

## 7. Regulação sanitária e habilitação profissional

A Anvisa orienta que procedimentos estéticos sejam realizados em local autorizado, por profissional qualificado e com produtos/equipamentos regularizados, além de exigir informação clara sobre produto, riscos, reações e cuidados. A Nota Técnica 2/2024 permanece referência técnica vigente e a própria Anvisa reconhece que normas locais e regras dos conselhos profissionais também precisam ser observadas.

A Lei 13.643/2018 disciplina o esteticista/cosmetólogo e o técnico em estética e delimita suas competências. Ela não autoriza transformar consentimento do cliente em autorização para prática fora do escopo profissional.

Há também jurisprudência recente relevante sobre limites de resoluções de conselhos: em março de 2026, o TRF1 manteve decisão que anulou resolução do CFBM que autorizava biomédicos a realizar procedimentos estéticos invasivos. Por outro lado, outras categorias possuem normas e decisões específicas, inclusive controvérsias próprias.

### 7.1 Farmacêutico esteta

Para farmacêuticos, o cenário regulatório exige cautela: existem Resoluções CFF 616/2015, 645/2017 e 669/2018 e decisões judiciais com objetos distintos. Em outubro de 2025, o TRF1 manteve a Resolução 669/2018 em processo específico; em dezembro de 2025, o CFF noticiou sentença de primeiro grau contra as Resoluções 616/2015 e 645/2017, afirmando que a decisão não tinha eficácia imediata e seria objeto de recurso.

**Implicação para o ERP:** não codificar “farmacêutico pode X” ou “biomédico pode Y” como verdade eterna. A competência precisa ser configurável/versionada e vinculada à documentação vigente da clínica/profissional.

## 8. Controles mínimos que o produto deve ter antes de produção

- cadastro estruturado do profissional executor e conselho/registro;
- registro da habilitação/especialização pertinente;
- registro de responsável técnico quando aplicável;
- licença/alvará sanitário e validade;
- referência à regularização Anvisa de produtos/equipamentos quando aplicável;
- rastreabilidade de produto efetivamente aplicado;
- TCLE específico e individualizado por procedimento/caso;
- bloqueio de atendimento quando o próprio procedimento estiver configurado como `required=true` e não houver aceite válido/evidência substitutiva documentada;
- trilha de auditoria do override administrativo;
- separação de TCLE, privacidade, consentimento LGPD e uso de imagem;
- política de retenção e atendimento de direitos do titular;
- revisão jurídica/ética dos templates reais antes da publicação.

## 9. Fontes principais da revisão

- Código de Defesa do Consumidor — Lei 8.078/1990, especialmente arts. 6º, 8º, 30, 31, 46, 47 e 51.
- LGPD — Lei 13.709/2018, especialmente arts. 5º, 7º, 8º e 11.
- MP 2.200-2/2001, art. 10, §2º.
- Lei 14.063/2020, classificação das assinaturas eletrônicas.
- Lei 13.643/2018, profissões de Esteticista e Técnico em Estética.
- STJ, REsp 1.540.580/DF — dever de informação específico e rejeição de consentimento genérico.
- STJ, REsp 1.848.862/RN — riscos, benefícios, alternativas e insuficiência do `blanket consent`.
- STJ, REsp 2.173.636/MT — cirurgia plástica estética e obrigação de resultado.
- STJ, Súmula 403 e precedentes sobre uso comercial não autorizado de imagem.
- Anvisa, Nota Técnica 2/2024 e campanha “Procedimento seguro”.
- Anvisa, Informe de Segurança GGMON 01/2026 — orientação de riscos antes da assinatura e rastreabilidade.
- TRF1, processo 0067987-48.2015.4.01.3400 — decisão de 2026 sobre resolução do CFBM e procedimentos invasivos.

## 10. Parecer sobre a Fase 7.1

**Com estas salvaguardas como requisitos obrigatórios, a especificação fica significativamente mais alinhada com os principais riscos jurídicos aplicáveis ao produto.**

Ainda assim, a conformidade final dependerá de três camadas que o software não consegue decidir sozinho:

1. conteúdo clínico de cada TCLE;
2. habilitação legal do profissional para o procedimento concreto;
3. normas sanitárias locais e condições do estabelecimento.

Por isso, o ERP deve funcionar como **mecanismo de prevenção, evidência e governança**, e não como certificador automático de legalidade profissional.
