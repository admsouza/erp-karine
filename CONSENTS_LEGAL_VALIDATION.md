# CONSENTS_LEGAL_VALIDATION.md — Validação normativa da revisão jurídica

> Data da validação: 2026-09-14.
> Escopo: conferir as afirmações de `CONSENTS_LEGAL_REVIEW.md` contra legislação e atos normativos vigentes, separando obrigação legal, entendimento jurisprudencial e controle preventivo de produto.
> Este documento não substitui parecer jurídico individualizado da clínica nem consulta ao conselho profissional e à vigilância sanitária local.

## 1. Resultado executivo

A maior parte das salvaguardas jurídicas propostas está alinhada ao direito vigente. Porém, algumas afirmações anteriores eram **recomendações de compliance** e não comandos literais da legislação. A implementação deve respeitar a classificação abaixo para não apresentar ao usuário do ERP uma regra interna como se fosse exigência legal absoluta.

### Classificação usada

- **LEGAL** — decorre diretamente de lei vigente.
- **REGULATÓRIO** — decorre de ato/norma técnica ou orientação oficial sanitária/profissional vigente.
- **JURISPRUDENCIAL** — decorre de entendimento judicial; não é artigo de lei.
- **COMPLIANCE** — controle prudencial do ERP; recomendado, mas não imposto literalmente por uma norma geral.

---

## 2. CDC — informação, responsabilidade, publicidade e cláusulas abusivas

### 2.1 Informação clara sobre serviço e riscos — **LEGAL**

**Base:** Lei 8.078/1990 (CDC), art. 6º, III: direito à informação adequada e clara, inclusive sobre riscos. Art. 31: oferta/apresentação deve trazer informações corretas, claras, precisas e ostensivas, inclusive riscos à saúde e segurança.

**Validação:** correta a exigência de que o TCLE seja legível, compreensível e apresentado antes do aceite, com riscos relevantes visíveis.

### 2.2 Falha de informação pode gerar responsabilidade — **LEGAL**

**Base:** CDC, art. 14, caput: o fornecedor de serviços responde por defeitos da prestação e também por informações insuficientes ou inadequadas sobre fruição e riscos. Art. 14, §4º: a responsabilidade pessoal do profissional liberal é apurada mediante culpa.

**Validação:** correta a afirmação de que consentimento não serve apenas como “papel assinado”; o dever de informação integra a própria prestação do serviço.

### 2.3 TCLE não pode excluir previamente a responsabilidade — **LEGAL**

**Base:** CDC, art. 51, I: são nulas cláusulas que impossibilitem, exoneren ou atenuem a responsabilidade do fornecedor por vícios ou impliquem renúncia/disposição de direitos. Art. 51, III e IV também alcança transferência indevida de responsabilidade e obrigações abusivas/desvantagem exagerada.

**Validação:** correta a proibição, nos templates, de frases como “a clínica não se responsabiliza por qualquer intercorrência”, “renuncio a indenização” ou transferência genérica de toda responsabilidade ao fabricante/paciente.

### 2.4 Publicidade/oferta vincula o fornecedor — **LEGAL**

**Base:** CDC, art. 30: informação/publicidade suficientemente precisa obriga o fornecedor e integra o contrato. Art. 31 reforça dever de clareza e riscos.

**Validação:** correta a regra de que um TCLE posterior não deve contradizer uma promessa comercial concreta feita anteriormente.

### 2.5 “Sem garantia de resultado” — **NÃO É PROIBIDO POR SI SÓ; exige contexto**

Não existe artigo geral do CDC proibindo a frase isoladamente. O risco jurídico surge quando a redação tenta afastar responsabilidade (art. 51), contradiz oferta/publicidade vinculante (art. 30) ou é usada para neutralizar dever de informação/segurança (arts. 6º, III; 14; 31).

**Correção de linguagem:** o ERP não deve tratar a frase como “ilegal automaticamente”. Deve impedir que ela seja usada como cláusula exoneratória ou contraditória com a oferta. É legítimo informar variabilidade biológica, limitações e ausência de certeza absoluta quando isso for clinicamente verdadeiro.

---

## 3. Consentimento informado individualizado

### 3.1 `blanket consent` insuficiente — **JURISPRUDENCIAL, apoiado pelo CDC**

A exigência de individualização não aparece no CDC com a expressão `blanket consent`. Ela decorre do dever legal de informação (arts. 6º, III, 14 e 31) e foi expressamente desenvolvida pelo STJ no REsp 1.848.862/RN, que rejeitou consentimento genérico e exigiu informação clara e precisa sobre riscos, benefícios e alternativas, relacionada ao caso.

