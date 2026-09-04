# Documento de Especificação e Design de Software — App CJnet

> **Projeto**: Canal Digital de Autoatendimento e Suporte Offline-First  
> **Empresa**: CJnet Provedor de Internet  
> **Localização**: Coqueiral/MG  
> **Metodologia**: DDD, Clean Architecture, Pattern BCE, Offline-First (SQLite + Supabase)  
> **Padrão de Documentação**: `software-design-doc` (UML / Mermaid)

---

## 1. Visão Geral e Levantamento de Requisitos

O **App CJnet** é o aplicativo móvel oficial de autoatendimento da CJnet para clientes residenciais e comerciais de Coqueiral/MG e região. O aplicativo resolve a sobrecarga do atendimento telefônico e presencial ao permitir consulta de faturas/2ª via de boletos, abertura de chamadas/Ordens de Serviço (OS) com anexação de fotos de equipamentos (roteadores/ONUs), acompanhamento em tempo real do suporte e verificação de cobertura via geolocalização. Por ser voltado para uma região com conectividade por vezes instável, o aplicativo adota arquitetura **Offline-First**, permitindo consulta de dados em cache local e filas de sincronização resilientes.

### 1.1 Tabela de Requisitos Funcionais (RF)

| ID | Descrição | Prioridade | Ator/Origem |
|----|-----------|-----------|-------------|
| **RF01** | O sistema deve permitir que o cliente realize login/autenticação vinculando seu CPF/CNPJ ou e-mail ao cadastro ativo na CJnet. | Alta | Cliente |
| **RF02** | O sistema deve listar boletos (em aberto, pagos e vencidos) sincronizados no dispositivo local. | Alta | Cliente |
| **RF03** | O sistema deve permitir a visualização de detalhes e a cópia da linha digitável / 2ª via em PDF de boletos quando houver conexão. | Média | Cliente |
| **RF04** | O sistema deve permitir a abertura de uma nova Ordem de Serviço (OS) informando o tipo de problema (ex: sem sinal, lentidão, queda) e descrição. | Alta | Cliente |
| **RF05** | O sistema deve permitir tirar foto do roteador/ONU através da câmera do dispositivo e anexá-la à Ordem de Serviço aberta. | Alta | Cliente |
| **RF06** | O sistema deve gravar a OS e a foto localmente no dispositivo (offline-first) atribuindo um ID temporário (UUID) e enfileirando para sincronização. | Alta | Sistema |
| **RF07** | O sistema deve exibir o status atualizado das Ordens de Serviço abertas (ex: Pendente, Em Atendimento, Concluída). | Alta | Cliente |
| **RF08** | O sistema deve exibir no mapa interativo se a localização do cliente ou endereço informado está dentro da área de cobertura GeoJSON da CJnet. | Média | Cliente / Visitante |
| **RF09** | O sistema deve permitir que o cliente consulte e atualize seus dados cadastrais e localização da sua residência no mapa. | Média | Cliente |
| **RF10** | O sistema deve sincronizar automaticamente as ações pendentes (`sync_queue`) em segundo plano assim que a conectividade for restabelecida. | Alta | Sistema (SyncService) |

### 1.2 Tabela de Requisitos Não Funcionais (RNF)

| ID | Categoria | Descrição + Critério Mensurável | Prioridade |
|----|-----------|----------------------------------|-------------|
| **RNF01** | **Disponibilidade / Offline** | O aplicativo deve manter funcionalidade de leitura (boletos em cache, OSs existentes, perfil e mapa offline) 100% acessível sem conexão à internet. | Alta |
| **RNF02** | **Desempenho** | A consulta e gravação local no banco de dados SQLite deve responder em tempo < 100ms no dispositivo móvel. | Alta |
| **RNF03** | **Segurança** | Toda comunicação com a nuvem deve utilizar HTTPS/TLS e as tabelas no Supabase devem possuir políticas rígidas de **Row Level Security (RLS)** restritas ao `auth.uid()`. | Alta |
| **RNF04** | **Usabilidade** | A interface deve ser otimizada para telas de dispositivos Android e iOS com botões grandes, alto contraste e linguagem simples, acessível para usuários de diferentes faixas etárias de cidade do interior. | Alta |
| **RNF05** | **Manutenibilidade** | A arquitetura do código deve seguir **Clean Architecture / BCE**, isolando completamente a camada de banco de dados SQLite (`src/db/`) da camada de API remota Supabase (`src/api/`). | Média |
| **RNF06** | **Confiabilidade** | O serviço de sincronização (`syncService`) deve implementar retentativas com backoff exponencial e garantir idempotência sem duplicação de chamados no backend. | Alta |
| **RNF07** | **Portabilidade** | O app deve ser construído sobre Expo (React Native) com suporte a navegação por arquivos (Expo Router) e suporte a execução universal Android e iOS. | Alta |
| **RNF08** | **Eficiência Energética** | A captura de geolocalização e fotos deve ser pontual, proibindo rastreamento de localização em segundo plano (*background location tracking*) para conservar bateria. | Média |

