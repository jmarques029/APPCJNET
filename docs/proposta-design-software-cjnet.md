# Documento de Especificação e Design de Software — App CJnet

> **Projeto**: Canal Digital de Autoatendimento e Suporte Offline-First  
> **Empresa**: CJnet Provedor de Internet  
> **Localização**: Coqueiral/MG  
> **Metodologia**: DDD, Clean Architecture, TDD (Test-Driven Development), Offline-First (SQLite + Supabase)  
> **Padrão de Documentação**: `software-design-doc` (UML / Mermaid)

---

## 1. Visão Geral e Levantamento de Requisitos

O **App CJnet** é o aplicativo móvel oficial de autoatendimento da CJnet para clientes residenciais e comerciais de Coqueiral/MG e região. O aplicativo resolve a sobrecarga do atendimento telefônico e presencial ao permitir a abertura de chamadas/Ordens de Serviço (OS) com anexação de fotos de equipamentos (roteadores/ONUs), acompanhamento em tempo real do suporte, verificação de cobertura via geolocalização e consulta aos planos de internet. Por ser voltado para uma região com conectividade por vezes instável, o aplicativo adota arquitetura **Offline-First**, permitindo consulta de dados em cache local e filas de sincronização resilientes.

### 1.1 Árvore de Ideias do Projeto (Mapa Mental de Visão Geral)

A **Árvore de Ideias** sintetiza a visão macro do **App CJnet**, organizando os pilares estratégicos da aplicação e desdobrando suas funcionalidades principais e requisitos estruturais, incluindo os módulos de **Autoatendimento**, **Técnicos**, **Administradores** e **Visitantes (na Tela de Login)**:

```mermaid
graph TD
    Root["<b>App CJnet</b><br/>Canal Digital de Autoatendimento, Suporte & Gestão"]

    Root --> P1["📱 <b>Autoatendimento do Cliente</b>"]
    P1 --> P1_1["Autoatendimento de Chamados<br/>(Sem Sinal, Queda, Lentidão)"]
    P1 --> P1_2["Autodiagnóstico Visual<br/>(Anexo de Foto da ONU/Roteador)"]
    P1 --> P1_3["Acompanhamento do Status da OS<br/>em Tempo Real"]
    P1 --> P1_4["Autoatendimento de Cadastro<br/>& Atualização do Endereço"]

    Root --> P2["💳 <b>Vitrine de Planos (Tela de Login)</b>"]
    P2 --> P2_1["Acesso Livre sem Autenticação"]
    P2 --> P2_2["Consulta de Velocidades & Preços"]
    P2 --> P2_3["Benefícios do Plano & Solicitação"]

    Root --> P3["👷 <b>Aba do Técnico de Campo</b>"]
    P3 --> P3_1["Lista de OSs Atribuídas ao Técnico"]
    P3 --> P3_2["Navegação GPS / Endereço do Cliente"]
    P3 --> P3_3["Check-in, Resolução & Foto do Reparo"]

    Root --> P4["👑 <b>Aba do Administrador / Gestor</b>"]
    P4 --> P4_1["Dashboard Geral de Atendimentos & Métricas"]
    P4 --> P4_2["Distribuição / Atribuição de OSs"]
    P4 --> P4_3["Gestão de Planos & Disparo de Avisos"]

    Root --> P5["⚡ <b>Resiliência & Offline-First</b>"]
    P5 --> P5_1["Cache Local SQLite<br/>(Leitura 100% Offline)"]
    P5 --> P5_2["Fila Assíncrona sync_queue<br/>(UUIDs temporários)"]
    P5 --> P5_3["Sincronização Automática<br/>(Backoff Exponencial)"]

    Root --> P6["🗺️ <b>Geolocalização & Rede</b>"]
    P6 --> P6_1["Mapa Interativo da Região<br/>(Coqueiral/MG e Arredores)"]
    P6 --> P6_2["Verificação de Cobertura GeoJSON"]
    P6 --> P6_3["Validação do Ponto de Instalação"]

    Root --> P7["🔒 <b>Segurança & UX Perfilada</b>"]
    P7 --> P7_1["Autenticação por Perfil<br/>(Cliente / Técnico / Admin)"]
    P7 --> P7_2["Segurança Supabase RLS"]
    P7 --> P7_3["UI Intuitiva & Acessível"]
```

#### Descrição dos Pilares da Árvore de Ideias:
1. **Autoatendimento do Cliente**: Empodera o assinante para resolver instabilidades de conexão de forma autônoma, abrindo chamados sem passar por filas telefônicas, enviando fotos das luzes do roteador para autodiagnóstico e gerenciando seu perfil e localização.
2. **Vitrine de Planos (Tela de Login)**: Permite que visitantes e futuros assinantes cliquem na tela inicial/login para explorar os planos de fibra óptica disponíveis (velocidades, valores e vantagens) sem precisar estar autenticado.
3. **Aba do Técnico de Campo**: Módulo exclusivo com visão em lista/mapa das ordens de serviço atribuídas ao técnico, guiando sua rota de atendimento e registrando o encerramento do chamado com foto do serviço finalizado.
4. **Aba do Administrador / Gestor**: Painel centralizado para a gerência da CJnet controlar filas de suporte, atribuir chamados para técnicos em campo, cadastrar/alterar planos comercializados e emitir alertas e comunicados gerais para a base de clientes.
5. **Resiliência & Offline-First**: Assegura a operabilidade completa do app mesmo em locais com sinal de internet oscilante ou indisponível.
6. **Geolocalização & Rede**: Permite consultar disponibilidade técnica de fibra óptica e validações de endereço em tempo real no mapa.
7. **Segurança & UX Perfilada**: Garante controle de acesso baseado em papéis (RBAC/RLS) para proteger dados sensíveis de acordo com o perfil do usuário logado.


### 1.2 Tabela de Requisitos Funcionais (RF)