**Validação:** correta como regra de produto, mas deve ser descrita como combinação de base legal + jurisprudência, não como texto literal do CDC.

### 3.2 “O ônus de provar que informou é sempre da clínica” — **EXIGE NUANCE**

Não há regra geral no CDC dizendo que, em qualquer caso, o fornecedor sempre terá esse ônus. O CDC permite inversão do ônus da prova em hipóteses do art. 6º, VIII, e a jurisprudência de consentimento informado reconhece a especial aptidão do profissional/serviço para produzir essa prova em diversos casos.

**Regra segura:** o ERP deve preservar evidências robustas porque isso melhora a capacidade probatória; não deve exibir ao usuário a afirmação absoluta de que a lei sempre inverte automaticamente o ônus.

---

## 4. Obrigação de resultado em estética

### 4.1 Cirurgia plástica estética não reparadora — **JURISPRUDENCIAL CONSOLIDADO**

O STJ, no REsp 2.173.636/MT, reafirmou que cirurgia plástica estética não reparadora é tratada como obrigação de resultado, mantendo a responsabilidade subjetiva do profissional liberal nos termos do CDC art. 14, §4º, com consequências probatórias próprias.

### 4.2 Todo procedimento estético é obrigação de resultado — **NÃO VALIDADO**

Não há lei geral nem resolução sanitária que transforme automaticamente todo procedimento estético, de qualquer categoria e natureza, em obrigação de resultado.

**Correção:** o ERP não deve hardcodar “estética = obrigação de resultado”. Deve preservar oferta, objetivo e expectativa concreta e evitar cláusulas exoneratórias.

---

## 5. LGPD — dados de saúde, consentimento e transparência

### 5.1 Dados de saúde são sensíveis — **LEGAL**

**Base:** Lei 13.709/2018 (LGPD), art. 5º, II.

### 5.2 Consentimento não é a única base legal para dados de saúde — **LEGAL**

**Base:** LGPD, art. 11, II. A lei admite tratamento de dados sensíveis sem consentimento em hipóteses específicas, incluindo cumprimento de obrigação legal/regulatória, exercício regular de direitos, proteção da vida e tutela da saúde nas condições do art. 11, II, `f`.

**Validação:** correta a decisão de não criar o padrão “aceite a LGPD para poder ser atendido”. A base legal deve ser definida por finalidade.

### 5.3 Quando consentimento for usado para dado sensível, deve ser específico e destacado — **LEGAL**

**Base:** LGPD, art. 11, I: consentimento específico e destacado para finalidades específicas. Art. 8º, §4º: consentimento deve referir-se a finalidades determinadas; autorizações genéricas são nulas. Art. 8º, §2º: cabe ao controlador provar a obtenção válida do consentimento.

**Validação:** correta a separação entre `PRIVACY_NOTICE` e `DATA_CONSENT`, quando este último efetivamente for a base legal escolhida.

### 5.4 Revogação do consentimento — **LEGAL**

**Base:** LGPD, art. 8º, §5º: revogação a qualquer momento, por procedimento gratuito e facilitado. Arts. 15 e 16 disciplinam término e hipóteses de conservação.

**Correção importante:** revogar consentimento não significa apagar automaticamente todo prontuário ou TCLE. A conservação pode continuar quando houver outra base legal, obrigação regulatória ou exercício regular de direitos, nos limites dos arts. 15 e 16.

### 5.5 Minimização/segurança — **LEGAL + COMPLIANCE**

A LGPD estabelece princípios e deveres de segurança; o desenho concreto de “token somente em hash”, “não logar CPF”, “não logar PDF” é uma **medida técnica recomendada**, não redação literal da LGPD. A ANPD publica guias de segurança para agentes de pequeno porte.

**Validação:** manter as medidas, mas classificá-las como controles técnicos de segurança/privacy by design.

---

## 6. Direito de imagem

### 6.1 Uso comercial de imagem exige forte cautela/autorização — **LEGAL + JURISPRUDENCIAL**

**Base legal:** Código Civil, art. 20, protege divulgação/exposição/utilização da imagem, especialmente em finalidade comercial; art. 18 veda uso do nome alheio em propaganda sem autorização. Constituição Federal, art. 5º, V e X, protege honra, imagem, intimidade e indenização.

**Jurisprudência:** Súmula 403/STJ: publicação não autorizada de imagem com fins econômicos/comerciais gera indenização independentemente da prova do prejuízo.

### 6.2 Autorização de imagem deve ser separada do TCLE — **COMPLIANCE fortemente apoiado pela LGPD/CC**

