# InveSimul System Architecture

This document contains the source architecture diagram for **InveSimul** (Suitability-Aware Payoff Simulator). It has been mapped precisely to the current implementation of the codebase.

## System Architecture Diagram

```mermaid
flowchart TB
    %% ========================================
    %% STYLING DEFINITIONS
    %% ========================================
    classDef uiLayer fill:#f0f9ff,stroke:#0284c7,stroke-width:2px,color:#0c4a6e,rx:8,ry:8
    classDef frontendLayer fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,rx:8,ry:8
    classDef backendLayer fill:#fdf4ff,stroke:#c026d3,stroke-width:2px,color:#701a75,rx:8,ry:8
    classDef engineLayer fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#78350f,rx:8,ry:8
    classDef dataLayer fill:#f8fafc,stroke:#475569,stroke-width:2px,color:#0f172a,rx:8,ry:8

    %% ========================================
    %% L1: USER INTERFACE LAYER
    %% ========================================
    subgraph Layer1 [1. User Interface Layer]
        direction LR
        RM["RM View<br/>(Configuration & Client Profile)"]:::uiLayer
        Client["Client View<br/>(Multilingual Insights)"]:::uiLayer
        PDF["Downloadable Client<br/>Investment Report"]:::uiLayer
    end

    %% ========================================
    %% L2: FRONTEND APPLICATION LAYER
    %% ========================================
    subgraph Layer2 [2. Frontend Application Layer (React & Vite)]
        direction LR
        Context["Assessment Context<br/>(Global Workflow State)"]:::frontendLayer
        UIComps["Reusable UI<br/>(Payoff Charts & Scenario Sliders)"]:::frontendLayer
        PDFRenderer["React-PDF<br/>(Native Document Generator)"]:::frontendLayer
        APIClient["API Client<br/>(REST HTTP Fetch)"]:::frontendLayer
    end

    %% ========================================
    %% L3: BACKEND AND API LAYER
    %% ========================================
    subgraph Layer3 [3. Backend & API Layer (FastAPI)]
        direction LR
        Router["FastAPI Routers<br/>(Endpoints & Validation)"]:::backendLayer
        Pydantic["Pydantic Models<br/>(Data Schemas)"]:::backendLayer
    end

    %% ========================================
    %% L4: CORE FINANCIAL ENGINE LAYER
    %% ========================================
    subgraph Layer4 [4. Core Financial Engine Layer (Python)]
        direction TB
        
        subgraph Products [Structured Product Payoff Engines]
            direction LR
            ELN["Equity-Linked Notes (ELN)"]:::engineLayer
            DCD["Dual Currency Deposits (DCD)"]:::engineLayer
            CPN["Capital-Protected Notes (CPN)"]:::engineLayer
        end

        SimEngine["Scenario Simulation Engine"]:::engineLayer
        BacktestEngine["Historical Backtesting Engine"]:::engineLayer
        SuitabilityEngine["Suitability Assessment Engine<br/>(Risk, Liquidity, Concentration)"]:::engineLayer
        ExplainService["Client Explanation & AI Service<br/>(Localization & Simplification)"]:::engineLayer
    end

    %% ========================================
    %% L5: DATA & EXTERNAL INTEGRATION LAYER
    %% ========================================
    subgraph Layer5 [5. Data & External Integration Layer]
        direction LR
        YFinance["Market Data API<br/>(yfinance / NIFTY 50)"]:::dataLayer
        Gemini["Google Gemini API"]:::dataLayer
        AuditLog["Audit Log<br/>(JSONL Storage)"]:::dataLayer
        DataCache["Local Snapshot Cache<br/>(CSV/JSON Data)"]:::dataLayer
    end

    %% ========================================
    %% WORKFLOW & RELATIONSHIPS
    %% ========================================
    
    %% UI to Frontend
    RM -->|User Input| Context
    Client -->|Interactions| Context
    Context --> UIComps
    Context --> APIClient
    Client -.->|Triggers| PDFRenderer
    PDFRenderer -.->|Generates| PDF

    %% Frontend to Backend
    APIClient ==>|HTTP JSON| Router
    Router -->|Validates| Pydantic

    %% Backend to Core Engines
    Pydantic -->|Configs| ELN
    Pydantic -->|Configs| DCD
    Pydantic -->|Configs| CPN
    
    Pydantic -->|Product & Client Specs| SimEngine
    Pydantic -->|Product Specs| BacktestEngine
    Pydantic -->|Client Profile| SuitabilityEngine
    Pydantic -->|Explanation Requests| ExplainService

    %% Core Engines to Core Engines
    Products -.->|Base Payoff Logic| SimEngine
    Products -.->|Base Payoff Logic| BacktestEngine

    %% Core Engines to External Data
    SimEngine -->|Fetches Data| YFinance
    BacktestEngine -->|Fetches History| YFinance
    SimEngine -->|Reads Cached Data| DataCache
    BacktestEngine -->|Reads Cached Data| DataCache
    
    ExplainService -->|Generates Explanations| Gemini
    SuitabilityEngine -->|Logs Outcomes| AuditLog
    
```

## Missing / Excluded Components
As per the strict inspection of the current repository, the following architectural components were **excluded** because they are not yet implemented:
* **Relational Database (e.g., PostgreSQL / SQLite)**: The application currently maintains state on the frontend via `AssessmentContext`, relies on local JSONL (`audit_log.jsonl`) for backend logging, and uses local CSVs for data caching.
* **Microservices Frameworks**: The backend is built as a single monolithic FastAPI application divided by module endpoints, rather than separated microservices.
* **Authentication/Authorization Systems**: No JWT tokens, IAM, or login databases exist yet.
* **Asynchronous Task Queues (e.g., Celery/Redis)**: Long-running tasks like backtesting currently execute synchronously via FastAPI endpoint calls.