| ID | Descrição | Prioridade | Ator/Origem |
|----|-----------|-----------|-------------|
| **RF01** | O sistema deve permitir que o cliente realize login/autenticação vinculando seu CPF/CNPJ ou e-mail ao cadastro ativo na CJnet, com sessão armazenada de forma segura no dispositivo. | Alta | Cliente |
| **RF02** | O sistema deve permitir que visitantes realizem pré-cadastro informando nome, CPF/CNPJ, endereço e telefone para solicitação de contrato de internet. | Média | Visitante |
| **RF03** | O sistema deve redirecionar automaticamente o usuário autenticado para a aba correta conforme seu papel: cliente → aba-cliente, técnico → aba-técnico, administrador → aba-administrador. | Alta | Sistema (AuthService) |
| **RF04** | O sistema deve permitir a abertura de uma nova Ordem de Serviço (OS) informando o tipo de problema (ex: sem sinal, lentidão, queda) e descrição. | Alta | Cliente |
| **RF05** | O sistema deve permitir tirar foto do roteador/ONU através da câmera do dispositivo e anexá-la à Ordem de Serviço aberta. | Alta | Cliente |
| **RF06** | O sistema deve gravar a OS e a foto localmente no dispositivo (offline-first) atribuindo um ID temporário (UUID) e enfileirando para sincronização. | Alta | Sistema |
| **RF07** | O sistema deve exibir o status atualizado das Ordens de Serviço abertas (ex: Pendente, Em Atendimento, Concluída) e o histórico completo de chamados encerrados do cliente logado. | Alta | Cliente |
| **RF08** | O sistema deve exibir no mapa interativo se a localização do cliente ou endereço informado está dentro da área de cobertura GeoJSON da CJnet. | Média | Cliente / Visitante |
| **RF09** | O sistema deve permitir que o cliente consulte e atualize seus dados cadastrais e localização da sua residência no mapa. | Média | Cliente |
| **RF10** | O sistema deve sincronizar automaticamente as ações pendentes (`sync_queue`) em segundo plano assim que a conectividade for restabelecida. | Alta | Sistema (SyncService) |
| **RF11** | O sistema deve permitir que visitantes e clientes consultem os planos de internet da CJnet (velocidades, preços e benefícios) diretamente através de um botão/atalho na tela de login, sem necessidade de autenticação. | Média | Visitante / Cliente |
| **RF12** | O sistema deve disponibilizar a **Aba do Técnico**, exibindo as Ordens de Serviço atribuídas ao técnico logado, mapa de rota até a residência do cliente e registro de encerramento com foto do reparo efetuado. | Alta | Técnico |
| **RF13** | O sistema deve disponibilizar a **Aba do Administrador**, fornecendo painel gerencial com indicadores de OSs (pendentes, em andamento, concluídas), atribuição de técnicos a chamados, gestão de planos e envio de notificações em massa. | Alta | Administrador |
| **RF14** | O sistema deve enviar notificações push para os clientes quando o status de uma OS for alterado pelo técnico ou administrador (ex: "Seu chamado está em atendimento"). | Média | Sistema / Administrador |
| **RF15** | O sistema deve permitir que o administrador filtre, busque e exporte relatórios de chamados por período, bairro e técnico responsável, diretamente pelo painel da Aba do Administrador. | Baixa | Administrador |


### 1.3 Tabela de Requisitos Não Funcionais (RNF)

| ID | Categoria | Descrição + Critério Mensurável | Prioridade |
|----|-----------|----------------------------------|-------------|
| **RNF01** | **Disponibilidade / Offline** | O aplicativo deve manter funcionalidade de leitura (OSs existentes, perfil e mapa offline) 100% acessível sem conexão à internet. | Alta |
| **RNF02** | **Desempenho** | A consulta e gravação local no banco de dados SQLite deve responder em tempo < 100ms no dispositivo móvel. | Alta |
| **RNF03** | **Segurança de Rede e Dados** | Toda comunicação com a nuvem deve utilizar HTTPS/TLS; as tabelas no Supabase devem possuir políticas rígidas de **Row Level Security (RLS)** restritas ao `auth.uid()`; e os tokens JWT de sessão devem ser armazenados exclusivamente via **`expo-secure-store`** (Keychain iOS / Android Keystore), nunca em `AsyncStorage` ou SQLite. | Alta |
| **RNF04** | **Usabilidade** | A interface deve ser otimizada para telas de dispositivos Android e iOS com botões grandes, alto contraste e linguagem simples, acessível para usuários de diferentes faixas etárias de cidade do interior. | Alta |
| **RNF05** | **Manutenibilidade** | A arquitetura do código deve seguir **Clean Architecture / TDD**, isolando completamente a camada de banco de dados SQLite (`src/db/`) da camada de API remota Supabase (`src/api/`). | Média |
| **RNF06** | **Confiabilidade** | O serviço de sincronização (`syncService`) deve implementar retentativas com backoff exponencial e garantir idempotência sem duplicação de chamados no backend. | Alta |
| **RNF07** | **Portabilidade** | O app deve ser construído sobre Expo (React Native) com suporte a navegação por arquivos (Expo Router) e suporte à execução universal em Android (mínimo API 26 / Android 8.0) e iOS (mínimo iOS 16). | Alta |
| **RNF08** | **Eficiência Energética** | A captura de geolocalização e fotos deve ser pontual, proibindo rastreamento de localização em segundo plano (*background location tracking*) para conservar bateria. | Média |
| **RNF09** | **Gestão de Mídia** | As fotos capturadas pelo cliente ou pelo técnico devem ser comprimidas para no máximo **1 MB** antes do upload para o Supabase Storage, garantindo desempenho adequado em conexões lentas (3G/4G de baixa intensidade). | Média |
| **RNF10** | **Controle de Acesso (RBAC)** | O sistema deve implementar controle de acesso baseado em papéis (*Role-Based Access Control*), garantindo que rotas, dados e funcionalidades da Aba do Técnico e da Aba do Administrador sejam completamente inacessíveis a usuários com papel `cliente`. | Alta |


---

## 2. Diagrama de Casos de Uso

### 2.1 Atores do Sistema
- **Cliente**: Usuário final cadastrado que utiliza o app para abrir Ordens de Serviço (OS), acompanhar o andamento e o histórico dos chamados e visualizar seu perfil.
- **Visitante / Não Logado**: Usuário que acessa o app para consultar a área de cobertura, explorar os **Planos de Internet** disponíveis na tela de login ou realizar pré-cadastro.
- **Técnico de Campo**: Usuário operacional da CJnet que acessa a **Aba do Técnico** para consultar a lista de OSs atribuídas a ele, navegar até o cliente e registrar o encerramento do chamado com foto do serviço prestado.
- **Administrador / Gestor**: Usuário gerencial da CJnet que acessa a **Aba do Administrador** para monitorar indicadores de suporte, atribuir ordens de serviço para técnicos, gerenciar planos de internet, filtrar relatórios e disparar notificações push em massa.
- **Supabase Auth / Postgres**: Sistema externo remoto de autenticação e banco de dados relacional.
- **SyncService (Cron/Event)**: Serviço em segundo plano que processa a fila local offline e dispara notificações push de status.
- **PushService**: Serviço de mensageria que entrega notificações push aos dispositivos dos clientes (ex: Expo Notifications / Firebase FCM).

### 2.2 Diagrama Mermaid de Casos de Uso