Não há artigo que diga literalmente “o termo de imagem deve ser um documento separado”. A separação é a forma mais segura de cumprir finalidade determinada e evitar autorização genérica, especialmente quando a imagem é usada para marketing.

**Validação:** manter como regra do produto, mas classificá-la como desenho de compliance, não como formalidade legal única possível.

### 6.3 Recusa de marketing não impedir atendimento — **LEGAL/COMPLIANCE conforme base**

Condicionar serviço clínico à autorização de marketing pode comprometer a liberdade do consentimento e a boa-fé, especialmente quando a imagem não é necessária à execução do serviço. A LGPD exige ausência de vício no consentimento (art. 8º, §3º) e finalidade determinada.

**Regra segura:** marketing é opcional e desacoplado do atendimento.

### 6.4 Revogação e material já publicado — **EXIGE FLUXO, NÃO FRASE ABSOLUTA**

A LGPD art. 8º, §5º preserva tratamentos anteriores à revogação até o pedido pertinente, mas o controlador precisa avaliar cessação de novos usos e eventual eliminação/conservação conforme arts. 15 e 16. Direito de imagem também pode exigir cessação de uso futuro conforme o caso.

**Correção:** o ERP deve registrar revogação, bloquear novas publicações e abrir tarefa operacional para avaliar remoção/cessação do material já publicado; não deve afirmar automaticamente que “não precisa remover” nem prometer que “todo conteúdo desaparecerá”.

---

## 7. Assinatura eletrônica

### 7.1 Outros meios além de ICP-Brasil podem comprovar autoria/integridade — **LEGAL**

**Base:** MP 2.200-2/2001, art. 10, §2º: a MP não impede outros meios de comprovação de autoria e integridade, inclusive certificados não ICP-Brasil, desde que admitidos pelas partes ou aceitos por quem o documento for oposto.

### 7.2 Classificação simples/avançada/qualificada — **LEGAL**

**Base:** Lei 14.063/2020, art. 4º. A assinatura avançada exige associação unívoca ao signatário, dados sob controle com elevado nível de confiança e possibilidade de detectar alterações posteriores; qualificada usa certificado ICP-Brasil.

### 7.3 Link + CPF + nascimento + hash = “assinatura avançada” — **NÃO VALIDADO AUTOMATICAMENTE**

Esse fluxo pode formar boa evidência eletrônica, mas não basta afirmar, sem análise técnica, que cumpre todos os requisitos da assinatura **avançada** do art. 4º, II, da Lei 14.063/2020.

**Correção:** no MVP chamar de `ACEITE_ELETRONICO` ou `SECURE_LINK_CHALLENGE`, preservando evidências. Não rotular como “assinatura avançada”, “assinatura digital” ou “ICP-Brasil” sem provider/avaliação compatível.

---

## 8. Esteticista e Técnico em Estética

### 8.1 Competências e limites — **LEGAL**

**Base:** Lei 13.643/2018.

- Art. 1º: regula Esteticista/Cosmetólogo e Técnico em Estética e exclui atividades de estética médica definidas pela Lei 12.842/2013.
- Art. 5º, I: Técnico em Estética executa procedimentos faciais, corporais e capilares usando produtos cosméticos, técnicas e equipamentos com registro na Anvisa.
- Art. 6º: Esteticista/Cosmetólogo acumula atividades do art. 5º e outras competências previstas.
- Art. 7º, II e III: dever de transparência, informação sobre técnicas/produtos/orçamento e segurança, evitando riscos/danos.
- Art. 8º: dever de cumprir normas de biossegurança e legislação sanitária.

**Validação:** correta a afirmação de que consentimento do cliente não amplia competência profissional.

### 8.2 Esteticista pode usar medicamentos — **NÃO, conforme orientação oficial da Anvisa e leitura da Lei 13.643**

A página oficial da Anvisa sobre serviços de embelezamento interpreta o art. 5º, I, da Lei 13.643/2018 no sentido de que Esteticistas/Técnicos em Estética utilizam cosméticos, não medicamentos.

---

## 9. Vigilância sanitária, estabelecimento e produtos

### 9.1 Local autorizado/licenciado — **REGULATÓRIO/LOCAL**

A Anvisa orienta que estabelecimentos de estética estejam regularizados perante a vigilância sanitária local. A competência de licenciamento/fiscalização é local, e estados/municípios podem estabelecer exigências adicionais.

**Validação:** o ERP deve registrar licença/alvará quando aplicável, mas não deve presumir um único modelo nacional de licença.