---

## 2. Diagrama de Casos de Uso

### 2.1 Atores do Sistema
- **Cliente**: Usuário final cadastrado que utiliza o app para consultar boletos, abrir OS e visualizar perfil.
- **Visitante / Não Logado**: Usuário que acessa o app para consultar a área de cobertura ou realizar cadastro inicial.
- **Técnico / Suporte CJnet**: Ator secundário no backend/backoffice que atualiza status da OS e recebe dados do cliente.
- **Supabase Auth / Postgres**: Sistema externo remoto de autenticação e banco de dados relacional.
- **SyncService (Cron/Event)**: Serviço em segundo plano que processa a fila local offline.

### 2.2 Diagrama Mermaid de Casos de Uso

```mermaid
flowchart LR
    Visitante((Visitante))
    Cliente((Cliente))
    Cliente --|> Visitante
    Tecnico((Técnico/Suporte))
    SyncCron((SyncService))

    Visitante --> UC01[Ver Cobertura no Mapa]
    Visitante --> UC02[Realizar Cadastro]
    Cliente --> UC03[Fazer Login]
    Cliente --> UC04[Consultar Boletos e 2ª Via]
    Cliente --> UC05[Abrir Ordem de Serviço]
    Cliente --> UC06[Acompanhar Status da OS]
    Cliente --> UC07[Atualizar Perfil / Endereço]

    UC05 -.include.-> UC08[Salvar na Fila Offline SQLite]
    UC09[Tirar Foto do Roteador/ONU] -.extend.-> UC05
    UC10[Marcar Ponto no Mapa] -.extend.-> UC07

    SyncCron --> UC11[Sincronizar Fila sync_queue com Supabase]
    Tecnico --> UC12[Atualizar Status da OS]

    UC03 -.include.-> UC13[Validar Sessão / Token Local]
```

### 2.3 Especificação Textual dos Casos de Uso Principais

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
  - *Dispositivo Offline*: A OS fica em cache local até que a rede retorne.

#### UC09: Tirar Foto do Roteador/ONU (Ponto de Extensão em UC05)
- **Ator Principal**: Cliente.
- **Condição de Extensão**: Acionada quando o cliente clica em "Adicionar foto do equipamento" durante a abertura da OS.
- **Fluxo**:
  1. O app abre a câmera do dispositivo via `expo-image-picker`/`expo-camera`.
  2. O cliente tira a foto demonstrando os leds/luzes de status do equipamento.
  3. O app salva o arquivo de imagem no armazenamento interno do app (`expo-file-system`) e grava o caminho local em `foto_local_path`.
  4. O upload binário para o Supabase Storage (`bucket: os-fotos`) é delegado para a fila de sincronização em segundo plano para não travar o envio do formulário textual.

---

## 3. Diagrama de Classes e Estrutura de Dados

### 3.1 Diagrama de Classes de Domínio (UML)