```mermaid
flowchart LR
    Visitante((Visitante))
    Cliente((Cliente))
    Tecnico((Técnico))
    Admin((Administrador))
    Cliente --|> Visitante
    SyncCron((SyncService))
    Push((PushService))

    Visitante --> UC01[UC01: Ver Cobertura no Mapa]
    Visitante --> UC02[UC02: Realizar Pré-Cadastro]
    Visitante --> UC14[UC14: Consultar Planos na Tela de Login]

    Cliente --> UC03[UC03: Fazer Login e Rotear por Perfil]
    Cliente --> UC05[UC05: Abrir Ordem de Serviço]
    Cliente --> UC06[UC06: Acompanhar Status e Histórico de OSs]
    Cliente --> UC07[UC07: Atualizar Perfil / Endereço]

    UC03 -.include.-> UC13[UC13: Validar JWT via expo-secure-store e Rotear por Perfil]
    UC02 -.extend.-> UC01
    UC02 -.include.-> UC08[UC08: Salvar na Fila Offline SQLite]
    UC05 -.include.-> UC08
    UC09[UC09: Tirar Foto do Roteador/ONU] -.extend.-> UC05
    UC10[UC10: Marcar Ponto no Mapa] -.extend.-> UC07

    Tecnico --> UC12[UC12: Aba do Técnico: Consultar OSs e Concluir Chamado]
    UC17[UC17: Tirar Foto do Serviço Concluído] -.extend.-> UC12
    UC12 -.include.-> UC08

    Admin --> UC15[UC15: Aba do Administrador: Dashboard e Gestão de OSs]
    UC16[UC16: Gerenciar Planos de Internet] -.extend.-> UC15
    UC18[UC18: Filtrar e Exportar Relatórios de Chamados] -.extend.-> UC15
    UC19[UC19: Enviar Notificação Push em Massa] -.extend.-> UC15

    SyncCron --> UC11[UC11: Sincronizar Fila sync_queue com Supabase]
    UC11 -.include.-> UC20[UC20: Disparar Push de Status da OS]
    UC20 --> Push
    UC19 --> Push
```

### 2.3 Especificação Textual dos Casos de Uso Principais

#### UC02: Realizar Pré-Cadastro
- **Ator Principal**: Visitante.
- **Pré-condição**: Nenhuma (acesso público).
- **Fluxo Principal**:
  1. O visitante acessa o app e na tela de login seleciona **"Quero ser cliente"**.
  2. O app exibe o formulário de pré-cadastro solicitando: nome completo, CPF/CNPJ, telefone e endereço.
  3. (Opcional) O visitante verifica a cobertura do endereço no mapa (`<<extend>> UC01`).
  4. O visitante confirma o envio. O app grava a solicitação no SQLite local e enfileira para envio ao Supabase (`<<include>> UC08`).
  5. O app exibe mensagem: **"Solicitação enviada! Nossa equipe entrará em contato."**
- **Fluxo Alternativo**:
  - *Offline*: O pré-cadastro fica salvo localmente e sincroniza quando a conexão for restabelecida.

#### UC03: Fazer Login e Rotear por Perfil
- **Ator Principal**: Cliente / Técnico / Administrador.
- **Pré-condição**: Nenhuma (tela de login).
- **Fluxo Principal**:
  1. O usuário informa e-mail (ou CPF) e senha na tela de login.
  2. O app autentica via Supabase Auth (HTTPS/TLS).
  3. Ao receber o token JWT, o app o salva de forma segura via **`expo-secure-store`** (Keychain/Android Keystore) — `<<include>> UC13`.
  4. O `authService` lê o campo `papel` do usuário (`cliente`, `tecnico` ou `admin`) e redireciona automaticamente:
     - `cliente` → **Aba do Cliente** `(tabs-cliente)`
     - `tecnico` → **Aba do Técnico** `(tabs-tecnico)`
     - `admin` → **Aba do Administrador** `(tabs-admin)`
- **Fluxo Alternativo**:
  - *Sessão cached*: Se já existe token válido no `expo-secure-store`, o usuário é redirecionado diretamente sem exibir o formulário de login.
  - *Credenciais inválidas*: O app exibe mensagem de erro e não salva nenhum dado.

#### UC05: Abrir Ordem de Serviço (OS)
- **Ator Principal**: Cliente.
- **Pré-condição**: Cliente logado ou com sessão em cache local.
- **Fluxo Principal**:
  1. O cliente navega até a aba `Suporte` e seleciona `Nova OS`.
  2. O cliente escolhe o tipo de problema (*Sem sinal*, *Lentidão*, *Queda constante*, *Mudança de endereço*).
  3. O cliente insere a descrição textual detalhada do problema.
  4. (Opcional) O cliente escolhe anexar foto (`<<extend>> UC09`).
  5. O cliente confirma o envio.
  6. O sistema gera um UUID local (`id_local`), grava na tabela local `ordens_servico` com `status = 'pendente'` e insere uma entrada na `sync_queue` (`<<include>> UC08`).
  7. A interface exibe a mensagem de sucesso otimista com um badge indicativo "Sincronizando...".
- **Fluxos Alternativos**:
  - *Dispositivo Online*: O `syncService` detecta a conexão e sincroniza imediatamente com o Supabase.
  - *Dispositivo Offline*: O OS fica em cache local até que a rede retorne.

#### UC06: Acompanhar Status e Histórico de OSs
- **Ator Principal**: Cliente.
- **Pré-condição**: Cliente logado.
- **Fluxo Principal**:
  1. O cliente acessa a aba `Meus Chamados`.
  2. O app exibe a lista de OSs **abertas** com badge de status em tempo real (Pendente, Em Atendimento).
  3. O cliente pode alternar para a aba **Histórico**, que lista todas as OSs com status `Concluída` ou `Cancelada`, com data de encerramento e observação do técnico.
  4. O cliente pode tocar em qualquer OS para ver os detalhes completos, incluindo a foto do reparo tirada pelo técnico.
- **Fluxo Alternativo**:
  - *Offline*: O app exibe os dados do cache SQLite local sem indicar atualização em tempo real.

#### UC09: Tirar Foto do Roteador/ONU (Ponto de Extensão em UC05)
- **Ator Principal**: Cliente.
- **Condição de Extensão**: Acionada quando o cliente clica em "Adicionar foto do equipamento" durante a abertura da OS.
- **Fluxo**:
  1. O app abre a câmera do dispositivo via `expo-image-picker`/`expo-camera`.
  2. O cliente tira a foto demonstrando os leds/luzes de status do equipamento.
  3. O app **comprime a imagem para no máximo 1 MB** antes de salvar (RNF09).
  4. O app salva o arquivo de imagem no armazenamento interno do app (`expo-file-system`) e grava o caminho local em `foto_local_path`.
  5. O upload binário para o Supabase Storage (`bucket: os-fotos`) é delegado para a fila de sincronização em segundo plano para não travar o envio do formulário textual.