### 9.2 Produto regularizado — **REGULATÓRIO**

A Anvisa orienta uso apenas de produtos regularizados. Produtos destinados a procedimentos injetáveis não podem ser regularizados como cosméticos; devem estar enquadrados conforme a categoria sanitária cabível (medicamento/produto para saúde).

### 9.3 Profissional legalmente habilitado — **REGULATÓRIO + PROFISSIONAL**

A Nota Técnica Anvisa 2/2024, vigente, afirma que a Anvisa não define qual categoria pode realizar cada procedimento; isso depende das leis e normas dos conselhos profissionais. A Nota também enfatiza que profissionais de saúde envolvidos estejam legalmente habilitados e com capacitação comprovada.

**Validação:** correta a arquitetura de não hardcodar uma matriz universal e eterna “profissão X pode procedimento Y”.

---

## 10. Farmacêutico esteta — situação que exige governança dinâmica

### 10.1 Resoluções CFF 616/2015 e 645/2017 — **ato profissional com controvérsia judicial**

O próprio CFF informa, em publicações oficiais recentes, que as Resoluções 616/2015 e 645/2017 continuam sendo a base normativa invocada para atuação de farmacêuticos habilitados em saúde estética. Em dezembro de 2025, o CFF noticiou sentença de primeiro grau que as questionou e afirmou que a decisão não tinha eficácia imediata e seria objeto de recurso.

### 10.2 Resolução CFF 669/2018 — **vigência afirmada pelo CFF + decisão judicial específica favorável**

A Resolução 669/2018 define requisitos técnicos para o exercício do farmacêutico na saúde estética. Em outubro de 2025, o CFF informou que o TRF1 manteve sua validade no processo então julgado.

**Validação:** correto evitar que o software fixe definitivamente permissões profissionais. O ERP deve registrar profissão, conselho, habilitação e referência normativa/documental vigente da clínica e permitir atualização sem migração destrutiva.

---

## 11. Biomédicos e procedimentos invasivos

A afirmação sobre a anulação da Resolução CFBM 241/2014 decorre de **jurisprudência do TRF1 em 2026**, não de uma nova lei geral. O TRF1 noticiou manutenção da sentença que anulou a resolução por entender que ela extrapolava a Lei 6.684/1979.

**Correção de produto:** usar esse caso como exemplo de por que competências profissionais não devem ser congeladas no código. Não transformar a decisão em regra universal sobre todas as atividades biomédicas sem análise do trânsito, do alcance e das demais normas aplicáveis.

---

## 12. Menores de idade e responsável legal

### 12.1 LGPD — **LEGAL**

LGPD, art. 14: tratamento de dados de crianças e adolescentes deve observar seu melhor interesse; para crianças, o §1º exige consentimento específico e destacado de pelo menos um dos pais ou responsável legal quando essa for a base aplicável, e o §5º exige esforços razoáveis para verificar o responsável.

### 12.2 TCLE clínico de todo menor de 18 anos — **NÃO HÁ UMA REGRA ÚNICA NA LGPD**

A LGPD não é a norma que resolve, sozinha, capacidade civil e consentimento clínico. A capacidade depende também do Código Civil e de normas profissionais/setoriais.

**Correção:** exigir responsável para menores no MVP é política conservadora de compliance. Deve existir espaço futuro para assentimento do adolescente e regras específicas da categoria/procedimento, sem afirmar que a LGPD exige responsável para todo adolescente em qualquer ato clínico.

### 12.3 Marketing com imagem de menor desabilitado — **COMPLIANCE**

É escolha prudencial do MVP, não proibição federal absoluta de toda publicidade autorizada com imagem de menor. Manter desabilitado até política específica é aceitável e reduz risco.

---

## 13. Bloqueio do atendimento sem TCLE

Não existe artigo geral do CDC, LGPD ou Lei 13.643/2018 dizendo que um ERP deve tecnicamente impedir `Appointment -> REALIZADO` quando falta aceite eletrônico.

**Classificação: COMPLIANCE.**

Se a própria clínica definiu que um procedimento exige consentimento informado antes da execução, bloquear o estado no sistema é um controle interno coerente com dever de informação e governança. Porém, deve existir exceção documentada para situações legítimas (ex.: termo físico válido, migração de prontuário, contingência), com motivo e auditoria.

O sistema não deve apresentar esse bloqueio como “exigência expressa da LGPD/CDC”.

---

## 14. Retenção e imutabilidade documental

### 14.1 Imutabilidade histórica — **COMPLIANCE/prova**

Preservar a versão assinada e seu hash é medida probatória adequada. A legislação citada não impõe especificamente “SHA-256” nem armazenamento eterno.