```mermaid
classDiagram
    class Cliente {
        +String id
        +String authUserId
        +String nome
        +String cpfCnpj
        +String telefone
        +String endereco
        +StatusContrato statusContrato
        +Date updatedAt
        +consultarFaturas() List~Boleto~
        +abrirOS(tipo, descricao) OrdemServico
    }

    class Boleto {
        +String id
        +String clienteId
        +Decimal valor
        +Date vencimento
        +StatusBoleto status
        +String linhaDigitavel
        +String urlPdf
        +Date updatedAt
        +estaVencido() Boolean
    }

    class OrdemServico {
        +String idLocal
        +String idRemoto
        +String clienteId
        +TipoProblema tipoProblema
        +String descricao
        +StatusOS status
        +Double latitude
        +Double longitude
        +Date createdAt
        +Date syncedAt
        +adicionarFoto(pathLocal) OSFoto
    }

    class OSFoto {
        +String id
        +String osId
        +String fotoLocalPath
        +String fotoRemotaUrl
        +TipoFoto tipo
        +Boolean enviada
    }

    class EnderecoCliente {
        +String clienteId
        +Double latitude
        +Double longitude
        +String enderecoFormatado
        +Boolean dentroCobertura
        +validarCobertura(poligonoGeoJSON) Boolean
    }

    class SyncQueueItem {
        +String id
        +String entidade
        +OperacaoSync operacao
        +String payloadJson
        +Int tentativas
        +StatusSync status
        +Date criadoEm
    }

    Cliente "1" -- "0..*" Boleto : possui
    Cliente "1" -- "0..*" OrdemServico : solicita
    Cliente "1" -- "1" EnderecoCliente : possui
    OrdemServico "1" *-- "0..*" OSFoto : contem
    OrdemServico ..> SyncQueueItem : gera_pendencia
```

### 3.2 Tabela de Persistência e Estratégia Mapeada

| Classe | Persistente? | Estratégia Local (SQLite) | Estratégia Remota (Supabase Postgres) | Observação |
|--------|-------------|----------------------------|----------------------------------------|------------|
| `Cliente` | Sim | Tabela `clientes` | Tabela `public.clientes` | FK `auth_user_id → auth.users` |
| `Boleto` | Sim | Tabela `boletos` | Tabela `public.boletos` | Somente leitura no app móvel |
| `OrdemServico` | Sim | Tabela `ordens_servico` (PK `id_local` UUID) | Tabela `public.ordens_servico` (PK `id` BigInt/UUID) | Sincronizado via `sync_queue` |
| `OSFoto` | Sim | Guardado em `foto_local_path` | Bucket Supabase Storage `os-fotos` + Tabela `public.os_fotos` | Upload de binários desassociado da fila texto |
| `EnderecoCliente` | Sim | Tabela `enderecos_cliente` | Tabela `public.clientes` / `PostGIS` | Armazena coordenadas (Lat/Lng) |
| `SyncQueueItem` | Sim (Apenas Local) | Tabela `sync_queue` | N/A (Fila efêmera no mobile) | Controla retentativas offline |
| `AppMeta` | Sim (Apenas Local) | Tabela `app_meta` | N/A | Guarda `last_sync_at`, tokens e flags |

---

### 3.3 Diagrama Entidade-Relacionamento (DER Relacional)

```mermaid
erDiagram
    CLIENTES ||--o{ BOLETOS : possui
    CLIENTES ||--o{ ORDENS_SERVICO : solicita
    CLIENTES ||--o| ENDERECOS_CLIENTE : possui
    ORDENS_SERVICO ||--o{ OS_FOTOS : contem
    AREA_COBERTURA ||--o{ ENDERECOS_CLIENTE : intercepta

    CLIENTES {
        string id PK
        string auth_user_id FK
        string nome
        string cpf_cnpj
        string telefone
        string endereco
        string status_contrato
        timestamp updated_at
    }

    BOLETOS {
        string id PK
        string cliente_id FK
        decimal valor
        date vencimento
        string status "ABERTO, PAGO, VENCIDO"
        string linha_digitavel
        string url_pdf
        timestamp updated_at
    }

    ORDENS_SERVICO {
        string id_local PK "UUID gerado no mobile"
        string id_remoto "ID atribuído pelo Supabase"
        string cliente_id FK
        string tipo_problema "SEM_SINAL, LENTIDAO, QUEDA, OUTROS"
        text descricao
        string status "PENDENTE, EM_ATENDIMENTO, CONCLUIDO"
        double latitude
        double longitude
        timestamp created_at
        timestamp synced_at
    }

    OS_FOTOS {
        string id PK
        string os_id_local FK
        string foto_local_path
        string foto_remota_url
        string tipo "ROTEADOR, ONU, GERAL"
    }

    ENDERECOS_CLIENTE {
        string cliente_id PK, FK
        double latitude
        double longitude
        text endereco_formatado
        boolean dentro_cobertura
    }

    SYNC_QUEUE {
        string id PK
        string entidade
        string operacao "INSERT, UPDATE"
        text payload_json
        int tentativas
        string status "PENDENTE, PROCESSANDO, ERRO, CONCLUIDO"
        timestamp criado_em
    }

    AREA_COBERTURA {
        string id PK
        string nome_zona
        geometry polígono_postgis "Polígono GeoJSON Coqueiral/MG"
    }
```