#### UC12: Aba do Técnico — Atendimento e Encerramento de OS
- **Ator Principal**: Técnico de Campo.
- **Pré-condição**: Técnico autenticado no perfil `tecnico`.
- **Fluxo**:
  1. O técnico acessa a **Aba do Técnico** e visualiza a lista de Ordens de Serviço atribuídas ao seu usuário no dia.
  2. O técnico seleciona um chamado, abre a localização do cliente no mapa integrado e aciona a navegação GPS.
  3. Ao chegar no local, o técnico altera o status para `em_atendimento`.
  4. Após efetuar o reparo ou troca do roteador, o técnico registra a observação técnica, clica em "Concluir Atendimento" e tira a foto comprovando o serviço executado (`<<extend>> UC17`).
  5. O app salva os dados localmente e enfileira na `sync_queue` para sincronização com o Supabase (`<<include>> UC08`).
  6. Após a sincronização, o `SyncService` dispara a notificação push para o cliente informando a conclusão (`<<include>> UC20`).

#### UC14: Consultar Planos de Internet na Tela de Login
- **Ator Principal**: Visitante / Cliente.
- **Pré-condição**: Nenhuma (Acesso público na tela de boas-vindas/login).
- **Fluxo**:
  1. O usuário abre o aplicativo e, na tela de login, clica no botão ou card **"Conhecer Nossos Planos"**.
  2. O app carrega a lista de planos de fibra óptica disponíveis (com dados em cache local ou via Supabase em tempo real).
  3. O usuário visualiza velocidades (ex: 200 Mega, 400 Mega, 600 Mega), preços mensais e benefícios incluídos (Wi-Fi 6, suporte prioritário, etc.).
  4. O usuário pode clicar em **"Contratar / Solicitar Cobertura"**, sendo redirecionado para a checagem no mapa (`UC01`) ou tela de cadastro (`UC02`).

#### UC15: Aba do Administrador — Painel de Gestão e Notificações
- **Ator Principal**: Administrador / Gestor.
- **Pré-condição**: Usuário autenticado no perfil `admin`.
- **Fluxo**:
  1. O gestor acessa a **Aba do Administrador** e visualiza o dashboard com métricas de chamados (total abertos, tempo médio de atendimento, chamados pendentes por bairro de Coqueiral/MG).
  2. O gestor seleciona chamados pendentes e faz a atribuição direta para os técnicos de campo disponíveis.
  3. O gestor pode cadastrar novos planos de internet ou alterar valores/velocidades existentes (`<<extend>> UC16`), que atualizarão a vitrine da tela de login (`UC14`).
  4. O gestor pode criar e enviar um comunicado/aviso geral (ex: "Manutenção programada na rede da zona rural dia 10/09") para a base de clientes via notificação push no app (`<<extend>> UC19`).
  5. O gestor pode filtrar chamados por período, bairro ou técnico e exportar o relatório (`<<extend>> UC18`).

#### UC20: Disparar Notificação Push de Status da OS
- **Ator Principal**: Sistema (SyncService / PushService).
- **Pré-condição**: OS sincronizada com sucesso no Supabase e status alterado (`em_atendimento` ou `concluída`).
- **Fluxo**:
  1. Após confirmar o `INSERT`/`UPDATE` da OS no Supabase, o `SyncService` identifica a mudança de status.
  2. O sistema envia uma notificação push para o dispositivo do cliente vinculado à OS (ex: *"Seu chamado #1234 está Em Atendimento"*) via `PushService`.
  3. O cliente recebe a notificação no dispositivo, podendo tocar para abrir diretamente os detalhes da OS no app.


---

## 3. Diagrama de Classes e Estrutura de Dados

### 3.1 Diagrama de Classes de Domínio (UML)