### 14.2 Retenção indefinida — **NÃO VALIDADA**

LGPD arts. 15 e 16 exigem que a conservação tenha finalidade/base compatível. Prazos de prontuário e documentos também podem variar por profissão e norma setorial.

**Correção:** documento aceito deve ser imutável **enquanto legitimamente conservado**, mas o ERP precisa de política de retenção configurável por tipo documental/base legal e procedimento de descarte seguro quando cabível.

---

## 15. Matriz final para implementação

| Regra | Classificação | Pode bloquear tecnicamente? |
| --- | --- | --- |
| Exibir riscos/informações claras antes do aceite | LEGAL | Sim |
| Proibir cláusula que exonera responsabilidade | LEGAL | Sim, no publicador de template |
| Preservar publicidade/oferta relevante | LEGAL + COMPLIANCE | Sim/alerta |
| Consentimento individualizado | LEGAL + JURISPRUDENCIAL | Sim |
| Separar aviso de privacidade de consentimento LGPD | COMPLIANCE apoiado pela LGPD | Sim |
| Consentimento sensível específico/destacado | LEGAL | Sim |
| Revogação gratuita/facilitada quando consentimento é base | LEGAL | Sim |
| Uso de imagem por escopo/finalidade | LEGAL + COMPLIANCE | Sim |
| Não condicionar atendimento a marketing | LEGAL/COMPLIANCE | Sim |
| Guardar token apenas em hash | COMPLIANCE de segurança | Sim |
| Chamar fluxo MVP de assinatura avançada | NÃO; evitar | Sim, bloquear rótulo |
| Verificar profissional/habilitação | REGULATÓRIO/profissional | Sim conforme cadastro/regra vigente |
| Verificar produto regularizado | REGULATÓRIO | Sim/alerta conforme criticidade |
| Bloquear atendimento por TCLE configurado como obrigatório | COMPLIANCE | Sim |
| Retenção eterna do TCLE | NÃO | Não; política configurável |
| Marketing de menor proibido no MVP | COMPLIANCE | Sim |

---

## 16. Fontes normativas e oficiais validadas

1. **Lei 8.078/1990 (CDC):** arts. 6º, III; 14; 30; 31; 51.
2. **Lei 13.709/2018 (LGPD):** arts. 5º, II; 8º; 11; 14; 15; 16.
3. **MP 2.200-2/2001:** art. 10, especialmente §2º.
4. **Lei 14.063/2020:** art. 4º (assinaturas simples, avançadas e qualificadas).
5. **Código Civil — Lei 10.406/2002:** arts. 18, 20 e 21 (nome, imagem, vida privada), além das regras gerais de capacidade a serem consideradas para menores.
6. **Lei 13.643/2018:** arts. 1º, 5º, 6º, 7º e 8º.
7. **Anvisa — Nota Técnica 2/2024/GGTES/DIRE3:** atualmente vigente segundo a própria Agência em 2026.
8. **Anvisa — páginas oficiais “Procedimento seguro”, “Estabelecimento seguro” e orientações sobre cosméticos/produtos estéticos.**
9. **Resoluções CFF 616/2015, 645/2017 e 669/2018**, observando a situação judicial específica de cada uma e as comunicações oficiais do CFF.
10. **ANPD — Resolução CD/ANPD 2/2022 (com alterações) e guias de segurança para agentes de pequeno porte**, como referência de boas práticas; guias são orientativos, não equivalem a artigo de lei.

## 17. Jurisprudência usada apenas como complemento interpretativo

- STJ, **REsp 1.848.862/RN** — consentimento genérico (`blanket consent`) e dever de informação individualizada.
- STJ, **REsp 2.173.636/MT** — cirurgia plástica estética não reparadora e obrigação de resultado.
- STJ, **Súmula 403** — uso econômico/comercial não autorizado de imagem.
- TRF1, processo **0067987-48.2015.4.01.3400** — decisão de 2026 sobre Resolução CFBM 241/2014.

## 18. Conclusão

Com as correções acima, a Fase 7.1 fica juridicamente mais precisa: o ERP diferencia o que é obrigação legal do que é governança preventiva, evita prometer que um clique resolve sozinho a validade do consentimento e não assume competência profissional fixa em um ambiente regulatório sujeito a lei, conselho, vigilância local e decisões judiciais.

Antes de produção, os **textos clínicos específicos de cada procedimento** ainda precisam de revisão pelo profissional habilitado e, para reduzir risco, revisão jurídica aplicada à categoria profissional e à localidade da clínica.