---

## 4. Diagramas Complementares de Análise e Arquitetura

### 4.1 Diagrama de Estados: Ciclo de Vida da Ordem de Serviço (OS)

```mermaid
stateDiagram-v2
    [*] --> CriadaLocalmente : Cliente confirma OS no app
    CriadaLocalmente --> EmFilaSync : Registrada no SQLite + sync_queue
    EmFilaSync --> UploadingFoto : Conectividade detectada
    UploadingFoto --> EnviandoDadosSupabase : Binário da foto enviado ao Storage
    EnviandoDadosSupabase --> RegistradaNoBackend : Supabase aceita Insert (RLS OK)
    RegistradaNoBackend --> EmAtendimento : Técnico assume chamado no Backoffice
    EmAtendimento --> Resolvida : Técnico conclui serviço no local
    EmAtendimento --> Cancelada : Chamado duplicado ou resolvido remoto
    Resolvida --> [*]
    Cancelada --> [*]
```

---

### 4.2 Arquitetura Boundary-Control-Entity (BCE)

A aplicação mapeia a especificação do projeto em 3 estereótipos bem definidos:

```mermaid
flowchart TD
    subgraph Boundary ["Boundary (Fronteira / UI - Expo Router)"]
        UI_Login["app/(auth)/login.tsx"]
        UI_Inicio["app/(app)/(tabs)/inicio.tsx"]
        UI_Boletos["app/(app)/(tabs)/boletos/index.tsx"]
        UI_NovaOS["app/(app)/(tabs)/suporte/nova-os.tsx"]
        UI_Foto["app/(app)/(tabs)/suporte/nova-os-foto.tsx"]
        UI_Mapa["app/(app)/(tabs)/mapa.tsx"]
    end

    subgraph Control ["Control (Lógica / Serviços / Hooks)"]
        H_Auth["hooks/useSession.ts & AuthContext"]
        H_Net["hooks/useNetworkStatus.ts"]
        H_Boletos["hooks/useBoletos.ts"]
        H_OS["hooks/useOrdensServico.ts"]
        S_Sync["services/syncService.ts"]
        S_Storage["services/storageService.ts"]
    end

    subgraph Entity ["Entity (Dados & Armazenamento)"]
        DB_SQLite[("db/schema.ts (SQLite local)")]
        DB_Supabase[("api/supabaseClient.ts (Supabase Postgres)")]
    end

    UI_NovaOS --> H_OS
    UI_Foto --> S_Storage
    H_OS --> S_Sync
    H_Net --> S_Sync
    S_Sync --> DB_SQLite
    S_Sync --> DB_Supabase
    UI_Login --> H_Auth
    H_Auth --> DB_Supabase
```

---