```mermaid
classDiagram
    class Cliente {
        +String id
        +String authUserId
        +String planoId
        +String nome
        +String cpfCnpj
        +String email
        +String telefone
        +String endereco
        +PapelUsuario papel
        +StatusContrato statusContrato
        +String pushToken
        +Date createdAt
        +Date updatedAt
        +abrirOS(tipo, descricao, foto) OrdemServico
        +atualizarEndereco(endereco) void
        +atualizarPushToken(token) void
        +consultarHistoricoOS() List~OrdemServico~
    }

    class PlanoInternet {
        +String id
        +String nome
        +Int velocidadeMbps
        +Decimal precoMensal
        +List~String~ beneficios
        +Boolean ativo
        +Boolean destaque
        +consultarVitrinePublica() List~PlanoInternet~
        +atualizarPlano(nome, velocidade, preco, beneficios) void
    }

    class AreaCobertura {
        +String id
        +String nomeZona
        +String poligonoGeoJSON
        +Boolean ativo
        +verificarPonto(lat, lng) Boolean
    }

    class EnderecoCliente {
        +String id
        +String clienteId
        +String areaCoberturaId
        +Double latitude
        +Double longitude
        +String logradouro
        +String numero
        +String bairro
        +String cidade
        +String estado
        +String cep
        +String complemento
        +Boolean dentroCobertura
        +validarCobertura(area) Boolean
        +formatarEnderecoCompleto() String
    }

    class OrdemServico {
        +String idLocal
        +String idRemoto
        +String clienteId
        +String tecnicoId
        +TipoProblema tipoProblema
        +String descricao
        +String parecerTecnico
        +StatusOS status
        +Double latitude
        +Double longitude
        +Date createdAt
        +Date dataFechamento
        +Date syncedAt
        +adicionarFoto(pathLocal, tipo) OSFoto
        +atribuirTecnico(tecnicoId) void
        +iniciarAtendimento() void
        +encerrarAtendimento(parecerTecnico, fotoConclusao) void
        +cancelar(motivo) void
    }

    class OSFoto {
        +String id
        +String osId
        +String fotoLocalPath
        +String fotoRemotaUrl
        +TipoFoto tipo
        +Int tamanhoKb
        +Boolean comprimida
        +Boolean enviada
        +comprimirParaLimiteMaximo(maxKb) void
        +marcarEnviada(urlRemota) void
    }

    class PreCadastro {
        +String id
        +String planoId
        +String areaCoberturaId
        +String nome
        +String cpfCnpj
        +String telefone
        +String enderecoCompleto
        +Double latitude
        +Double longitude
        +StatusPreCadastro status
        +Date criadoEm
        +Date syncedAt
        +submeterSolicitacao() void
        +marcarContatado() void
        +converterEmContrato() Cliente
    }

    class NotificacaoPush {
        +String id
        +String clienteId
        +String osId
        +String titulo
        +String corpo
        +TipoNotificacao tipo
        +Boolean enviada
        +Date criadaEm
        +Date enviadaEm
        +enviarParaDispositivo(pushToken) Boolean
    }

    class SyncQueueItem {
        +String id
        +String entidade
        +OperacaoSync operacao
        +String payloadJson
        +Int tentativas
        +StatusSync status
        +Date criadoEm
        +incrementarTentativa() void
        +calcularProximoBackoff() Int
        +marcarConcluido() void
    }

    class AppMeta {
        +String chave
        +String valor
        +Date atualizadoEm
        +getLastSyncAt() Date
        +setLastSyncAt(date) void
    }

    class PapelUsuario {
        <<enumeration>>
        CLIENTE
        TECNICO
        ADMIN
    }

    class StatusContrato {
        <<enumeration>>
        ATIVO
        SUSPENSO
        CANCELADO
    }

    class TipoProblema {
        <<enumeration>>
        SEM_SINAL
        LENTIDAO
        QUEDA
        MUDANCA_ENDERECO
        OUTROS
    }

    class StatusOS {
        <<enumeration>>
        PENDENTE
        EM_ATENDIMENTO
        CONCLUIDO
        CANCELADO
    }

    class TipoFoto {
        <<enumeration>>
        CLIENTE_ROTEADOR
        TECNICO_REPARO
    }

    class StatusPreCadastro {
        <<enumeration>>
        PENDENTE
        CONTATADO
        CONVERTIDO
        RECUSADO
    }

    class TipoNotificacao {
        <<enumeration>>
        STATUS_OS
        AVISO_ADMIN
        MANUTENCAO
    }

    class OperacaoSync {
        <<enumeration>>
        INSERT
        UPDATE
    }

    class StatusSync {
        <<enumeration>>
        PENDENTE
        PROCESSANDO
        ERRO
        CONCLUIDO
    }

    PlanoInternet "1" -- "0..*" Cliente : contratado_por
    PlanoInternet "1" -- "0..*" PreCadastro : interesse_em
    AreaCobertura "1" -- "0..*" EnderecoCliente : abrange
    AreaCobertura "1" -- "0..*" PreCadastro : valida_regiao
    Cliente "1" -- "1" EnderecoCliente : possui
    Cliente "1" -- "0..*" OrdemServico : solicita
    Cliente "1" -- "0..*" OrdemServico : atende_como_tecnico
    Cliente "1" -- "0..*" NotificacaoPush : recebe
    OrdemServico "1" *-- "0..*" OSFoto : contem
    OrdemServico "0..*" -- "0..1" NotificacaoPush : dispara
    OrdemServico ..> SyncQueueItem : gera_pendencia
    PreCadastro ..> SyncQueueItem : gera_pendencia
    SyncQueueItem "1" -- "1" AppMeta : sincroniza_com
    Cliente ..> PapelUsuario : define_papel
    Cliente ..> StatusContrato : define_status
    OrdemServico ..> TipoProblema : categorizado_em
    OrdemServico ..> StatusOS : possui_status
    OSFoto ..> TipoFoto : tipo_anexo
    PreCadastro ..> StatusPreCadastro : possui_status
    NotificacaoPush ..> TipoNotificacao : tipo_notificacao
    SyncQueueItem ..> OperacaoSync : tipo_operacao
    SyncQueueItem ..> StatusSync : status_fila
```

### 3.2 Tabela de Persistência e Estratégia Mapeada

| Classe | Persistente? | Estratégia Local (SQLite) | Estratégia Remota (Supabase Postgres) | Observação |
|--------|-------------|----------------------------|----------------------------------------|------------|
| `Cliente` | Sim | Tabela `clientes` | Tabela `public.clientes` | FK `auth_user_id → auth.users`, FK `plano_id → planos_internet`, `papel`, `push_token` |
| `PlanoInternet` | Sim | Tabela `planos_internet` | Tabela `public.planos_internet` | Exibido na tela de login sem autenticação; gerenciado pelo Administrador |
| `AreaCobertura` | Sim | Tabela `area_cobertura` (cache GeoJSON) | Tabela `public.area_cobertura` (PostGIS) | Polígonos de cobertura da rede de fibra em Coqueiral/MG |
| `EnderecoCliente` | Sim | Tabela `enderecos_cliente` | Tabela `public.enderecos_cliente` | FK `cliente_id → clientes`, FK `area_cobertura_id → area_cobertura` |
| `OrdemServico` | Sim | Tabela `ordens_servico` (PK `id_local` UUID) | Tabela `public.ordens_servico` (PK `id` UUID) | FK `cliente_id`, FK `tecnico_id`, `parecer_tecnico`, `status` |
| `OSFoto` | Sim | Guardado em `foto_local_path` + flags locais | Bucket `os-fotos` + Tabela `public.os_fotos` | Comprimida $\le$ 1 MB (RNF09); FK `os_id → ordens_servico` |
| `PreCadastro` | Sim | Tabela `pre_cadastros` | Tabela `public.pre_cadastros` | FK `plano_id`, FK `area_cobertura_id`; sincroniza quando online |
| `NotificacaoPush` | Sim | Tabela `notificacoes` (cache local) | Tabela `public.notificacoes_push` | FK `cliente_id`, FK `os_id`; disparada pelo SyncService via PushService |
| `SyncQueueItem` | Sim (Apenas Local) | Tabela `sync_queue` | N/A (Fila efêmera no mobile) | Controla retentativas offline com backoff exponencial |
| `AppMeta` | Sim (Apenas Local) | Tabela `app_meta` | N/A | Guarda `last_sync_at` e flags de configuração. **Tokens JWT ficam exclusivamente no `expo-secure-store`** (RNF03) — nunca nesta tabela. |

---

## 4. Diagrama Entidade-Relacionamento (DER Relacional) e Modelo de Dados

### 4.1 Diagrama Entidade-Relacionamento (DER)

O **Diagrama Entidade-Relacionamento (DER)** apresenta a modelagem relacional física do banco de dados no **Supabase Postgres (Remoto)** e o mapeamento das chaves primárias (PK), chaves estrangeiras (FK), tipos de dados e cardinalidades exatas do ecossistema **CJnet**:

```mermaid
erDiagram
    PLANOS_INTERNET ||--o{ CLIENTES : "contratado_por"
    PLANOS_INTERNET ||--o{ PRE_CADASTROS : "interesse_em"
    AREA_COBERTURA ||--o{ ENDERECOS_CLIENTE : "abrange"
    AREA_COBERTURA ||--o{ PRE_CADASTROS : "valida_viabilidade"
    CLIENTES ||--o| ENDERECOS_CLIENTE : "possui"
    CLIENTES ||--o{ ORDENS_SERVICO : "solicita (cliente_id)"
    CLIENTES ||--o{ ORDENS_SERVICO : "executa (tecnico_id)"
    ORDENS_SERVICO ||--o{ OS_FOTOS : "contem_anexos"
    ORDENS_SERVICO ||--o{ NOTIFICACOES_PUSH : "dispara_evento"
    CLIENTES ||--o{ NOTIFICACOES_PUSH : "recebe_alerta"

    PLANOS_INTERNET {
        uuid id PK "Identificador único do plano"
        string nome "Ex: Fibra Turbo 400 Mega"
        int velocidade_mbps "Velocidade em Mbps (ex: 400)"
        decimal preco_mensal "Valor da mensalidade (ex: 99.90)"
        jsonb beneficios "JSON com vantagens: Wi-Fi 6, Suporte Local..."
        boolean ativo "Disponibilidade comercial"
        boolean destaque "Exibição em destaque na tela de login"
        timestamp created_at "Data de criação"
        timestamp updated_at "Data de atualização"
    }

    AREA_COBERTURA {
        uuid id PK "Identificador único da zona"
        string nome_zona "Nome do setor atendido em Coqueiral/MG"
        geometry poligono_postgis "Polígono GeoJSON / PostGIS delimitador"
        boolean ativo "Status operacional da área"
        timestamp updated_at "Data de atualização da malha"
    }

    CLIENTES {
        uuid id PK "Identificador único do usuário/cliente"
        uuid auth_user_id FK "Vínculo com auth.users no Supabase"
        uuid plano_id FK "FK para PLANOS_INTERNET (plano ativo)"
        string nome "Nome completo ou Razão Social"
        string cpf_cnpj "Documento fiscal único indexado"
        string email "E-mail para autenticação e avisos"
        string telefone "WhatsApp / Telefone de contato"
        string papel "CLIENTE, TECNICO, ADMIN (RBAC)"
        string status_contrato "ATIVO, SUSPENSO, CANCELADO"
        string push_token "Token Expo/FCM para notificações push"
        timestamp created_at "Data de cadastro"
        timestamp updated_at "Data de atualização cadastral"
    }

    ENDERECOS_CLIENTE {
        uuid id PK "Identificador único do endereço"
        uuid cliente_id FK "FK única para CLIENTES (relação 1:1)"
        uuid area_cobertura_id FK "FK para AREA_COBERTURA"
        double latitude "Coordenada GPS (Latitude)"
        double longitude "Coordenada GPS (Longitude)"
        string logradouro "Rua, Avenida, Praça..."
        string numero "Número do imóvel"
        string bairro "Bairro em Coqueiral/MG"
        string cidade "Cidade (Coqueiral)"
        string estado "Estado (MG)"
        string cep "CEP (37235-000)"
        text complemento "Apto, bloco, ponto de referência"
        boolean dentro_cobertura "Validação geográfica automática"
        timestamp updated_at "Data de atualização"
    }

    ORDENS_SERVICO {
        uuid id PK "Identificador único remoto no Supabase"
        string id_local "UUID gerado no mobile (offline-first)"
        uuid cliente_id FK "FK para CLIENTES (solicitante do reparo)"
        uuid tecnico_id FK "FK para CLIENTES (técnico responsável)"
        string tipo_problema "SEM_SINAL, LENTIDAO, QUEDA, OUTROS"
        text descricao "Descrição detalhada do cliente"
        text parecer_tecnico "Laudo técnico registrado ao concluir chamado"
        string status "PENDENTE, EM_ATENDIMENTO, CONCLUIDO, CANCELADO"
        double latitude "Coordenada GPS da solicitação"
        double longitude "Coordenada GPS da solicitação"
        timestamp created_at "Data e hora de abertura"
        timestamp data_fechamento "Data e hora de encerramento pelo técnico"
        timestamp synced_at "Data de sincronização com o backend"
    }

    OS_FOTOS {
        uuid id PK "Identificador único do anexo"
        uuid os_id FK "FK para ORDENS_SERVICO"
        string foto_local_path "Caminho no sistema de arquivos local do mobile"
        string foto_remota_url "URL pública no Supabase Storage"
        string tipo "CLIENTE_ROTEADOR, TECNICO_REPARO"
        int tamanho_kb "Tamanho do arquivo comprimido (<= 1024 KB)"
        boolean comprimida "Flag indicativa de compressão (RNF09)"
        boolean enviada "Flag de status de upload"
        timestamp created_at "Data de captura"
    }

    PRE_CADASTROS {
        uuid id PK "Identificador único do pré-cadastro"
        uuid plano_id FK "FK para PLANOS_INTERNET (plano de interesse)"
        uuid area_cobertura_id FK "FK para AREA_COBERTURA"
        string nome "Nome do visitante interessado"
        string cpf_cnpj "Documento fiscal do interessado"
        string telefone "Telefone / WhatsApp de contato"
        text endereco_completo "Endereço informado para instalação"
        double latitude "Coordenada geográfica aproximada"
        double longitude "Coordenada geográfica aproximada"
        string status "PENDENTE, CONTATADO, CONVERTIDO, RECUSADO"
        timestamp criado_em "Data de envio da solicitação"
        timestamp synced_at "Data de sincronização com a nuvem"
    }

    NOTIFICACOES_PUSH {
        uuid id PK "Identificador único da notificação"
        uuid cliente_id FK "FK para CLIENTES (destinatário)"
        uuid os_id FK "FK para ORDENS_SERVICO (origem do evento)"
        string titulo "Título da notificação push"
        text corpo "Conteúdo detalhado da mensagem ou aviso"
        string tipo "STATUS_OS, AVISO_ADMIN, MANUTENCAO"
        boolean enviada "Flag de confirmação de envio via FCM/Expo"
        timestamp criada_em "Data de geração do evento"
        timestamp enviada_em "Data de entrega ao dispositivo"
    }
```

---

### 4.2 Modelo Físico Local (SQLite Mobile) e Políticas de Segurança (RLS)

#### 4.2.1 Tabelas Exclusivas do Banco Local SQLite (`expo-sqlite`)

Além de manter cópias em cache local das tabelas remotas para leitura offline, o dispositivo móvel possui tabelas locais exclusivas para governança da resiliência:

1. **`SYNC_QUEUE` (Fila Assíncrona de Sincronização)**:
   - `id` (TEXT PK — UUID): Identificador da pendência local.
   - `entidade` (TEXT): Entidade afetada (`ordem_servico`, `pre_cadastro`, `cliente`, `os_foto`).
   - `operacao` (TEXT): Tipo da operação (`INSERT`, `UPDATE`).
   - `payload_json` (TEXT): Dados completos serializados para envio.
   - `tentativas` (INTEGER DEFAULT 0): Contador de retentativas com backoff exponencial ($2^n$ segundos).
   - `status` (TEXT): Status da pendência (`PENDENTE`, `PROCESSANDO`, `ERRO`, `CONCLUIDO`).
   - `criado_em` (TEXT): Timestamp de inclusão na fila.

2. **`APP_META` (Metadados da Aplicação)**:
   - `chave` (TEXT PK): Identificador da configuração (ex: `last_sync_at`, `offline_mode`).
   - `valor` (TEXT): Valor associado.
   - `atualizado_em` (TEXT): Timestamp da última atualização.
   - *Nota de Segurança*: **Tokens JWT de sessão nunca são gravados nesta tabela**, ficando armazenados com isolamento de hardware exclusivamente no **`expo-secure-store`** (RNF03).

#### 4.2.2 Mapeamento de Tabelas: SQLite (Local) vs Supabase Postgres (Remoto)

| Tabela Local (SQLite) | Tabela Remota (Supabase) | Sincroniza? | Direção | Observação |
|-----------------------|--------------------------|-------------|----------|------------|
| `clientes` | `public.clientes` | Sim | Bidirecional | Leitura local offline; escrita sobe via `sync_queue` |
| `planos_internet` | `public.planos_internet` | Sim | Nuvem → Mobile (somente leitura) | Atualizado pelo Administrador; consultado público na tela de login |
| `area_cobertura` | `public.area_cobertura` | Sim | Nuvem → Mobile (cache GeoJSON) | Polígonos de fibra para checagem client-side no mapa |
| `enderecos_cliente` | `public.enderecos_cliente` | Sim | Bidirecional | Armazena geolocalização e endereço residencial |
| `ordens_servico` | `public.ordens_servico` | Sim | Mobile → Nuvem (INSERT) + Nuvem → Mobile (UPDATE status) | PK local = `id_local` (UUID); PK remota = `id` (UUID) |
| `os_fotos` | Bucket `os-fotos` + `public.os_fotos` | Sim | Mobile → Nuvem | Imagem comprimida sobe para o Storage; metadados no Postgres |
| `pre_cadastros` | `public.pre_cadastros` | Sim | Mobile → Nuvem | Visitante sem conta; sincroniza quando online |
| `notificacoes` | `public.notificacoes_push` | Sim | Nuvem → Mobile | Histórico de alertas e avisos recebidos no app |
| `sync_queue` | N/A | Não | Apenas Local | Fila efêmera no mobile com retry e backoff |
| `app_meta` | N/A | Não | Apenas Local | Metadados de cache; **Tokens JWT: exclusivamente no `expo-secure-store`** |

#### 4.2.3 Políticas de Row Level Security (RLS) por Tabela