### 4.3 Diagrama de Sequência: Abertura de OS Offline com Foto e Sync Assíncrono

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant UI as UI (nova-os.tsx / foto.tsx)
    participant OSQuery as DB Queries (ordensServico.ts)
    participant SQLite as SQLite Local (expo-sqlite)
    participant SyncService as SyncService (syncService.ts)
    participant Storage as Supabase Storage (bucket os-fotos)
    participant Supabase as Supabase Database (Postgres API)

    Cliente->>UI: Preenche formulário de OS e tira foto do roteador
    UI->>OSQuery: criarOSLocal(dados, localFotoPath)
    OSQuery->>SQLite: INSERT INTO ordens_servico (id_local, status='pendente')
    OSQuery->>SQLite: INSERT INTO sync_queue (entidade='ordem_servico', status='pendente')
    SQLite-->>OSQuery: OK (ID Local Gerado)
    OSQuery-->>UI: Retorno com sucesso otimista
    UI-->>Cliente: Exibe badge "OS Salva. Sincronizando quando online..."

    Note over SyncService: Evento de Conexão (NetInfo: isOnline = true)
    SyncService->>SQLite: SELECT * FROM sync_queue WHERE status='pendente'
    SQLite-->>SyncService: Retorna item da OS + foto local
    
    SyncService->>Storage: uploadFoto(fotoLocalPath)
    Storage-->>SyncService: Retorna fotoRemotaUrl (HTTPS)

    SyncService->>Supabase: POST /rest/v1/ordens_servico (Payload + fotoRemotaUrl)
    Supabase-->>SyncService: 201 Created (ID Remoto Atribuído)

    SyncService->>SQLite: UPDATE ordens_servico SET status='aberto', id_remoto=X, synced_at=NOW()
    SyncService->>SQLite: UPDATE sync_queue SET status='concluido'
    SyncService-->>UI: Dispara atualização de UI via Hook (useOrdensServico)
```

---

### 4.4 Diagrama de Atividades: Processamento da Fila de Sincronização (`syncService`)

```mermaid
flowchart TD
    A([Início: Transição Offline -> Online ou Timer]) --> B{Existe Conexão?}
    B -- Não --> C[Manter dados no SQLite local] --> End([Fim])
    B -- Sim --> D[Buscar itens em sync_queue com status PENDENTE ordenados por criado_em]
    D --> E{Há itens na fila?}
    E -- Não --> End
    E -- Sim --> F[Pegar próximo item da fila]
    F --> G{Tipo de Entidade?}

    G -- Ordem de Serviço --> H{Possui Foto Local?}
    H -- Sim --> I[Fazer upload do arquivo para Supabase Storage]
    I --> J[Obter URL pública da foto]
    H -- Não --> K[Montar payload da OS]
    J --> K
    K --> L[Executar Insert/Update via client Supabase com RLS]

    G -- Atualização Perfil --> M[Executar Update de Perfil no Supabase]

    L --> N{Sucesso na API?}
    M --> N
    N -- Sim --> O[Atualizar registro no SQLite local: synced_at = now]
    O --> P[Marcar item na sync_queue como CONCLUÍDO]
    P --> E

    N -- Falha (Erro de Rede / Timeout) --> Q[Incrementar campo tentativas no item]
    Q --> R{Tentativas > 5?}
    R -- Sim --> S[Marcar status = ERRO_DEFINITIVO]
    R -- Não --> T[Aplicar Backoff Exponencial: esperar 2^n segundos]
    S --> E
    T --> E
```

---

### 4.5 Diagrama de Componentes da Aplicação Mobile

```mermaid
componentDiagram
    package "Dispositivo Móvel (Expo React Native)" {
        [Expo Router (Stack & Tabs)] as Router
        [Contextos Globais (Auth & Sync)] as Contexts
        [Custom Hooks (useBoletos, useOS)] as Hooks
        
        package "Camada de Dados Local" {
            [SQLite Client (expo-sqlite)] as SQLiteDB
            [Queries Locais (src/db/queries)] as DBQueries
        }

        package "Camada de Serviços" {
            [SyncService] as SyncSvc
            [StorageService] as StorageSvc
            [NetInfo Listener] as NetInfo
        }

        package "Camada de API Remota" {
            [Supabase JS Client] as SupabaseSDK
        }
    }

    cloud "Supabase Cloud PaaS" {
        [Supabase Auth (JWT)] as RemoteAuth
        [PostgreSQL + RLS + PostGIS] as RemoteDB
        [Supabase Storage Buckets] as RemoteStorage
    }

    Router --> Contexts
    Contexts --> Hooks
    Hooks --> DBQueries
    DBQueries --> SQLiteDB
    
    NetInfo --> SyncSvc
    SyncSvc --> DBQueries
    SyncSvc --> StorageSvc
    SyncSvc --> SupabaseSDK

    StorageSvc --> RemoteStorage
    SupabaseSDK --> RemoteAuth
    SupabaseSDK --> RemoteDB
```

---

## 5. Diretrizes de Arquitetura e Implementação (DDD, Clean Arch & TDD)

### 5.1 Organização do Projeto (`src/`)

```
src/
├── app/                    # Rotas e Páginas (Expo Router)
│   ├── (auth)/             # Telas Públicas (login, cadastro, esqueci-senha)
│   ├── (app)/              # Telas Autenticadas (tabs: inicio, boletos, suporte, mapa, perfil)
│   └── _layout.tsx         # Root Layout (Gerencia Auth Guard)
├── db/                     # BANCO LOCAL (SQLite) - Isolar de Supabase!
│   ├── schema.ts           # Schema das tabelas SQLite
│   ├── migrations/         # Scripts de criação e alteração de tabelas
│   └── queries/            # Funções puras de CRUD SQLite (boletos.ts, ordensServico.ts, clientes.ts)
├── api/                    # COMUNICAÇÃO REMOTA (Supabase) - Isolar de SQLite!
│   ├── supabaseClient.ts   # Instância inicializada do client Supabase
│   └── endpoints/          # Funções de chamada HTTP/RPC (boletos.ts, ordensServico.ts, auth.ts)
├── services/               # ORQUESTRADORES & SERVIÇOS DE REDE
│   ├── syncService.ts      # Consome db/ e api/ para executar sincronização bidirecional
│   ├── authService.ts      # Gerencia sessão, cache local e login
│   └── storageService.ts   # Upload de fotos do roteador para o bucket os-fotos
├── hooks/                  # HOOKS DE INTERFACE
│   ├── useNetworkStatus.ts # Escuta mudanças de conectividade via NetInfo
│   ├── useBoletos.ts       # Retorna dados locais instantâneos + dispara sync em background
│   └── useOrdensServico.ts # Interface reativa para listagem e abertura de OS
├── components/             # COMPONENTES DE UI PURA (Desconectados de dados diretos)
│   ├── ui/                 # Botões, cards, inputs, badges de status
│   └── domain/             # ItemBoleto, CardOS, MapaCoberturaView
├── context/                # CONTEXTOS DA APLICAÇÃO
│   ├── AuthContext.tsx     # Estado global de autenticação
│   └── SyncContext.tsx     # Estado da fila de sincronização
└── utils/                  # Utilitários de formatação de moeda, datas e validação de CPF
```

> **Regra de Ouro da Arquitetura**:  
> - `src/db/` **NUNCA** importa nada de `src/api/`.  
> - `src/api/` **NUNCA** importa nada de `src/db/`.  
> - `src/services/` é a **única camada** autorizada a orquestrar as duas pontas.  
> - `src/components/` recebe propriedades puras de dados.

---

### 5.2 Contextos Delimitados (DDD - Domain Driven Design)

1. **Contexto de Autenticação & Cliente**:
   - *Entidades*: `Cliente`, `EnderecoCliente`.
   - *Regra*: Validação do CPF/CNPJ com a base ativa da CJnet durante o cadastro.
2. **Contexto Financeiro**:
   - *Entidades*: `Boleto`.
   - *Regra*: Leitura offline do histórico de faturas; geração de 2ª via válida apenas online.
3. **Contexto de Suporte & Ordem de Serviço**:
   - *Entidades*: `OrdemServico`, `OSFoto`.
   - *Agregado*: `OrdemServico` atua como raiz do agregado contendo `OSFoto`.
4. **Contexto de Geolocalização & Cobertura**:
   - *Entidades*: `AreaCobertura` (GeoJSON / PostGIS).
   - *Regra*: Comparação client-side (offline) das coordenadas do cliente com o polígono delimitador de Coqueiral/MG.

---

### 5.3 Estratégia de Testes (TDD / Jest)

- **Testes Unitários de Banco Local (`src/db/queries/`)**:
  - Testar inserção de OS com status `pendente` e verificação da gravação idêntica em `sync_queue`.
- **Testes Unitários de Serviços (`src/services/syncService.ts`)**:
  - Mockar o `supabaseClient` e o `sqliteDb`.
  - Simular execução da fila com retentativa (backoff) após erro HTTP 500.
  - Verificar se a foto é enviada primeiro e se seu URL remoto é injetado no registro final da OS.
- **Testes de Integração de Telas (Expo Router)**:
  - Garantir que a troca de rota de `(auth)` para `(app)` ocorra automaticamente de acordo com o `AuthContext`.