> **Regra base**: Todas as tabelas no Supabase Postgres possuem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` ativado. Nenhuma leitura ou escrita ocorre sem política explícita.

| Tabela | Operação | Papel Permitido | Condição RLS |
|--------|----------|----------------|---------------|
| `public.clientes` | `SELECT` | `cliente`, `tecnico`, `admin` | `auth.uid() = auth_user_id` (cliente/técnico vê o próprio) / `admin` vê todos |
| `public.clientes` | `UPDATE` | `cliente`, `admin` | `auth.uid() = auth_user_id` (cliente atualiza o próprio perfil) |
| `public.clientes` | `INSERT` | `service_role` | Criação de contas via backend/serviço autenticado |
| `public.planos_internet` | `SELECT` | **público (anon)** | `TRUE` — acessado livremente na tela de login sem autenticação |
| `public.planos_internet` | `INSERT`, `UPDATE`, `DELETE` | `admin` | `(SELECT papel FROM clientes WHERE auth_user_id = auth.uid()) = 'admin'` |
| `public.area_cobertura` | `SELECT` | **público (anon)** + autenticados | `TRUE` — consulta pública de disponibilidade no mapa |
| `public.area_cobertura` | `INSERT`, `UPDATE`, `DELETE` | `admin` | `(SELECT papel FROM clientes WHERE auth_user_id = auth.uid()) = 'admin'` |
| `public.enderecos_cliente` | `SELECT`, `UPDATE` | `cliente`, `admin` | `auth.uid() = (SELECT auth_user_id FROM clientes WHERE id = cliente_id)` |
| `public.ordens_servico` | `SELECT` | `cliente` | `auth.uid() = (SELECT auth_user_id FROM clientes WHERE id = cliente_id)` |
| `public.ordens_servico` | `SELECT` | `tecnico` | `auth.uid() = (SELECT auth_user_id FROM clientes WHERE id = tecnico_id)` |
| `public.ordens_servico` | `SELECT` | `admin` | `TRUE` (visão geral do painel gerencial) |
| `public.ordens_servico` | `INSERT` | `cliente` | `auth.uid() = (SELECT auth_user_id FROM clientes WHERE id = cliente_id)` |
| `public.ordens_servico` | `UPDATE` | `tecnico` | Campos `status`, `parecer_tecnico`, `synced_at` quando `tecnico_id` bate com `auth.uid()` |
| `public.ordens_servico` | `UPDATE` | `admin` | `TRUE` (atribuição de técnico, cancelamento e reabertura) |
| `public.os_fotos` | `SELECT` | `cliente`, `tecnico`, `admin` | Herdado do `os_id` da OS que o usuário possui permissão |
| `public.os_fotos` | `INSERT` | `cliente`, `tecnico` | Restrito ao `os_id` das OSs vinculadas ao usuário |
| `public.pre_cadastros` | `INSERT` | **público (anon)** + `service_role` | `TRUE` — visitante não logado pode solicitar contrato |
| `public.pre_cadastros` | `SELECT`, `UPDATE` | `admin` | `(SELECT papel FROM clientes WHERE auth_user_id = auth.uid()) = 'admin'` |
| `public.notificacoes_push` | `SELECT` | `cliente` | `auth.uid() = (SELECT auth_user_id FROM clientes WHERE id = cliente_id)` |
| `public.notificacoes_push` | `INSERT` | `service_role` | Disparado apenas por serviços de backend autorizados |
| `storage.os-fotos` (bucket) | `INSERT` | `cliente`, `tecnico` | Somente no diretório `os-fotos/{auth.uid()}/` |
| `storage.os-fotos` (bucket) | `SELECT` | `cliente`, `tecnico`, `admin` | Caminho `os-fotos/{auth.uid()}/` ou papel = `admin` |

---

## 5. Diretrizes de Arquitetura e Implementação (DDD, Clean Architecture & TDD)

### 5.1 Organização do Projeto (`src/`)

```
src/
├── app/                    # Rotas e Páginas (Expo Router com Guard por Papel)
│   ├── (auth)/             # Telas Públicas / Não Logadas
│   │   ├── login.tsx       # Tela de Login com atalho/botão "Ver Planos"
│   │   ├── planos.tsx      # Vitrine Pública de Planos de Fibra Óptica
│   │   ├── cadastro.tsx    # Formulário de pré-cadastro
│   │   └── esqueci-senha.tsx
│   ├── (app)/              # Telas Autenticadas (Redirecionamento dinâmico)
│   │   ├── (tabs-cliente)/ # ABA DO CLIENTE (inicio, suporte, mapa, perfil)
│   │   ├── (tabs-tecnico)/ # ABA DO TÉCNICO (minhas-os, rota-mapa, concluir-os)
│   │   └── (tabs-admin)/   # ABA DO ADMINISTRADOR (dashboard, gerir-os, planos, avisos)
│   └── _layout.tsx         # Root Layout (Gerencia Auth Guard e Role Routing)
├── db/                     # BANCO LOCAL (SQLite) - Isolar de Supabase!
│   ├── schema.ts           # Schema das tabelas SQLite (clientes, ordens_servico, planos, etc)
│   ├── migrations/         # Scripts de criação e alteração de tabelas
│   └── queries/            # Funções puras de CRUD SQLite (ordensServico.ts, planos.ts, clientes.ts)
├── api/                    # COMUNICAÇÃO REMOTA (Supabase) - Isolar de SQLite!
│   ├── supabaseClient.ts   # Instância inicializada do client Supabase
│   └── endpoints/          # Funções HTTP/RPC (ordensServico.ts, planos.ts, auth.ts)
├── services/               # ORQUESTRADORES & SERVIÇOS DE REDE
│   ├── syncService.ts      # Consome db/ e api/ para sincronização bidirecional
│   ├── authService.ts      # Gerencia sessão, papéis de usuário (cliente/técnico/admin) e cache
│   └── storageService.ts   # Upload de fotos dos equipamentos e serviços
├── hooks/                  # HOOKS DE INTERFACE
│   ├── useNetworkStatus.ts # Escuta mudanças de conectividade via NetInfo
│   ├── useOrdensServico.ts # Interface reativa para abertura e gestão de OS
│   └── usePlanos.ts        # Consulta reativa da vitrine de planos de internet
├── components/             # COMPONENTES DE UI PURA
│   ├── ui/                 # Botões, cards, inputs, badges de status
│   └── domain/             # CardOS, CardPlanoInternet, DashboardAdminCard
├── context/                # CONTEXTOS DA APLICAÇÃO
│   ├── AuthContext.tsx     # Estado global de autenticação e papel (Role)
│   └── SyncContext.tsx     # Estado da fila de sincronização
└── utils/                  # Utilitários de moeda, datas e validação de CPF/CNPJ
```

> **Regra de Ouro da Arquitetura**:  
> - `src/db/` **NUNCA** importa nada de `src/api/`.  
> - `src/api/` **NUNCA** importa nada de `src/db/`.  
> - `src/services/` é a **única camada** autorizada a orquestrar as duas pontas.  
> - `src/components/` recebe propriedades puras de dados.

---

### 5.2 Contextos Delimitados (DDD - Domain Driven Design)

1. **Contexto de Autenticação & Gestão de Acessos**:
   - *Entidades*: `Cliente` (com `PapelUsuario`: Cliente, Técnico, Admin), `EnderecoCliente`.
   - *Regra*: Redirecionamento dinâmico da navegação conforme o papel do usuário logado.
2. **Contexto de Suporte & Ordem de Serviço (Cliente & Técnico)**:
   - *Entidades*: `OrdemServico`, `OSFoto`.
   - *Agregado*: `OrdemServico` atua como raiz do agregado contendo fotos do cliente (roteador) e do técnico (serviço concluído).
3. **Contexto Gerencial & Operacional (Administrador)**:
   - *Entidades*: `OrdemServico`, `PlanoInternet`, `NotificacaoPush`.
   - *Regra*: O Administrador gerencia e distribui chamados para os técnicos e envia notificações push para a base de assinantes.
4. **Contexto de Vitrine Comercial & Planos (Login / Público)**:
   - *Entidades*: `PlanoInternet`.
   - *Regra*: Exibição pública dos planos de fibra óptica na tela de login sem necessidade de autenticação.
5. **Contexto de Geolocalização & Cobertura**:
   - *Entidades*: `AreaCobertura` (GeoJSON / PostGIS).
   - *Regra*: Comparação client-side (offline) das coordenadas do cliente com o polígono delimitador de Coqueiral/MG.

---

### 5.3 Metodologia TDD (Test-Driven Development) e Estratégia de Testes

A aplicação adota a metodologia **TDD** (*Test-Driven Development*), operando em um ciclo contínuo de **Red-Green-Refactor**:
- **1. RED (Falha Inicial)**: Antes de implementar qualquer funcionalidade ou regra de negócio (ex: abertura de OS offline, compressão de imagens, consulta pública de planos), são desenvolvidos os testes unitários (`tests/domain/`, `tests/application/`) definindo o comportamento esperado.
- **2. GREEN (Aprovação Mínima)**: Implementa-se a regra de negócio com a quantidade mínima de código necessária para que a suíte de testes do Jest execute com 100% de aprovação.
- **3. REFACTOR (Refatoração Limpa)**: O código é refinado e organizado nas camadas de Clean Architecture (`db/`, `api/`, `services/`), garantindo manutenibilidade sem regressões.

#### Mapeamento de Testes:
- **Testes Unitários de Banco Local (`src/db/queries/`)**:
  - Testar inserção de OS com status `pendente` e gravação correspondente em `sync_queue`.
  - Testar leitura offline da vitrine de planos de internet na tabela `planos_internet`.
- **Testes Unitários de Serviços (`src/services/syncService.ts`)**:
  - Mockar o `supabaseClient` e o `sqliteDb`.
  - Simular execução da fila com retentativa (backoff exponencial) após indisponibilidade temporária.
  - Verificar se a foto é comprimida para $\le 1$ MB e seu URL remoto injetado no registro final da OS.
- **Testes de Integração de Telas (Expo Router)**:
  - Garantir que a troca de rota de `(auth)` para `(tabs-cliente)`, `(tabs-tecnico)` ou `(tabs-admin)` ocorra automaticamente de acordo com o `AuthContext` e o papel do usuário.



